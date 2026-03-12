'use client';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

function ConfirmedContent() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get('status') || 'success';

  const states = {
    success: {
      icon: CheckCircle,
      color: 'var(--green)',
      title: 'You\'re confirmed! 🎉',
      message: 'Welcome to the MyWorkSpace newsletter. You\'ll be the first to know about new tutorials, projects, and resources.',
    },
    already: {
      icon: CheckCircle,
      color: 'var(--cyan)',
      title: 'Already confirmed',
      message: 'Your email is already confirmed and active. You\'re all set!',
    },
    invalid: {
      icon: XCircle,
      color: '#ef4444',
      title: 'Invalid link',
      message: 'This confirmation link is invalid or has already been used. Try subscribing again.',
    },
  };

  const s = states[status as keyof typeof states] || states.success;
  const Icon = s.icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#020c18' }}>
      <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center space-y-6"
        style={{ border: '1px solid rgba(0,168,98,0.3)' }}>

        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: `${s.color}15`, border: `2px solid ${s.color}40` }}>
            <Icon size={40} style={{ color: s.color }} />
          </div>
        </div>

        {/* Logo/Brand */}
        <div>
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>
            MyWorkSpace Newsletter
          </p>
          <h1 className="text-2xl font-black text-[var(--text-primary)]"
            style={{ fontFamily: 'Orbitron' }}>
            {s.title}
          </h1>
        </div>

        <p className="text-[var(--text-secondary)] leading-relaxed">
          {s.message}
        </p>

        {status === 'success' && (
          <div className="p-4 rounded-xl text-sm text-left space-y-2"
            style={{ background: 'rgba(0,168,98,0.08)', border: '1px solid rgba(0,168,98,0.2)' }}>
            <p className="font-semibold" style={{ color: 'var(--green)' }}>What to expect:</p>
            <ul className="space-y-1 text-[var(--text-secondary)]">
              <li>📚 New tutorial announcements</li>
              <li>🚀 Project launches & updates</li>
              <li>🎁 Exclusive freebies & resources</li>
            </ul>
          </div>
        )}

        <button
          onClick={() => router.push('/')}
          className="btn-primary w-full justify-center gap-2">
          <ArrowLeft size={16} /> Back to MyWorkSpace
        </button>
      </div>
    </div>
  );
}

export default function NewsletterConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#020c18' }}>
        <div className="spinner w-10 h-10 border-4"></div>
      </div>
    }>
      <ConfirmedContent />
    </Suspense>
  );
}
