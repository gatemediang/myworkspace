'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import { Download, Award, GraduationCap, Users } from 'lucide-react';
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
    "Under Tunji Ologun's leadership, AI Pulse is focused on making AI reporting more transparent, critical, and accessible.",
    'His vision is simple: if AI will touch every industry and every person, then accurate, nuanced coverage of AI should be available to everyone, not just insiders.',
  ],
  photo_url: '',
  cv_url: '',
  topics: ['AI Research', 'GenAI & LLMs', 'AI Startups', 'Enterprise AI', 'Policy & Ethics', 'Developer Tools'],
  social_links: {},
};

function InfoCard({ imageUrl, title, subtitle, icon: Icon, apiBase, linkUrl }: {
  imageUrl?: string; title: string; subtitle?: string; icon: any; apiBase: string; linkUrl?: string;
}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => linkUrl
    ? <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">{children}</a>
    : <>{children}</>;
  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col"
      style={{
        width: '300px', height: '300px', flexShrink: 0,
        border: '1px solid rgba(0,168,98,0.2)',
        transition: 'border-color 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--green)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,168,98,0.2)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}>
      <Wrapper>
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'rgba(0,15,30,0.6)' }}>
        {imageUrl ? (
          <img src={`${apiBase}${imageUrl}`} alt={title} className="object-contain"
            style={{ maxWidth: '220px', maxHeight: '190px' }} />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,168,98,0.15)', border: '2px solid rgba(0,168,98,0.3)' }}>
            <Icon size={36} style={{ color: 'var(--green)' }} />
          </div>
        )}
      </div>
      <div className="px-4 py-4 text-center"
        style={{ borderTop: '1px solid rgba(0,168,98,0.15)', background: 'rgba(0,168,98,0.05)', minHeight: '72px' }}>
        <p className="text-sm font-bold text-[var(--text-primary)] leading-snug line-clamp-2 mb-1">{title}</p>
        {subtitle && <p className="text-xs leading-snug line-clamp-1" style={{ color: 'var(--green)' }}>{subtitle}</p>}
      </div>
      </Wrapper>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color = 'var(--green)' }: { icon: any; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <h2 className="text-2xl font-black text-[var(--text-primary)]"
        style={{ fontFamily: 'Orbitron, monospace' }}>{title}</h2>
    </div>
  );
}

