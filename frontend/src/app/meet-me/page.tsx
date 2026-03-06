'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import api from '@/lib/api';

const DEFAULT_ABOUT = {
  name: 'Tunji Ologun',
  title: 'Chief Executive Officer, AI Pulse',
  bio_paragraphs: [
    'AI Pulse is the fastest-growing AI news platform in the world, built to give curious minds a front-row seat to the future of intelligent technology.',
    'Every day, our newsroom tracks the breakthroughs, setbacks, and real-world deployments that are reshaping how people build, work, and live with AI.',
    'From cutting-edge research and foundation models to scrappy new startups, we break down what matters, why it matters, and who is building it.',
    'Our reporters and analysts follow the money, the policy debates, and the people behind the products to give readers context they cannot get from press releases or hype alone.',
    'AI Pulse serves founders, engineers, data scientists, investors, policymakers, and anyone who wants a clear signal through the AI noise.',
    'Under Tunji Ologun\'s leadership, AI Pulse is focused on making AI reporting more transparent, critical, and accessible.',
    'His vision is simple: if AI will touch every industry and every person, then accurate, nuanced coverage of AI should be available to everyone, not just insiders.',
  ],
  photo_url: '',
  topics: ['AI Research', 'GenAI & LLMs', 'AI Startups', 'Enterprise AI', 'Policy & Ethics', 'Developer Tools'],
  social_links: {}
};

export default function MeetMePage() {
  const [about, setAbout] = useState(DEFAULT_ABOUT);

  useEffect(() => {
    api.get('/about').then(res => {
      if (res.data?.name) setAbout({ ...DEFAULT_ABOUT, ...res.data });
    }).catch(() => {});
  }, []);

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="pt-20">
        <div className="container-xl py-12 max-w-5xl">

          {/* Hero split: photo + meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden mb-10 border border-[rgba(0,168,98,0.2)]" style={{ minHeight: '360px' }}>
            {/* Photo */}
            <div className="relative bg-[#040f1e]" style={{ minHeight: '320px' }}>
              {about.photo_url ? (
                <img src={`${process.env.NEXT_PUBLIC_API_URL}${about.photo_url}`}
                  alt={about.name} className="w-full h-full object-cover" style={{ maxHeight: '420px' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#040f1e] to-[#0a1628]" style={{ minHeight: '320px' }}>
                  <div className="w-40 h-40 rounded-full bg-[rgba(0,168,98,0.15)] border-2 border-[var(--green)] flex items-center justify-center text-6xl font-bold text-[var(--green)]" style={{ fontFamily: 'Orbitron' }}>
                    {about.name[0]}
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 right-3">
                <span className="text-xs px-3 py-1 rounded-full text-[var(--text-secondary)]" style={{ background: 'rgba(0,0,0,0.6)' }}>
                  AI Pulse Leadership
                </span>
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-col justify-center p-8 md:p-10" style={{ background: 'var(--green)' }}>
              <span className="text-xs font-bold uppercase tracking-widest text-black/70 mb-3">About Us</span>
              <h1 className="text-3xl md:text-4xl font-black text-black mb-2" style={{ fontFamily: 'Orbitron, monospace' }}>
                {about.name}
              </h1>
              <p className="text-black/80 font-medium">{about.title}</p>
            </div>
          </div>

          {/* Bio content */}
          <article className="glass-card p-8 md:p-10 rounded-2xl mb-8">
            <div className="space-y-5">
              {about.bio_paragraphs.map((para, i) => (
                <p key={i} className="text-[var(--text-secondary)] leading-relaxed text-base">{para}</p>
              ))}
            </div>
          </article>

          {/* Topics */}
          <div className="glass-card p-8 rounded-2xl">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6" style={{ fontFamily: 'Orbitron, monospace' }}>
              What We Cover
            </h2>
            <div className="flex flex-wrap gap-3">
              {about.topics.map((topic, i) => (
                <Link key={i} href="#"
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                  style={{ background: 'rgba(0,168,98,0.12)', border: '1px solid rgba(0,168,98,0.3)', color: 'var(--green)' }}>
                  {topic}
                </Link>
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
