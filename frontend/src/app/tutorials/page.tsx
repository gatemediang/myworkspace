'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Heart, MessageCircle, Calendar, ArrowRight, FolderOpen } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import api from '@/lib/api';

const CATS = ['All', 'Python', 'AI/ML', 'Data Science', 'Web Dev', 'DevOps', 'Projects'];
const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');

  useEffect(() => {
    setLoading(true);
    const tutUrl = category === 'All' || category === 'Projects' ? '/tutorials' : `/tutorials?category=${category}`;
    const blogUrl = '/blog';
    Promise.all([
      api.get(tutUrl).then(r => r.data.map((t: any) => ({ ...t, _type: 'tutorial' }))).catch(() => []),
      category === 'All' || category === 'Projects'
        ? api.get(blogUrl).then(r => r.data.map((p: any) => ({ ...p, _type: 'project' }))).catch(() => [])
        : Promise.resolve([]),
    ]).then(([tutorials, projects]) => {
      const merged = [...tutorials, ...projects].sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setPosts(merged);
    }).finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container-xl max-w-5xl">
          <div className="mb-10">
            <div className="section-tag">Ideas & Insights</div>
            <h1 className="section-title mt-2">Blog</h1>
            <p className="text-[var(--text-secondary)] mt-3 max-w-2xl">Tutorials, project write-ups, AI insights and more.</p>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CATS.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`tab-btn ${category === cat ? 'active' : ''}`}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="spinner w-10 h-10 border-4"></div></div>
          ) : posts.length === 0 ? (
            <div className="glass-card p-16 text-center rounded-2xl">
              <p className="text-[var(--text-secondary)] text-lg">No posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((t) => (
                <div key={`${t._type}-${t.id}`} className="glass-card rounded-xl overflow-hidden flex flex-col md:flex-row">
                  {t.image_url && (
                    <div className="w-full md:w-48 h-40 md:h-auto flex-shrink-0">
                      <img src={`${API}${t.image_url}`} alt={t.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {t._type === 'project' ? (
                          <span className="badge badge-green flex items-center gap-1"><FolderOpen size={10} /> Project</span>
                        ) : (
                          <span className="badge badge-cyan">{t.category}</span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Orbitron, monospace', fontSize: '1rem' }}>
                        {t.title}
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: t.summary?.replace(/<[^>]*>/g, '').substring(0, 180) + '...' }} />
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                        {t._type === 'tutorial' && <>
                          <span className="flex items-center gap-1"><Eye size={12} /> {t.views || 0}</span>
                          <span className="flex items-center gap-1"><Heart size={12} /> {t.likes_count || 0}</span>
                          <span className="flex items-center gap-1"><MessageCircle size={12} /> {t.comments_count || 0}</span>
                        </>}
                        {t.created_at && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(t.created_at).toLocaleDateString()}</span>}
                      </div>
                      <Link
                        href={t._type === 'project' ? `/projects/${t.slug}` : `/tutorials/${t.slug}`}
                        className="btn-outline text-xs py-1.5 px-4 flex items-center gap-1">
                        Read More <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <ChatBot />
    </div>
  );
}
