'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Mail, User } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const footerLinks = {
  Tech: [
    { label: 'AI News',         href: '/' },
    { label: 'Developer Tools', href: '/tutorials' },
    { label: 'Apps',            href: '/shop' },
    { label: 'Cybersecurity',   href: '/tutorials?category=security' },
  ],
  Company: [
    { label: 'About',    href: '/meet-me' },
    { label: 'Contact',  href: '/#contact' },
    { label: 'Tutorial', href: '/tutorials' },
    { label: 'Careers',  href: '#' },
  ],
  Resources: [
    { label: 'Newsletter',    href: '#' },
    { label: 'RSS',           href: '#' },
    { label: 'Events',        href: '#' },
    { label: 'Privacy Policy',href: '#' },
  ],
};

const socialLinks = [
  {
    label: 'X/Twitter', href: 'https://x.com/TunjiOlogun',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.207-6.807-5.979 6.807H2.882l7.73-8.835L1.24 2.25h6.837l4.713 6.231 5.734-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  {
    label: 'LinkedIn', href: 'https://www.linkedin.com/in/tunji-ologun-0b558576/',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.25-.129.599-.129.948v5.439h-3.554s.05-8.81 0-9.728h3.554v1.375c.427-.659 1.19-1.596 2.897-1.596 2.117 0 3.704 1.383 3.704 4.357v5.592zM5.337 8.855c-1.144 0-1.915-.758-1.915-1.708 0-.951.77-1.708 1.915-1.708 1.144 0 1.915.757 1.915 1.708 0 .95-.771 1.708-1.915 1.708zm1.6 11.597H3.738V9.579h3.199v10.873zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>,
  },
  {
    label: 'Facebook', href: 'https://www.facebook.com/tunji.ologun1',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  {
    label: 'YouTube', href: 'https://www.youtube.com/@fullstackaai',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  },
];

export default function Footer() {
  const [subOpen, setSubOpen] = useState(false);
  const [subForm, setSubForm] = useState({ full_name: '', email: '' });
  const [subLoading, setSubLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubLoading(true);
    try {
      await api.post('/newsletter/subscribe', subForm);
      toast.success('Thanks! Please check your email to confirm your subscription.');
      setSubOpen(false);
      setSubForm({ full_name: '', email: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Subscription failed. Please try again.';
      toast.error(msg);
    } finally {
      setSubLoading(false);
    }
  };

  return (
    <>
      <footer style={{ background: '#020c18', borderTop: '1px solid rgba(0,168,98,0.15)' }}>
        <div className="container-xl py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link href="/">
                <Image src="/images/logo.png" alt="WorkSpace" width={180} height={50}
                  className="h-12 w-auto object-contain mb-4" />
              </Link>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                Building intelligent systems, one line of code at a time. AI/ML engineering,
                data analysis, and full-stack development.
              </p>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([group, links]) => (
              <div key={group}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: 'var(--text-primary)' }}>
                  {group}
                </h3>
                <ul className="space-y-2">
                  {links.map(link => (
                    <li key={link.label}>
                      <Link href={link.href}
                        className="text-sm transition-colors hover:text-[var(--green)]"
                        style={{ color: 'var(--text-secondary)' }}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Social + Subscribe */}
          <div className="mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderTop: '1px solid rgba(0,168,98,0.1)' }}>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--text-secondary)' }}>
                Follow
              </span>
              {socialLinks.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  aria-label={s.label}
                  className="social-icon-btn rounded-full transition-all"
                  style={{ background: 'rgba(0,168,98,0.1)', border: '1px solid rgba(0,168,98,0.2)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--green)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--green)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,168,98,0.2)'; }}>
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Subscribe button → opens modal */}
            <button onClick={() => setSubOpen(true)} className="btn-primary text-sm py-2 px-6">
              Subscribe
            </button>
          </div>

          <div className="mt-6 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
            &copy; 2026 MyWorkSpace. Built by Tunji Ologun.
          </div>
        </div>
      </footer>

      {/* ── Subscribe Modal ── */}
      {subOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,12,24,0.88)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSubOpen(false); }}>
          <div className="w-full max-w-md glass-card rounded-2xl p-8 animate-slide-up"
            style={{ border: '1px solid rgba(0,168,98,0.35)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-[var(--text-primary)]"
                  style={{ fontFamily: 'Orbitron, monospace' }}>
                  Stay Updated
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Get notified when new tutorials are published.
                </p>
              </div>
              <button onClick={() => setSubOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubscribe} className="space-y-4">
              <div>
                <label className="form-label">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                  <input required type="text" value={subForm.full_name}
                    onChange={e => setSubForm(p => ({ ...p, full_name: e.target.value }))}
                    className="form-input" style={{ paddingLeft: '2.5rem' }}
                    placeholder="Your full name" />
                </div>
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                  <input required type="email" value={subForm.email}
                    onChange={e => setSubForm(p => ({ ...p, email: e.target.value }))}
                    className="form-input" style={{ paddingLeft: '2.5rem' }}
                    placeholder="your@email.com" />
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                You will receive a confirmation email. Only confirmed subscribers receive tutorial notifications.
              </p>
              <button type="submit" disabled={subLoading} className="btn-primary w-full justify-center">
                {subLoading ? <><span className="spinner w-4 h-4 border-2 mr-2"></span>Subscribing...</> : 'Subscribe Now'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
