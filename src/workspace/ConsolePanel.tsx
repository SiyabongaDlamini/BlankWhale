import { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, Cpu, Trash2 } from 'lucide-react';
import type { WorkspaceTab } from '../App';
import type { useEngine } from '../hooks/useEngine';

interface ConsolePanelProps {
  activeTab: WorkspaceTab;
  engine: ReturnType<typeof useEngine>;
}

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

const TYPE_COLORS: Record<string, string> = {
  info: 'var(--text-muted)',
  success: 'var(--success)',
  warn: 'var(--warning)',
  error: 'var(--error)',
};

export default function ConsolePanel({ activeTab, engine }: ConsolePanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: new Date().toLocaleTimeString('en', { hour12: false }), type: 'info', message: '[system] BlankWhale initialized — waiting for engine...' },
  ]);
  const [consoleTab, setConsoleTab] = useState<'console' | 'activity' | 'gpu'>('console');
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevStatus = useRef<string>('');
  const prevConnected = useRef<boolean>(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Log when connection changes
  useEffect(() => {
    if (engine.isConnected !== prevConnected.current) {
      prevConnected.current = engine.isConnected;
      const now = new Date().toLocaleTimeString('en', { hour12: false });
      if (engine.isConnected) {
        setLogs(prev => [...prev, { time: now, type: 'success', message: '[engine] Connected to Python training engine on ws://localhost:9876' }]);
      } else {
        setLogs(prev => [...prev, { time: now, type: 'warn', message: '[engine] Disconnected — will retry in 3s...' }]);
      }
    }
  }, [engine.isConnected]);

  // Log engine status messages
  useEffect(() => {
    if (engine.statusMessage && engine.statusMessage !== prevStatus.current) {
      prevStatus.current = engine.statusMessage;
      const now = new Date().toLocaleTimeString('en', { hour12: false });
      const isError = engine.statusMessage.startsWith('Error');
      setLogs(prev => [...prev, {
        time: now,
        type: isError ? 'error' : 'info',
        message: `[engine] ${engine.statusMessage}`
      }]);
    }
  }, [engine.statusMessage]);

  // Log training metrics periodically (every 10 steps)
  useEffect(() => {
    if (engine.metrics.length > 0 && engine.metrics.length % 10 === 0) {
      const m = engine.metrics[engine.metrics.length - 1];
      const now = new Date().toLocaleTimeString('en', { hour12: false });
      setLogs(prev => [...prev, {
        time: now,
        type: 'info',
        message: `[train] step=${m.step} loss=${m.loss.toFixed(4)} lr=${m.learning_rate?.toExponential(2) || '-'}`
      }]);
    }
  }, [engine.metrics.length]);

  // Log tab switches
  useEffect(() => {
    const now = new Date().toLocaleTimeString('en', { hour12: false });
    setLogs(prev => [...prev, { time: now, type: 'info', message: `[nav] Switched to ${activeTab.toUpperCase()} workspace` }]);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col panel">
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <button onClick={() => setConsoleTab('console')} className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: consoleTab === 'console' ? 'var(--accent)' : 'var(--text-muted)' }}>
            <Terminal className="w-3 h-3" /> Console
          </button>
          <button onClick={() => setConsoleTab('activity')} className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: consoleTab === 'activity' ? 'var(--accent)' : 'var(--text-muted)' }}>
            <Activity className="w-3 h-3" /> Activity
          </button>
          <button onClick={() => setConsoleTab('gpu')} className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: consoleTab === 'gpu' ? 'var(--accent)' : 'var(--text-muted)' }}>
            <Cpu className="w-3 h-3" /> Hardware
          </button>
        </div>
        <button onClick={() => setLogs([])} className="p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors" title="Clear">
          <Trash2 className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Console Output */}
      {consoleTab === 'console' && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs leading-relaxed" style={{ background: 'var(--bg-panel)' }}>
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2 py-0.5 hover:bg-[var(--bg-surface)] px-1 rounded">
              <span style={{ color: 'var(--text-muted)' }} className="flex-shrink-0 w-16">{log.time}</span>
              <span style={{ color: TYPE_COLORS[log.type] }}>{log.message}</span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>Console cleared</div>
          )}
        </div>
      )}

      {/* Activity — real events */}
      {consoleTab === 'activity' && (
        <div className="flex-1 overflow-y-auto p-3 text-xs space-y-2">
          <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-surface)' }}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${engine.isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span style={{ color: 'var(--text-secondary)' }}>Engine Connection</span>
            </div>
            <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{engine.isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {engine.isTraining && (
            <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-surface)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 live-dot" />
                <span style={{ color: 'var(--text-secondary)' }}>Training in progress</span>
              </div>
              <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                Step {engine.metrics.length > 0 ? engine.metrics[engine.metrics.length - 1].step : 0}
              </span>
            </div>
          )}
          {engine.metrics.length > 0 && !engine.isTraining && (
            <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-surface)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span style={{ color: 'var(--text-secondary)' }}>Training completed</span>
              </div>
              <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                Loss: {engine.metrics[engine.metrics.length - 1].loss.toFixed(4)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Hardware Monitor — real data */}
      {consoleTab === 'gpu' && (
        <div className="flex-1 overflow-y-auto p-3">
          {engine.hardware ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <div className="stat-label">Device</div>
                <div className="stat-value text-sm">{engine.hardware.device.toUpperCase()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">GPU</div>
                <div className="stat-value text-sm">{engine.hardware.gpu_available ? (engine.hardware.gpu_name || 'Available') : 'None'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">GPU Memory</div>
                <div className="stat-value text-sm">{engine.hardware.gpu_memory_gb ? `${engine.hardware.gpu_memory_gb} GB` : '—'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">System RAM</div>
                <div className="stat-value text-sm">{engine.hardware.ram_gb} GB</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Waiting for engine connection to detect hardware...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
