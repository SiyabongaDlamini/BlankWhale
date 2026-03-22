import { useState } from 'react';
import { Send } from 'lucide-react';
import type { LocalFile } from '../FileExplorer';
import type { useEngine } from '../../hooks/useEngine';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface EvaluateCanvasProps {
  files?: LocalFile[];
  engine: ReturnType<typeof useEngine>;
}

export default function EvaluateCanvas({ files = [], engine }: EvaluateCanvasProps) {
  const { isTraining, metrics, isConnected, runInference } = engine;
  
  const isTrained = metrics.length > 0;
  const finalEpoch = isTrained ? metrics[metrics.length - 1].epoch.toFixed(2) : '—';
  const finalLoss = isTrained ? metrics[metrics.length - 1].loss.toFixed(4) : '—';
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Connection established. Waiting for a trained model to be loaded or fine-tuned.' },
  ]);
  const [input, setInput] = useState('');
  const [inferring, setInferring] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');

    if (!isConnected) {
      setMessages(prev => [...prev, { role: 'assistant', content: '[Error] Engine is disconnected. Cannot run inference.' }]);
      return;
    }
    if (!isTrained) {
       setMessages(prev => [...prev, { role: 'assistant', content: 'I do not have a trained checkpoint loaded yet. Please complete training in the Train tab first.' }]);
       return;
    }
    if (isTraining) {
       setMessages(prev => [...prev, { role: 'assistant', content: 'Training is in progress. Inference will be available after training completes.' }]);
       return;
    }

    // Send real inference request to engine
    setInferring(true);
    runInference(userMsg, (response: string) => {
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setInferring(false);
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Benchmark strip */}
      <div className="flex items-center gap-4 p-3 border-b flex-shrink-0" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}>
        {[
          { label: 'Status', value: isTraining ? 'Training' : isTrained ? 'Ready' : 'No Model', color: isTrained || isTraining ? 'var(--success)' : 'var(--text-secondary)' },
          { label: 'Final Epoch', value: finalEpoch, color: 'var(--accent)' },
          { label: 'Final Loss', value: finalLoss, color: 'var(--accent)' },
          { label: 'Files', value: `${files.length}`, color: 'var(--text-secondary)' },
        ].map(b => (
          <div key={b.label} className="flex items-center gap-2 text-xs">
            <span style={{ color: 'var(--text-muted)' }}>{b.label}</span>
            <span className="font-mono font-bold" style={{ color: b.color }}>{b.value}</span>
          </div>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[75%] rounded-lg px-4 py-3 text-sm shadow-sm"
              style={{
                background: 'var(--bg-panel)',
                color: 'var(--text-primary)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(0, 113, 227, 0.4)' : 'var(--border-subtle)'}`,
              }}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content}</pre>
            </div>
          </div>
        ))}
        {inferring && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              Generating response...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border-panel)', background: 'var(--bg-panel)' }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={isTrained ? "Test your fine-tuned model..." : "Train a model first..."}
            className="ctrl-input flex-1"
            disabled={inferring}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || inferring}
            className="px-4 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
            style={{ 
               background: input.trim() ? 'var(--accent)' : 'var(--bg-surface)', 
               color: input.trim() ? '#fff' : 'var(--text-muted)' 
            }}
          >
            <Send className="w-3.5 h-3.5" /> Evaluate
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          {['What data are you trained on?', 'What is your final loss?', 'Summarize your training'].map(q => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="px-2.5 py-1 rounded text-xs transition-colors hover:bg-[var(--bg-elevated)]"
              style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
