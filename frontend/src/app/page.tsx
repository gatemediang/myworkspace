'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Github, ExternalLink, Mail, Phone, User, Users, ChevronLeft, ChevronRight, ExternalLink as LinkIcon, Calendar, Clock } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { key: 'ai_ml', label: 'AI/ML' },
  { key: 'data_analysis', label: 'Data Analysis' },
  { key: 'ai_automations', label: 'AI Automations' },
  { key: 'fullstack', label: 'FullStack APPs' },
];

const DEFAULT_PHRASES = [
  'Welcome To My Workspace',
  'I Offer Data/AI Powered Solutions',
  'Be My Guest',
];

// ── Multi-phrase typewriter hook ─────────────────────────────────

function useTypewriter(phrases: string[]) {
  const [display, setDisplay] = useState('');
  const phraseIdx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);

  useEffect(() => {
    const tick = () => {
      const current = phrases[phraseIdx.current];
      if (!deleting.current) {
        // typing forward
        charIdx.current += 1;
        setDisplay(current.slice(0, charIdx.current));
        if (charIdx.current === current.length) {
          // finished typing — pause then start deleting
          deleting.current = true;
          return 1800;
        }
        return 75;
      } else {
        // deleting
        charIdx.current -= 1;
        setDisplay(current.slice(0, charIdx.current));
        if (charIdx.current === 0) {
          // finished deleting — move to next phrase
          deleting.current = false;
          phraseIdx.current = (phraseIdx.current + 1) % phrases.length;
          return 400; // brief pause before next phrase
        }
        return 40;
      }
    };

    let timeout: ReturnType<typeof setTimeout>;
    const run = () => {
      const delay = tick();
      timeout = setTimeout(run, delay);
    };
    timeout = setTimeout(run, 500);
    return () => clearTimeout(timeout);
  }, [phrases]);

  return display;
}

// ── Hero image slider ────────────────────────────────────────────
interface HeroSlide {
  id: number;
  image_url: string;
  caption?: string;
  tutorial_slug?: string;
  tutorial_title?: string;
}

const FALLBACK_SLIDES: HeroSlide[] = [
  { id: 0, image_url: '/images/hero_slides/s1.png', caption: 'Train & Score — Deep Learning Image Pipeline' },
  { id: 1, image_url: '/images/hero_slides/s2.png', caption: 'ML Ops — where Machine Learning meets DevOps & Data Engineering' },
  { id: 2, image_url: '/images/hero_slides/s4.png', caption: 'Integrating the ML Pipeline for Success' },
];

