'use client';
import { useEffect, useState } from 'react';
import { ShoppingCart, Download, Tag } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ShopPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data)).catch(() => { setProducts([]); toast.error('Failed to load products. Please refresh.'); }).finally(() => setLoading(false));
  }, []);

  const addToCart = (product: any) => {
    if (cart.find(c => c.id === product.id)) { toast.error('Already in cart'); return; }
    setCart(prev => [...prev, product]);
    toast.success(`${product.title} added to cart!`);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart.length) { toast.error('Cart is empty'); return; }
    setCheckingOut(true);
    try {
      const res = await api.post('/shop/checkout', { product_ids: cart.map(p => p.id), customer_email: email, customer_name: name });
      window.location.href = res.data.checkout_url;
    } catch {
      toast.error('Checkout failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="container-xl max-w-5xl">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="section-tag">Digital Products</div>
              <h1 className="section-title mt-2">Shop</h1>
            </div>
            {cart.length > 0 && (
              <button onClick={() => setShowCheckout(true)}
                className="btn-primary relative">
                <ShoppingCart size={18} />
                Cart ({cart.length})
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="spinner w-10 h-10 border-4"></div></div>
          ) : products.length === 0 ? (
            <div className="glass-card p-16 text-center rounded-2xl">
              <p className="text-[var(--text-secondary)] text-lg">No products yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className="glass-card rounded-xl overflow-hidden flex flex-col md:flex-row">
                  {p.image_url && (
                    <div className="w-full md:w-32 h-32 flex-shrink-0">
                      <img src={`${process.env.NEXT_PUBLIC_API_URL}${p.image_url}`} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-green">{p.category}</span>
                        <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                          <Download size={10} /> {p.downloads}
                        </span>
                      </div>
                      <h3 className="font-bold text-[var(--text-primary)] text-base">{p.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-1">{p.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-black text-[var(--green)]" style={{ fontFamily: 'Orbitron' }}>${p.price}</p>
                      </div>
                      <button onClick={() => addToCart(p)} className="btn-primary py-2 px-5 text-sm whitespace-nowrap">
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,12,24,0.95)' }}>
          <div className="glass-card rounded-2xl p-8 w-full max-w-md" style={{ border: '1px solid rgba(0,168,98,0.4)' }}>
            <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6" style={{ fontFamily: 'Orbitron' }}>Checkout</h2>
            <div className="mb-6 space-y-2">
              {cart.map(p => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{p.title}</span>
                  <span className="text-[var(--green)] font-bold">${p.price}</span>
                </div>
              ))}
              <div className="border-t border-[rgba(0,168,98,0.2)] pt-2 flex justify-between font-bold">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-[var(--green)]">${cart.reduce((s, p) => s + p.price, 0).toFixed(2)}</span>
              </div>
            </div>
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label className="form-label">Full Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="form-input" placeholder="Your name" />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" placeholder="your@email.com" />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">Download links will be sent to your email after payment.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCheckout(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={checkingOut} className="btn-primary flex-1 justify-center">
                  {checkingOut ? 'Processing...' : 'Pay with Stripe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
      <ChatBot />
    </div>
  );
}
