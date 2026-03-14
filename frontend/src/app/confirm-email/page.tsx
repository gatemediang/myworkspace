'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Invalid confirmation link.'); return; }
    api.get(`/auth/confirm-email?token=${token}`)
      .then(res => { setStatus('success'); setMessage(res.data.message); })
      .catch(err => { setStatus('error'); setMessage(err?.response?.data?.detail || 'Confirmation failed. The link may have already been used.'); });
  }, [token]);

  return (
    <div className="glass-card rounded-2xl p-8 text-center" style={{ border: '1px solid rgba(0,168,98,0.3)' }}>
      {status === 'loading' && (
        <>
          <div className="flex justify-center mb-4"><span className="spinner w-10 h-10 border-4"></span></div>
          <p className="text-[var(--text-secondary)]">Confirming your email...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(0,168,98,0.15)', border: '2px solid rgba(0,168,98,0.4)' }}>
            <CheckCircle size={32} style={{ color: 'var(--green)' }} />
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Orbitron' }}>Email Confirmed!</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">{message}</p>
          <Link href="/login" className="btn-primary">Go to Login</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle size={32} style={{ color: '#f87171' }} />
          </div>
          <h2 className="text-xl font-black text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Orbitron' }}>Link Invalid</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">{message}</p>
          <Link href="/login" className="btn-primary">Back to Login</Link>
        </>
      )}
    </div>
  );
}

export default function ConfirmEmailPage() {
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
          <ConfirmEmailContent />
        </Suspense>
        <p className="text-center mt-4 text-sm text-[var(--text-secondary)]">
          <Link href="/" className="text-[var(--green)] hover:underline">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
