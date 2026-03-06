'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, Bot } from 'lucide-react';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const QUICK_PROMPTS = [
  'How can I help you today?',
  'Book an appointment?',
  'Tell me about projects?',
];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'model',
        content: "Hi! I'm your AI assistant for **MyWorkSpace**. I can answer questions about projects, tutorials, book appointments, and more. How can I help you today?"
      }]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/chat', { message: text, history });
      const botMsg: Message = { role: 'model', content: res.data.response };
      setMessages(prev => [...prev, botMsg]);
      if (res.data.appointment_booked) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'model',
            content: '✅ **Appointment booked!** A confirmation has been sent to the admin. You will receive a response via email shortly.'
          }]);
        }, 500);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I encountered an error. Please try again or use the contact form.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1 group"
          aria-label="Open chat"
        >
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[var(--cyan)] shadow-lg group-hover:scale-105 transition-transform"
            style={{ boxShadow: '0 0 20px rgba(0,200,255,0.4)' }}>
            <div className="w-full h-full bg-[var(--blue-mid)] flex items-center justify-center">
              <Bot className="text-[var(--cyan)]" size={28} />
            </div>
          </div>
          <span className="text-xs font-bold text-[var(--cyan)] uppercase tracking-widest"
            style={{ textShadow: '0 0 10px rgba(0,200,255,0.6)', fontFamily: 'Orbitron, monospace' }}>
            ASK ME
          </span>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-80 md:w-96 flex flex-col rounded-2xl overflow-hidden animate-slide-up"
          style={{ height: '520px', background: '#0a1628', border: '1px solid var(--cyan)', boxShadow: '0 0 40px rgba(0,168,98,0.2)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4" style={{ background: 'linear-gradient(135deg, #0d2137 0%, #0a1628 100%)', borderBottom: '1px solid rgba(0,200,255,0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--blue-mid)] border-2 border-[var(--cyan)] flex items-center justify-center">
                <Bot className="text-[var(--cyan)]" size={18} />
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]" style={{ fontFamily: 'Orbitron, monospace' }}>ASK ME</p>
                <p className="text-xs text-[var(--green)]">● Online</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 border-b border-[rgba(0,200,255,0.1)]">
              <div className="glass-card p-3 rounded-xl" style={{ border: '1px solid rgba(0,200,255,0.2)' }}>
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => sendMessage(p)}
                    className="block w-full text-left text-sm text-[var(--text-secondary)] hover:text-[var(--cyan)] py-1 transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
                  <ReactMarkdown className="prose prose-sm max-w-none [&>*]:m-0 [&>p]:text-inherit [&>strong]:text-inherit">
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="chat-bubble-bot px-4 py-3 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[rgba(0,200,255,0.15)]" style={{ background: '#040f1e' }}>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                placeholder="Type a message..."
                className="flex-1 bg-[rgba(10,22,40,0.9)] border border-[rgba(0,200,255,0.2)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--cyan)] transition-colors"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                style={{ background: 'var(--green)' }}
              >
                <Send size={16} className="text-black" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
