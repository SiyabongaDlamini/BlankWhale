import { UploadCloud, FileText, FileSpreadsheet, Eye, Trash2 } from 'lucide-react';

interface DataCanvasProps {
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
}

const FILES_DATA = [
  { name: 'medical_notes.pdf', type: 'PDF', size: '2.4 MB', tokens: 18432, chunks: 37, status: 'ready' as const },
  { name: 'patient_data.csv', type: 'CSV', size: '840 KB', tokens: 6210, chunks: 12, status: 'ready' as const },
  { name: 'research_paper.pdf', type: 'PDF', size: '5.1 MB', tokens: 42100, chunks: 84, status: 'ready' as const },
  { name: 'clinical_trials.docx', type: 'DOCX', size: '1.2 MB', tokens: 9800, chunks: 19, status: 'processing' as const },
  { name: 'drug_interactions.json', type: 'JSON', size: '320 KB', tokens: 2150, chunks: 4, status: 'ready' as const },
  { name: 'xray_scan_01.png', type: 'IMAGE', size: '3.8 MB', tokens: 0, chunks: 1, status: 'ready' as const },
  { name: 'doctor_notes.txt', type: 'TXT', size: '45 KB', tokens: 890, chunks: 2, status: 'ready' as const },
  { name: 'pubmed.org/article/...', type: 'URL', size: '—', tokens: 3200, chunks: 6, status: 'ready' as const },
];

export default function DataCanvas({ selectedFile, setSelectedFile }: DataCanvasProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Upload Dropzone */}
      <div
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
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border-panel)' }}>
              {['File', 'Type', 'Size', 'Tokens', 'Chunks', 'Status', ''].map(h => (
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
            {FILES_DATA.map((file) => {
              const isSelected = selectedFile === file.name;
              const Icon = file.type === 'CSV' ? FileSpreadsheet : FileText;
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
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />
                      <span className="truncate font-medium" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="badge badge-blue">{file.type}</span>
                  </td>
                  <td className="py-2 px-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{file.size}</td>
                  <td className="py-2 px-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {file.tokens > 0 ? file.tokens.toLocaleString() : '—'}
                  </td>
                  <td className="py-2 px-3 font-mono" style={{ color: 'var(--text-secondary)' }}>{file.chunks}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${file.status === 'ready' ? 'bg-emerald-400' : 'bg-amber-400 live-dot'}`} />
                      <span style={{ color: file.status === 'ready' ? 'var(--success)' : 'var(--warning)' }}>
                        {file.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <button className="p-1 rounded hover:bg-[var(--bg-elevated)]">
                        <Eye className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button className="p-1 rounded hover:bg-[var(--bg-elevated)]">
                        <Trash2 className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
