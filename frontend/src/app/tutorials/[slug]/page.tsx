'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Heart, MessageCircle, Send, Calendar } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import api, { getBackendUrl } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';


export default function TutorialDetail() {
  const { slug } = useParams();
  const { user } = useAuthStore();
  const [tutorial, setTutorial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get(`/tutorials/${slug}`)
      .then(r => setTutorial(r.data))
      .catch(() => toast.error('Failed to load post. Please refresh.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleLike = async () => {
    if (!user || liked) return;
    try {
      await api.post(`/tutorials/${slug}/like`);
      setTutorial((p: any) => ({ ...p, likes_count: p.likes_count + 1 }));
      setLiked(true);
    } catch {
      toast.error('Failed to like. Please try again.');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post(`/tutorials/${slug}/comments`, { content: comment });
      setComment('');
      const r = await api.get(`/tutorials/${slug}`);
      setTutorial(r.data);
    } catch {
      toast.error('Failed to post comment. Please try again.');
    } finally { setSubmittingComment(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#020c18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner w-12 h-12 border-4" />
    </div>
  );
  if (!tutorial) return (
    <div style={{ minHeight: '100vh', background: '#020c18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)' }}>Post not found.</p>
    </div>
  );

  return (
    <div className="page-wrapper">
      <Navbar />
      <main style={{ paddingBottom: '4rem' }}>

        {/* ── HERO ── */}
        <section style={{ position: 'relative', minHeight: '55vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
          {tutorial.image_url ? (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <img src={`${getBackendUrl()}${tutorial.image_url}`} alt={tutorial.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #020c18 35%, rgba(2,12,24,0.6) 70%, rgba(2,12,24,0.2) 100%)' }} />
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(135deg, #020c18 0%, #0a1628 100%)' }} />
          )}
          <div className="container-xl" style={{ position: 'relative', zIndex: 2, paddingBottom: '3rem', paddingTop: '8rem', maxWidth: '860px' }}>
            <Link href="/tutorials" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '1.2rem' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              <ArrowLeft size={15} /> Back to Blog
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <span className="badge badge-cyan">{tutorial.category}</span>
            </div>
            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: 900, lineHeight: 1.2, color: 'var(--text-primary)', marginBottom: '1.2rem' }}>
              {tutorial.title}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <span>By {tutorial.author}</span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} /> {new Date(tutorial.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={13} /> {tutorial.views} views</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Heart size={13} /> {tutorial.likes_count || 0}</span>
            </div>
          </div>
        </section>

        {/* ── BODY ── */}
        <div className="container-xl max-w-4xl" style={{ paddingTop: '2.5rem' }}>

          {/* Video */}
          {tutorial.video_url && (() => {
            const u = tutorial.video_url;
            const m = u.match(/(?:v=|youtu\.be\/|embed\/)([^&?#\n]+)/);
            const videoId = m ? m[1] : null;
            return (
              <a href={u} target="_blank" rel="noopener noreferrer"
                className="block mb-8 rounded-2xl overflow-hidden relative group"
                style={{ aspectRatio: '16/9', background: '#000' }}>
                {videoId && <img src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} alt="Video thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Watch on YouTube</span>
                </div>
              </a>
            );
          })()}

          {/* Content */}
          <div className="glass-card p-8 rounded-2xl mb-8 prose prose-invert max-w-none rich-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div">
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-[#0d1117] text-[var(--cyan)] px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>
                  );
                },
              }}
            >
              {tutorial.content}
            </ReactMarkdown>
          </div>

          {/* Like */}
          <div className="flex items-center gap-4 mb-10">
            <button onClick={handleLike}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${liked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'glass-card text-[var(--text-secondary)] hover:text-red-400'}`}>
              <Heart size={16} className={liked ? 'fill-red-400' : ''} />
              {tutorial.likes_count} Likes
            </button>
          </div>

          {/* Comments */}
          <div className="glass-card p-8 rounded-2xl">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2" style={{ fontFamily: 'Orbitron, monospace' }}>
              <MessageCircle size={20} className="text-[var(--green)]" />
              Comments ({tutorial.comments?.length || 0})
            </h3>
            {user ? (
              <form onSubmit={handleComment} className="mb-6">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--green)] flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                    {user.full_name?.[0]}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input value={comment} onChange={e => setComment(e.target.value)} className="form-input flex-1" placeholder="Write a comment..." />
                    <button type="submit" disabled={submittingComment || !comment.trim()} className="btn-primary py-2 px-4">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <p className="text-[var(--text-secondary)] text-sm mb-6">
                <a href="/login" className="text-[var(--green)]">Login</a> to leave a comment.
              </p>
            )}
            <div className="space-y-4">
              {tutorial.comments?.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[rgba(0,168,98,0.2)] flex items-center justify-center text-[var(--green)] font-bold text-sm flex-shrink-0">
                    {c.user?.[0]}
                  </div>
                  <div className="flex-1 bg-[rgba(10,22,40,0.5)] rounded-xl p-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{c.user}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <ChatBot />
    </div>
  );
}
