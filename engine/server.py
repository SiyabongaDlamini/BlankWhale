"""
BlankWhale WebSocket Metrics Server
Real-time bridge between the Python training engine and the Tauri/React UI.
"""

import asyncio
import json
import logging
import signal
from typing import Optional

logger = logging.getLogger("blankwhale.server")


class MetricsServer:
    """
    WebSocket server that streams training metrics to the frontend.
    The Tauri app connects to ws://localhost:9876 and receives live updates.
    """

    def __init__(self, host: str = "127.0.0.1", port: int = 9876):
        self.host = host
        self.port = port
        self.clients: set = set()
        self.trainer = None
        self._server = None
        self._model = None
        self._tokenizer = None
        self._loop = None  # Will be set when server starts

    async def handler(self, websocket):
        """Handle a new WebSocket connection."""
        self.clients.add(websocket)
        client_addr = websocket.remote_address
        logger.info(f"Client connected: {client_addr}")

        # Send current hardware info on connect
        from .gpu_detect import detect_hardware
        hw = detect_hardware()
        await websocket.send(json.dumps({
            "event": "hardware",
            "data": hw,
        }))

        try:
            async for message in websocket:
                await self._handle_message(websocket, message)
        except Exception as e:
            logger.warning(f"Client disconnected: {client_addr} ({e})")
        finally:
            self.clients.discard(websocket)

    async def _handle_message(self, websocket, raw_message: str):
        """Process incoming commands from the frontend."""
        try:
            msg = json.loads(raw_message)
            command = msg.get("command")

            if command == "start_training":
                config = msg.get("config", {})
                asyncio.create_task(self._run_training(config))
                await websocket.send(json.dumps({
                    "event": "status",
                    "data": {"message": "Training job started"},
                }))

            elif command == "stop_training":
                if self.trainer:
                    self.trainer.stop()
                await websocket.send(json.dumps({
                    "event": "status",
                    "data": {"message": "Stopping training..."},
                }))

            elif command == "get_hardware":
                from .gpu_detect import detect_hardware
                hw = detect_hardware()
                await websocket.send(json.dumps({
                    "event": "hardware",
                    "data": hw,
                }))

            elif command == "export_model":
                export_config = msg.get("config", {})
                asyncio.create_task(self._run_export(export_config))

            elif command == "inference":
                inference_config = msg.get("config", {})
                asyncio.create_task(self._run_inference(websocket, inference_config))

            elif command == "load_hf_dataset":
                dataset_config = msg.get("config", {})
                asyncio.create_task(self._load_hf_dataset(websocket, dataset_config))

            elif command == "preview_data":
                preview_config = msg.get("config", {})
                asyncio.create_task(self._preview_data(websocket, preview_config))

            else:
                await websocket.send(json.dumps({
                    "event": "error",
                    "data": {"message": f"Unknown command: {command}"},
                }))

        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                "event": "error",
                "data": {"message": "Invalid JSON"},
            }))

    async def _run_training(self, config: dict):
        """Run training in a background thread."""
        from .trainer import TrainingConfig, BlankWhaleTrainer

        training_config = TrainingConfig(**config) if config else TrainingConfig()

        def on_metrics(metrics):
            """Broadcast metrics to all connected clients."""
            if self._loop:
                asyncio.run_coroutine_threadsafe(
                    self._broadcast(json.dumps(metrics)),
                    self._loop,
                )

        self.trainer = BlankWhaleTrainer(training_config, on_metrics=on_metrics)

        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, self.trainer.setup)
            # Save model/tokenizer reference for inference later
            self._model = self.trainer.model
            self._tokenizer = self.trainer.tokenizer
            await loop.run_in_executor(None, self.trainer.train)
        except Exception as e:
            await self._broadcast(json.dumps({
                "event": "error",
                "data": {"message": str(e)},
            }))

    async def _run_export(self, config: dict):
        """Run model export in background."""
        from .export import export_model

        loop = asyncio.get_event_loop()
        try:
            await self._broadcast(json.dumps({
                "event": "status",
                "data": {"message": "Exporting model..."},
            }))
            result = await loop.run_in_executor(
                None,
                lambda: export_model(
                    model_path=config.get("model_path", "./output/final"),
                    output_format=config.get("format", "safetensors"),
                    output_path=config.get("output_path", "./output/export"),
                ),
            )
            await self._broadcast(json.dumps({
                "event": "export_complete",
                "data": result,
            }))
        except Exception as e:
            await self._broadcast(json.dumps({
                "event": "error",
                "data": {"message": f"Export failed: {e}"},
            }))

    async def _run_inference(self, websocket, config: dict):
        """Run model inference and return the result."""
        prompt = config.get("prompt", "")

        if not self._model or not self._tokenizer:
            await websocket.send(json.dumps({
                "event": "error",
                "data": {"message": "No model loaded. Please train or load a model first."},
            }))
            return

        loop = asyncio.get_event_loop()
        try:
            def generate():
                import torch
                inputs = self._tokenizer(prompt, return_tensors="pt").to(self._model.device)
                with torch.no_grad():
                    outputs = self._model.generate(
                        **inputs,
                        max_new_tokens=256,
                        temperature=0.7,
                        do_sample=True,
                        top_p=0.9,
                    )
                # Decode only the new tokens
                response = self._tokenizer.decode(
                    outputs[0][inputs["input_ids"].shape[1]:],
                    skip_special_tokens=True
                )
                return response.strip()

            response = await loop.run_in_executor(None, generate)
            await websocket.send(json.dumps({
                "event": "inference_result",
                "data": {"response": response, "prompt": prompt},
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "event": "error",
                "data": {"message": f"Inference failed: {e}"},
            }))

    async def _load_hf_dataset(self, websocket, config: dict):
        """Load a HuggingFace dataset and save to local disk."""
        dataset_name = config.get("dataset_name", "")
        split = config.get("split", "train")

        if not dataset_name:
            await websocket.send(json.dumps({
                "event": "error",
                "data": {"message": "No dataset name provided."},
            }))
            return

        loop = asyncio.get_event_loop()
        try:
            await websocket.send(json.dumps({
                "event": "status",
                "data": {"message": f"Downloading {dataset_name}..."},
            }))

            def download():
                import os
                from datasets import load_dataset

                ds = load_dataset(dataset_name, split=split)
                os.makedirs("./data", exist_ok=True)
                output_path = f"./data/{dataset_name.replace('/', '_')}_{split}.jsonl"
                ds.to_json(output_path)
                return {
                    "path": output_path,
                    "num_rows": len(ds),
                    "columns": list(ds.column_names),
                }

            result = await loop.run_in_executor(None, download)
            await websocket.send(json.dumps({
                "event": "dataset_loaded",
                "data": {
                    "message": f"Loaded {result['num_rows']} rows from {dataset_name}",
                    **result,
                },
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "event": "error",
                "data": {"message": f"Failed to load dataset: {e}"},
            }))

    async def _preview_data(self, websocket, config: dict):
        """Preview data extraction and chunking for the UI."""
        path = config.get("path", "")
        chunk_size = config.get("chunk_size", 1024)
        overlap = config.get("overlap", 200)

        if not path:
            return

        from .data_pipeline import load_raw_data
        loop = asyncio.get_event_loop()
        try:
            # Use same loader logic as training
            def load():
                # Provide a limited preview (first few chunks)
                data = load_raw_data(path, chunk_size=chunk_size, overlap=overlap)
                return {
                    "chunks": [d.get("text", "") for d in data[:10]],
                    "total_chunks": len(data),
                }

            result = await loop.run_in_executor(None, load)
            await websocket.send(json.dumps({
                "event": "preview_result",
                "data": result,
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "event": "error",
                "data": {"message": f"Preview failed: {e}"},
            }))

    async def _broadcast(self, message: str):
        """Send a message to all connected WebSocket clients."""
        disconnected = set()
        for client in self.clients:
            try:
                await client.send(message)
            except Exception:
                disconnected.add(client)
        self.clients -= disconnected

    async def start(self):
        """Start the WebSocket server."""
        try:
            import websockets
        except ImportError:
            logger.error("websockets package not found. Install with: pip install websockets")
            return

        logger.info(f"BlankWhale engine starting on ws://{self.host}:{self.port}")
        self._loop = asyncio.get_running_loop()
        self._server = await websockets.serve(self.handler, self.host, self.port)
        logger.info("Engine ready. Waiting for connections...")
        await self._server.wait_closed()

    def stop(self):
        """Stop the server."""
        if self._server:
            self._server.close()


def start_server(host: str = "127.0.0.1", port: int = 9876):
    """Entry point to start the BlankWhale training engine."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    server = MetricsServer(host=host, port=port)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, server.stop)

    try:
        loop.run_until_complete(server.start())
    except KeyboardInterrupt:
        logger.info("Server shutting down...")
    finally:
        loop.close()


if __name__ == "__main__":
    start_server()
