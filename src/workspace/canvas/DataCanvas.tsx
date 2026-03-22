import { UploadCloud, FileText, FileSpreadsheet, Eye, Trash2 } from 'lucide-react';
import type { LocalFile } from '../FileExplorer';
import { useRef } from 'react';

interface DataCanvasProps {
  files: LocalFile[];
  setFiles: React.Dispatch<React.SetStateAction<LocalFile[]>>;
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
}

export default function DataCanvas({ files, setFiles, selectedFile, setSelectedFile }: DataCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFiles = (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList).map(f => {
      let ext = f.name.split('.').pop()?.toLowerCase() || 'txt';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) ext = 'image';
      if (['mp3', 'wav', 'ogg'].includes(ext)) ext = 'audio';

      return {
        name: f.name,
        type: ext,
        size: formatSize(f.size),
        rawSize: f.size,
        status: 'ready' as const,
        fileObj: f
      };
    });

    setFiles(prev => {
      const existingNames = new Set(prev.map(p => p.name));
      const filtered = newFiles.filter(nf => !existingNames.has(nf.name));
      return [...prev, ...filtered];
    });
    
    if (!selectedFile && newFiles.length > 0) {
      setSelectedFile(newFiles[0].name);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setFiles(prev => prev.filter(f => f.name !== name));
    if (selectedFile === name) {
      setSelectedFile(null);
    }
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
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="m-3 mb-0 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all hover:border-[var(--accent)] group flex-shrink-0"
        style={{ borderColor: 'var(--border-panel)', background: 'var(--bg-panel)' }}
      >
        <UploadCloud className="w-8 h-8 mx-auto mb-2 group-hover:text-blue-500 transition-colors" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Drop files here or <span style={{ color: 'var(--accent)' }} className="underline underline-offset-2">browse</span>
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          PDF, DOCX, CSV, TXT, JSON, Images, Audio, Web URLs
        </p>
      </div>

      {/* File Table */}
      <div className="flex-1 overflow-y-auto m-3">
        {files.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 border rounded-lg" style={{ borderColor: 'var(--border-panel)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No datasets added yet. Upload files to begin.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
                {['File', 'Type', 'Size', 'Status', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="text-left py-2 px-3 font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {h}
                  </th>
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
                    className={`border-b cursor-pointer transition-colors`}
                    style={{
                      borderColor: 'var(--border-subtle)',
                      background: isSelected ? 'rgba(0, 113, 227, 0.06)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.background = 'var(--bg-surface)'); }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.background = 'transparent'); }}
                  >
                    <td className="py-2 px-3 max-w-[200px] truncate">
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />
                        <span className="truncate font-medium" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }} title={file.name}>
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="badge badge-blue uppercase">{file.type}</span>
                    </td>
                    <td className="py-2 px-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{file.size}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${file.status === 'ready' ? 'bg-emerald-400' : file.status === 'error' ? 'bg-red-400' : 'bg-amber-400 live-dot'}`} />
                        <span style={{ color: file.status === 'ready' ? 'var(--success)' : file.status === 'error' ? 'var(--error)' : 'var(--warning)' }}>
                          {file.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity" style={{ opacity: isSelected ? 1 : undefined }}>
                        <button className="p-1.5 rounded hover:bg-[var(--bg-elevated)]" title="Preview">
                          <Eye className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <button 
                          className="p-1.5 rounded hover:bg-red-500/10" 
                          onClick={(e) => removeFile(e, file.name)}
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
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
