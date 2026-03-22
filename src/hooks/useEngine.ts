import { useState, useEffect, useCallback, useRef } from 'react';

export interface HardwareInfo {
  device: string;
  gpu_available: boolean;
  gpu_name: string | null;
  gpu_memory_gb: number | null;
  ram_gb: number;
}

export interface TrainingMetrics {
  step: number;
  epoch: number;
  loss: number;
  learning_rate: number;
  total_steps: number;
}

export function useEngine() {
  const [isConnected, setIsConnected] = useState(false);
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [metrics, setMetrics] = useState<TrainingMetrics[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isTraining, setIsTraining] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log("Connecting to BlankWhale engine at ws://localhost:9876...");
    const ws = new WebSocket('ws://localhost:9876');

    ws.onopen = () => {
      console.log('Connected to engine');
      setIsConnected(true);
      // Request hardware info on connect
      ws.send(JSON.stringify({ command: 'get_hardware' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.event) {
          case 'hardware':
            setHardware(msg.data);
            break;
          case 'status':
            setStatusMessage(msg.data.message);
            if (msg.data.message === 'Training job started') {
              setIsTraining(true);
              setMetrics([]); // Reset metrics on new run
            } else if (msg.data.message.includes('complete') || msg.data.message.includes('Stopping')) {
              setIsTraining(false);
            }
            break;
          case 'metrics':
            setMetrics((prev) => {
              // Only add if it's a new step to prevent duplicates
              if (prev.length > 0 && prev[prev.length - 1].step === msg.data.step) {
                return prev;
              }
              return [...prev, msg.data];
            });
            break;
          case 'error':
            console.error('Engine error:', msg.data.message);
            setStatusMessage(`Error: ${msg.data.message}`);
            setIsTraining(false);
            break;
        }
      } catch (err) {
        console.error('Failed to parse engine message:', err);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from engine');
      setIsConnected(false);
      setIsTraining(false);
      // Auto-reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const startTraining = useCallback((config: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        command: 'start_training',
        config
      }));
    } else {
      console.error("Cannot start training: Engine not connected");
      setStatusMessage("Error: Engine not connected. Is the Python server running?");
    }
  }, []);

  const stopTraining = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'stop_training' }));
    }
  }, []);

  return {
    isConnected,
    hardware,
    metrics,
    statusMessage,
    isTraining,
    startTraining,
    stopTraining
  };
}