function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const list = slides.length > 0 ? slides : FALLBACK_SLIDES;
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((idx: number) => {
    if (idx === current || fading) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(idx);
      setFading(false);
    }, 350);
  }, [current, fading]);

  const prev = () => goTo((current - 1 + list.length) % list.length);
  const next = useCallback(() => goTo((current + 1) % list.length), [current, goTo, list.length]);

  // Auto-advance every 5 s
  useEffect(() => {
    if (list.length <= 1) return;
    timerRef.current = setTimeout(next, 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, next, list.length]);

  const slide = list[current];
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const imgSrc = slide.image_url.startsWith('/uploads')
    ? `${apiBase}${slide.image_url}`
    : slide.image_url;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: '5px',
        width: 'min(750px, 95vw)',
        aspectRatio: '5 / 3',
        border: '1px solid rgba(0,200,255,0.25)',
        boxShadow: '0 0 40px rgba(0,168,98,0.15)',
      }}
    >
      {/* Slide image */}
      <div
        style={{
          opacity: fading ? 0 : 1,
          transition: 'opacity 0.35s ease',
          position: 'absolute', inset: 0,
        }}
      >
        <Image
          src={imgSrc}
          alt={slide.caption || 'Hero image'}
          fill
          className="object-cover"
          priority={current === 0}
        />
      </div>

      {/* Edge vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'linear-gradient(to right, #020c18 0%, transparent 12%, transparent 88%, #020c18 100%)',
        }}
      />

      {/* Caption + tutorial link */}
      {(slide.caption || slide.tutorial_slug) && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-4 py-3"
          style={{
            background: 'linear-gradient(to top, rgba(2,12,24,0.92) 0%, transparent 100%)',
          }}
        >
          {slide.caption && (
            <p className="text-xs text-[var(--text-secondary)] leading-snug mb-1">{slide.caption}</p>
          )}
          {slide.tutorial_slug && (
            <Link
              href={`/tutorials/${slide.tutorial_slug}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--green)] hover:underline"
            >
              {slide.tutorial_title || 'View Tutorial'} <LinkIcon size={11} />
            </Link>
          )}
        </div>
      )}

      {/* Prev / Next arrows — only shown when >1 slide */}
      {list.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-8 h-8 rounded-full transition-all"
            style={{ background: 'rgba(2,12,24,0.6)', border: '1px solid rgba(0,200,255,0.25)' }}
          >
            <ChevronLeft size={16} className="text-[var(--text-primary)]" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-8 h-8 rounded-full transition-all"
            style={{ background: 'rgba(2,12,24,0.6)', border: '1px solid rgba(0,200,255,0.25)' }}
          >
            <ChevronRight size={16} className="text-[var(--text-primary)]" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {list.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
          {list.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === current ? '18px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === current ? 'var(--green)' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function HomePage() {
  const [activeTab, setActiveTab] = useState('ai_ml');
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [contactForm, setContactForm] = useState({ full_name: '', email: '', phone: '', message: '', preferred_date: '', preferred_time: '' });
  const [submitting, setSubmitting] = useState(false);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [heroPhrases, setHeroPhrases] = useState<string[]>(DEFAULT_PHRASES);

  const typedText = useTypewriter(heroPhrases);

  // Load hero phrases from CMS
  useEffect(() => {
    api.get('/site-settings/hero-phrases').then(res => {
      if (Array.isArray(res.data?.phrases) && res.data.phrases.length === 3) {
        setHeroPhrases(res.data.phrases);
      }
    }).catch(() => {});
  }, []);

  // Load hero slides
  useEffect(() => {
    api.get('/hero-slides').then(res => {
      if (Array.isArray(res.data) && res.data.length > 0) setHeroSlides(res.data);
    }).catch(() => {});

    api.get('/clients').then(res => {
      if (Array.isArray(res.data)) setClients(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingProjects(true);
    api.get(`/projects?category=${activeTab}`)
      .then(res => setProjects(res.data.slice(0, 5)))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [activeTab]);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/contact', contactForm);
      toast.success('Message sent! I will get back to you soon.');
      setContactForm({ full_name: '', email: '', phone: '', message: '', preferred_date: '', preferred_time: '' });
    } catch {
      toast.error('Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      {/* ===== HERO ===== */}
      <section
        id="home"
        className="relative min-h-screen flex items-center overflow-hidden bg-grid"
        style={{ background: 'linear-gradient(135deg, #020c18 0%, #040f1e 50%, #020c18 100%)' }}
      >
        {/* Ambient glows */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--green) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--cyan) 0%, transparent 70%)', opacity: 0.07 }} />

        <div className="container-xl relative z-10 pt-24 pb-16">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            {/* LEFT — text */}
            <div className="flex-1 max-w-xl">
              <div className="section-tag mb-5">Portfolio 2026</div>

              <h1
                className="text-2xl md:text-3xl font-black leading-tight mb-5"
                style={{ fontFamily: 'Orbitron, monospace', minHeight: '2.5rem' }}
              >
                <span className="typing-cursor">{typedText}</span>
              </h1>

              <p className="text-base text-[var(--text-secondary)] mb-8 leading-relaxed">
                AI/ML Engineer. Data Analyst. Full Stack Developer.<br />
                Building intelligent systems and sharing knowledge with the world.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#projects" className="btn-primary">
                  View Projects <ArrowRight size={18} />
                </a>
                <a href="#contact" className="btn-secondary">
                  Book a Call
                </a>
              </div>
            </div>

            {/* RIGHT — hero image slider */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <HeroSlider slides={heroSlides} />
            </div>

          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[var(--text-secondary)] animate-bounce">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ===== PROJECTS ===== */}
      <section id="projects" className="py-20 bg-grid" style={{ background: 'linear-gradient(to bottom, #020c18, #040f1e)' }}>
        <div className="container-xl">
          <div className="text-center mb-12">
            <div className="section-tag">My Work</div>
            <h2 className="section-title mt-2">Featured <span>Projects</span></h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {CATEGORIES.map((cat) => (
              <button key={cat.key} onClick={() => setActiveTab(cat.key)}
                className={`tab-btn ${activeTab === cat.key ? 'active' : ''}`}>
                {cat.label}
              </button>
            ))}
          </div>

          {loadingProjects ? (
            <div className="flex justify-center py-16">
              <div className="spinner w-10 h-10 border-4"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-secondary)]">
              <p className="text-lg">No projects yet in this category.</p>
              <p className="text-sm mt-1">Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="project-card group">
                  {project.image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}${project.image_url}`}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="overlay" />
                      <div className="absolute top-3 left-3">
                        <span className="badge badge-green">{project.category?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-bold text-[var(--text-primary)] mb-2"
                      style={{ fontFamily: 'Orbitron, monospace', fontSize: '1rem' }}>
                      {project.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed line-clamp-3">
                      {project.summary}
                    </p>
                    {project.tech_stack?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {project.tech_stack.slice(0, 4).map((tech: string) => (
                          <span key={tech} className="text-xs px-2 py-0.5 rounded"
                            style={{ background: 'rgba(0,200,255,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,200,255,0.2)' }}>
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Link href={`/projects/${project.slug}`} className="btn-outline text-sm py-1.5 px-4 flex items-center gap-1">
                        Read More <ArrowRight size={14} />
                      </Link>
                      {project.github_url && (
                        <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                          <Github size={18} />
                        </a>
                      )}
                      {project.live_url && (
                        <a href={project.live_url} target="_blank" rel="noopener noreferrer"
                          className="text-[var(--text-secondary)] hover:text-[var(--green)] transition-colors">
                          <ExternalLink size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      <section id="contact" className="py-20 relative overflow-hidden" style={{ background: '#020c18' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <Image src="/images/contact_me.png" alt="" fill className="object-cover" />
        </div>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, #020c18, rgba(2,12,24,0.6), #020c18)' }} />

        <div className="container-xl relative z-10">
          <div className="text-center mb-12">
            <div className="section-tag">Get In Touch</div>
            <h2 className="section-title mt-2">Contact <span>Me</span></h2>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8 rounded-2xl" style={{ border: '1px solid rgba(0,168,98,0.3)' }}>
              <form onSubmit={handleContact} className="space-y-4">
                <div>
                  <label className="form-label">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                    <input type="text" required value={contactForm.full_name}
                      onChange={e => setContactForm(p => ({ ...p, full_name: e.target.value }))}
                      className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="Your full name" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                      <input type="email" required value={contactForm.email}
                        onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                        className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="your@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Phone <span className="normal-case opacity-60">(optional)</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                      <input type="tel" value={contactForm.phone}
                        onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))}
                        className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="+44 xxx xxx xxxx" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Preferred Date <span className="normal-case opacity-60">(optional)</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                      <input type="date" value={contactForm.preferred_date}
                        onChange={e => setContactForm(p => ({ ...p, preferred_date: e.target.value }))}
                        className="form-input" style={{ paddingLeft: '2.5rem', colorScheme: 'dark' }} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Preferred Time <span className="normal-case opacity-60">(optional)</span></label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                      <input type="time" value={contactForm.preferred_time}
                        onChange={e => setContactForm(p => ({ ...p, preferred_time: e.target.value }))}
                        className="form-input" style={{ paddingLeft: '2.5rem', colorScheme: 'dark' }} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="form-label">Message</label>
                  <textarea required value={contactForm.message}
                    onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                    className="form-input resize-none h-32" placeholder="Tell me what you need..." />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
                  {submitting
                    ? <><span className="spinner w-4 h-4 border-2 mr-2"></span>Sending...</>
                    : 'Submit Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>


      {/* ===== CLIENTELE ===== */}
      {clients.length > 0 && (
        <section className="py-16" style={{ background: '#020c18', borderTop: '1px solid rgba(0,200,255,0.08)' }}>
          <div className="container-xl">
            <div className="text-center mb-10">
              <div className="section-tag">Trusted By</div>
              <h2 className="section-title mt-2">Our <span>Clientele</span></h2>
            </div>
            <div className="flex flex-wrap gap-6 items-center justify-center">
              {clients.map((client: any) => (
                <div key={client.id}
                  className="glass-card rounded-2xl overflow-hidden flex flex-col"
                  style={{
                    width: '220px', height: '220px', flexShrink: 0,
                    border: '1px solid rgba(0,200,255,0.2)',
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,255,0.5)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,255,0.2)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div className="flex-1 flex items-center justify-center p-4"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {client.logo_url ? (
                      <img src={`${process.env.NEXT_PUBLIC_API_URL}${client.logo_url}`}
                        alt={client.name} className="object-contain"
                        style={{ maxWidth: '160px', maxHeight: '130px', filter: 'brightness(0.9) saturate(0.75)' }} />
                    ) : (
                      <span className="text-4xl font-black text-[var(--text-secondary)]">{client.name[0]}</span>
                    )}
                  </div>
                  <div className="px-3 py-3 text-center"
                    style={{ borderTop: '1px solid rgba(0,200,255,0.15)', background: 'rgba(0,200,255,0.04)' }}>
                    <p className="text-xs font-bold text-[var(--text-primary)] line-clamp-2">{client.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
      <ChatBot />
    </div>
  );
}
