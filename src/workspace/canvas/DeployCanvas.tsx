import { useState } from 'react';
import { Copy, Check, Globe, Code2, MessageSquare, Smartphone, Download, Loader2 } from 'lucide-react';
import { useEngine } from '../../hooks/useEngine';

export default function DeployCanvas() {
  const [copied, setCopied] = useState<string | null>(null);
  const [exportingAs, setExportingAs] = useState<string | null>(null);
  
  const { metrics, statusMessage, exportModel } = useEngine();
  const isTrained = metrics.length > 0;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };
  
  const handleExport = (format: string) => {
    if (!isTrained) return;
    setExportingAs(format);
    exportModel({ format, output_path: `./output/export_${format}` });
    setTimeout(() => setExportingAs(null), 3500); // Simulate export UX reset
  };

  const apiEndpoint = 'http://localhost:9876/v1/chat/completions';
  const curlExample = `curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "What is CRISPR?"}]}'`;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {!isTrained && (
         <div className="p-3 rounded border border-amber-200 bg-amber-50 text-amber-800 text-xs mb-4">
           You have not completed a training run yet. Some deployment features require a trained model.
         </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {/* API Endpoint */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded" style={{ background: 'rgba(0, 113, 227, 0.08)' }}>
              <Code2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Local REST API</h3>
            <span className="ml-auto badge badge-green">Ready</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="ctrl-label">Endpoint</label>
              <div className="flex gap-1">
                <input className="ctrl-input text-xs font-mono flex-1" value={apiEndpoint} readOnly />
                <button
                  onClick={() => handleCopy('endpoint', apiEndpoint)}
                  className="p-1.5 rounded transition-colors hover:bg-[var(--bg-elevated)]"
                >
                  {copied === 'endpoint' ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            </div>

            <div>
              <label className="ctrl-label">cURL Example</label>
              <div className="relative">
                <pre
                  className="text-xs font-mono p-3 rounded overflow-x-auto leading-relaxed"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                >
                  {curlExample}
                </pre>
                <button
                  onClick={() => handleCopy('curl', curlExample)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-[var(--bg-elevated)]"
                >
                  {copied === 'curl' ? <Check className="w-3 h-3" style={{ color: 'var(--success)' }} /> : <Copy className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Widget Embed */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded" style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
              <MessageSquare className="w-4 h-4 text-indigo-500" />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Integrations</h3>
          </div>

          <div>
             <div className="space-y-2 mb-4">
              <button disabled className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer disabled:opacity-50">
                Generate Vercel AI SDK snippet
              </button>
              <button disabled className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer disabled:opacity-50">
                Generate LangChain setup
              </button>
            </div>
          </div>
        </div>

        {/* Model Weights */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded" style={{ background: 'rgba(40, 167, 69, 0.08)' }}>
              <Globe className="w-4 h-4" style={{ color: 'var(--success)' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Export Model Weights</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Export your fine-tuned weights for external inference engines.</p>
          <div className="space-y-2">
            <button 
               onClick={() => handleExport('gguf')}
               disabled={!isTrained || exportingAs !== null}
               className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer disabled:opacity-50 flex items-center justify-between"
            >
              <span>{exportingAs === 'gguf' ? 'Exporting...' : 'Export to GGUF (Ollama, llama.cpp)'}</span>
              {exportingAs === 'gguf' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3" />}
            </button>
            <button 
               onClick={() => handleExport('safetensors')}
               disabled={!isTrained || exportingAs !== null}
               className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer disabled:opacity-50 flex items-center justify-between"
            >
              <span>{exportingAs === 'safetensors' ? 'Exporting...' : 'Export to SafeTensors (vLLM)'}</span>
              {exportingAs === 'safetensors' ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3" />}
            </button>
          </div>
          {statusMessage.includes('Export') && (
            <p className="text-xs mt-3 text-blue-500 font-medium">{statusMessage}</p>
          )}
        </div>

        {/* Mobile SDK */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded" style={{ background: 'rgba(232, 163, 23, 0.08)' }}>
              <Smartphone className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Mobile CoreML</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Export for on-device iOS / Android execution.</p>
          <div className="space-y-2">
            <button disabled className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer disabled:opacity-50">
              Export to CoreML (Apple Neural Engine)
            </button>
            <button disabled className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer disabled:opacity-50">
              Export to ONNX (Android / Web)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
