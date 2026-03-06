'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [showPass, setShowPass] = useState(false);
  const { login, register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await register({ full_name: form.full_name, email: form.email, password: form.password, phone: form.phone });
        toast.success('Account created!');
      }
      router.push('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-grid" style={{ background: 'linear-gradient(135deg, #020c18 0%, #040f1e 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/images/logo.png" alt="WorkSpace" width={180} height={50} className="h-12 w-auto mx-auto object-contain" />
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-8" style={{ border: '1px solid rgba(0,168,98,0.3)' }}>
          {/* Toggle */}
          <div className="flex gap-1 mb-8 bg-[rgba(10,22,40,0.8)] rounded-xl p-1">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${mode === m ? 'bg-[var(--green)] text-black' : 'text-[var(--text-secondary)]'}`}>
                {m === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6 text-center" style={{ fontFamily: 'Orbitron' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="form-label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                  <input required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                    className="form-input pl-10" placeholder="Your full name" />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="form-label">Phone <span className="normal-case opacity-60">(optional)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="form-input pl-10" placeholder="+44 xxx xxxx" />
                </div>
              </div>
            )}

            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="form-input pl-10" placeholder="your@email.com" />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                <input required type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="form-input pl-10 pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="form-label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                  <input required type={showPass ? 'text' : 'password'} value={form.confirmPassword}
                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className="form-input pl-10" placeholder="••••••••" />
                </div>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center mt-2">
              {isLoading ? <><span className="spinner w-4 h-4 border-2 mr-2"></span>Processing...</> : mode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-center text-xs text-[var(--text-secondary)] mt-4">
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="text-[var(--green)]">Login here</button>
            </p>
          )}
        </div>

        <p className="text-center mt-4 text-sm text-[var(--text-secondary)]">
          <Link href="/" className="text-[var(--green)] hover:underline">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
