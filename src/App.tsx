import { useState } from 'react';
import './App.css';

import TopBar from './workspace/TopBar';
import FileExplorer, { type LocalFile } from './workspace/FileExplorer';
import Inspector from './workspace/Inspector';
import ConsolePanel from './workspace/ConsolePanel';
import DataCanvas from './workspace/canvas/DataCanvas';
import PrepareCanvas from './workspace/canvas/PrepareCanvas';
import TrainCanvas from './workspace/canvas/TrainCanvas';
import EvaluateCanvas from './workspace/canvas/EvaluateCanvas';
import DeployCanvas from './workspace/canvas/DeployCanvas';
import NetworkCanvas from './workspace/canvas/NetworkCanvas';
import CodeCanvas from './workspace/canvas/CodeCanvas';

export type WorkspaceTab = 'data' | 'prepare' | 'train' | 'evaluate' | 'deploy' | 'code';

function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('data');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [showNetwork, setShowNetwork] = useState(false);

  // Panel widths (in px) and bottom panel height
  const [leftWidth, setLeftWidth] = useState(200);
  const [rightWidth, setRightWidth] = useState(260);
  const [bottomHeight, setBottomHeight] = useState(180);

  const renderCanvas = () => {
    switch (activeTab) {
      case 'data': return <DataCanvas files={files} setFiles={setFiles} selectedFile={selectedFile} setSelectedFile={setSelectedFile} />;
      case 'prepare': return <PrepareCanvas files={files} />;
      case 'train': return <TrainCanvas />;
      case 'evaluate': return <EvaluateCanvas files={files} />;
      case 'deploy': return <DeployCanvas />;
      case 'code': return <CodeCanvas />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-workspace)' }}>
      {/* Top Bar */}
      <TopBar activeTab={activeTab} setActiveTab={setActiveTab} showNetwork={showNetwork} setShowNetwork={setShowNetwork} />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Upper section: 3 columns */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Panel — File Explorer */}
          <div style={{ width: leftWidth, minWidth: 140, maxWidth: 400 }} className="flex-shrink-0 border-r overflow-hidden" >
            <FileExplorer files={files} setFiles={setFiles} selectedFile={selectedFile} setSelectedFile={setSelectedFile} activeTab={activeTab} />
          </div>

          {/* Left Resize Handle */}
          <ResizeHandle direction="horizontal" onResize={(delta) => setLeftWidth(w => Math.max(140, Math.min(400, w + delta)))} />

          {/* Center — Main Canvas */}
          <div className="flex-1 overflow-hidden min-w-0" style={{ background: 'var(--bg-workspace)' }}>
            {showNetwork ? <NetworkCanvas /> : renderCanvas()}
          </div>

          {/* Right Resize Handle */}
          <ResizeHandle direction="horizontal" onResize={(delta) => setRightWidth(w => Math.max(180, Math.min(450, w - delta)))} />

          {/* Right Panel — Inspector */}
          <div style={{ width: rightWidth, minWidth: 180, maxWidth: 450 }} className="flex-shrink-0 border-l overflow-hidden">
            <Inspector activeTab={activeTab} selectedFile={selectedFile} files={files} />
          </div>
        </div>

        {/* Bottom Resize Handle */}
        <ResizeHandle direction="vertical" onResize={(delta) => setBottomHeight(h => Math.max(80, Math.min(400, h - delta)))} />

        {/* Bottom Panel — Console */}
        <div style={{ height: bottomHeight, minHeight: 80, maxHeight: 400 }} className="flex-shrink-0 border-t overflow-hidden">
          <ConsolePanel activeTab={activeTab} />
        </div>
      </div>
    </div>
  );
}

/* Custom resize handle component — simple, reliable dragging */
function ResizeHandle({ direction, onResize }: { direction: 'horizontal' | 'vertical'; onResize: (delta: number) => void }) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    let lastPos = direction === 'horizontal' ? e.clientX : e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPos - lastPos;
      if (delta !== 0) {
        onResize(delta);
        lastPos = currentPos;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  if (direction === 'horizontal') {
    return (
      <div
        onMouseDown={handleMouseDown}
        className="w-1.5 flex-shrink-0 cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors"
        style={{ background: 'var(--border-panel)' }}
      />
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="h-1.5 flex-shrink-0 cursor-row-resize hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors"
      style={{ background: 'var(--border-panel)' }}
    />
  );
}

export default App;
