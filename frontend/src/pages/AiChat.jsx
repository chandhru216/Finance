import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import './AiChat.css';

const SUGGESTED = [
  { icon: '📉', text: 'How can I reduce my EMI?' },
  { icon: '🏆', text: 'Which loan should I close first?' },
  { icon: '📊', text: 'Why is my utilization high?' },
  { icon: '💰', text: 'How much can I save this month?' },
  { icon: '🎯', text: 'Give me a debt repayment plan' },
  { icon: '📈', text: 'Am I spending too much on fees?' },
];

const TypingDots = () => (
  <div className="typing-dots">
    <span /><span /><span />
  </div>
);

// Simple markdown-like renderer for AI responses
const renderMessage = (text) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('• ') || line.startsWith('- ')) {
      return <li key={i}>{line.slice(2)}</li>;
    }
    if (line.startsWith('**') && line.endsWith('**')) {
      return <strong key={i} style={{ display: 'block', marginTop: 6 }}>{line.slice(2, -2)}</strong>;
    }
    if (line === '') return <br key={i} />;
    return <p key={i} style={{ margin: '3px 0' }}>{line}</p>;
  });
};

export default function AiChat() {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [started, setStarted]     = useState(false);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput('');
    setStarted(true);

    const userMsg = { role: 'user', content: userText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { messages: updatedMessages });
      const aiMsg = { role: 'assistant', content: res.data.reply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: err.response?.data?.message ||
          'Sorry, I ran into an error. Please check your Groq API key in the backend .env file.',
        isError: true,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStarted(false);
    setInput('');
  };

  return (
    <div className="ai-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="ai-title-icon">🤖</span> AI Financial Advisor
          </h1>
          <p className="page-subtitle">
            Powered by Groq AI · Answers based on your real loan & expense data
          </p>
        </div>
        {started && (
          <button className="btn btn-secondary" onClick={clearChat}>
            🗑 Clear Chat
          </button>
        )}
      </div>

      <div className="ai-layout">
        {/* Chat area */}
        <div className="ai-chat-box">

          {/* Empty / Welcome state */}
          {!started && (
            <div className="ai-welcome">
              <div className="ai-avatar-big">🤖</div>
              <h2 className="ai-welcome-title">Hi! I'm your LoanTrack AI Advisor</h2>
              <p className="ai-welcome-sub">
                I have access to all your loan and expense data.<br />
                Ask me anything about your finances!
              </p>

              <div className="suggestions-grid">
                {SUGGESTED.map((s, i) => (
                  <button
                    key={i}
                    className="suggestion-chip"
                    onClick={() => sendMessage(s.text)}
                  >
                    <span className="chip-icon">{s.icon}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {started && (
            <div className="messages-area">
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role === 'user' ? 'user-row' : 'ai-row'}`}>
                  {msg.role === 'assistant' && (
                    <div className="ai-avatar-sm">🤖</div>
                  )}
                  <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : msg.isError ? 'error-bubble' : 'ai-bubble'}`}>
                    {msg.role === 'assistant'
                      ? <div className="ai-text">{renderMessage(msg.content)}</div>
                      : msg.content
                    }
                  </div>
                  {msg.role === 'user' && (
                    <div className="user-avatar-sm">👤</div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="message-row ai-row">
                  <div className="ai-avatar-sm">🤖</div>
                  <div className="message-bubble ai-bubble">
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Sidebar: quick suggestions (shown after chat starts) */}
        {started && (
          <div className="ai-sidebar">
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                💡 Quick Questions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SUGGESTED.map((s, i) => (
                  <button
                    key={i}
                    className="quick-chip"
                    onClick={() => sendMessage(s.text)}
                    disabled={loading}
                  >
                    <span>{s.icon}</span>
                    <span style={{ fontSize: 12 }}>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: 16, marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ℹ️ About This AI
              </div>
              <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
                This advisor uses Groq AI by Groq and reads your <strong style={{ color: 'var(--text2)' }}>real loan and expense data</strong> to give you personalised advice.
              </p>
              <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.7, marginTop: 8 }}>
                Your data is sent securely and is not stored by the AI.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="ai-input-bar">
        <div className="ai-input-wrap">
          <textarea
            ref={inputRef}
            className="ai-textarea"
            placeholder="Ask anything about your loans, expenses, or finances..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            disabled={loading}
          />
          <button
            className={`ai-send-btn ${input.trim() && !loading ? 'active' : ''}`}
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '↑'}
          </button>
        </div>
        <div className="ai-input-hint">
          Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
}
