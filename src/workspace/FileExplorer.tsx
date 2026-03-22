import { useState, useRef } from 'react';
import {
  FileText, FileSpreadsheet, FileImage, FileAudio, Globe,
  ChevronRight, ChevronDown, FolderOpen, Plus, Search, Trash2
} from 'lucide-react';
import type { WorkspaceTab } from '../App';

interface FileExplorerProps {
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  activeTab: WorkspaceTab;
}

export interface LocalFile {
  name: string;
  type: string;
  size: string;
  rawSize: number;
  status: 'ready' | 'processing' | 'error';
  fileObj?: File;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  csv: FileSpreadsheet,
  docx: FileText,
  txt: FileText,
  json: FileText,
  jsonl: FileText,
  image: FileImage,
  audio: FileAudio,
  url: Globe,
};

export default function FileExplorer({ selectedFile, setSelectedFile }: FileExplorerProps) {
  const [files, setFiles] = useState<LocalFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(f => {
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
    }
    // Reset input so the same file can be selected again if it was deleted
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setFiles(prev => prev.filter(f => f.name !== name));
    if (selectedFile === name) {
      setSelectedFile(null);
    }
  };

  const totalSize = formatSize(files.reduce((acc, f) => acc + f.rawSize, 0));

  return (
    <div className="h-full flex flex-col panel">
      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
      />

      {/* Header */}
      <div className="panel-header">
        <span className="panel-header-title">Files</span>
        <div className="flex gap-1">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors"
            title="Add Files"
          >
            <Plus className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </button>
          <button className="p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors">
            <Search className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Project Root */}
      <div className="panel-body flex-1 overflow-y-auto">
        <div className="mb-2">
          <div className="list-item font-medium text-xs">
            <ChevronDown className="w-3 h-3 mr-1" style={{ color: 'var(--text-muted)' }} />
            <FolderOpen className="w-3.5 h-3.5 mr-2" style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-primary)' }}>local-dataset</span>
          </div>
        </div>

        {/* File List */}
        <div className="ml-3 space-y-0.5">
          {files.length === 0 ? (
            <div className="py-4 text-center px-4">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No files uploaded.</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Click to add files
              </button>
            </div>
          ) : (
            files.map((file) => {
              const Icon = FILE_ICONS[file.type] || FileText;
              const isSelected = selectedFile === file.name;

              return (
                <div
                  key={file.name}
                  onClick={() => setSelectedFile(file.name)}
                  className={`list-item text-xs group flex items-center justify-between ${isSelected ? 'active' : ''}`}
                >
                  <div className="flex items-center truncate min-w-0 pr-2">
                    <ChevronRight className={`w-2.5 h-2.5 mr-1 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                    <Icon className="w-3.5 h-3.5 mr-2 flex-shrink-0" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />
                    <span className="truncate">{file.name}</span>
                  </div>

                  <div className="flex items-center flex-shrink-0">
                    {/* Status dot */}
                    {file.status === 'processing' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 live-dot ml-2" />
                    )}
                    {file.status === 'error' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 ml-2" />
                    )}
                    <button 
                      onClick={(e) => removeFile(e, file.name)}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 ml-1 transition-opacity`}
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-auto pt-3 border-t p-3 flex-shrink-0" style={{ borderColor: 'var(--border-panel)' }}>
        <div className="text-xs space-y-1.5" style={{ color: 'var(--text-muted)' }}>
          <div className="flex justify-between">
            <span>Files</span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{files.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Size</span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{totalSize}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
