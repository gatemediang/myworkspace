'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Eye, Heart, MessageCircle, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function TutorialPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tutorial, setTutorial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const { user, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (!slug) return;
    api.get(`/tutorials/${slug}`).then(res => setTutorial(res.data)).catch(() => setTutorial(null)).finally(() => setLoading(false));
  }, [slug]);

  const handleLike = async () => {
    if (!user) { toast.error('Please login to like tutorials'); return; }
    try {
      const res = await api.post(`/tutorials/${tutorial.id}/like`);
      setLiked(res.data.liked);
      setTutorial((prev: any) => ({ ...prev, likes_count: res.data.liked ? prev.likes_count + 1 : prev.likes_count - 1 }));
    } catch { toast.error('Failed to like'); }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please login to comment'); return; }
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      const formData = new FormData();
      formData.append('content', comment);
      await api.post(`/tutorials/${tutorial.id}/comment`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Comment posted!');
      setComment('');
      const res = await api.get(`/tutorials/${slug}`);
      setTutorial(res.data);
    } catch { toast.error('Failed to post comment'); }
    finally { setSubmittingComment(false); }
  };

  if (loading) return (
    <div className="page-wrapper">
      <Navbar />
      <div className="flex justify-center items-center min-h-screen"><div className="spinner w-12 h-12 border-4"></div></div>
    </div>
  );

  if (!tutorial) return (
    <div className="page-wrapper">
      <Navbar />
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-[var(--text-secondary)]">Tutorial not found.</p>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container-xl max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <span className="badge badge-cyan mb-4">{tutorial.category}</span>
            <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-4" style={{ fontFamily: 'Orbitron, monospace', lineHeight: 1.3 }}>
              {tutorial.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
              <span>By {tutorial.author}</span>
              <span>·</span>
              <span>{new Date(tutorial.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="flex items-center gap-1"><Eye size={14} /> {tutorial.views}</span>
            </div>
          </div>

          {/* Hero image */}
          {tutorial.image_url && (
            <div className="rounded-2xl overflow-hidden mb-8 h-72">
              <img src={`${process.env.NEXT_PUBLIC_API_URL}${tutorial.image_url}`} alt={tutorial.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Video embed */}
          {tutorial.video_url && (
            <div className="mb-8 rounded-2xl overflow-hidden aspect-video">
              <iframe src={tutorial.video_url.replace('watch?v=', 'embed/')} className="w-full h-full" allowFullScreen title="Tutorial video" />
            </div>
          )}

          {/* Content */}
          <div className="glass-card p-8 rounded-2xl mb-8 prose prose-invert max-w-none">
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

          {/* Like Button */}
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

            {/* Comment form */}
            {user ? (
              <form onSubmit={handleComment} className="mb-6">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--green)] flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                    {user.full_name?.[0]}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input value={comment} onChange={e => setComment(e.target.value)}
                      className="form-input flex-1" placeholder="Write a comment..." />
                    <button type="submit" disabled={submittingComment || !comment.trim()}
                      className="btn-primary py-2 px-4">
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

            {/* Comments list */}
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
