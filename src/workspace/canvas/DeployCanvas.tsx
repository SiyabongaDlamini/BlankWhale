import { useState } from 'react';
import { Copy, Check, Globe, Code2, MessageSquare, Smartphone } from 'lucide-react';

export default function DeployCanvas() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const apiEndpoint = 'https://api.blankwhale.ai/v1/models/medical-kb/chat';
  const curlExample = `curl -X POST ${apiEndpoint} \\
  -H "Authorization: Bearer bw_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "What is CRISPR?"}]}'`;

  const embedCode = `<script src="https://cdn.blankwhale.ai/widget.js"></script>
<script>
  BlankWhale.init({
    model: "medical-kb",
    theme: "light",
    position: "bottom-right"
  });
</script>`;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* API Endpoint */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded" style={{ background: 'rgba(0, 113, 227, 0.08)' }}>
              <Code2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>REST API</h3>
            <span className="ml-auto badge badge-green">Live</span>
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
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chat Widget</h3>
          </div>

          <div>
            <label className="ctrl-label">Embed Code</label>
            <div className="relative">
              <pre
                className="text-xs font-mono p-3 rounded overflow-x-auto leading-relaxed"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
              >
                {embedCode}
              </pre>
              <button
                onClick={() => handleCopy('embed', embedCode)}
                className="absolute top-2 right-2 p-1 rounded hover:bg-[var(--bg-elevated)]"
              >
                {copied === 'embed' ? <Check className="w-3 h-3" style={{ color: 'var(--success)' }} /> : <Copy className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />}
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
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Model Weights</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Download the fine-tuned adapter weights for local inference.</p>
          <div className="space-y-2">
            <button className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer">
              LoRA Adapter (GGUF) — 245 MB
            </button>
            <button className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer">
              Full Merged Model — 4.7 GB
            </button>
          </div>
        </div>

        {/* Mobile SDK */}
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded" style={{ background: 'rgba(232, 163, 23, 0.08)' }}>
              <Smartphone className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Mobile SDK</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>iOS and Android integration packages.</p>
          <div className="space-y-2">
            <button className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer">
              Swift Package — v2.0.1
            </button>
            <button className="w-full ctrl-input text-xs text-left hover:border-[var(--accent)] cursor-pointer">
              Kotlin SDK — v2.0.1
            </button>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="rounded-lg p-4" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Usage (Last 24h)</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Requests', value: '1,284' },
            { label: 'Avg Latency', value: '120ms' },
            { label: 'Tokens Served', value: '2.4M' },
            { label: 'Errors', value: '0' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value text-sm">{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
