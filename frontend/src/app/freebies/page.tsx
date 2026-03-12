'use client';
import { useEffect, useState } from 'react';
import { Download, Gift } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function FreebiesPage() {
  const [freebies, setFreebies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; freebie: any | null }>({ open: false, freebie: null });
  const [form, setForm] = useState({ full_name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/freebies').then(res => setFreebies(res.data)).catch(() => setFreebies([])).finally(() => setLoading(false));
  }, []);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/freebies/download', { freebie_id: modal.freebie?.id, ...form });
      toast.success(res.data.message || 'Check your email to confirm and get your download!');
      setModal({ open: false, freebie: null });
      setForm({ full_name: '', email: '' });
    } catch {
      toast.error('Download failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container-xl max-w-5xl">
          <div className="mb-10">
            <div className="section-tag">Free Resources</div>
            <h1 className="section-title mt-2">Free<span>Bies</span></h1>
            <p className="text-[var(--text-secondary)] mt-2 max-w-xl">
              Free digital resources to help you learn and build. Download by submitting your name and email.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="spinner w-10 h-10 border-4"></div></div>
          ) : freebies.length === 0 ? (
            <div className="glass-card p-16 text-center rounded-2xl">
              <Gift size={48} className="mx-auto mb-4 text-[var(--green)] opacity-50" />
              <p className="text-[var(--text-secondary)] text-lg">No freebies yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {freebies.map(f => (
                <div key={f.id} className="glass-card rounded-xl overflow-hidden flex flex-col">
                  {f.image_url ? (
                    <div className="h-44 overflow-hidden">
                      <img src={`${process.env.NEXT_PUBLIC_API_URL}${f.image_url}`} alt={f.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center" style={{ background: 'rgba(0,168,98,0.08)' }}>
                      <Gift size={48} className="text-[var(--green)] opacity-40" />
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="mb-2"><span className="badge badge-green">{f.category}</span></div>
                    <h3 className="font-bold text-[var(--text-primary)] mb-2">{f.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] flex-1 line-clamp-3 mb-4">{f.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                        <Download size={12} /> {f.downloads} downloads
                      </span>
                      <button onClick={() => setModal({ open: true, freebie: f })} className="btn-primary text-sm py-2 px-4">
                        <Download size={14} /> Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Download Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,12,24,0.95)' }}>
          <div className="glass-card rounded-2xl p-8 w-full max-w-md" style={{ border: '1px solid rgba(0,168,98,0.4)' }}>
            <h2 className="text-xl font-black text-[var(--text-primary)] mb-2" style={{ fontFamily: 'Orbitron' }}>
              Download Free Resource
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6">{modal.freebie?.title}</p>
            <form onSubmit={handleDownload} className="space-y-4">
              <div>
                <label className="form-label">Full Name</label>
                <input required value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="form-input" placeholder="Your full name" />
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="form-input" placeholder="your@email.com" />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">The download link will also be sent to your email.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModal({ open: false, freebie: null })} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? 'Processing...' : <><Download size={14} /> Download</>}
                </button>
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                📧 By downloading, you automatically subscribe to our <strong style={{ color: 'var(--green)' }}>Tech Newsletter</strong>. You can unsubscribe anytime.
              </p>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <ChatBot />
    </div>
  );
}