export default function MeetMePage() {
  const [about, setAbout] = useState(DEFAULT_ABOUT);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    api.get('/about').then(res => { if (res.data?.name) setAbout({ ...DEFAULT_ABOUT, ...res.data }); }).catch(() => {});
    api.get('/certifications').then(res => { if (Array.isArray(res.data)) setCertifications(res.data); }).catch(() => {});
    api.get('/education').then(res => { if (Array.isArray(res.data)) setEducation(res.data); }).catch(() => {});
    api.get('/clients').then(res => { if (Array.isArray(res.data)) setClients(res.data); }).catch(() => {});
  }, []);

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="pt-20">
        <div className="container-xl py-12 max-w-5xl">

          {/* Hero */}
          <div className="grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden mb-10 border border-[rgba(0,168,98,0.2)]"
            style={{ minHeight: '400px', alignItems: 'stretch' }}>
            <div className="relative bg-[#040f1e]" style={{ minHeight: '400px', height: '100%' }}>
              {about.photo_url ? (
                <img src={`${apiBase}${about.photo_url}`} alt={about.name}
                  className="w-full h-full object-cover"
                  style={{ position: 'absolute', inset: 0, height: '100%', maxHeight: 'none' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#040f1e] to-[#0a1628]"
                  style={{ minHeight: '320px' }}>
                  <div className="w-40 h-40 rounded-full bg-[rgba(0,168,98,0.15)] border-2 border-[var(--green)] flex items-center justify-center text-6xl font-bold text-[var(--green)]"
                    style={{ fontFamily: 'Orbitron' }}>{about.name[0]}</div>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center p-8 md:p-10" style={{ background: 'var(--green)' }}>
              <span className="text-xs font-bold uppercase tracking-widest text-black/70 mb-3">About Me</span>
              <h1 className="text-3xl md:text-4xl font-black text-black mb-2"
                style={{ fontFamily: 'Orbitron, monospace' }}>{about.name}</h1>
              <p className="text-black/80 font-medium">{about.title}</p>
            </div>
          </div>

          {/* Bio */}
          <article className="glass-card p-8 md:p-10 rounded-2xl mb-6">
            <div className="rich-content" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{
                __html: typeof about.bio_paragraphs === 'string'
                  ? about.bio_paragraphs
                  : Array.isArray(about.bio_paragraphs)
                    ? about.bio_paragraphs.map(p => `<p>${p}</p>`).join('') : ''
              }} />
          </article>

          {/* CV Download */}
          {about.cv_url && (
            <div className="mb-10">
              <a href={`${apiBase}${about.cv_url}`} target="_blank" rel="noopener noreferrer" download
                className="btn-primary inline-flex items-center gap-2 px-6 py-3">
                <Download size={18} /> Download My CV
              </a>
            </div>
          )}

          {/* Interests */}
          <div className="glass-card p-8 rounded-2xl mb-14">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6"
              style={{ fontFamily: 'Orbitron, monospace' }}>Interests</h2>
            <div className="flex flex-wrap gap-3">
              {about.topics.map((topic, i) => (
                <span key={i} className="px-5 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'rgba(0,168,98,0.12)', border: '1px solid rgba(0,168,98,0.3)', color: 'var(--green)' }}>
                  {topic}
                </span>
              ))}
            </div>
          </div>

          {/* Certifications */}
          {certifications.length > 0 && (
            <section className="mb-14">
              <SectionHeader icon={Award} title="Certifications" />
              <div className="flex flex-wrap gap-6">
                {certifications.map(cert => (
                  <InfoCard key={cert.id} imageUrl={cert.image_url} title={cert.name}
                    icon={Award} apiBase={apiBase} linkUrl={cert.cert_url} />
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {education.length > 0 && (
            <section className="mb-14">
              <SectionHeader icon={GraduationCap} title="Education" color="var(--cyan)" />
              <div className="flex flex-wrap gap-6">
                {education.map(edu => (
                  <InfoCard key={edu.id} imageUrl={edu.logo_url} title={edu.school_name}
                    subtitle={edu.degree} icon={GraduationCap} apiBase={apiBase} />
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Clientele — full width */}
        {clients.length > 0 && (
          <section className="py-16" style={{ background: 'linear-gradient(to bottom, #020c18, #040f1e)' }}>
            <div className="container-xl max-w-5xl">
              <SectionHeader icon={Users} title="Clientele" color="var(--cyan)" />
              <div className="flex flex-wrap gap-6">
                {clients.map(client => (
                  <div key={client.id}
                    className="glass-card rounded-2xl overflow-hidden flex flex-col"
                    style={{
                      width: '300px', height: '300px', flexShrink: 0,
                      border: '1px solid rgba(0,200,255,0.2)',
                      transition: 'border-color 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,255,0.2)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}>
                    <div className="flex-1 flex items-center justify-center p-6"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {client.logo_url ? (
                        <img src={`${apiBase}${client.logo_url}`} alt={client.name}
                          className="object-contain"
                          style={{ maxWidth: '220px', maxHeight: '190px', filter: 'brightness(0.95) saturate(0.8)' }} />
                      ) : (
                        <span className="text-5xl font-black text-[var(--text-secondary)]">{client.name[0]}</span>
                      )}
                    </div>
                    <div className="px-4 py-4 text-center"
                      style={{ borderTop: '1px solid rgba(0,200,255,0.15)', background: 'rgba(0,200,255,0.04)', minHeight: '72px' }}>
                      <p className="text-sm font-bold text-[var(--text-primary)] leading-snug line-clamp-2">{client.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
      <Footer />
      <ChatBot />
    </div>
  );
}
