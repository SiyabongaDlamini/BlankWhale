import { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, AlertTriangle, Trash2 } from 'lucide-react';
import type { WorkspaceTab } from '../App';

interface ConsolePanelProps {
  activeTab: WorkspaceTab;
}

interface LogEntry {
  time: string;
  type: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

const INITIAL_LOGS: LogEntry[] = [
  { time: '00:00:01', type: 'info', message: '[system] BlankWhale v2.0 initialized' },
  { time: '00:00:01', type: 'info', message: '[system] GPU cluster connected — 8× A100 80GB allocated' },
  { time: '00:00:02', type: 'success', message: '[data] Loaded 8 files (13.7 MB total)' },
  { time: '00:00:02', type: 'info', message: '[data] Auto-cleaning pipeline started...' },
  { time: '00:00:03', type: 'success', message: '[data] medical_notes.pdf — 18,432 tokens extracted' },
  { time: '00:00:03', type: 'success', message: '[data] patient_data.csv — 6,210 tokens extracted' },
  { time: '00:00:04', type: 'success', message: '[data] research_paper.pdf — 42,100 tokens extracted' },
  { time: '00:00:04', type: 'warn', message: '[clean] clinical_trials.docx — 2 broken text segments repaired' },
  { time: '00:00:05', type: 'success', message: '[data] drug_interactions.json — 2,150 tokens extracted' },
  { time: '00:00:05', type: 'info', message: '[tokenizer] BPE tokenizer loaded (vocab_size=32000)' },
  { time: '00:00:06', type: 'success', message: '[prepare] Chunking complete — 162 chunks @ avg 511 tokens' },
  { time: '00:00:06', type: 'info', message: '[system] Workspace ready. Total: 82,782 tokens across 8 files.' },
];

const TYPE_COLORS: Record<string, string> = {
  info: 'var(--text-muted)',
  success: 'var(--success)',
  warn: 'var(--warning)',
  error: 'var(--error)',
};

export default function ConsolePanel({ activeTab }: ConsolePanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [consoleTab, setConsoleTab] = useState<'console' | 'activity' | 'gpu'>('console');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Add a log when switching workspace tabs
  useEffect(() => {
    const msg = `[nav] Switched to ${activeTab.toUpperCase()} workspace`;
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString('en', { hour12: false }),
      type: 'info',
      message: msg,
    }]);
  }, [activeTab]);

  return (
    <div className="h-full flex flex-col panel">
      {/* Header with sub-tabs */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConsoleTab('console')}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${consoleTab === 'console' ? '' : ''}`}
            style={{ color: consoleTab === 'console' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Terminal className="w-3 h-3" /> Console
          </button>
          <button
            onClick={() => setConsoleTab('activity')}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: consoleTab === 'activity' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Activity className="w-3 h-3" /> Activity
          </button>
          <button
            onClick={() => setConsoleTab('gpu')}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: consoleTab === 'gpu' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <AlertTriangle className="w-3 h-3" /> GPU
          </button>
        </div>

        <button
          onClick={() => setLogs([])}
          className="p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors"
          title="Clear"
        >
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

      {/* Activity */}
      {consoleTab === 'activity' && (
        <div className="flex-1 overflow-y-auto p-3 text-xs space-y-2">
          {[
            { action: 'Uploaded 8 files', time: '2m ago', status: 'done' },
            { action: 'Auto-cleaning pipeline', time: '1m ago', status: 'done' },
            { action: 'BPE tokenization', time: '45s ago', status: 'done' },
            { action: 'Embedding generation', time: 'now', status: 'running' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg-surface)' }}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.status === 'running' ? 'bg-blue-500 live-dot' : 'bg-emerald-500'}`} />
                <span style={{ color: 'var(--text-secondary)' }}>{item.action}</span>
              </div>
              <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{item.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* GPU Monitor */}
      {consoleTab === 'gpu' && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
              const usage = Math.floor(Math.random() * 40) + 30;
              const temp = Math.floor(Math.random() * 15) + 55;
              return (
                <div key={i} className="stat-card">
                  <div className="stat-label">GPU {i}</div>
                  <div className="flex items-end gap-1">
                    <span className="stat-value text-sm">{usage}%</span>
                    <span className="text-xs font-mono mb-0.5" style={{ color: temp > 65 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {temp}°C
                    </span>
                  </div>
                  <div className="h-1 rounded-full mt-2" style={{ background: 'var(--bg-workspace)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${usage}%`, background: usage > 70 ? 'var(--warning)' : 'var(--accent)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
