import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Square, RotateCcw } from 'lucide-react';

interface DataPoint {
  step: number;
  loss: number;
  valLoss: number;
  lr: number;
}

export default function TrainCanvas() {
  const [isTraining, setIsTraining] = useState(false);
  const [data, setData] = useState<DataPoint[]>([]);
  const [epoch, setEpoch] = useState(0);
  const [currentLoss, setCurrentLoss] = useState(2.8);
  const [tokensProcessed, setTokensProcessed] = useState(0);

  useEffect(() => {
    if (!isTraining) return;

    const interval = setInterval(() => {
      setData(prev => {
        const step = prev.length;
        const loss = Math.max(0.3, 2.8 * Math.exp(-step * 0.035) + (Math.random() - 0.5) * 0.08);
        const valLoss = Math.max(0.4, 2.9 * Math.exp(-step * 0.03) + (Math.random() - 0.5) * 0.12);
        const lr = 0.0003 * Math.max(0.1, 1 - step / 120);
        setCurrentLoss(loss);
        setEpoch(Math.floor(step / 24) + 1);
        setTokensProcessed(prev2 => prev2 + Math.floor(Math.random() * 500 + 300));
        return [...prev, { step, loss: +loss.toFixed(4), valLoss: +valLoss.toFixed(4), lr }];
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isTraining]);

  const reset = () => {
    setIsTraining(false);
    setData([]);
    setEpoch(0);
    setCurrentLoss(2.8);
    setTokensProcessed(0);
  };

  const progress = Math.min(100, (data.length / 120) * 100);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="flex items-center gap-3 p-3 border-b flex-shrink-0" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}>
        <button
          onClick={() => setIsTraining(!isTraining)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
          style={{
            background: isTraining ? 'rgba(220, 53, 69, 0.08)' : 'rgba(0, 113, 227, 0.08)',
            color: isTraining ? 'var(--error)' : 'var(--accent)',
          }}
        >
          {isTraining ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isTraining ? 'Stop' : 'Start Training'}
        </button>
        <button onClick={reset} className="p-1.5 rounded hover:bg-[var(--bg-surface)]" title="Reset">
          <RotateCcw className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>

        <div className="ml-auto flex items-center gap-6 text-xs font-mono">
          <span style={{ color: 'var(--text-muted)' }}>Epoch <span style={{ color: 'var(--text-primary)' }}>{epoch}/5</span></span>
          <span style={{ color: 'var(--text-muted)' }}>Loss <span style={{ color: currentLoss < 1 ? 'var(--success)' : currentLoss < 2 ? 'var(--warning)' : 'var(--error)' }}>{currentLoss.toFixed(4)}</span></span>
          <span style={{ color: 'var(--text-muted)' }}>Tokens <span style={{ color: 'var(--accent)' }}>{tokensProcessed.toLocaleString()}</span></span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 flex-shrink-0" style={{ background: 'var(--bg-surface)' }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, var(--accent), var(--success))`,
          }}
        />
      </div>

      {/* Live Chart */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full rounded-lg p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
          {data.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Press Start Training to begin</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Loss curve will appear here in real‑time</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  stroke="var(--border-panel)"
                  label={{ value: 'Step', position: 'insideBottom', offset: -5, fontSize: 10, fill: 'var(--text-muted)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  stroke="var(--border-panel)"
                  domain={[0, 3]}
                  label={{ value: 'Loss', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: 'var(--text-muted)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-panel)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="loss"
                  stroke="#0071e3"
                  strokeWidth={2}
                  dot={false}
                  name="Train Loss"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="valLoss"
                  stroke="#a78bfa"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Val Loss"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 p-3 flex-shrink-0">
        {[
          { label: 'Learning Rate', value: data.length > 0 ? data[data.length - 1].lr.toExponential(2) : '3.00e-4' },
          { label: 'GPU Memory', value: '62.4 / 80 GB' },
          { label: 'Throughput', value: `${Math.floor(Math.random() * 200 + 800)} tok/s` },
          { label: 'ETA', value: progress >= 100 ? 'Done' : `${Math.max(0, Math.floor((120 - data.length) * 0.3))}s` },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value text-sm">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
