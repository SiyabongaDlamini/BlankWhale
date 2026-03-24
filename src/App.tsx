import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import './App.css';

import TopBar from './workspace/TopBar';
import FileExplorer, { type LocalFile } from './workspace/FileExplorer';
import Inspector from './workspace/Inspector';
import ConsolePanel from './workspace/ConsolePanel';

// Legacy Canvases
import DataCanvas from './workspace/canvas/DataCanvas';
import PrepareCanvas from './workspace/canvas/PrepareCanvas';
import TrainCanvas from './workspace/canvas/TrainCanvas';
import EvaluateCanvas from './workspace/canvas/EvaluateCanvas';
import DeployCanvas from './workspace/canvas/DeployCanvas';
import NetworkCanvas from './workspace/canvas/NetworkCanvas';
import CodeCanvas from './workspace/canvas/CodeCanvas';

// New Features (Phase 2 & 3)
import ChatPage from './pages/llm/ChatPage';
import SceneBuilder from './pages/robot/SceneBuilder';
// Note: robot-train and robot-reward would be imported here once fully fleshed out 
// but for now I'll use placeholders if they don't have distinct page components yet.

import { useEngine } from './hooks/useEngine';

export type WorkspaceTab = 
  'data' | 'prepare' | 'train' | 'evaluate' | 'deploy' | 'code' | 
  'chat' | 'robot-scene' | 'robot-train' | 'robot-reward';

export interface TrainingConfig {
  baseModel: string;
  strategy: string;
  epochs: number;
  learningRate: number;
  batchSize: number;
  quantization: string;
}

const DEFAULT_CONFIG: TrainingConfig = {
  baseModel: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
  strategy: 'lora',
  epochs: 3,
  learningRate: 0.0003,
  batchSize: 4,
  quantization: '4bit',
};

function App() {
  const [activeTab, setActiveTab] = useLocalStorage<WorkspaceTab>('bw_activeTab', 'data');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [showNetwork, setShowNetwork] = useState(false);
  const [projectName, setProjectName] = useLocalStorage('bw_projectName', 'my-project');
  const [trainConfig, setTrainConfig] = useLocalStorage<TrainingConfig>('bw_trainConfig', DEFAULT_CONFIG);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('bw_theme', 'light');

  // Engine state (single instance, shared via props)
  const engine = useEngine();

  // Apply theme class to document body
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  // Panel widths (in px) and bottom panel height
  const [leftWidth, setLeftWidth] = useState(200);
  const [rightWidth, setRightWidth] = useState(260);
  const [bottomHeight, setBottomHeight] = useState(180);

  const renderCanvas = () => {
    switch (activeTab) {
      // Data / LLM Studio
      case 'data': return <DataCanvas files={files} setFiles={setFiles} selectedFile={selectedFile} setSelectedFile={setSelectedFile} engine={engine} />;
      case 'prepare': return <PrepareCanvas files={files} selectedFile={selectedFile} engine={engine} />;
      case 'train': return <TrainCanvas engine={engine} trainConfig={trainConfig} files={files} selectedFile={selectedFile} />;
      case 'evaluate': return <EvaluateCanvas files={files} selectedFile={selectedFile} engine={engine} />;
      case 'deploy': return <DeployCanvas engine={engine} />;
      case 'code': return <CodeCanvas />;
      
      // New features
      case 'chat': return <ChatPage engine={engine} />;
      case 'robot-scene': return <SceneBuilder />;
      
      // Placeholders for parts not fully converted to root canvases yet
      case 'robot-train': 
      case 'robot-reward': 
        return (
          <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--bg-workspace)', color: 'var(--text-muted)' }}>
            <div className="text-center">
              <h2 className="text-lg font-bold mb-2">Robotics Studio</h2>
              <p className="text-sm">RL Train & Rewards panels are active. Build scenes to get started.</p>
            </div>
          </div>
        );
      
      default: return null;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-workspace)' }}>
      {/* Top Bar */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showNetwork={showNetwork}
        setShowNetwork={setShowNetwork}
        projectName={projectName}
        setProjectName={setProjectName}
        engine={engine}
        files={files}
        trainConfig={trainConfig}
        theme={theme}
        setTheme={setTheme}
      />

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
            <Inspector activeTab={activeTab} selectedFile={selectedFile} files={files} trainConfig={trainConfig} setTrainConfig={setTrainConfig} engine={engine} />
          </div>
        </div>

        {/* Bottom Resize Handle */}
        <ResizeHandle direction="vertical" onResize={(delta) => setBottomHeight(h => Math.max(80, Math.min(400, h - delta)))} />

        {/* Bottom Panel — Console */}
        <div style={{ height: bottomHeight, minHeight: 80, maxHeight: 400 }} className="flex-shrink-0 border-t overflow-hidden">
          <ConsolePanel activeTab={activeTab} engine={engine} />
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
        className="w-1.5 flex-shrink-0 cursor-col-resize trans-colors handle-h"
      />
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="h-1.5 flex-shrink-0 cursor-row-resize trans-colors handle-v"
    />
  );
}

export default App;
