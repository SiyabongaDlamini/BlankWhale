import { useState } from 'react';
import type { ViewState } from '../App';
import { 
  ArrowLeft, ArrowRight, UploadCloud, FileText, Settings, 
  Brain, Activity, MessageSquare, Rocket, CheckCircle2
} from 'lucide-react';

interface StudioViewProps {
  setCurrentView: (view: ViewState) => void;
}

const STEPS = [
  { id: 1, title: 'Upload', icon: UploadCloud },
  { id: 2, title: 'Tokenize', icon: FileText },
  { id: 3, title: 'AI Model', icon: Brain },
  { id: 4, title: 'Parameters', icon: Settings },
  { id: 5, title: 'Training', icon: Activity },
  { id: 6, title: 'Test', icon: MessageSquare },
  { id: 7, title: 'Deploy', icon: Rocket },
];

export default function StudioView({ setCurrentView }: StudioViewProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 2 State
  const [chunkSize, setChunkSize] = useState(500);
  const [overlap, setOverlap] = useState(50);

  // Step 3 State
  const [aiType, setAiType] = useState('Chat AI');

  // Step 4 State
  const [mode, setMode] = useState('Balanced');

  // Step 5 State (Mock Training)
  const [trainingProgress, setTrainingProgress] = useState(0);

  const startMockTraining = () => {
    setTrainingProgress(0);
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  const handleNext = () => {
    if (currentStep === 4) startMockTraining(); // Start training when entering step 5
    if (currentStep < 7) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-16 lg:top-20 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">New Project</h2>
            <p className="text-xs text-slate-500">Draft Training Session</p>
          </div>
        </div>
        
        {/* Step Indicator */}
        <div className="hidden md:flex items-center gap-2">
          {STEPS.map((step, idx) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  isActive 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : isCompleted 
                      ? 'bg-slate-900 border-slate-900 text-white' 
                      : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  <step.icon className="w-3.5 h-3.5 mr-1.5" />
                  {step.title}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-8 h-px mx-1 ${isCompleted ? 'bg-slate-900' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-12 mb-20">
        <div className="max-w-4xl mx-auto">
          {/* STEP 1: UPLOAD */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Upload Knowledge</h1>
              <p className="text-slate-500 mb-8">Drag and drop your files or connect to your data sources.</p>
              
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white hover:bg-blue-50/50 hover:border-blue-400 transition-colors cursor-pointer group">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Click to upload or drag files here</h3>
                <p className="text-slate-500 mt-2 text-sm">Supports PDF, DOCX, CSV, TXT, JSON, Audio & Images</p>
              </div>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Google Drive', 'Dropbox', 'Notion', 'Website URL'].map(source => (
                  <div key={source} className="bg-white border border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-slate-400 hover:shadow-sm transition-all">
                    <p className="font-semibold text-sm text-slate-700">{source}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: TOKENIZE */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Smart Tokenization</h1>
               <p className="text-slate-500 mb-8">Configure how your data is chunked and processed.</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-8">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between items-end mb-4">
                        <label className="font-semibold text-slate-900 block">Chunk Size</label>
                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{chunkSize} tokens</span>
                      </div>
                      <input 
                        type="range" min="100" max="2000" step="100" 
                        value={chunkSize} onChange={(e) => setChunkSize(parseInt(e.target.value))}
                        className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <p className="text-xs text-slate-500 mt-2">Determines how much context the model sees at once.</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between items-end mb-4">
                        <label className="font-semibold text-slate-900 block">Overlap</label>
                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{overlap} tokens</span>
                      </div>
                      <input 
                        type="range" min="0" max="200" step="10" 
                        value={overlap} onChange={(e) => setOverlap(parseInt(e.target.value))}
                        className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <p className="text-xs text-slate-500 mt-2">Prevents context loss between chunks.</p>
                    </div>
                 </div>

                 <div className="bg-slate-900 rounded-2xl p-6 text-slate-300 shadow-xl overflow-hidden relative">
                   <div className="absolute top-0 right-0 p-4">
                     <div className="bg-blue-500/20 text-blue-400 text-xs font-mono px-2 py-1 rounded border border-blue-500/30">
                       ~15,432 Total Tokens
                     </div>
                   </div>
                   <h3 className="font-bold text-white mb-4 flex items-center">
                     <FileText className="w-5 h-5 mr-2 text-slate-400" />
                     Live Preview
                   </h3>
                   <div className="font-mono text-sm space-y-4">
                     <p>
                       <span className="bg-blue-500/20 text-blue-100 rounded px-1">This is a biomedical paper...</span>
                       <span className="bg-purple-500/20 text-purple-100 rounded px-1 ml-1">The objective is to understand...</span>
                     </p>
                     <p className="opacity-50">
                       <span className="bg-emerald-500/20 text-emerald-100 rounded px-1">Data structures defined as...</span>
                     </p>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {/* STEP 3: AI MODEL SELECTION */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Choose AI Profile</h1>
               <p className="text-slate-500 mb-8">Select the foundational behavior of your model.</p>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {['Chat AI', 'Document AI', 'Medical AI', 'Coding AI', 'Trading AI'].map(type => (
                   <div 
                     key={type}
                     onClick={() => setAiType(type)}
                     className={`border-2 rounded-2xl p-6 cursor-pointer transition-all ${
                       aiType === type 
                        ? 'border-blue-600 bg-blue-50/50 shadow-md transform -translate-y-1' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                     }`}
                   >
                     <Brain className={`w-8 h-8 mb-4 ${aiType === type ? 'text-blue-600' : 'text-slate-400'}`} />
                     <h3 className="text-lg font-bold text-slate-900">{type}</h3>
                     <p className="text-sm text-slate-500 mt-2">Optimized for specialized workflows.</p>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* STEP 4: PARAMETERS */}
          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Visual Training Controls</h1>
               <p className="text-slate-500 mb-8">Choose your optimization strategy. Simplicity over complexity.</p>
               
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                 {['Fast Training', 'Balanced', 'High Accuracy'].map(m => (
                   <div 
                     key={m}
                     onClick={() => setMode(m)}
                     className={`border-2 rounded-xl p-4 text-center cursor-pointer transition-colors ${
                       mode === m ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                     }`}
                   >
                     <span className="font-semibold">{m}</span>
                   </div>
                 ))}
               </div>
               
               <div className="bg-white border border-slate-200 rounded-2xl p-6 opacity-60">
                 <h4 className="font-bold text-slate-900 mb-4 flex items-center">
                   <Settings className="w-5 h-5 mr-2" /> Advanced Parameters (Auto-configured)
                 </h4>
                 <div className="space-y-4">
                   <div className="h-2 w-full bg-slate-100 rounded-full" />
                   <div className="h-2 w-3/4 bg-slate-100 rounded-full" />
                   <div className="h-2 w-5/6 bg-slate-100 rounded-full" />
                 </div>
               </div>
            </div>
          )}

          {/* STEP 5: TRAINING MONITOR */}
          {currentStep === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Live Training Dashboard</h1>
               <p className="text-slate-500 mb-8">Your AI is actively learning from your data right now.</p>
               
               <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                 {/* Visual flares */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20" />
                 
                 <div className="flex justify-between items-end mb-12 relative z-10">
                   <div>
                     <p className="text-blue-400 font-medium mb-1 flex items-center">
                       {trainingProgress < 100 ? (
                         <><Activity className="w-4 h-4 mr-2 animate-pulse" /> Training in progress...</>
                       ) : (
                         <><CheckCircle2 className="w-4 h-4 mr-2" /> Training Complete</>
                       )}
                     </p>
                     <h2 className="text-4xl font-bold font-mono">{trainingProgress}%</h2>
                   </div>
                   <div className="text-right">
                     <p className="text-slate-400 text-sm">Epoch 3 / 5</p>
                     <p className="font-bold">Loss: <span className="text-emerald-400">1.24</span></p>
                   </div>
                 </div>

                 {/* Progress Bar */}
                 <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden mb-8 relative z-10">
                   <div 
                     className="h-full bg-gradient-to-r from-blue-600 to-emerald-400 transition-all duration-300 ease-out"
                     style={{ width: `${trainingProgress}%` }}
                   />
                 </div>

                 <div className="grid grid-cols-3 gap-6 relative z-10 border-t border-slate-700 pt-6">
                   <div>
                     <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Compute</p>
                     <p className="font-semibold text-sm">Cloud GPU Node (8xA100)</p>
                   </div>
                   <div>
                     <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Tokens Processed</p>
                     <p className="font-semibold text-sm">{(15.4 * (trainingProgress/100)).toFixed(1)}k / 15.4k</p>
                   </div>
                   <div>
                     <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Est. Time Remaining</p>
                     <p className="font-semibold text-sm">{trainingProgress < 100 ? '00:02:45' : 'Done'}</p>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {/* STEP 6: TEST */}
          {currentStep === 6 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Instant Test Window</h1>
               <p className="text-slate-500 mb-8">Chat with your newly trained model before deploying.</p>
               
               <div className="bg-white border text-center border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[400px]">
                 <div className="flex-1 p-6 flex flex-col justify-end space-y-4 bg-slate-50">
                   <div className="flex justify-end">
                     <div className="bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] text-sm">
                       What is inside my documents?
                     </div>
                   </div>
                   <div className="flex justify-start">
                     <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm shadow-sm text-left">
                       <p className="mb-2">Based on your uploaded knowledge, the document discusses:</p>
                       <ul className="list-disc pl-4 space-y-1 text-slate-600">
                         <li>Biomedical entity extraction</li>
                         <li>Advanced data structures</li>
                         <li>Pattern recognition in biological sequences</li>
                       </ul>
                     </div>
                   </div>
                 </div>
                 <div className="p-4 bg-white border-t border-slate-100">
                   <div className="relative">
                     <input type="text" placeholder="Ask your model..." className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                     <button className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                       <UploadCloud className="w-4 h-4 transform rotate-90" />
                     </button>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {/* STEP 7: DEPLOY */}
          {currentStep === 7 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Export & Deploy</h1>
               <p className="text-slate-500 mb-8">Your model is ready. Choose how you want to use it.</p>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 {[
                   { title: 'Create API Endpoint', desc: 'Get a RESTful API to integrate anywhere.', icon: Settings, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                   { title: 'Website Widget', desc: 'Copy-paste code for a chat bubble on your site.', icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50' },
                   { title: 'Download Weights', desc: 'Export the raw model for local execution.', icon: UploadCloud, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                   { title: 'Mobile App SDK', desc: 'Libraries for iOS and Android integration.', icon: Rocket, color: 'text-sky-600', bg: 'bg-sky-50' },
                 ].map(opt => (
                   <div key={opt.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow cursor-pointer flex items-start">
                     <div className={`p-3 rounded-xl ${opt.bg} ${opt.color} mr-4`}>
                       <opt.icon className="w-6 h-6" />
                     </div>
                     <div>
                       <h3 className="font-bold text-slate-900">{opt.title}</h3>
                       <p className="text-sm text-slate-500 mt-1">{opt.desc}</p>
                     </div>
                   </div>
                 ))}
               </div>
               
               <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
                 <h3 className="font-bold text-blue-900">Want unlimited usage?</h3>
                 <p className="text-blue-700 text-sm mt-1 mb-4">Upgrade to Pro for faster GPUs and unlimited API exports.</p>
                 <button className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium shadow-sm hover:bg-blue-700 transition-colors">
                   View Pricing / Upgrade
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button 
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`px-6 py-2.5 rounded-full font-medium transition-colors border shadow-sm ${
              currentStep === 1 
                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Back
          </button>
          
          <button 
            onClick={handleNext}
            disabled={currentStep === 7}
            className={`flex items-center px-8 py-2.5 rounded-full font-semibold transition-all shadow-md active:scale-95 ${
              currentStep === 7 
                ? 'bg-emerald-500 text-white shadow-emerald-200' 
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            {currentStep === 7 ? 'Done' : currentStep === 4 ? 'Train AI' : 'Next Step'} 
            {currentStep !== 7 && <ArrowRight className="w-4 h-4 ml-2" />}
          </button>
        </div>
      </div>
    </div>
  );
}
