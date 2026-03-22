import { useState, useEffect } from 'react';
import { Save, Settings, Play, ChevronDown, Download, Share2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
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
  const [updateStatus, setUpdateStatus] = useState<'checking' | 'available' | 'updated' | 'error'>('checking');
  const [latestUrl, setLatestUrl] = useState('https://github.com/SiyabongaDlamini/BlankWhale/releases/latest');

  useEffect(() => {
    fetch('https://api.github.com/repos/SiyabongaDlamini/BlankWhale/releases/latest')
      .then(res => res.json())
      .then(data => {
        if (data && data.tag_name) {
          const currentVersion = 'v0.1.1';
          if (data.tag_name !== currentVersion && data.tag_name > currentVersion) {
            setUpdateStatus('available');
            setLatestUrl(data.html_url);
          } else {
            // Either up to date, or ahead of tag
            setUpdateStatus('updated');
          }
        } else {
          setUpdateStatus('updated'); // default fallback if no releases
        }
      })
      .catch(() => setUpdateStatus('error'));
  }, []);

  const handleUpdateClick = () => {
    if (updateStatus === 'available') {
      open(latestUrl);
    } else if (updateStatus !== 'checking') {
      // Force a manual re-check
      setUpdateStatus('checking');
      fetch('https://api.github.com/repos/SiyabongaDlamini/BlankWhale/releases/latest')
        .then(res => res.json())
        .then(data => {
          if (data && data.tag_name && data.tag_name > 'v0.1.1') {
            setUpdateStatus('available');
            setLatestUrl(data.html_url);
            open(data.html_url);
          } else {
            setUpdateStatus('updated');
          }
        })
        .catch(() => setUpdateStatus('error'));
    }
  };

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

        {/* Update Checker Button */}
        <button
          onClick={handleUpdateClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors hover:bg-[var(--bg-surface)] border mr-1"
          style={{ 
             borderColor: updateStatus === 'available' ? 'var(--accent)' : 'var(--border-panel)', 
             color: updateStatus === 'available' ? 'var(--accent)' : 'var(--text-secondary)' 
          }}
          title={updateStatus === 'available' ? 'Click to download new update' : 'Check for Updates'}
        >
          <Download className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-pulse' : ''}`} />
          <span className="hidden lg:inline">
            {updateStatus === 'checking' ? 'Checking...' :
             updateStatus === 'available' ? 'Update Available!' :
             updateStatus === 'updated' ? 'Up to date' : 'Check Updates'}
          </span>
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
