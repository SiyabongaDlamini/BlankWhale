import { useEngine } from '../../hooks/useEngine';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Play, Square, Cpu } from 'lucide-react';

export default function TrainCanvas() {
  const {
    isConnected,
    hardware,
    metrics,
    statusMessage,
    isTraining,
    startTraining,
    stopTraining
  } = useEngine();

  const handleStartStop = () => {
    if (isTraining) {
      stopTraining();
    } else {
      // In a real app, this config would come from the UI (YAML editor or visual controls)
      startTraining({
        base_model: "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        epochs: 3,
        batch_size: 4
      });
    }
  };

  const getLatestMetric = (key: 'loss' | 'learning_rate') => {
    if (metrics.length === 0) return null;
    return metrics[metrics.length - 1][key];
  };

  const currentLoss = getLatestMetric('loss') || 0;
  const currentLr = getLatestMetric('learning_rate') || 0;
  
  // Estimate total steps (this would normally come from the engine based on dataset size)
  const estimatedTotalSteps = metrics.length > 0 && metrics[0].total_steps ? metrics[0].total_steps : 100;
  
  const currentStep = metrics.length > 0 ? metrics[metrics.length - 1].step : 0;
  const currentEpoch = metrics.length > 0 ? metrics[metrics.length - 1].epoch : 0;
  
  const progress = isTraining ? Math.min(100, (currentStep / estimatedTotalSteps) * 100) : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="flex items-center gap-3 p-3 border-b flex-shrink-0" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}>
        <button
          onClick={handleStartStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
          style={{
            background: isTraining ? 'rgba(220, 53, 69, 0.08)' : 'rgba(0, 113, 227, 0.08)',
            color: isTraining ? 'var(--error)' : 'var(--accent)',
            opacity: !isConnected ? 0.5 : 1,
            cursor: !isConnected ? 'not-allowed' : 'pointer'
          }}
          disabled={!isConnected}
        >
          {isTraining ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isTraining ? 'Stop' : 'Start Training'}
        </button>

        <div className="text-xs flex items-center gap-2" style={{ color: isConnected ? 'var(--success)' : 'var(--error)' }}>
          <div className="w-2 h-2 rounded-full" style={{ background: 'currentColor' }} />
          {isConnected ? 'Engine Connected' : 'Engine Disconnected - Start Python Server'}
        </div>
        
        {statusMessage && (
          <div className="text-xs ml-4 max-w-md truncate" style={{ color: 'var(--text-muted)' }}>
            {statusMessage}
          </div>
        )}

        <div className="ml-auto flex items-center gap-6 text-xs font-mono">
          <span style={{ color: 'var(--text-muted)' }}>Epoch <span style={{ color: 'var(--text-primary)' }}>{currentEpoch.toFixed(2)}/3</span></span>
          <span style={{ color: 'var(--text-muted)' }}>Loss <span style={{ color: currentLoss < 1 ? 'var(--success)' : currentLoss < 2 ? 'var(--warning)' : 'var(--error)' }}>{currentLoss ? currentLoss.toFixed(4) : '-.----'}</span></span>
          <span style={{ color: 'var(--text-muted)' }}>Step <span style={{ color: 'var(--accent)' }}>{currentStep}</span></span>
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
          {metrics.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  {!isConnected ? "Waiting for engine connection..." : "Press Start Training to begin"}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Loss curve will appear here in real‑time</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
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
                  domain={['auto', 'auto']}
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
                  formatter={(value: number) => value.toFixed(4)}
                  labelFormatter={(step) => `Step: ${step}`}
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
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 p-3 flex-shrink-0">
        {[
          { label: 'Learning Rate', value: currentLr ? currentLr.toExponential(2) : '-' },
          { 
            label: 'Hardware', 
            value: hardware ? (
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {hardware.gpu_available ? (hardware.gpu_name?.slice(0, 15) || 'GPU') : 'CPU Only'}
              </span>
            ) : '-' 
          },
          { label: 'Platform', value: hardware ? `${hardware.device.toUpperCase()} (${hardware.ram_gb}GB RAM)` : '-' },
          { label: 'Progress', value: progress > 0 ? `${progress.toFixed(1)}%` : '-' },
        ].map(s => (
          <div key={s.label as string} className="stat-card">
            <div className="stat-label">{s.label as React.ReactNode}</div>
            <div className="stat-value text-sm">{s.value as React.ReactNode}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

