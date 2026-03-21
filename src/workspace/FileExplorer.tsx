import {
  FileText, FileSpreadsheet, FileImage, FileAudio, Globe,
  ChevronRight, ChevronDown, FolderOpen, Plus, Search
} from 'lucide-react';
import type { WorkspaceTab } from '../App';

interface FileExplorerProps {
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  activeTab: WorkspaceTab;
}

interface MockFile {
  name: string;
  type: 'pdf' | 'csv' | 'docx' | 'txt' | 'json' | 'image' | 'audio' | 'url';
  size: string;
  tokens?: number;
  status: 'ready' | 'processing' | 'error';
}

const MOCK_FILES: MockFile[] = [
  { name: 'medical_notes.pdf', type: 'pdf', size: '2.4 MB', tokens: 18432, status: 'ready' },
  { name: 'patient_data.csv', type: 'csv', size: '840 KB', tokens: 6210, status: 'ready' },
  { name: 'research_paper.pdf', type: 'pdf', size: '5.1 MB', tokens: 42100, status: 'ready' },
  { name: 'clinical_trials.docx', type: 'docx', size: '1.2 MB', tokens: 9800, status: 'processing' },
  { name: 'drug_interactions.json', type: 'json', size: '320 KB', tokens: 2150, status: 'ready' },
  { name: 'xray_scan_01.png', type: 'image', size: '3.8 MB', status: 'ready' },
  { name: 'doctor_notes.txt', type: 'txt', size: '45 KB', tokens: 890, status: 'ready' },
  { name: 'pubmed.org/article/...', type: 'url', size: '—', tokens: 3200, status: 'ready' },
];

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  csv: FileSpreadsheet,
  docx: FileText,
  txt: FileText,
  json: FileText,
  image: FileImage,
  audio: FileAudio,
  url: Globe,
};

export default function FileExplorer({ selectedFile, setSelectedFile }: FileExplorerProps) {
  return (
    <div className="h-full flex flex-col panel">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-header-title">Files</span>
        <div className="flex gap-1">
          <button className="p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors">
            <Plus className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </button>
          <button className="p-1 rounded hover:bg-[var(--bg-elevated)] transition-colors">
            <Search className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      {/* Project Root */}
      <div className="panel-body flex-1">
        <div className="mb-2">
          <div className="list-item font-medium text-xs">
            <ChevronDown className="w-3 h-3 mr-1" style={{ color: 'var(--text-muted)' }} />
            <FolderOpen className="w-3.5 h-3.5 mr-2" style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-primary)' }}>medical-knowledge-base</span>
          </div>
        </div>

        {/* File List */}
        <div className="ml-3 space-y-0.5">
          {MOCK_FILES.map((file) => {
            const Icon = FILE_ICONS[file.type] || FileText;
            const isSelected = selectedFile === file.name;

            return (
              <div
                key={file.name}
                onClick={() => setSelectedFile(file.name)}
                className={`list-item text-xs group ${isSelected ? 'active' : ''}`}
              >
                <ChevronRight className="w-2.5 h-2.5 mr-1 opacity-0" />
                <Icon className="w-3.5 h-3.5 mr-2 flex-shrink-0" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />
                <span className="truncate flex-1">{file.name}</span>

                {/* Status dot */}
                {file.status === 'processing' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 live-dot ml-2 flex-shrink-0" />
                )}
                {file.status === 'error' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 ml-2 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-panel)' }}>
          <div className="text-xs space-y-1.5" style={{ color: 'var(--text-muted)' }}>
            <div className="flex justify-between">
              <span>Files</span>
              <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{MOCK_FILES.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Tokens</span>
              <span className="font-mono" style={{ color: 'var(--accent)' }}>82,782</span>
            </div>
            <div className="flex justify-between">
              <span>Size</span>
              <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>13.7 MB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
