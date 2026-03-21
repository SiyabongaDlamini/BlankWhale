import type { ViewState } from '../App';
import { 
  FolderPlus, 
  LayoutGrid, 
  Database, 
  SearchCode, 
  BrainCircuit, 
  TestTube, 
  Send, 
  CreditCard,
  MoreVertical,
  Activity
} from 'lucide-react';

interface DashboardViewProps {
  setCurrentView: (view: ViewState) => void;
}

const SIDEBAR_NAV = [
  { name: 'Projects', icon: LayoutGrid, active: true },
  { name: 'Datasets', icon: Database, active: false },
  { name: 'Tokenizer', icon: SearchCode, active: false },
  { name: 'Training', icon: BrainCircuit, active: false },
  { name: 'Testing', icon: TestTube, active: false },
  { name: 'Deployment', icon: Send, active: false },
];

const DUMMY_PROJECTS = [
  { id: 1, name: 'Medical AI', status: 'Trained', date: '2 days ago', color: 'bg-emerald-500' },
  { id: 2, name: 'Trading AI', status: 'Training', date: '4 hours ago', color: 'bg-amber-500', progress: 45 },
  { id: 3, name: 'Legal AI', status: 'Draft', date: 'Last week', color: 'bg-slate-300' },
  { id: 4, name: 'Business AI', status: 'Deployed', date: '1 month ago', color: 'bg-blue-500' },
];

export default function DashboardView({ setCurrentView }: DashboardViewProps) {
  return (
    <div className="flex h-[calc(100vh-80px)] w-full bg-slate-50 relative overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col flex-shrink-0">
        <div className="p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Workspace</p>
          <nav className="space-y-1">
            {SIDEBAR_NAV.map((item) => (
              <button
                key={item.name}
                className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 ${item.active ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.name}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-200">
          <button className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            <CreditCard className="mr-3 h-5 w-5 text-slate-400" />
            Billing
          </button>
        </div>
      </aside>

      {/* Main Center Canvas */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projects</h1>
              <p className="text-sm text-slate-500 mt-1">Manage your AI models and training workflows.</p>
            </div>
            
            <button 
              onClick={() => setCurrentView('studio')}
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Training Project
            </button>
          </div>

          {/* Project Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DUMMY_PROJECTS.map((project) => (
              <div 
                key={project.id} 
                className="group relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer p-6"
                onClick={() => setCurrentView('studio')}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${project.color} bg-opacity-10 text-${project.color.split('-')[1]}-600`}>
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Updated {project.date}</p>
                
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mr-2 ${project.status === 'Training' ? 'bg-amber-400 animate-pulse' : project.status === 'Deployed' ? 'bg-blue-500' : project.status === 'Trained' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-xs font-semibold text-slate-600">{project.status}</span>
                  </div>
                  
                  {project.status === 'Training' && (
                    <div className="flex items-center text-xs font-medium text-amber-600">
                      <Activity className="w-3.5 h-3.5 mr-1" />
                      {project.progress}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
