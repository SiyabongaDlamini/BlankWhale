import { useState } from 'react';
import type { WorkspaceTab } from '../App';
import type { LocalFile } from './FileExplorer';

interface InspectorProps {
  activeTab: WorkspaceTab;
  selectedFile: string | null;
  files?: LocalFile[];
}

export default function Inspector({ activeTab, selectedFile, files = [] }: InspectorProps) {
  const [epochs, setEpochs] = useState(5);
  const [lr, setLr] = useState(0.0003);
  const [batchSize, setBatchSize] = useState(16);

  const fileMeta = files.find(f => f.name === selectedFile);

  return (
    <div className="h-full flex flex-col panel">
      <div className="panel-header">
        <span className="panel-header-title">Properties</span>
      </div>

      <div className="panel-body flex-1 space-y-4">
        {activeTab === 'data' && selectedFile && fileMeta && (
          <>
            <Section title="File Info">
              <PropRow label="Name" value={fileMeta.name} />
              <PropRow label="Type" value={fileMeta.type.toUpperCase()} />
              <PropRow label="Size" value={fileMeta.size} />
              <PropRow label="Encoding" value="UTF-8" />
              <PropRow label="Language" value="auto" badge="auto" />
            </Section>
            <Section title="Processing">
              <PropRow label="Status" value={fileMeta.status} badgeColor={fileMeta.status === 'ready' ? 'green' : 'amber'} />
              <PropRow label="Tokens" value="—" mono />
              <PropRow label="Chunks" value="—" mono />
              <PropRow label="Duplicates" value="0 found" />
            </Section>
            <Section title="Auto Cleaning">
              <PropRow label="Encoding Fix" value="Applied" badgeColor="green" />
              <PropRow label="Whitespace" value="Normalized" badgeColor="green" />
            </Section>
          </>
        )}

        {activeTab === 'prepare' && (
          <>
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
                <div>
                  <label className="ctrl-label">Chunk Size</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="128" max="2048" step="64" defaultValue={512} className="flex-1" />
                    <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--accent)' }}>512</span>
                  </div>
                </div>
                <div>
                  <label className="ctrl-label">Overlap</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0" max="256" step="16" defaultValue={64} className="flex-1" />
                    <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--accent)' }}>64</span>
                  </div>
                </div>
              </div>
            </Section>
            <Section title="Stats">
              <PropRow label="Total Tokens" value="82,782" mono />
              <PropRow label="Total Chunks" value="162" mono />
              <PropRow label="Avg. Chunk" value="511 tokens" mono />
              <PropRow label="Est. Cost" value="$0.083" mono />
            </Section>
          </>
        )}

        {activeTab === 'train' && (
          <>
            <Section title="Model">
              <div className="space-y-3">
                <div>
                  <label className="ctrl-label">Base Model</label>
                  <select className="ctrl-input text-xs">
                    <option>Llama 3.1 8B</option>
                    <option>Mistral 7B v0.3</option>
                    <option>Gemma 2 9B</option>
                    <option>Phi-3 Mini</option>
                    <option>GPT-4o (Fine-tune)</option>
                  </select>
                </div>
                <div>
                  <label className="ctrl-label">Strategy</label>
                  <select className="ctrl-input text-xs">
                    <option>LoRA (Recommended)</option>
                    <option>QLoRA</option>
                    <option>Full Fine-tune</option>
                    <option>RAG Pipeline</option>
                  </select>
                </div>
              </div>
            </Section>
            <Section title="Hyperparameters">
              <div className="space-y-3">
                <div>
                  <label className="ctrl-label">Epochs</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="1" max="20" value={epochs} onChange={e => setEpochs(+e.target.value)} className="flex-1" />
                    <span className="text-xs font-mono w-6 text-right" style={{ color: 'var(--accent)' }}>{epochs}</span>
                  </div>
                </div>
                <div>
                  <label className="ctrl-label">Learning Rate</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0.00001" max="0.01" step="0.00001" value={lr} onChange={e => setLr(+e.target.value)} className="flex-1" />
                    <span className="text-xs font-mono w-16 text-right" style={{ color: 'var(--accent)' }}>{lr.toFixed(5)}</span>
                  </div>
                </div>
                <div>
                  <label className="ctrl-label">Batch Size</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="1" max="64" value={batchSize} onChange={e => setBatchSize(+e.target.value)} className="flex-1" />
                    <span className="text-xs font-mono w-6 text-right" style={{ color: 'var(--accent)' }}>{batchSize}</span>
                  </div>
                </div>
              </div>
            </Section>
            <Section title="Compute">
              <PropRow label="GPU" value="8x A100 80GB" />
              <PropRow label="VRAM Est." value="62.4 GB" mono />
              <PropRow label="Est. Time" value="~14 min" mono />
              <PropRow label="Est. Cost" value="$2.80" mono />
            </Section>
          </>
        )}

        {activeTab === 'evaluate' && (
          <>
            <Section title="Model Info">
              <PropRow label="Base" value="Llama 3.1 8B" />
              <PropRow label="Adapter" value="LoRA r=16" />
              <PropRow label="Parameters" value="8.03B" mono />
            </Section>
            <Section title="Benchmarks">
              <PropRow label="BLEU" value="0.847" mono />
              <PropRow label="ROUGE-L" value="0.912" mono />
              <PropRow label="Perplexity" value="4.21" mono />
              <PropRow label="F1 Score" value="0.893" mono />
            </Section>
          </>
        )}

        {activeTab === 'deploy' && (
          <>
            <Section title="Endpoint">
              <PropRow label="Status" value="Live" badgeColor="green" />
              <PropRow label="URL" value="api.blankwhale.ai/v1" />
              <PropRow label="Latency" value="120ms" mono />
              <PropRow label="Requests" value="1,284" mono />
            </Section>
            <Section title="Export">
              <div className="space-y-2">
                <button className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer">
                  Download GGUF Weights
                </button>
                <button className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer">
                  Copy API Endpoint
                </button>
                <button className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer">
                  Embed Chat Widget
                </button>
              </div>
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
