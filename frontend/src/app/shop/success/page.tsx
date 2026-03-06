'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Download, Home } from 'lucide-react';
import Image from 'next/image';

export default function ShopSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #020c18 0%, #040f1e 100%)' }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(0,168,98,0.15)', border: '2px solid var(--green)' }}>
          <CheckCircle size={40} className="text-[var(--green)]" />
        </div>
        <h1 className="text-3xl font-black text-[var(--text-primary)] mb-3" style={{ fontFamily: 'Orbitron' }}>
          Payment Successful!
        </h1>
        <p className="text-[var(--text-secondary)] mb-2">
          Thank you for your purchase. Your download links have been sent to your email address.
        </p>
        <p className="text-sm text-[var(--text-secondary)] mb-8">
          Check your inbox (and spam folder) for the download links.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/shop" className="btn-outline flex items-center gap-2">
            <Download size={16} /> Back to Shop
          </Link>
          <Link href="/" className="btn-primary flex items-center gap-2">
            <Home size={16} /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
