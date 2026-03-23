import { UploadCloud, FileText, FileSpreadsheet, Eye, Trash2, Database } from 'lucide-react';
import type { LocalFile } from '../FileExplorer';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { useRef, useState } from 'react';
import type { useEngine } from '../../hooks/useEngine';

interface DataCanvasProps {
  files: LocalFile[];
  setFiles: React.Dispatch<React.SetStateAction<LocalFile[]>>;
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  engine: ReturnType<typeof useEngine>;
}

export default function DataCanvas({ files, setFiles, selectedFile, setSelectedFile, engine }: DataCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hfInput, setHfInput] = useState('');
  const [showHfModal, setShowHfModal] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFiles = async (fileList?: FileList | File[]) => {
    // If we have a fileList (from drop), we try to get paths if possible, 
    // but better to use the native dialog for all "Upload" actions in Tauri.
    
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Data Files',
          extensions: ['txt', 'csv', 'json', 'jsonl', 'pdf']
        }]
      });

      if (selected && Array.isArray(selected)) {
        for (const filePath of selected) {
          const fileName = filePath.split('/').pop() || 'unknown';
          const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
          
          // Copy to local data directory
          try {
            const content = await readFile(filePath);
            await mkdir('data', { recursive: true });
            await writeFile(`data/${fileName}`, content);
            
            setFiles(prev => {
              if (prev.find(f => f.name === fileName)) return prev;
              return [...prev, {
                name: fileName,
                type: ext,
                size: formatSize(content.length),
                rawSize: content.length,
                status: 'ready' as const,
              }];
            });
          } catch (err) {
            console.error(`Failed to copy file ${fileName}:`, err);
          }
        }
      } else if (selected && typeof selected === 'string') {
          // Single file
          const filePath = selected;
          const fileName = filePath.split('/').pop() || 'unknown';
          const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
          const content = await readFile(filePath);
          await mkdir('data', { recursive: true });
          await writeFile(`data/${fileName}`, content);
          
          setFiles(prev => {
            if (prev.find(f => f.name === fileName)) return prev;
            return [...prev, {
              name: fileName,
              type: ext,
              size: formatSize(content.length),
              rawSize: content.length,
              status: 'ready' as const,
            }];
          });
      }
    } catch (err) {
      console.error('File dialog error:', err);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    // For drop, we might still get files but paths are limited in browser zone.
    // In Tauri v2, we should use the drag-drop event on the window, 
    // but for now, we'll prompt the user to use the click-to-browse if drop fails to give paths.
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       // Fallback to browse for now to ensure we get real paths/copying works
       handleFiles();
    }
  };

  const removeFile = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setFiles(prev => prev.filter(f => f.name !== name));
    if (selectedFile === name) {
      setSelectedFile(null);
    }
  };

  const handleHfLoad = () => {
    if (!hfInput.trim()) return;
    engine.loadHfDataset(hfInput.trim());
    // Add a placeholder file entry so user sees it
    setFiles(prev => [...prev, {
      name: `hf://${hfInput.trim()}`,
      type: 'jsonl',
      size: 'Downloading...',
      rawSize: 0,
      status: 'processing' as const,
    }]);
    setShowHfModal(false);
    setHfInput('');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }} 
        className="hidden" 
      />

      {/* Upload Dropzone */}
      <div className="flex gap-3 m-3 mb-0 flex-shrink-0">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all hover:border-[var(--accent)] group"
          style={{ borderColor: 'var(--border-panel)', background: 'var(--bg-panel)' }}
        >
          <UploadCloud className="w-8 h-8 mx-auto mb-2 group-hover:text-blue-500 transition-colors" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Drop files here or <span style={{ color: 'var(--accent)' }} className="underline underline-offset-2">browse</span>
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            CSV, TXT, JSONL, JSON
          </p>
        </div>

        {/* HuggingFace Button */}
        <div
          onClick={() => setShowHfModal(true)}
          className="w-48 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all hover:border-[var(--accent)] group"
          style={{ borderColor: 'var(--border-panel)', background: 'var(--bg-panel)' }}
        >
          <Database className="w-8 h-8 mx-auto mb-2 group-hover:text-blue-500 transition-colors" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>HuggingFace</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Load dataset</p>
        </div>
      </div>

      {/* HuggingFace Modal */}
      {showHfModal && (
        <div className="mx-3 mt-3 p-4 rounded-lg border flex-shrink-0" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Load HuggingFace Dataset</h3>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Enter a dataset name from huggingface.co/datasets</p>
          <div className="flex gap-2">
            <input
              value={hfInput}
              onChange={e => setHfInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleHfLoad()}
              placeholder="e.g. tatsu-lab/alpaca"
              className="ctrl-input flex-1 text-xs"
            />
            <button
              onClick={handleHfLoad}
              disabled={!hfInput.trim() || !engine.isConnected}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={{ background: hfInput.trim() ? 'var(--accent)' : 'var(--bg-surface)', color: hfInput.trim() ? '#fff' : 'var(--text-muted)' }}
            >
              Load
            </button>
            <button
              onClick={() => setShowHfModal(false)}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
          {!engine.isConnected && (
            <p className="text-xs mt-2" style={{ color: 'var(--error)' }}>Engine must be running to load datasets</p>
          )}
          <div className="flex gap-2 mt-3">
            {['tatsu-lab/alpaca', 'OpenAssistant/oasst1', 'databricks/dolly-15k'].map(name => (
              <button key={name} onClick={() => setHfInput(name)} className="px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Table */}
      <div className="flex-1 overflow-y-auto m-3">
        {files.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 border rounded-lg" style={{ borderColor: 'var(--border-panel)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No datasets added yet. Upload files or load from HuggingFace.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                {['File', 'Type', 'Size', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const isSelected = selectedFile === file.name;
                const Icon = file.type === 'csv' || file.type === 'xlsx' ? FileSpreadsheet : FileText;
                return (
                  <tr
                    key={file.name}
                    onClick={() => setSelectedFile(file.name)}
                    className="border-b cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--border-subtle)', background: isSelected ? 'rgba(0, 113, 227, 0.06)' : 'transparent' }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.background = 'var(--bg-surface)'); }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.background = 'transparent'); }}
                  >
                    <td className="py-2 px-3 max-w-[200px] truncate">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />
                        <span className="truncate font-medium" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }} title={file.name}>{file.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3"><span className="badge badge-blue uppercase">{file.type}</span></td>
                    <td className="py-2 px-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{file.size}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${file.status === 'ready' ? 'bg-emerald-400' : file.status === 'error' ? 'bg-red-400' : 'bg-amber-400 live-dot'}`} />
                        <span style={{ color: file.status === 'ready' ? 'var(--success)' : file.status === 'error' ? 'var(--error)' : 'var(--warning)' }}>{file.status}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded hover:bg-[var(--bg-elevated)]" title="Preview"><Eye className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} /></button>
                        <button className="p-1.5 rounded hover:bg-red-500/10" onClick={(e) => removeFile(e, file.name)} title="Remove"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
