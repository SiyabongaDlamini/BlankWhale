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
            asyncio.run_coroutine_threadsafe(
                self._broadcast(json.dumps(metrics)),
                asyncio.get_event_loop(),
            )

        self.trainer = BlankWhaleTrainer(training_config, on_metrics=on_metrics)

        # Run in thread to not block the event loop
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, self.trainer.setup)
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

    # Handle graceful shutdown
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
