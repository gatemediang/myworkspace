'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

// Social login icon components (inline SVG — no extra library needed)
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [showPass, setShowPass] = useState(false);
  const [formError, setFormError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { login, register, isLoading } = useAuthStore();
  const router = useRouter();

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m);
    setFormError('');
    setSignupSuccess(false);
    setForm(p => ({ ...p, confirmPassword: '', password: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (mode === 'signup' && form.password !== form.confirmPassword) {
      setFormError('Passwords do not match'); return;
    }
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
        router.push('/');
      } else {
        await register({ full_name: form.full_name, email: form.email, password: form.password, phone: form.phone });
        setSignupSuccess(true);
      }
    } catch (err: any) {
      const raw = err?.message || '';
      if (raw === 'UNCONFIRMED_EMAIL') {
        setFormError('Please confirm your email before logging in. Check your inbox for the confirmation link.');
      } else {
        setFormError(raw || (mode === 'signup' ? 'Sign up failed. Please try again.' : 'Login failed. Please check your email and password.'));
      }
    }
  };

  // Google / GitHub — note: these require backend OAuth2 routes to be configured.
  // For now they show a friendly message.
  const handleSocialLogin = (provider: string) => {
    setFormError(`${provider} login coming soon! Please use email/password for now.`);
  };

  // Shared input padding style — keeps icon and text separated
  const iconInput = { paddingLeft: '2.5rem' };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #020c18 0%, #040f1e 100%)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/images/logo.png" alt="WorkSpace" width={180} height={50}
              className="h-12 w-auto mx-auto object-contain" />
          </Link>
        </div>

        <div className="glass-card rounded-2xl p-8" style={{ border: '1px solid rgba(0,168,98,0.3)' }}>
          {/* Mode toggle */}
          <div className="flex gap-1 mb-8 bg-[rgba(10,22,40,0.8)] rounded-xl p-1">
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all
                  ${mode === m ? 'bg-[var(--green)] text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                {m === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6 text-center"
            style={{ fontFamily: 'Orbitron' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>

          {/* ── Signup success ── */}
          {signupSuccess && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,168,98,0.15)', border: '2px solid rgba(0,168,98,0.4)' }}>
                <CheckCircle size={28} style={{ color: 'var(--green)' }} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Orbitron' }}>Check your inbox</h3>
              <p className="text-sm text-[var(--text-secondary)] text-center">
                We sent a confirmation link to <strong className="text-[var(--text-primary)]">{form.email}</strong>.
                Click it to activate your account, then come back to log in.
              </p>
              <button onClick={() => switchMode('login')} className="btn-primary mt-2">Back to Login</button>
            </div>
          )}

          {/* ── Social login buttons ── */}
          {!signupSuccess && (<>
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocialLogin('Google')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-sm font-semibold"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)' }}
            >
              <GoogleIcon /> Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('GitHub')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-sm font-semibold"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)' }}
            >
              <GitHubIcon /> GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* ── Email/password form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="form-label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                  <input required value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                    className="form-input" style={iconInput} placeholder="Your full name" />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="form-label">Phone <span className="normal-case opacity-60">(optional)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                  <input value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="form-input" style={iconInput} placeholder="+44 xxx xxxx" />
                </div>
              </div>
            )}

            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                <input required type="email" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="form-input" style={iconInput} placeholder="your@email.com" />
              </div>
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                <input required type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="form-input pr-10" style={iconInput} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="form-label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" size={16} />
                  <input required type={showPass ? 'text' : 'password'} value={form.confirmPassword}
                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className="form-input" style={iconInput} placeholder="••••••••" />
                </div>
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right -mt-1">
                <Link href="/forgot-password" className="text-xs text-[var(--green)] hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center mt-2">
              {isLoading
                ? <><span className="spinner w-4 h-4 border-2 mr-2"></span>Processing...</>
                : mode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          </>)}

          {!signupSuccess && mode === 'login' && (
            <p className="text-center text-xs text-[var(--text-secondary)] mt-4">
              No account yet?{' '}
              <button onClick={() => switchMode('signup')} className="text-[var(--green)] hover:underline">Sign up free</button>
            </p>
          )}
          {!signupSuccess && mode === 'signup' && (
            <p className="text-center text-xs text-[var(--text-secondary)] mt-4">
              Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="text-[var(--green)] hover:underline">Login here</button>
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
