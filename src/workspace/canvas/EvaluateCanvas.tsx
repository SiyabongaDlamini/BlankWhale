import { useState } from 'react';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MOCK_RESPONSES: Record<string, string> = {
  default: `Based on the medical knowledge base you've trained me on, I can provide insights about CRISPR-Cas9 gene therapy, cardiovascular pathology, drug interactions, and clinical trial data across your 8 uploaded documents.`,
  'what': `Your training data contains 82,782 tokens across 8 files covering:
• CRISPR-Cas9 gene editing for cardiomyopathy
• Patient records from 340 enrolled subjects
• Drug interaction databases (2,150 entries)
• Clinical trial results from 12 medical centers
• Radiological imaging data (X-ray scans)`,
  'crispr': `According to your research paper, CRISPR-Cas9 gene editing showed significant improvement in LVEF (Left Ventricular Ejection Fraction) after a single AAV-delivered dose. The study enrolled 340 patients with MYH7 and MYBPC3 pathogenic variants. Follow-up at 6, 12, and 24 months confirmed sustained therapeutic benefit with manageable immune responses.`,
  'drug': `From your drug_interactions.json data, there are 2,150 documented interactions. Key highlights:
• 47 critical interactions flagged
• Beta-blockers and ACE inhibitors show synergistic effects
• Immunosuppressive protocols are recommended post-gene therapy
• 12 novel compound interactions identified`,
};

export default function EvaluateCanvas() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Model loaded. Ask me anything about your training data.' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');

    // Simulate response
    setTimeout(() => {
      const key = Object.keys(MOCK_RESPONSES).find(k => userMsg.toLowerCase().includes(k)) || 'default';
      setMessages(prev => [...prev, { role: 'assistant', content: MOCK_RESPONSES[key] }]);
    }, 600);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Benchmark strip */}
      <div className="flex items-center gap-4 p-3 border-b flex-shrink-0" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}>
        {[
          { label: 'BLEU', value: '0.847', color: 'var(--success)' },
          { label: 'ROUGE-L', value: '0.912', color: 'var(--success)' },
          { label: 'Perplexity', value: '4.21', color: 'var(--accent)' },
          { label: 'F1', value: '0.893', color: 'var(--success)' },
          { label: 'Latency', value: '120ms', color: 'var(--text-secondary)' },
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
              className="max-w-[75%] rounded-lg px-4 py-3 text-sm"
              style={{
                background: msg.role === 'user' ? 'rgba(0, 113, 227, 0.06)' : 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(0, 113, 227, 0.15)' : 'var(--border-panel)'}`,
              }}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content}</pre>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border-panel)', background: 'var(--bg-panel)' }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask your trained model..."
            className="ctrl-input flex-1"
          />
          <button
            onClick={handleSend}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
            style={{ background: 'rgba(0, 113, 227, 0.08)', color: 'var(--accent)' }}
          >
            <Send className="w-3 h-3" /> Send
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          {['What data do I have?', 'Tell me about CRISPR', 'Drug interactions?'].map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); }}
              className="px-2 py-1 rounded text-xs transition-colors"
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
