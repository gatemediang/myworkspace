'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Heart, MessageCircle, Calendar, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import api from '@/lib/api';

const CATS = ['All', 'Python', 'AI/ML', 'Data Science', 'Web Dev', 'DevOps'];

export default function TutorialsPage() {
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');

  useEffect(() => {
    setLoading(true);
    const url = category === 'All' ? '/tutorials' : `/tutorials?category=${category}`;
    api.get(url).then(res => setTutorials(res.data)).catch(() => setTutorials([])).finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container-xl max-w-5xl">
          <div className="mb-10">
            <div className="section-tag">Learn & Grow</div>
            <h1 className="section-title mt-2">Tutorials</h1>
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
          ) : tutorials.length === 0 ? (
            <div className="glass-card p-16 text-center rounded-2xl">
              <p className="text-[var(--text-secondary)] text-lg">No tutorials yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tutorials.map((t) => (
                <div key={t.id} className="glass-card rounded-xl overflow-hidden flex flex-col md:flex-row">
                  {t.image_url && (
                    <div className="w-full md:w-48 h-40 md:h-auto flex-shrink-0">
                      <img src={`${process.env.NEXT_PUBLIC_API_URL}${t.image_url}`}
                        alt={t.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="badge badge-cyan">{t.category}</span>
                      </div>
                      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Orbitron, monospace', fontSize: '1rem' }}>
                        {t.title}
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{t.summary}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1"><Eye size={12} /> {t.views}</span>
                        <span className="flex items-center gap-1"><Heart size={12} /> {t.likes_count}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={12} /> {t.comments_count}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                      <Link href={`/tutorials/${t.slug}`} className="btn-outline text-xs py-1.5 px-4 flex items-center gap-1">
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
