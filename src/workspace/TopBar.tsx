import { Save, Settings, Play, ChevronDown, Download, Share2 } from 'lucide-react';
import type { WorkspaceTab } from '../App';

interface TopBarProps {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  showNetwork: boolean;
  setShowNetwork: (show: boolean) => void;
}

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'data', label: 'Data' },
  { id: 'prepare', label: 'Prepare' },
  { id: 'train', label: 'Train' },
  { id: 'evaluate', label: 'Evaluate' },
  { id: 'deploy', label: 'Deploy' },
  { id: 'code', label: 'Code' },
];

export default function TopBar({ activeTab, setActiveTab, showNetwork, setShowNetwork }: TopBarProps) {
  return (
    <div
      className="flex items-center h-10 border-b select-none flex-shrink-0"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 border-r h-full" style={{ borderColor: 'var(--border-panel)' }}>
        <img src="/whale-logo.png" alt="Logo" className="w-6 h-6 object-contain drop-shadow-sm" />
        <span className="font-heading text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          BlankWhale
        </span>
      </div>

      {/* Project Name */}
      <div className="flex items-center gap-1.5 px-4 border-r h-full cursor-pointer hover:bg-[var(--bg-surface)] transition-colors" style={{ borderColor: 'var(--border-panel)' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          medical-knowledge-base
        </span>
        <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center h-full">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`workspace-tab h-full ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Controls */}
      <div className="flex items-center gap-1 px-3 h-full">
        {/* Status */}
        <div className="flex items-center gap-1.5 mr-3">
          <div className="w-2 h-2 rounded-full live-dot" style={{ background: 'var(--success)' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--success)' }}>Ready</span>
        </div>

        {/* Download Button */}
        <button
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors hover:bg-[var(--bg-surface)] border mr-1"
          style={{ borderColor: 'var(--border-panel)', color: 'var(--text-secondary)' }}
          title="Download BlankWhale for your device"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Download</span>
        </button>

        {/* Network Visualization Button */}
        <button
          onClick={() => setShowNetwork(!showNetwork)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors border mr-1 ${
            showNetwork ? 'bg-blue-50 border-blue-200' : 'hover:bg-[var(--bg-surface)]'
          }`}
          style={showNetwork ? { color: '#0071e3' } : { borderColor: 'var(--border-panel)', color: 'var(--text-secondary)' }}
          title="View neural network visualization"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Network</span>
        </button>

        <button className="p-1.5 rounded hover:bg-[var(--bg-surface)] transition-colors" title="Run Pipeline">
          <Play className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button className="p-1.5 rounded hover:bg-[var(--bg-surface)] transition-colors" title="Save">
          <Save className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button className="p-1.5 rounded hover:bg-[var(--bg-surface)] transition-colors" title="Settings">
          <Settings className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </div>
  );
}
