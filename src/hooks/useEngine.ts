import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

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

export interface EngineStatus {
  running: boolean;
  installed: boolean;
  pid: number | null;
}

export function useEngine() {
  const [isConnected, setIsConnected] = useState(false);
  const [isInstalled, setIsInstalled] = useState(true); // Default to true to avoid flicker
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [metrics, setMetrics] = useState<TrainingMetrics[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isTraining, setIsTraining] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const inferenceCallbackRef = useRef<((response: string) => void) | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const status = await invoke<EngineStatus>('get_engine_status');
      setIsInstalled(status.installed);
      return status;
    } catch (err) {
      console.error('Failed to get engine status:', err);
      return null;
    }
  }, []);

  const setup = useCallback(async () => {
    setIsBootstrapping(true);
    setStatusMessage('Bootstrapping AI engine... This may take a few minutes.');
    try {
      await invoke('setup_engine');
      setIsInstalled(true);
      setStatusMessage('Setup complete! Starting engine...');
      await invoke('restart_engine');
    } catch (err) {
      console.error('Setup failed:', err);
      setStatusMessage(`Setup failed: ${err}`);
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket('ws://localhost:9876');

    ws.onopen = () => {
      setIsConnected(true);
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
              setMetrics([]);
            } else if (msg.data.message.includes('complete') || msg.data.message.includes('Stopping')) {
              setIsTraining(false);
            }
            break;
          case 'metrics':
            setMetrics((prev) => {
              if (prev.length > 0 && prev[prev.length - 1].step === msg.data.step) {
                return prev;
              }
              return [...prev, msg.data];
            });
            break;
          case 'inference_result':
            if (inferenceCallbackRef.current) {
              inferenceCallbackRef.current(msg.data.response);
              inferenceCallbackRef.current = null;
            }
            break;
          case 'dataset_loaded':
            setStatusMessage(`Dataset loaded: ${msg.data.message || 'Ready'}`);
            break;
          case 'export_complete':
            setStatusMessage(`Export complete: ${msg.data.output_path || 'Done'}`);
            break;
          case 'error':
            console.error('Engine error:', msg.data.message);
            setStatusMessage(`Error: ${msg.data.message}`);
            setIsTraining(false);
            if (inferenceCallbackRef.current) {
              inferenceCallbackRef.current(`[Error] ${msg.data.message}`);
              inferenceCallbackRef.current = null;
            }
            break;
        }
      } catch (err) {
        console.error('Failed to parse engine message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsTraining(false);
      // Only retry if marked as installed
      setTimeout(() => {
        checkStatus().then(status => {
           if (status?.installed) connect();
        });
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [checkStatus]);

  useEffect(() => {
    checkStatus().then(status => {
      if (status?.installed) {
        connect();
      }
    });
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, checkStatus]);

  const startTraining = useCallback((config: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'start_training', config }));
    } else {
      setStatusMessage("Error: Engine not connected. Is the Python server running?");
    }
  }, []);

  const stopTraining = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'stop_training' }));
    }
  }, []);

  const exportModel = useCallback((config: { format: string, output_path: string }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'export_model', config }));
      setStatusMessage(`Exporting model as ${config.format.toUpperCase()}...`);
    } else {
      setStatusMessage("Error: Engine not connected.");
    }
  }, []);

  const runInference = useCallback((prompt: string, callback: (response: string) => void) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      inferenceCallbackRef.current = callback;
      wsRef.current.send(JSON.stringify({ command: 'inference', config: { prompt } }));
    } else {
      callback("[Error] Engine not connected.");
    }
  }, []);

  const loadHfDataset = useCallback((datasetName: string, split?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setStatusMessage(`Loading dataset: ${datasetName}...`);
      wsRef.current.send(JSON.stringify({ command: 'load_hf_dataset', config: { dataset_name: datasetName, split: split || 'train' } }));
    } else {
      setStatusMessage("Error: Engine not connected.");
    }
  }, []);

  const previewData = useCallback((path: string, options?: { chunk_size?: number, overlap?: number }, onResult?: (data: any) => void) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Store temp listener for this one-off request
      const originalOnMessage = wsRef.current.onmessage;
      wsRef.current.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'preview_result') {
            if (onResult) onResult(msg.data);
            if (wsRef.current) wsRef.current.onmessage = originalOnMessage;
          } else {
             // Fallback to original for others
             if (originalOnMessage && wsRef.current) originalOnMessage.call(wsRef.current, e);
          }
        } catch (err) {
           if (originalOnMessage && wsRef.current) originalOnMessage.call(wsRef.current, e);
        }
      };
      
      wsRef.current.send(JSON.stringify({ 
        command: 'preview_data', 
        config: { path, ...options } 
      }));
    }
  }, []);

  return {
    isConnected,
    isInstalled,
    isBootstrapping,
    hardware,
    metrics,
    statusMessage,
    isTraining,
    startTraining,
    stopTraining,
    exportModel,
    runInference,
    loadHfDataset,
    previewData,
    setup,
    checkStatus,
  };
}
