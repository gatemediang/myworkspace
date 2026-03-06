'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const navLinks = [
  { label: 'Meet Me', href: '/meet-me' },
  { label: 'Tutorials', href: '/tutorials' },
  { label: 'FreeBies', href: '/freebies' },
  { label: 'Shop', href: '/shop' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, []);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isHome = pathname === '/';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || !isHome ? 'bg-[#020c18]/95 backdrop-blur-md border-b border-[rgba(0,168,98,0.15)]' : 'bg-transparent'}`}>
      <div className="container-xl">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="WorkSpace" width={160} height={45} className="h-10 w-auto object-contain" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`nav-link ${pathname === link.href ? 'active' : ''}`}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[var(--green)] flex items-center justify-center text-black font-bold text-sm">
                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-semibold">{user.full_name?.split(' ')[0]}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 glass-card py-2 rounded-xl">
                    {(user.role === 'admin' || user.role === 'instructor') && (
                      <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--green)] transition-colors">
                        <Settings size={14} /> Admin Dashboard
                      </Link>
                    )}
                    <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                      <User size={14} /> Profile
                    </Link>
                    <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors">
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="nav-cta">Login</Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden text-[var(--text-primary)] p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-[rgba(0,168,98,0.15)] animate-slide-up">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className={`block py-3 text-base font-semibold uppercase tracking-wider transition-colors ${pathname === link.href ? 'text-[var(--green)]' : 'text-[var(--text-secondary)]'}`}>
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                {(user.role === 'admin' || user.role === 'instructor') && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} className="block py-3 text-[var(--green)] font-semibold">Admin Dashboard</Link>
                )}
                <button onClick={() => { logout(); setMobileOpen(false); }} className="block py-3 text-red-400 font-semibold">Logout</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block py-3">
                <span className="nav-cta">Login</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
