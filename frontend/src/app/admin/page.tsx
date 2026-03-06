'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, BookOpen, ShoppingBag, Gift,
  MessageSquare, Calendar, Users, Settings, LogOut, Upload,
  Plus, Trash2, Edit, Eye, Save, X, Image as ImageIcon, Video
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Image from 'next/image';

type Section = 'dashboard' | 'projects' | 'tutorials' | 'products' | 'freebies' | 'contacts' | 'appointments' | 'users' | 'about';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', icon: FolderOpen },
  { key: 'tutorials', label: 'Tutorials', icon: BookOpen },
  { key: 'products', label: 'Shop Products', icon: ShoppingBag },
  { key: 'freebies', label: 'FreeBies', icon: Gift },
  { key: 'contacts', label: 'Messages', icon: MessageSquare },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'about', label: 'About Me', icon: Settings },
];

const PROJECT_CATS = ['ai_ml', 'data_analysis', 'ai_automations', 'fullstack'];

// ---- Mini components ----
function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="glass-card p-5 rounded-xl flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-black text-[var(--text-primary)]" style={{ fontFamily: 'Orbitron' }}>{value}</p>
        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

// ---- Main Admin ----
export default function AdminPage() {
  const { user, logout, hydrate } = useAuthStore();
  const router = useRouter();
  const [section, setSection] = useState<Section>('dashboard');
  const [stats, setStats] = useState<any>({});
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [fileInputs, setFileInputs] = useState<any>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin' && user.role !== 'instructor') {
      router.push('/');
    }
  }, [user]);

  useEffect(() => {
    if (section === 'dashboard') {
      api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    } else {
      loadData();
    }
  }, [section]);

  const loadData = async () => {
    setLoading(true);
    const endpoints: Record<string, string> = {
      projects: '/projects', tutorials: '/tutorials',
      products: '/products', freebies: '/freebies',
      contacts: '/admin/contacts', appointments: '/admin/appointments',
      users: '/admin/users',
    };
    if (section === 'about') {
      api.get('/about').then(r => setFormData(r.data)).catch(() => {});
      setLoading(false);
      return;
    }
    const ep = endpoints[section];
    if (ep) {
      api.get(ep).then(r => setData(r.data)).catch(() => setData([])).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    const eps: Record<string, string> = {
      projects: `/admin/projects/${id}`, tutorials: `/admin/tutorials/${id}`,
      products: `/admin/products/${id}`, freebies: `/admin/freebies/${id}`,
    };
    try {
      await api.delete(eps[section]);
      toast.success('Deleted!');
      loadData();
    } catch { toast.error('Delete failed'); }
  };

  const openForm = (item?: any) => {
    setEditItem(item || null);
    setFormData(item ? { ...item, tech_stack: Array.isArray(item.tech_stack) ? item.tech_stack.join(', ') : item.tech_stack } : {});
    setFileInputs({});
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, String(v)); });
    if (fileInputs.image) fd.append('image', fileInputs.image);
    if (fileInputs.digital_file) fd.append('digital_file', fileInputs.digital_file);
    if (fileInputs.photo) fd.append('photo', fileInputs.photo);
    const eps: Record<string, string> = {
      projects: '/admin/projects', tutorials: '/admin/tutorials',
      products: '/admin/products', freebies: '/admin/freebies',
    };
    try {
      if (editItem?.id) {
        await api.put(`${eps[section]}/${editItem.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Updated!');
      } else {
        await api.post(eps[section], fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Created!');
      }
      setShowForm(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed');
    }
  };

  const handleAboutSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', formData.name || '');
    fd.append('title', formData.title || '');
    fd.append('bio_paragraphs', JSON.stringify(Array.isArray(formData.bio_paragraphs) ? formData.bio_paragraphs : [formData.bio_paragraphs]));
    fd.append('topics', JSON.stringify(Array.isArray(formData.topics) ? formData.topics : []));
    fd.append('social_links', JSON.stringify(formData.social_links || {}));
    if (fileInputs.photo) fd.append('photo', fileInputs.photo);
    try {
      await api.put('/admin/about', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('About page updated!');
    } catch { toast.error('Failed to update'); }
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#020c18' }}>
      <div className="spinner w-10 h-10 border-4"></div>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: '#020c18' }}>
      {/* Sidebar */}
      <aside className={`admin-sidebar transition-all ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-[rgba(0,168,98,0.15)]">
          <Image src="/images/logo.png" alt="WorkSpace" width={140} height={40} className="h-9 w-auto object-contain" />
          <p className="text-xs text-[var(--text-secondary)] mt-1 uppercase tracking-wider">Admin Panel</p>
        </div>

        <nav className="p-3 space-y-1">
          {NAV.filter(n => user.role === 'admin' || !['users'].includes(n.key)).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setSection(key as Section)}
              className={`admin-nav-item w-full ${section === key ? 'active' : ''}`}>
              <Icon size={18} />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[rgba(0,168,98,0.15)]">
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--green)] flex items-center justify-center text-black font-bold text-sm">
              {user.full_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user.full_name}</p>
              <p className="text-xs text-[var(--green)] capitalize">{user.role}</p>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/'); }}
            className="admin-nav-item w-full text-red-400 hover:bg-red-500/10">
            <LogOut size={16} /> <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all ${sidebarOpen ? 'ml-[260px]' : 'ml-0'} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-black text-[var(--text-primary)] capitalize" style={{ fontFamily: 'Orbitron' }}>
            {section.replace('_', ' ')}
          </h1>
          {['projects', 'tutorials', 'products', 'freebies'].includes(section) && (
            <button onClick={() => openForm()} className="btn-primary text-sm py-2 px-4">
              <Plus size={16} /> Add New
            </button>
          )}
        </div>

        {/* DASHBOARD */}
        {section === 'dashboard' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Users" value={stats.users || 0} icon={Users} color="var(--cyan)" />
            <StatCard label="Projects" value={stats.projects || 0} icon={FolderOpen} color="var(--green)" />
            <StatCard label="Tutorials" value={stats.tutorials || 0} icon={BookOpen} color="#f59e0b" />
            <StatCard label="Products" value={stats.products || 0} icon={ShoppingBag} color="#ec4899" />
            <StatCard label="Orders" value={stats.orders || 0} icon={ShoppingBag} color="var(--green)" />
            <StatCard label="FreeBies" value={stats.freebies || 0} icon={Gift} color="var(--cyan)" />
            <StatCard label="Messages" value={stats.contacts || 0} icon={MessageSquare} color="#f59e0b" />
            <StatCard label="Appointments" value={stats.appointments || 0} icon={Calendar} color="#ec4899" />
          </div>
        )}

        {/* LIST VIEWS */}
        {['projects', 'tutorials', 'products', 'freebies'].includes(section) && !showForm && (
          <div className="space-y-3">
            {loading ? <div className="flex justify-center py-10"><div className="spinner w-8 h-8 border-4"></div></div> :
              data.length === 0 ? (
                <div className="glass-card p-10 text-center rounded-xl">
                  <p className="text-[var(--text-secondary)]">No items yet. Click "Add New" to create one.</p>
                </div>
              ) : data.map((item: any) => (
                <div key={item.id} className="glass-card p-4 rounded-xl flex items-center gap-4">
                  {item.image_url && (
                    <img src={`${process.env.NEXT_PUBLIC_API_URL}${item.image_url}`} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--text-primary)] truncate">{item.title || item.name}</p>
                    <p className="text-sm text-[var(--text-secondary)] truncate">{item.summary || item.description?.substring(0, 100)}</p>
                    {item.price && <p className="text-sm text-[var(--green)] font-bold mt-1">${item.price}</p>}
                    {item.category && <span className="badge badge-cyan mt-1">{item.category}</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openForm(item)} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1">
                      <Edit size={12} /> Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* READ-ONLY VIEWS */}
        {['contacts', 'appointments'].includes(section) && (
          <div className="space-y-3">
            {loading ? <div className="flex justify-center py-10"><div className="spinner w-8 h-8 border-4"></div></div> :
              data.map((item: any) => (
                <div key={item.id} className="glass-card p-5 rounded-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-[var(--text-primary)]">{item.full_name}</p>
                      <p className="text-sm text-[var(--green)]">{item.email}</p>
                      {item.phone && <p className="text-sm text-[var(--text-secondary)]">{item.phone}</p>}
                      {item.preferred_date && <p className="text-sm text-[var(--cyan)]">Preferred: {item.preferred_date}</p>}
                      <p className="text-sm text-[var(--text-secondary)] mt-2">{item.message}</p>
                    </div>
                    <div className="text-right text-xs text-[var(--text-secondary)]">
                      {new Date(item.created_at).toLocaleDateString()}
                      {item.status && <div className="badge badge-green mt-1">{item.status}</div>}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* USERS */}
        {section === 'users' && user.role === 'admin' && (
          <div className="space-y-3">
            {data.map((u: any) => (
              <div key={u.id} className="glass-card p-4 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--green)] flex items-center justify-center text-black font-bold">
                  {u.full_name?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[var(--text-primary)]">{u.full_name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{u.email}</p>
                </div>
                <select defaultValue={u.role}
                  onChange={async (e) => {
                    await api.put(`/admin/users/${u.id}/role?role=${e.target.value}`);
                    toast.success('Role updated!');
                  }}
                  className="form-input w-36 py-1.5 text-sm">
                  <option value="guest">Guest</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {/* ABOUT */}
        {section === 'about' && (
          <form onSubmit={handleAboutSave} className="glass-card p-6 rounded-xl max-w-2xl space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Name</label>
                <input value={formData.name || ''} onChange={e => setFormData((p: any) => ({ ...p, name: e.target.value }))} className="form-input" />
              </div>
              <div>
                <label className="form-label">Title</label>
                <input value={formData.title || ''} onChange={e => setFormData((p: any) => ({ ...p, title: e.target.value }))} className="form-input" />
              </div>
            </div>
            <div>
              <label className="form-label">Bio Paragraphs (one per line)</label>
              <textarea
                value={Array.isArray(formData.bio_paragraphs) ? formData.bio_paragraphs.join('\n\n') : ''}
                onChange={e => setFormData((p: any) => ({ ...p, bio_paragraphs: e.target.value.split('\n\n').filter(Boolean) }))}
                className="form-input resize-none h-48" placeholder="Each paragraph separated by blank line..." />
            </div>
            <div>
              <label className="form-label">Topics (comma separated)</label>
              <input
                value={Array.isArray(formData.topics) ? formData.topics.join(', ') : ''}
                onChange={e => setFormData((p: any) => ({ ...p, topics: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) }))}
                className="form-input" placeholder="AI Research, GenAI, ..." />
            </div>
            <div>
              <label className="form-label">Profile Photo</label>
              <div className="flex items-center gap-4">
                {formData.photo_url && <img src={`${process.env.NEXT_PUBLIC_API_URL}${formData.photo_url}`} alt="Profile" className="w-20 h-20 rounded-xl object-cover" />}
                <input type="file" accept="image/*" onChange={e => setFileInputs((p: any) => ({ ...p, photo: e.target.files?.[0] }))} className="form-input" />
              </div>
            </div>
            <button type="submit" className="btn-primary"><Save size={16} /> Save Changes</button>
          </form>
        )}

        {/* CREATE/EDIT FORM MODAL */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 p-4 overflow-y-auto" style={{ background: 'rgba(2,12,24,0.9)' }}>
            <div className="glass-card rounded-2xl p-8 w-full max-w-2xl mb-10" style={{ border: '1px solid rgba(0,168,98,0.4)' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-[var(--text-primary)]" style={{ fontFamily: 'Orbitron' }}>
                  {editItem ? 'Edit' : 'Create'} {section.slice(0, -1)}
                </h2>
                <button onClick={() => setShowForm(false)}><X className="text-[var(--text-secondary)]" size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Title</label>
                  <input required value={formData.title || ''} onChange={e => setFormData((p: any) => ({ ...p, title: e.target.value }))} className="form-input" />
                </div>

                {section === 'projects' && (
                  <>
                    <div>
                      <label className="form-label">Category</label>
                      <select value={formData.category || 'ai_ml'} onChange={e => setFormData((p: any) => ({ ...p, category: e.target.value }))} className="form-input">
                        {PROJECT_CATS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Summary</label>
                      <textarea value={formData.summary || ''} onChange={e => setFormData((p: any) => ({ ...p, summary: e.target.value }))} className="form-input resize-none h-20" />
                    </div>
                    <div>
                      <label className="form-label">Full Description</label>
                      <textarea value={formData.description || ''} onChange={e => setFormData((p: any) => ({ ...p, description: e.target.value }))} className="form-input resize-none h-32" />
                    </div>
                    <div>
                      <label className="form-label">Tech Stack (comma separated)</label>
                      <input value={formData.tech_stack || ''} onChange={e => setFormData((p: any) => ({ ...p, tech_stack: e.target.value }))} className="form-input" placeholder="Python, FastAPI, React, ..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">GitHub URL</label>
                        <input type="url" value={formData.github_url || ''} onChange={e => setFormData((p: any) => ({ ...p, github_url: e.target.value }))} className="form-input" />
                      </div>
                      <div>
                        <label className="form-label">Live URL</label>
                        <input type="url" value={formData.live_url || ''} onChange={e => setFormData((p: any) => ({ ...p, live_url: e.target.value }))} className="form-input" />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <input type="checkbox" checked={formData.is_featured || false} onChange={e => setFormData((p: any) => ({ ...p, is_featured: e.target.checked }))} />
                        Featured
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="form-label mb-0">Order</label>
                        <input type="number" value={formData.order_index || 0} onChange={e => setFormData((p: any) => ({ ...p, order_index: Number(e.target.value) }))} className="form-input w-20 py-1.5" />
                      </div>
                    </div>
                  </>
                )}

                {section === 'tutorials' && (
                  <>
                    <div>
                      <label className="form-label">Summary</label>
                      <input value={formData.summary || ''} onChange={e => setFormData((p: any) => ({ ...p, summary: e.target.value }))} className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">Category</label>
                      <input value={formData.category || ''} onChange={e => setFormData((p: any) => ({ ...p, category: e.target.value }))} className="form-input" placeholder="Python, AI/ML, ..." />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-2"><Video size={14} /> Video URL (YouTube embed)</label>
                      <input type="url" value={formData.video_url || ''} onChange={e => setFormData((p: any) => ({ ...p, video_url: e.target.value }))} className="form-input" placeholder="https://www.youtube.com/watch?v=..." />
                    </div>
                    <div>
                      <label className="form-label">Content (Markdown)</label>
                      <textarea required value={formData.content || ''} onChange={e => setFormData((p: any) => ({ ...p, content: e.target.value }))}
                        className="form-input resize-y h-48 font-mono text-sm" placeholder="# Heading&#10;&#10;Write your tutorial in **Markdown**...&#10;&#10;```python&#10;code here&#10;```" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <input type="checkbox" checked={formData.is_published || false} onChange={e => setFormData((p: any) => ({ ...p, is_published: e.target.checked }))} />
                      Publish
                    </label>
                  </>
                )}

                {section === 'products' && (
                  <>
                    <div>
                      <label className="form-label">Description</label>
                      <textarea value={formData.description || ''} onChange={e => setFormData((p: any) => ({ ...p, description: e.target.value }))} className="form-input resize-none h-24" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Price (USD)</label>
                        <input required type="number" step="0.01" value={formData.price || ''} onChange={e => setFormData((p: any) => ({ ...p, price: e.target.value }))} className="form-input" />
                      </div>
                      <div>
                        <label className="form-label">Category</label>
                        <select value={formData.category || 'ebook'} onChange={e => setFormData((p: any) => ({ ...p, category: e.target.value }))} className="form-input">
                          <option value="ebook">eBook</option>
                          <option value="source_code">Source Code</option>
                          <option value="template">Template</option>
                          <option value="course">Course</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Upload size={14} /> Digital File (PDF, ZIP, etc.)</label>
                      <input type="file" onChange={e => setFileInputs((p: any) => ({ ...p, digital_file: e.target.files?.[0] }))} className="form-input" />
                      {editItem?.file_name && <p className="text-xs text-[var(--text-secondary)] mt-1">Current: {editItem.file_name}</p>}
                    </div>
                  </>
                )}

                {section === 'freebies' && (
                  <>
                    <div>
                      <label className="form-label">Description</label>
                      <textarea value={formData.description || ''} onChange={e => setFormData((p: any) => ({ ...p, description: e.target.value }))} className="form-input resize-none h-24" />
                    </div>
                    <div>
                      <label className="form-label">Category</label>
                      <input value={formData.category || ''} onChange={e => setFormData((p: any) => ({ ...p, category: e.target.value }))} className="form-input" placeholder="ebook, template, ..." />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Upload size={14} /> Digital File</label>
                      <input type="file" onChange={e => setFileInputs((p: any) => ({ ...p, digital_file: e.target.files?.[0] }))} className="form-input" />
                    </div>
                  </>
                )}

                {/* Image upload for all */}
                {['projects', 'tutorials', 'products', 'freebies'].includes(section) && (
                  <div>
                    <label className="form-label flex items-center gap-1"><ImageIcon size={14} /> Cover Image</label>
                    <input type="file" accept="image/*" onChange={e => setFileInputs((p: any) => ({ ...p, image: e.target.files?.[0] }))} className="form-input" />
                    {editItem?.image_url && (
                      <img src={`${process.env.NEXT_PUBLIC_API_URL}${editItem.image_url}`} alt="" className="w-24 h-16 rounded-lg object-cover mt-2" />
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center">
                    <Save size={16} /> {editItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
