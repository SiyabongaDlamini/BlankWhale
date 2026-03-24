"""
BlankWhale WebSocket Metrics Server
Real-time bridge between the Python training engine and the Tauri/React UI.
"""

import asyncio
import json
import logging
import signal
import os
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

            elif command == "extract_document":
                extract_config = msg.get("config", {})
                asyncio.create_task(self._extract_document(websocket, extract_config))

            elif command == "redact_pii":
                pii_config = msg.get("config", {})
                asyncio.create_task(self._redact_pii(websocket, pii_config))

            elif command == "generate_qa":
                qa_config = msg.get("config", {})
                asyncio.create_task(self._generate_qa(websocket, qa_config))

            elif command == "list_templates":
                from .qa_generator import list_templates
                await websocket.send(json.dumps({
                    "event": "templates_list",
                    "data": {"templates": list_templates()},
                }))

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
        logger.info(f"TRAIN: Config received: {config}")
        data_dir = os.environ.get("BLANKWHALE_DATA_DIR", ".")
        logger.info(f"TRAIN: ENV_DATA_DIR='{data_dir}'")
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
                from datasets import load_dataset
                
                data_dir = os.environ.get("BLANKWHALE_DATA_DIR", ".")
                data_path = os.path.join(data_dir, "data")
                os.makedirs(data_path, exist_ok=True)
                
                ds = load_dataset(dataset_name, split=split)
                output_path = os.path.join(data_path, f"{dataset_name.replace('/', '_')}_{split}.jsonl")
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
        data_dir = os.environ.get("BLANKWHALE_DATA_DIR", ".")
        logger.info(f"PREVIEW: Requested path='{path}', BLANKWHALE_DATA_DIR='{data_dir}'")
        data_dir = os.environ.get("BLANKWHALE_DATA_DIR", ".")
        
        if path and not os.path.isabs(path):
            # Try resolving against AppData/data if it looks like a simple name or ./data
            if path.startswith("./data/"):
                path = os.path.join(data_dir, path.lstrip("./"))
            else:
                path = os.path.join(data_dir, "data", path)

        chunk_size = config.get("chunk_size", 1024)
        overlap = config.get("overlap", 128)

        if not path:
            return

        from .data_pipeline import extract_document, chunk_by_semantic_boundaries
        loop = asyncio.get_event_loop()
        try:
            def load():
                # Only extract first 10 pages for lightning-fast preview
                result = extract_document(path, max_pages=10)
                chunks = chunk_by_semantic_boundaries(
                    result.markdown, chunk_size=chunk_size, overlap=overlap
                )
                return {
                    "markdown": result.markdown[:5000],   # First 5k chars for preview
                    "chunks": chunks[:10],
                    "total_chunks": len(chunks),
                    "word_count": result.word_count,
                    "pages": result.pages,
                    "format": result.format,
                    "has_tables": result.has_tables,
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

    async def _extract_document(self, websocket, config: dict):
        """Full document extraction with smart pipeline."""
        path = config.get("path", "")
        data_dir = os.environ.get("BLANKWHALE_DATA_DIR", ".")
        if path and not os.path.isabs(path):
            if path.startswith("./data/"):
                path = os.path.join(data_dir, path.lstrip("./"))
            else:
                path = os.path.join(data_dir, "data", path)

        redact = config.get("redact_pii", False)
        redact_strategy = config.get("pii_strategy", "redact")

        if not path:
            await websocket.send(json.dumps({
                "event": "error",
                "data": {"message": "No file path provided."},
            }))
            return

        from .data_pipeline import extract_document
        loop = asyncio.get_event_loop()
        try:
            def extract():
                result = extract_document(path)
                markdown = result.markdown

                pii_info = {}
                if redact:
                    from .pii_redactor import redact_pii
                    pii_result = redact_pii(markdown, strategy=redact_strategy)
                    markdown = pii_result.cleaned_text
                    pii_info = {
                        "total_redacted": pii_result.total_redacted,
                        "categories": pii_result.categories_found,
                    }

                return {
                    "markdown": markdown,
                    "word_count": result.word_count,
                    "pages": result.pages,
                    "format": result.format,
                    "has_tables": result.has_tables,
                    "pii": pii_info,
                }

            result = await loop.run_in_executor(None, extract)
            await websocket.send(json.dumps({
                "event": "extraction_result",
                "data": result,
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "event": "error",
                "data": {"message": f"Extraction failed: {e}"},
            }))

    async def _redact_pii(self, websocket, config: dict):
        """Scan and redact PII from text."""
        text = config.get("text", "")
        strategy = config.get("strategy", "redact")

        if not text:
            return

        from .pii_redactor import redact_pii
        loop = asyncio.get_event_loop()
        try:
            def run_redaction():
                result = redact_pii(text, strategy=strategy)
                return {
                    "cleaned_text": result.cleaned_text,
                    "total_redacted": result.total_redacted,
                    "categories": result.categories_found,
                    "matches": [
                        {"category": m.category, "original": m.original, "replacement": m.replacement}
                        for m in result.matches
                    ],
                }

            result = await loop.run_in_executor(None, run_redaction)
            await websocket.send(json.dumps({
                "event": "pii_result",
                "data": result,
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "event": "error",
                "data": {"message": f"PII redaction failed: {e}"},
            }))

    async def _generate_qa(self, websocket, config: dict):
        """Generate QA training pairs from chunks."""
        chunks = config.get("chunks", [])
        template_name = config.get("template", "knowledge_base")
        format_type = config.get("format", "alpaca")
        pairs_per_chunk = config.get("pairs_per_chunk", 2)

        if not chunks:
            return

        from .qa_generator import generate_qa_pairs
        from .data_pipeline import save_training_data
        loop = asyncio.get_event_loop()
        try:
            def generate():
                records = generate_qa_pairs(
                    chunks, template_name=template_name,
                    format_type=format_type, pairs_per_chunk=pairs_per_chunk,
                )
                data_dir = os.environ.get("BLANKWHALE_DATA_DIR", ".")
                output_dir = os.path.join(data_dir, "data")
                os.makedirs(output_dir, exist_ok=True)
                output = os.path.join(output_dir, f"train_{template_name}.jsonl")
                save_training_data(records, output)
                return {
                    "total_pairs": len(records),
                    "output_path": output,
                    "template": template_name,
                    "format": format_type,
                }

            result = await loop.run_in_executor(None, generate)
            await websocket.send(json.dumps({
                "event": "qa_generated",
                "data": result,
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "event": "error",
                "data": {"message": f"QA generation failed: {e}"},
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
        data_dir = os.environ.get("BLANKWHALE_DATA_DIR", ".")
        os.makedirs(os.path.join(data_dir, "data"), exist_ok=True)
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
    data_dir = os.environ.get("BLANKWHALE_DATA_DIR", os.path.expanduser("~"))
    # Stabilize CWD to prevent FileNotFoundError if app bundle is updated/deleted
    try:
        os.chdir(data_dir)
    except Exception:
        pass
    
    log_file = os.path.join(data_dir, "engine.log")
    
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(message)s",
        datefmt="%H:%M:%S",
        handlers=[
            logging.FileHandler(log_file, mode='a', encoding='utf-8'),
            logging.StreamHandler()
        ]
    )
    logger.info(f"Logging to {log_file}")

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
