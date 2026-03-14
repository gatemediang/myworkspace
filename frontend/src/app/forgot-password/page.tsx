'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #020c18 0%, #040f1e 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/images/logo.png" alt="WorkSpace" width={180} height={50}
              className="h-12 w-auto mx-auto object-contain" />
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-8" style={{ border: '1px solid rgba(0,168,98,0.3)' }}>
          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2 text-center"
            style={{ fontFamily: 'Orbitron' }}>Forgot Password</h2>
          <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
            Enter your email and we'll send you a reset link.
          </p>

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,168,98,0.15)', border: '2px solid rgba(0,168,98,0.4)' }}>
                <CheckCircle size={28} style={{ color: 'var(--green)' }} />
              </div>
              <p className="text-center text-sm text-[var(--text-secondary)]">
                If <strong className="text-[var(--text-primary)]">{email}</strong> has an account,
                a reset link has been sent. Check your inbox.
              </p>
              <Link href="/login" className="btn-primary mt-2">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                  <input required type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="form-input" style={{ paddingLeft: '2.5rem' }}
                    placeholder="your@email.com" />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
                {loading ? <><span className="spinner w-4 h-4 border-2 mr-2"></span>Sending...</> : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-4 text-sm text-[var(--text-secondary)]">
          <Link href="/login" className="text-[var(--green)] hover:underline">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
