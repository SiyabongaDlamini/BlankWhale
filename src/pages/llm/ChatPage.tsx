import { useState } from 'react';

interface ChatPageProps {
  engine: {
    isConnected: boolean;
    runInference: (prompt: string, callback: (response: string) => void) => void;
    statusMessage: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatPage({ engine }: ChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    engine.runInference(input.trim(), (response) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: response, timestamp: Date.now() }]);
      setIsLoading(false);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-panel)' }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--border-panel)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-surface)',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Chat with Your Model</h2>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Test your fine-tuned model in real time</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 6,
          background: engine.isConnected ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
          color: engine.isConnected ? 'var(--success)' : 'var(--error)',
          fontSize: 11, fontWeight: 500,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: engine.isConnected ? 'var(--success)' : 'var(--error)' }} />
          {engine.isConnected ? 'Model Ready' : 'No Model Loaded'}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 13 }}>Start a conversation with your fine-tuned model</p>
            <p style={{ fontSize: 11 }}>Train a model first, then come back here to test it</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '70%', padding: '10px 14px', borderRadius: 14,
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-surface)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              border: msg.role === 'assistant' ? '1px solid var(--border-panel)' : 'none',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 14,
              background: 'var(--bg-surface)', border: '1px solid var(--border-panel)',
              color: 'var(--text-muted)', fontSize: 13,
            }}>
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-panel)', display: 'flex', gap: 10, background: 'var(--bg-panel)' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={engine.isConnected ? 'Type a message...' : 'Train a model first to chat...'}
          disabled={!engine.isConnected || isLoading}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border-panel)', background: 'var(--bg-input)',
            color: 'var(--text-primary)', fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!engine.isConnected || isLoading || !input.trim()}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: engine.isConnected && input.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
            color: engine.isConnected && input.trim() ? '#fff' : 'var(--text-muted)', 
            fontSize: 13, fontWeight: 600,
            cursor: engine.isConnected && input.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
