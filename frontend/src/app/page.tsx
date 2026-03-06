'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Github, ExternalLink, Mail, Phone, User } from 'lucide-react';
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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('ai_ml');
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [contactForm, setContactForm] = useState({ full_name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [typedText, setTypedText] = useState('');

  const heroText = 'Welcome To MyWorkSpace';

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i <= heroText.length) {
        setTypedText(heroText.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 60);
    return () => clearInterval(timer);
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
      setContactForm({ full_name: '', email: '', phone: '', message: '' });
    } catch {
      toast.error('Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      {/* ===== HERO / LANDING ===== */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-grid" style={{ background: 'linear-gradient(135deg, #020c18 0%, #040f1e 50%, #020c18 100%)' }}>
        {/* BG Image */}
        <div className="absolute inset-0 flex items-center justify-end pr-0 md:pr-20 opacity-20 md:opacity-30 pointer-events-none">
          <Image src="/images/landing_page.png" alt="AI Brain" width={600} height={600} className="object-contain w-auto h-[70vh] max-h-[600px]" />
        </div>

        {/* Ambient glows */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, var(--green) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-8 pointer-events-none" style={{ background: 'radial-gradient(circle, var(--cyan) 0%, transparent 70%)' }} />

        <div className="container-xl relative z-10 pt-24 pb-16">
          <div className="max-w-3xl">
            <div className="section-tag mb-6">Portfolio 2026</div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6" style={{ fontFamily: 'Orbitron, monospace' }}>
              <span className="typing-cursor">{typedText}</span>
            </h1>
            <p className="text-xl text-[var(--text-secondary)] mb-8 max-w-xl leading-relaxed">
              AI/ML Engineer. Data Analyst. Full Stack Developer. Building intelligent systems and sharing knowledge with the world.
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

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {CATEGORIES.map((cat) => (
              <button key={cat.key} onClick={() => setActiveTab(cat.key)}
                className={`tab-btn ${activeTab === cat.key ? 'active' : ''}`}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Project grid */}
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
                      <img src={`${process.env.NEXT_PUBLIC_API_URL}${project.image_url}`}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="overlay" />
                      <div className="absolute top-3 left-3">
                        <span className="badge badge-green">{project.category?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Orbitron, monospace', fontSize: '1rem' }}>
                      {project.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed line-clamp-3">
                      {project.summary}
                    </p>
                    {project.tech_stack?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {project.tech_stack.slice(0, 4).map((tech: string) => (
                          <span key={tech} className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(0,200,255,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,200,255,0.2)' }}>{tech}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Link href={`/projects/${project.slug}`} className="btn-outline text-sm py-1.5 px-4 flex items-center gap-1">
                        Read More <ArrowRight size={14} />
                      </Link>
                      {project.github_url && (
                        <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                          <Github size={18} />
                        </a>
                      )}
                      {project.live_url && (
                        <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--green)] transition-colors">
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
        {/* BG */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <Image src="/images/contact_me.png" alt="" fill className="object-cover" />
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, #020c18, rgba(2,12,24,0.6), #020c18)' }} />

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
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                    <input type="text" required value={contactForm.full_name}
                      onChange={e => setContactForm(p => ({ ...p, full_name: e.target.value }))}
                      className="form-input pl-10" placeholder="Your full name" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                      <input type="email" required value={contactForm.email}
                        onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                        className="form-input pl-10" placeholder="your@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Phone <span className="normal-case opacity-60">(optional)</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                      <input type="tel" value={contactForm.phone}
                        onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))}
                        className="form-input pl-10" placeholder="+44 xxx xxx xxxx" />
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
                  {submitting ? <><span className="spinner w-4 h-4 border-2 mr-2"></span>Sending...</> : 'Submit Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <ChatBot />
    </div>
  );
}
