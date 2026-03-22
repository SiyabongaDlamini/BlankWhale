import type { WorkspaceTab, TrainingConfig } from '../App';
import type { LocalFile } from './FileExplorer';
import type { useEngine } from '../hooks/useEngine';

const BASE_MODELS = [
  { id: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0', name: 'TinyLlama 1.1B', size: '~2 GB' },
  { id: 'meta-llama/Llama-3.1-8B', name: 'Llama 3.1 8B', size: '~16 GB' },
  { id: 'mistralai/Mistral-7B-v0.3', name: 'Mistral 7B v0.3', size: '~14 GB' },
  { id: 'google/gemma-2-9b', name: 'Gemma 2 9B', size: '~18 GB' },
  { id: 'microsoft/phi-3-mini-4k-instruct', name: 'Phi-3 Mini', size: '~8 GB' },
];

const STRATEGIES = [
  { id: 'lora', name: 'LoRA (Recommended)' },
  { id: 'qlora', name: 'QLoRA (4-bit)' },
  { id: 'full', name: 'Full Fine-tune' },
];

interface InspectorProps {
  activeTab: WorkspaceTab;
  selectedFile: string | null;
  files?: LocalFile[];
  trainConfig: TrainingConfig;
  setTrainConfig: React.Dispatch<React.SetStateAction<TrainingConfig>>;
  engine: ReturnType<typeof useEngine>;
}

export default function Inspector({ activeTab, selectedFile, files = [], trainConfig, setTrainConfig, engine }: InspectorProps) {
  const { hardware, metrics, isTraining } = engine;
  const fileMeta = files.find(f => f.name === selectedFile);

  const isTrained = metrics.length > 0;
  const finalLoss = isTrained ? metrics[metrics.length - 1].loss.toFixed(4) : '—';

  const updateConfig = <K extends keyof TrainingConfig>(key: K, value: TrainingConfig[K]) => {
    setTrainConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full flex flex-col panel">
      <div className="panel-header">
        <span className="panel-header-title">Properties</span>
      </div>

      <div className="panel-body flex-1 space-y-4 overflow-y-auto">
        {activeTab === 'data' && selectedFile && fileMeta && (
          <>
            <Section title="File Info">
              <PropRow label="Name" value={fileMeta.name} />
              <PropRow label="Type" value={fileMeta.type.toUpperCase()} />
              <PropRow label="Size" value={fileMeta.size} />
              <PropRow label="Encoding" value="UTF-8" />
            </Section>
            <Section title="Processing">
              <PropRow label="Status" value={fileMeta.status} badgeColor={fileMeta.status === 'ready' ? 'green' : 'amber'} />
            </Section>
          </>
        )}

        {activeTab === 'prepare' && (
          <Section title="Tokenizer">
            <div className="space-y-3">
              <div>
                <label className="ctrl-label">Tokenizer Type</label>
                <select className="ctrl-input text-xs">
                  <option>BPE (Byte Pair Encoding)</option>
                  <option>WordPiece</option>
                  <option>SentencePiece</option>
                  <option>Tiktoken (GPT-4)</option>
                </select>
              </div>
            </div>
          </Section>
        )}

        {activeTab === 'train' && (
          <>
            <Section title="Model">
              <div className="space-y-3">
                <div>
                  <label className="ctrl-label">Base Model</label>
                  <select
                    className="ctrl-input text-xs"
                    value={trainConfig.baseModel}
                    onChange={e => updateConfig('baseModel', e.target.value)}
                    disabled={isTraining}
                  >
                    {BASE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.size})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="ctrl-label">Strategy</label>
                  <select
                    className="ctrl-input text-xs"
                    value={trainConfig.strategy}
                    onChange={e => updateConfig('strategy', e.target.value)}
                    disabled={isTraining}
                  >
                    {STRATEGIES.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Section>
            <Section title="Hyperparameters">
              <div className="space-y-3">
                <div>
                  <label className="ctrl-label">Epochs</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="1" max="20" value={trainConfig.epochs} onChange={e => updateConfig('epochs', +e.target.value)} className="flex-1" disabled={isTraining} />
                    <span className="text-xs font-mono w-6 text-right" style={{ color: 'var(--accent)' }}>{trainConfig.epochs}</span>
                  </div>
                </div>
                <div>
                  <label className="ctrl-label">Learning Rate</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0.00001" max="0.01" step="0.00001" value={trainConfig.learningRate} onChange={e => updateConfig('learningRate', +e.target.value)} className="flex-1" disabled={isTraining} />
                    <span className="text-xs font-mono w-16 text-right" style={{ color: 'var(--accent)' }}>{trainConfig.learningRate.toFixed(5)}</span>
                  </div>
                </div>
                <div>
                  <label className="ctrl-label">Batch Size</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="1" max="64" value={trainConfig.batchSize} onChange={e => updateConfig('batchSize', +e.target.value)} className="flex-1" disabled={isTraining} />
                    <span className="text-xs font-mono w-6 text-right" style={{ color: 'var(--accent)' }}>{trainConfig.batchSize}</span>
                  </div>
                </div>
              </div>
            </Section>
            <Section title="Compute">
              <PropRow label="GPU" value={hardware?.gpu_available ? (hardware.gpu_name || 'GPU') : 'CPU'} />
              <PropRow label="RAM" value={hardware ? `${hardware.ram_gb} GB` : '—'} mono />
              <PropRow label="Device" value={hardware?.device?.toUpperCase() || '—'} />
            </Section>
          </>
        )}

        {activeTab === 'evaluate' && (
          <>
            <Section title="Model Status">
              <PropRow label="Status" value={isTrained ? 'Trained' : 'No Model'} badgeColor={isTrained ? 'green' : 'amber'} />
              <PropRow label="Final Loss" value={finalLoss} mono />
              <PropRow label="Training Data" value={`${files.length} files`} />
            </Section>
          </>
        )}

        {activeTab === 'deploy' && (
          <>
            <Section title="Local API">
              <PropRow label="Status" value={engine.isConnected ? 'Engine Ready' : 'Offline'} badgeColor={engine.isConnected ? 'green' : 'red'} />
              <PropRow label="URL" value="localhost:9876" />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PropRow({ label, value, mono, badge, badgeColor }: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: string;
  badgeColor?: 'green' | 'amber' | 'red';
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-center gap-1.5">
        {badge && <span className="badge badge-blue">{badge}</span>}
        {badgeColor && !badge && <div className={`w-1.5 h-1.5 rounded-full ${badgeColor === 'green' ? 'bg-emerald-500' : badgeColor === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} />}
        <span className={mono ? 'font-mono' : ''} style={{ color: 'var(--text-secondary)' }}>
          {value}
        </span>
      </div>
    </div>
  );
}
