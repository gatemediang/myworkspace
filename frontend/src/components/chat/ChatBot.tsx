'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const QUICK_PROMPTS = [
  'Tell me about your projects?',
  'Book an appointment?',
  'What tutorials are available?',
];
// FAQs loaded dynamically from admin

// ─────────────────────────────────────────────────────────────────
// CHATBOT AVATAR CONFIG
// To use a custom profile photo:
//   1. Place your image in /frontend/public/images/  (e.g. profile.jpg)
//   2. Change CHATBOT_PHOTO below to '/images/profile.jpg'
//   3. Rebuild Docker: docker compose up --build -d
//
// Leave as null to use the default robot icon.
// Admin can also upload via Admin → Site Settings → Chatbot Photo.
// ─────────────────────────────────────────────────────────────────
const CHATBOT_PHOTO: string | null = null;

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatbotPhoto, setChatbotPhoto] = useState<string | null>(CHATBOT_PHOTO);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chatbot photo from site settings (admin-configurable)
  useEffect(() => {
    api.get('/site-settings/chatbot_photo').then(res => {
      if (res.data?.value) setChatbotPhoto(res.data.value);
    }).catch(() => {});
  }, []);

  const [faqs, setFaqs] = useState<{id:number;question:string;answer:string}[]>([]);

  useEffect(() => {
    api.get('/faqs').then(res => setFaqs(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'model',
        content: "Hi! I am Gab, Tunji's Personal Assistant 👋 How can I help you today?"
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
      setMessages(prev => [...prev, { role: 'model', content: res.data.response }]);
      if (res.data.appointment_booked) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'model',
            content: '✅ **Appointment booked!** A confirmation has been sent to the admin. You will receive a response via email shortly.'
          }]);
        }, 500);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Sorry, I encountered an error. Please try again or use the contact form.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Reusable avatar — profile photo if set, robot icon otherwise
  const AvatarBubble = ({ size = 56 }: { size?: number }) => (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size,
        border: '2px solid var(--cyan)',
        boxShadow: '0 0 16px rgba(0,200,255,0.35)',
        background: 'var(--blue-mid)',
      }}
    >
      {chatbotPhoto ? (
        <Image
          src={chatbotPhoto.startsWith('/uploads') ? `${process.env.NEXT_PUBLIC_API_URL}${chatbotPhoto}` : chatbotPhoto}
          alt="AI Assistant"
          width={size} height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <Bot style={{ color: 'var(--cyan)', width: size * 0.5, height: size * 0.5 }} />
      )}
    </div>
  );

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1 group"
          aria-label="Open chat"
        >
          <div className="group-hover:scale-105 transition-transform">
            <AvatarBubble size={56} />
          </div>
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{
              color: 'var(--cyan)',
              textShadow: '0 0 10px rgba(0,200,255,0.6)',
              fontFamily: 'Orbitron, monospace',
            }}
          >
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
          <div
            className="flex items-center justify-between p-4"
            style={{ background: 'linear-gradient(135deg, #0d2137 0%, #0a1628 100%)', borderBottom: '1px solid rgba(0,200,255,0.2)' }}
          >
            <div className="flex items-center gap-3">
              <AvatarBubble size={40} />
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
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-2 h-2 rounded-full bg-[var(--green)] animate-bounce"
                      style={{ animationDelay: `${delay}ms` }} />
                  ))}
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
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                placeholder="Type a message..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                style={{
                  background: 'rgba(10,22,40,0.9)',
                  border: '1px solid rgba(0,200,255,0.2)',
                  color: 'var(--text-primary)',
                  fontFamily: 'Rajdhani, sans-serif',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--cyan)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(0,200,255,0.2)')}
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
