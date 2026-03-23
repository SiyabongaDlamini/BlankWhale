import { useState, useEffect } from 'react';
import type { LocalFile } from '../FileExplorer';


export default function PrepareCanvas({ files = [], engine }: { files?: LocalFile[], engine: any }) {
  const [chunkSize, setChunkSize] = useState(512);
  const [overlap, setOverlap] = useState(64);
  const [realText, setRealText] = useState('Please select a file on the left to preview its extracted text.');
  const [previewChunks, setPreviewChunks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const textFile = files.find(f => ['txt', 'csv', 'json', 'pdf'].includes(f.type));
    if (textFile && engine.isConnected) {
      setLoading(true);
      const path = textFile.name.includes('/') ? textFile.name : `./data/${textFile.name}`;
      
      engine.previewData(path, { chunk_size: chunkSize, overlap: overlap }, (result: any) => {
        if (result.chunks && result.chunks.length > 0) {
          setRealText(result.chunks.join('\n\n'));
          setPreviewChunks(result.chunks);
        }
        setLoading(false);
      });
    }
  }, [files, engine.isConnected, chunkSize, overlap]);

  const COLORS = [
    'rgba(34, 211, 238, 0.15)',
    'rgba(167, 139, 250, 0.15)',
    'rgba(52, 211, 153, 0.15)',
    'rgba(251, 191, 36, 0.15)',
    'rgba(248, 113, 113, 0.15)',
  ];

  return (
    <div className={`h-full flex flex-col overflow-hidden ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Controls Bar */}
      <div className="flex items-center gap-6 p-3 border-b flex-shrink-0" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Chunk Size</label>
          <input type="range" min={128} max={2048} step={64} value={chunkSize} onChange={e => setChunkSize(+e.target.value)} className="w-32" />
          <span className="text-xs font-mono w-12 text-right" style={{ color: 'var(--accent)' }}>{chunkSize}</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Overlap</label>
          <input type="range" min={0} max={256} step={16} value={overlap} onChange={e => setOverlap(+e.target.value)} className="w-32" />
          <span className="text-xs font-mono w-10 text-right" style={{ color: 'var(--accent)' }}>{overlap}</span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs font-mono">
          <span style={{ color: 'var(--text-muted)' }}>Preview Chunks: <span style={{ color: 'var(--text-primary)' }}>{previewChunks.length}</span></span>
          <span style={{ color: 'var(--text-muted)' }}>Preview Tokens: <span style={{ color: 'var(--accent)' }}>~{(previewChunks.length * chunkSize).toLocaleString()}</span></span>
        </div>
      </div>

      {/* Side-by-side view */}
      <div className="flex-1 grid grid-cols-2 overflow-hidden">
        {/* Original Text */}
        <div className="border-r overflow-y-auto" style={{ borderColor: 'var(--border-panel)' }}>
          <div className="p-2 border-b sticky top-0" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-panel)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Original Document Preview</span>
          </div>
          <div className="p-4">
            <p className="text-sm leading-relaxed font-mono whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
              {realText}
            </p>
          </div>
        </div>

        {/* Chunked View */}
        <div className="overflow-y-auto">
          <div className="p-2 border-b sticky top-0" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-panel)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Chunk Strategy Preview</span>
          </div>
          <div className="p-4 space-y-2">
            {previewChunks.length === 0 ? (
               <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No chunks generated yet.</div>
            ) : (
              previewChunks.map((chunk, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border text-sm font-mono leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: COLORS[idx % COLORS.length],
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Chunk {idx + 1}
                    </span>
                    <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
                      ~{Math.round(chunk.split(/\s+/).length * 1.3)} tokens
                    </span>
                  </div>
                  {chunk}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
