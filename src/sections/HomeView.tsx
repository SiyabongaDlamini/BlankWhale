import type { ViewState } from '../App';
import { Upload, FileText, Brain, Rocket, PlayCircle } from 'lucide-react';

interface HomeViewProps {
  setCurrentView: (view: ViewState) => void;
}

export default function HomeView({ setCurrentView }: HomeViewProps) {
  const coreFeatures = [
    {
      title: 'Upload Knowledge',
      description: 'Drag & drop PDF, CSV, DOCX, TXT, audio, images. Instant processing.',
      icon: Upload,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Smart Tokenization',
      description: 'Automatic chunking, token preview, and overlap algorithms.',
      icon: FileText,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Train Model',
      description: 'Choose AI type (Chat, Document, Medical) and start training visually.',
      icon: Brain,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Deploy Anywhere',
      description: 'Export AI via API, interactive chatbot widgets, or downloadable weights.',
      icon: Rocket,
      color: 'bg-rose-100 text-rose-600',
    },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden w-full pt-20 pb-32 flex flex-col lg:flex-row items-center justify-center min-h-[calc(100vh-80px)] max-w-7xl mx-auto px-6 lg:px-12 gap-12">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-blue-50/50 blur-3xl -z-10" />

        <div className="flex flex-col items-start lg:w-1/2 space-y-8 z-10">
          <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-800 font-medium">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2"></span>
            Visual AI Studio
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            Train your own AI from files, visually.
          </h1>
          
          <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
            Upload files, tokenize automatically, fine-tune models, and deploy your own AI assistant in minutes. No code. No terminals. Just intelligence.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
            >
              Start Free Training
            </button>
            <button 
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all shadow-sm group"
            >
              <PlayCircle className="w-5 h-5 mr-2 text-slate-400 group-hover:text-blue-600 transition-colors" />
              Watch Demo
            </button>
          </div>
        </div>

        {/* Hero Dashboard Mockup Widget */}
        <div className="lg:w-1/2 w-full relative z-10 mt-12 lg:mt-0">
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-2xl overflow-hidden shadow-slate-200/50 group hover:shadow-3xl transition-all duration-500">
            {/* Window Controls Mock */}
            <div className="h-10 border-b border-slate-100 bg-slate-50 flex items-center px-4 space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-semibold text-slate-900">Medical AI Training</h3>
                  <p className="text-sm text-slate-500">Epoch 3/5</p>
                </div>
                <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                  Running
                </div>
              </div>
              
              {/* Progress UI Mock */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tokens Processed</span>
                    <span className="font-medium text-slate-900">24.5M / 50M</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-[49%] rounded-full relative">
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 mt-6">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <Brain className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">GPU Allocation</p>
                    <p className="text-xs text-slate-500">8x A100 (Connected)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating badge */}
          <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce shadow-blue-100/50">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Loss Dropping</p>
              <p className="text-sm font-bold text-slate-900">2.1 → 1.4</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 py-24 sm:py-32 w-full">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Train AI the easy way</h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Your platform replaces the command line, GPU environments, and Python errors with a simple 4-step visual flow.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
              {coreFeatures.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex flex-col relative group">
                    <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ring-1 ring-slate-200/50 group-hover:-translate-y-1 transition-transform ${feature.color}`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <dt className="text-lg font-bold leading-7 text-slate-900 flex items-center">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center mr-3 font-semibold">{idx+1}</span>
                      {feature.title}
                    </dt>
                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                      <p className="flex-auto">{feature.description}</p>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
}
