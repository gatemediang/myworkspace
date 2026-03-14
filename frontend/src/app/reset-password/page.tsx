'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ new_password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Invalid reset link. Please request a new one.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.new_password !== form.confirm) {
      setError('Passwords do not match.'); return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: form.new_password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Reset failed. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-8" style={{ border: '1px solid rgba(0,168,98,0.3)' }}>
      <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2 text-center"
        style={{ fontFamily: 'Orbitron' }}>Reset Password</h2>
      <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
        Enter your new password below.
      </p>

      {success ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,168,98,0.15)', border: '2px solid rgba(0,168,98,0.4)' }}>
            <CheckCircle size={28} style={{ color: 'var(--green)' }} />
          </div>
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Password updated! Redirecting to login...
          </p>
          <Link href="/login" className="btn-primary mt-2">Go to Login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
              <input required type={showPass ? 'text' : 'password'} value={form.new_password}
                onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
                className="form-input pr-10" style={{ paddingLeft: '2.5rem' }}
                placeholder="Min 8 chars, 1 uppercase, 1 number" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
              <input required type={showPass ? 'text' : 'password'} value={form.confirm}
                onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                className="form-input" style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••" />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading || !token} className="btn-primary w-full justify-center mt-2">
            {loading ? <><span className="spinner w-4 h-4 border-2 mr-2"></span>Updating...</> : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div className="glass-card rounded-2xl p-8 text-center text-[var(--text-secondary)]">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-center mt-4 text-sm text-[var(--text-secondary)]">
          <Link href="/login" className="text-[var(--green)] hover:underline">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
