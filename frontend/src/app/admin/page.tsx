'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, FolderOpen, BookOpen, ShoppingBag, Gift,
  MessageSquare, Calendar, Users, Settings, LogOut, Upload,
  Plus, Trash2, Edit, Eye, Save, X, Image as ImageIcon, Video, Mail, Send, Award, GraduationCap, Download, Bot, MessageSquareMore
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import RichEditor from '@/components/ui/RichEditor';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Image from 'next/image';

type Section = 'dashboard' | 'projects' | 'tutorials' | 'products' | 'freebies' | 'contacts' | 'appointments' | 'users' | 'about' | 'newsletter' | 'certifications' | 'education' | 'clientele' | 'chatbot';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', icon: FolderOpen },
  { key: 'tutorials', label: 'Blog', icon: BookOpen },
  { key: 'products', label: 'Shop Products', icon: ShoppingBag },
  { key: 'freebies', label: 'FreeBies', icon: Gift },
  { key: 'contacts', label: 'Messages', icon: MessageSquare },
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'about', label: 'About Me', icon: Settings },
  { key: 'newsletter', label: 'Newsletter', icon: Mail },
  { key: 'certifications', label: 'Certifications', icon: Award },
  { key: 'education', label: 'Education', icon: GraduationCap },
  { key: 'clientele', label: 'Clientele', icon: Users },
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
    if (!['admin', 'instructor', 'superuser'].includes(user.role)){
      router.push('/');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
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
      certifications: '/certifications',
      chatbot: '/admin/bot-settings',
      education: '/education',
      clientele: '/clients',
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

  const clearFile = async (field: string) => {
    if (!editItem?.id) return;
    if (!confirm(`Remove this ${field.replace('_url','')}?`)) return;
    try {
      await api.delete(`/admin/projects/${editItem.id}/file/${field}`);
      setEditItem((p: any) => ({ ...p, [field]: null }));
      toast.success('File removed');
    } catch { toast.error('Failed to remove file'); }
  };
  const openForm = (item?: any) => {
    setEditItem(item || null);
    setFormData(item ? { ...item, tech_stack: Array.isArray(item.tech_stack) ? item.tech_stack.join(', ') : item.tech_stack } : { category: 'ai_ml', is_featured: false, order_index: 0, publish_to_blog: false });
    setFileInputs({});
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, String(v)); });
    if (section === 'projects') fd.append('publish_to_blog', String(formData.publish_to_blog || false));
    if (fileInputs.image) fd.append('image', fileInputs.image);
    if (fileInputs.digital_file) fd.append('digital_file', fileInputs.digital_file);
    if (fileInputs.photo) fd.append('photo', fileInputs.photo);
    if (fileInputs.source_code) fd.append('source_code', fileInputs.source_code);
    if (fileInputs.notebook) fd.append('notebook', fileInputs.notebook);
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
    if (fileInputs.source_code) fd.append('source_code', fileInputs.source_code);
    if (fileInputs.notebook) fd.append('notebook', fileInputs.notebook);
    if (fileInputs.cv) fd.append('cv', fileInputs.cv);
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
        <div className="flex-shrink-0 p-5 border-b border-[rgba(0,168,98,0.15)]">
          <Link href="/"><Image src="/images/logo.png" alt="WorkSpace" width={140} height={40} className="h-9 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" /></Link>
          <p className="text-xs text-[var(--text-secondary)] mt-1 uppercase tracking-wider">Admin Panel</p>
        </div>
        <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.75rem' }} className="space-y-1">
          {NAV.filter(n => !(['users'].includes(n.key)) || (user.role as string) === 'admin' || (user.role as string) === 'superuser').map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setSection(key as Section)}
              className={`admin-nav-item w-full ${section === key ? 'active' : ''}`}>
              <Icon size={18} />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </nav>
        <div className="flex-shrink-0 p-3 border-t border-[rgba(0,168,98,0.15)]" style={{ background: 'rgba(4,15,30,0.99)' }}>
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
            <StatCard label="Blog" value={stats.tutorials || 0} icon={BookOpen} color="#f59e0b" />
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
                <div key={item.id} onClick={() => openForm(item)} className="glass-card p-4 rounded-xl flex items-center gap-4 cursor-pointer" style={{overflow:"hidden", border:"1px solid rgba(0,200,255,0.12)", transition:"border-color 0.2s"}} onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--green)")} onMouseLeave={e=>(e.currentTarget.style.borderColor="rgba(0,200,255,0.12)")}>
                  {item.image_url && (
                    <img src={`${process.env.NEXT_PUBLIC_API_URL}${item.image_url}`} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div style={{flex:1, minWidth:0, overflow:"hidden"}}>
                    <p className="font-bold text-[var(--text-primary)]" style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{item.title || item.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]" style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%"}}>{item.summary?.replace(/<[^>]*>/g,"").substring(0,120) || item.description?.replace(/<[^>]*>/g,"").substring(0, 120)}</p>
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
                      {(item.preferred_date || item.preferred_time) && <p className="text-sm text-[var(--cyan)]">📅 {item.preferred_date || ''} {item.preferred_time ? '🕐 ' + item.preferred_time : ''}</p>}
                      <p className="text-sm text-[var(--text-secondary)] mt-2">{item.message}</p>
                    </div>
                    <div className="text-right text-xs text-[var(--text-secondary)] flex flex-col items-end gap-2">
                      {new Date(item.created_at).toLocaleDateString()}
                      {item.status && <div className="badge badge-green">{item.status}</div>}
                      <button onClick={async () => {
                        if (!confirm("Delete this message?")) return;
                        const ep = section === "contacts" ? `/admin/contacts/${item.id}` : `/admin/appointments/${item.id}`;
                        await api.delete(ep);
                        setData((prev: any[]) => prev.filter((d: any) => d.id !== item.id));
                      }} className="flex items-center gap-1 text-red-400 hover:text-red-300">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}


        {/* CHATBOT */}
        {section === 'chatbot' && <ChatbotAdmin apiBase={process.env.NEXT_PUBLIC_API_URL || ''} />}
        {/* USERS */}
        {section === 'users' && (['admin','superuser'].includes(user.role as string)) && (
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
              <label className="form-label">Bio</label>
              <RichEditor key="about-bio" value={typeof formData.bio_paragraphs === 'string' ? formData.bio_paragraphs : Array.isArray(formData.bio_paragraphs) ? formData.bio_paragraphs.map((p: string) => `<p>${p}</p>`).join('') : ''} onChange={v => setFormData((p: any) => ({ ...p, bio_paragraphs: v }))} placeholder="Write your bio..." minHeight="200px" />
            </div>
            <div>
              <label className="form-label">Interests (comma separated)</label>
              <input
                value={Array.isArray(formData.topics) ? formData.topics.join(', ') : (formData.topics || '')}
                onChange={e => setFormData((p: any) => ({ ...p, topics: e.target.value }))}
                onBlur={e => setFormData((p: any) => ({ ...p, topics: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) }))}
                className="form-input" placeholder="AI Research, GenAI, LLMs, ..." />
            </div>
            <div>
              <label className="form-label">Profile Photo</label>
              <div className="flex items-center gap-4">
                {formData.photo_url && <img src={`${process.env.NEXT_PUBLIC_API_URL}${formData.photo_url}`} alt="Profile" className="w-20 h-20 rounded-xl object-cover" />}
                <input type="file" accept="image/*" onChange={e => setFileInputs((p: any) => ({ ...p, photo: e.target.files?.[0] }))} className="form-input" />
              </div>
            </div>
            <div>
              <label className="form-label">CV / Resume (PDF)</label>
              <div className="flex items-center gap-4">
                {formData.cv_url && (
                  <a href={`${process.env.NEXT_PUBLIC_API_URL}${formData.cv_url}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[var(--green)] underline flex items-center gap-1">
                    <Download size={12} /> Current CV
                  </a>
                )}
                <input type="file" accept=".pdf,.doc,.docx"
                  onChange={e => setFileInputs((p: any) => ({ ...p, cv: e.target.files?.[0] }))}
                  className="form-input" />
              </div>
            </div>
            <button type="submit" className="btn-primary"><Save size={16} /> Save Changes</button>
          </form>
        )}

        {section === 'certifications' && (
          <CertificationsAdmin data={data} onRefresh={loadData} />
        )}

        {section === 'education' && (
          <EducationAdmin data={data} onRefresh={loadData} />
        )}

        {section === 'clientele' && (
          <ClienteleAdmin data={data} onRefresh={loadData} />
        )}

        {section === 'newsletter' && (
          <div className="space-y-6">
            {/* Audience Stats */}
            <NewsletterStats />
            {/* Compose */}
            <NewsletterCompose />
          </div>
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
                      <RichEditor key={`summary-${editItem?.id || 'new'}`} value={formData.summary || ''} onChange={v => setFormData((p: any) => ({ ...p, summary: v }))} placeholder="Project summary..." minHeight="100px" />
                    </div>
                    <div>
                      <label className="form-label">Full Description</label>
                      <RichEditor key={`description-${editItem?.id || 'new'}`} value={formData.description || ''} onChange={v => setFormData((p: any) => ({ ...p, description: v }))} placeholder="Full project details..." minHeight="180px" />
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
                    <div className="flex gap-4 flex-wrap">
                      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <input type="checkbox" checked={formData.is_featured || false} onChange={e => setFormData((p: any) => ({ ...p, is_featured: e.target.checked }))} />
                        Featured
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <input type="checkbox" checked={formData.publish_to_blog || false} onChange={e => setFormData((p: any) => ({ ...p, publish_to_blog: e.target.checked }))} />
                        <span style={{color:'var(--green)', fontWeight:600}}>Publish to Blog</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="form-label mb-0">Order</label>
                        <input type="number" value={formData.order_index || 0} onChange={e => setFormData((p: any) => ({ ...p, order_index: Number(e.target.value) }))} className="form-input w-20 py-1.5" />
                      </div>
                    </div>
                  </>
                )}

                {section === 'tutorials' && ( // Blog posts
                  <>
                    <div>
                      <label className="form-label">Summary</label>
                      <RichEditor key={`tsummary-${editItem?.id || 'new'}`} value={formData.summary || ''} onChange={v => setFormData((p: any) => ({ ...p, summary: v }))} placeholder="Tutorial summary..." minHeight="90px" />
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
                      <label className="form-label">Content</label>
                      <RichEditor key={`content-${editItem?.id || 'new'}`} value={formData.content || ''} onChange={v => setFormData((p: any) => ({ ...p, content: v }))} placeholder="Tutorial content..." minHeight="240px" /><textarea required value={formData.content || ''} onChange={e => setFormData((p: any) => ({ ...p, content: e.target.value }))} style={{display:'none'}}
                        className="form-input resize-y h-48 font-mono text-sm" placeholder="# Heading&#10;&#10;Write your tutorial in **Markdown**...&#10;&#10;```python&#10;code here&#10;```" />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <div>
                      <label className="form-label">Tech Stack</label>
                      <input value={formData.tech_stack || ''} onChange={e => setFormData((p: any) => ({ ...p, tech_stack: e.target.value }))} className="form-input" placeholder="Python, FastAPI, React, ..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="form-label">GitHub URL</label>
                        <input type="url" value={formData.github_url || ''} onChange={e => setFormData((p: any) => ({ ...p, github_url: e.target.value }))} className="form-input" placeholder="https://github.com/..." />
                      </div>
                      <div>
                        <label className="form-label">Live URL</label>
                        <input type="url" value={formData.live_url || ''} onChange={e => setFormData((p: any) => ({ ...p, live_url: e.target.value }))} className="form-input" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="form-label">Notebook URL</label>
                        <input type="url" value={formData.notebook_url || ''} onChange={e => setFormData((p: any) => ({ ...p, notebook_url: e.target.value }))} className="form-input" placeholder="https://colab.research.google.com/..." />
                      </div>
                    </div>
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
                    <div>
                      <label className="form-label">Live / External URL (optional)</label>
                      <input type="url" value={formData.live_url || ''} onChange={e => setFormData((p: any) => ({ ...p, live_url: e.target.value }))} className="form-input" placeholder="https://..." />
                    </div>
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
                      <div className="flex items-center gap-3 mt-2">
                        <img src={`${process.env.NEXT_PUBLIC_API_URL}${editItem.image_url}`} alt="" className="w-24 h-16 rounded-lg object-cover" />
                        <button type="button" onClick={() => clearFile('image_url')}
                          className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1">
                          <Trash2 size={11} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Source code upload for projects only */}
                {section === 'projects' && (
                  <div>
                    <label className="form-label flex items-center gap-1"><Upload size={14} /> Source Code File (zip, py, ipynb...)</label>
                    <input type="file" accept=".zip,.py,.ipynb,.js,.ts,.json,.tar.gz" onChange={e => setFileInputs((p: any) => ({ ...p, source_code: e.target.files?.[0] }))} className="form-input" />
                    {editItem?.source_code_url && (
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-[var(--green)]">✓ File uploaded</p>
                        <button type="button" onClick={() => clearFile('source_code_url')}
                          className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1">
                          <Trash2 size={11} /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {section === 'projects' && (
                  <div>
                    <label className="form-label flex items-center gap-1">📓 Jupyter Notebook (.ipynb)</label>
                    <input type="file" accept=".ipynb" onChange={e => setFileInputs((p: any) => ({ ...p, notebook: e.target.files?.[0] }))} className="form-input" />
                    {editItem?.notebook_url && (
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-xs text-[var(--green)]">✓ Notebook uploaded</p>
                        <button type="button" onClick={() => clearFile('notebook_url')}
                          className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1">
                          <Trash2 size={11} /> Remove
                        </button>
                      </div>
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

// ── Newsletter Stats Component ──
function NewsletterStats() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    Promise.all([
      api.get('/admin/newsletter/subscribers').catch(() => ({ data: [] })),
      api.get('/admin/freebies/downloads').catch(() => ({ data: [] })),
      api.get('/admin/users').catch(() => ({ data: [] })),
    ]).then(([subs, freebies, users]) => {
      const confirmedSubs = subs.data.filter((s: any) => s.is_confirmed).length;
      const confirmedFreebies = [...new Map(freebies.data.filter((f: any) => f.is_confirmed).map((f: any) => [f.email, f])).values()].length;
      const totalUsers = users.data.length;
      setStats({ confirmedSubs, confirmedFreebies, totalUsers, total: new Set([...subs.data.map((s:any)=>s.email), ...freebies.data.map((f:any)=>f.email), ...users.data.map((u:any)=>u.email)]).size });
    });
  }, []);
  if (!stats) return <div className="flex justify-center py-8"><div className="spinner w-8 h-8 border-4"/></div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Newsletter Subscribers', value: stats.confirmedSubs, color: 'var(--green)' },
        { label: 'Freebie Downloaders', value: stats.confirmedFreebies, color: 'var(--cyan)' },
        { label: 'Registered Users', value: stats.totalUsers, color: '#f59e0b' },
        { label: 'Total Unique Emails', value: stats.total, color: '#a78bfa' },
      ].map(s => (
        <div key={s.label} className="glass-card p-5 rounded-xl text-center">
          <div className="text-3xl font-black mb-1" style={{ color: s.color, fontFamily: 'Orbitron' }}>{s.value}</div>
          <div className="text-xs text-[var(--text-secondary)]">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Newsletter Compose Component ──
function NewsletterCompose() {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) { toast.error('Subject and content required'); return; }
    if (!confirm(`Send newsletter to ${audience === 'all' ? 'all audiences' : audience}?`)) return;
    setSending(true);
    try {
      const res = await api.post('/admin/newsletter/broadcast', { subject, content, audience });
      setResult(res.data);
      toast.success(`Sending to ${res.data.recipient_count} recipients!`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Send failed');
    } finally { setSending(false); }
  };

  return (
    <div className="glass-card p-6 rounded-xl space-y-5">
      <h2 className="text-lg font-black text-[var(--text-primary)]" style={{ fontFamily: 'Orbitron' }}>
        Compose Newsletter
      </h2>
      {result && (
        <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(0,168,98,0.1)', border: '1px solid rgba(0,168,98,0.3)', color: 'var(--green)' }}>
          ✅ {result.message}
        </div>
      )}
      <div>
        <label className="form-label">Audience</label>
        <select value={audience} onChange={e => setAudience(e.target.value)} className="form-input">
          <option value="all">Everyone (All sources)</option>
          <option value="subscribers">Newsletter Subscribers only</option>
          <option value="freebie">Freebie Downloaders only</option>
          <option value="users">Registered Users only</option>
        </select>
      </div>
      <div>
        <label className="form-label">Subject</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} className="form-input" placeholder="Your newsletter subject..." />
      </div>
      <div>
        <label className="form-label">Content</label>
        <RichEditor key="newsletter-content" value={content} onChange={setContent} placeholder="Write your newsletter..." minHeight="300px" />
      </div>
      <button onClick={handleSend} disabled={sending} className="btn-primary flex items-center gap-2">
        {sending ? <><div className="spinner w-4 h-4 border-2"/> Sending...</> : <><Mail size={16}/> Send Newsletter</>}
      </button>
    </div>
  );
}


// ── Certifications Admin ─────────────────────────────────────────
function CertificationsAdmin({ data, onRefresh }: { data: any[], onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [name, setName] = useState('');
  const [certUrl, setCertUrl] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const openForm = (item?: any) => {
    setEditItem(item || null); setName(item?.name || '');
    setCertUrl(item?.cert_url || '');
    setOrderIndex(item?.order_index || 0); setImageFile(null); setShowForm(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData();
    fd.append('name', name); fd.append('order_index', String(orderIndex));
    if (certUrl) fd.append('cert_url', certUrl);
    if (imageFile) fd.append('image', imageFile);
    try {
      if (editItem) await api.put(`/admin/certifications/${editItem.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/admin/certifications', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(editItem ? 'Updated!' : 'Created!'); setShowForm(false); onRefresh();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };
  const handleDelete = async (id: number) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/admin/certifications/${id}`); toast.success('Deleted'); onRefresh();
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => openForm()} className="btn-primary text-sm py-2 px-4 flex items-center gap-2"><Plus size={16} /> Add Certification</button>
      </div>
      <div className="flex flex-wrap gap-4">
        {data.length === 0 && <div className="glass-card p-10 w-full text-center rounded-xl"><p className="text-[var(--text-secondary)]">No certifications yet.</p></div>}
        {data.map((cert: any) => (
          <div key={cert.id} className="glass-card rounded-xl overflow-hidden flex flex-col items-center" style={{ width: '220px', border: '1px solid rgba(0,168,98,0.2)' }}>
            <div className="w-full flex items-center justify-center p-4 bg-[rgba(0,15,30,0.5)]" style={{ height: '200px' }}>
              {cert.image_url ? <img src={`${apiBase}${cert.image_url}`} alt={cert.name} className="object-contain" style={{ maxHeight: '180px', maxWidth: '180px' }} />
                : <Award size={48} style={{ color: 'var(--green)', opacity: 0.4 }} />}
            </div>
            <div className="w-full px-3 py-2 text-center" style={{ borderTop: '1px solid rgba(0,168,98,0.15)' }}>
              <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 mb-2">{cert.name}</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => openForm(cert)} className="btn-outline text-xs py-1 px-2"><Edit size={11} /></button>
                <button onClick={() => handleDelete(cert.id)} className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-500/10"><Trash2 size={11} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,12,24,0.9)' }}>
          <div className="glass-card rounded-2xl p-8 w-full max-w-md" style={{ border: '1px solid rgba(0,168,98,0.4)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-[var(--text-primary)]" style={{ fontFamily: 'Orbitron' }}>{editItem ? 'Edit' : 'Add'} Certification</h2>
              <button onClick={() => setShowForm(false)}><X className="text-[var(--text-secondary)]" size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="form-label">Certification Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="form-input" placeholder="e.g. AWS Solutions Architect" /></div>
              <div><label className="form-label">Certificate URL (optional)</label>
                <input type="url" value={certUrl} onChange={e => setCertUrl(e.target.value)} className="form-input" placeholder="https://www.credly.com/badges/..." /></div>
              <div><label className="form-label">Badge Image</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="form-input" />
                {editItem?.image_url && !imageFile && <img src={`${apiBase}${editItem.image_url}`} alt="" className="mt-2 w-20 h-20 object-contain" />}</div>
              <div><label className="form-label">Display Order</label>
                <input type="number" value={orderIndex} onChange={e => setOrderIndex(Number(e.target.value))} className="form-input w-24" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center"><Save size={16} /> {editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Education Admin ───────────────────────────────────────────────
function EducationAdmin({ data, onRefresh }: { data: any[], onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [schoolName, setSchoolName] = useState('');
  const [degree, setDegree] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const openForm = (item?: any) => {
    setEditItem(item || null); setSchoolName(item?.school_name || '');
    setDegree(item?.degree || ''); setOrderIndex(item?.order_index || 0);
    setLogoFile(null); setShowForm(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData();
    fd.append('school_name', schoolName); fd.append('degree', degree);
    fd.append('order_index', String(orderIndex));
    if (logoFile) fd.append('logo', logoFile);
    try {
      if (editItem) await api.put(`/admin/education/${editItem.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/admin/education', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(editItem ? 'Updated!' : 'Created!'); setShowForm(false); onRefresh();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };
  const handleDelete = async (id: number) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/admin/education/${id}`); toast.success('Deleted'); onRefresh();
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => openForm()} className="btn-primary text-sm py-2 px-4 flex items-center gap-2"><Plus size={16} /> Add Education</button>
      </div>
      <div className="flex flex-wrap gap-4">
        {data.length === 0 && <div className="glass-card p-10 w-full text-center rounded-xl"><p className="text-[var(--text-secondary)]">No education entries yet.</p></div>}
        {data.map((edu: any) => (
          <div key={edu.id} className="glass-card rounded-xl overflow-hidden flex flex-col items-center" style={{ width: '220px', border: '1px solid rgba(0,200,255,0.2)' }}>
            <div className="w-full flex items-center justify-center p-4 bg-[rgba(0,15,30,0.5)]" style={{ height: '180px' }}>
              {edu.logo_url ? <img src={`${apiBase}${edu.logo_url}`} alt={edu.school_name} className="object-contain" style={{ maxHeight: '160px', maxWidth: '180px' }} />
                : <GraduationCap size={48} style={{ color: 'var(--cyan)', opacity: 0.4 }} />}
            </div>
            <div className="w-full px-3 py-2 text-center" style={{ borderTop: '1px solid rgba(0,200,255,0.15)' }}>
              <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-1 mb-0.5">{edu.school_name}</p>
              <p className="text-xs line-clamp-1 mb-2" style={{ color: 'var(--cyan)' }}>{edu.degree}</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => openForm(edu)} className="btn-outline text-xs py-1 px-2"><Edit size={11} /></button>
                <button onClick={() => handleDelete(edu.id)} className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-500/10"><Trash2 size={11} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,12,24,0.9)' }}>
          <div className="glass-card rounded-2xl p-8 w-full max-w-md" style={{ border: '1px solid rgba(0,168,98,0.4)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-[var(--text-primary)]" style={{ fontFamily: 'Orbitron' }}>{editItem ? 'Edit' : 'Add'} Education</h2>
              <button onClick={() => setShowForm(false)}><X className="text-[var(--text-secondary)]" size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="form-label">University / College Logo</label>
                <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="form-input" />
                {editItem?.logo_url && !logoFile && <img src={`${apiBase}${editItem.logo_url}`} alt="" className="mt-2 w-20 h-20 object-contain" />}</div>
              <div><label className="form-label">School Name</label>
                <input required value={schoolName} onChange={e => setSchoolName(e.target.value)} className="form-input" placeholder="e.g. University of Lagos" /></div>
              <div><label className="form-label">Degree &amp; Course of Study</label>
                <input required value={degree} onChange={e => setDegree(e.target.value)} className="form-input" placeholder="e.g. B.Sc. Computer Science" /></div>
              <div><label className="form-label">Display Order</label>
                <input type="number" value={orderIndex} onChange={e => setOrderIndex(Number(e.target.value))} className="form-input w-24" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center"><Save size={16} /> {editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Clientele Admin ───────────────────────────────────────────────
function ClienteleAdmin({ data, onRefresh }: { data: any[], onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [name, setName] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const openForm = (item?: any) => {
    setEditItem(item || null); setName(item?.name || '');
    setOrderIndex(item?.order_index || 0); setLogoFile(null); setShowForm(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const fd = new FormData();
    fd.append('name', name); fd.append('order_index', String(orderIndex));
    if (logoFile) fd.append('logo', logoFile);
    try {
      if (editItem) await api.put(`/admin/clients/${editItem.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/admin/clients', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(editItem ? 'Updated!' : 'Created!'); setShowForm(false); onRefresh();
    } catch { toast.error('Failed'); } finally { setSaving(false); }
  };
  const handleDelete = async (id: number) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/admin/clients/${id}`); toast.success('Deleted'); onRefresh();
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => openForm()} className="btn-primary text-sm py-2 px-4 flex items-center gap-2"><Plus size={16} /> Add Client</button>
      </div>
      <div className="flex flex-wrap gap-4">
        {data.length === 0 && <div className="glass-card p-10 w-full text-center rounded-xl"><p className="text-[var(--text-secondary)]">No clients yet.</p></div>}
        {data.map((client: any) => (
          <div key={client.id} className="glass-card rounded-xl p-4 flex flex-col items-center gap-3" style={{ width: '160px', border: '1px solid rgba(0,200,255,0.15)' }}>
            <div className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,200,255,0.2)' }}>
              {client.logo_url ? <img src={`${apiBase}${client.logo_url}`} alt={client.name} className="object-contain p-1" style={{ maxWidth: '72px', maxHeight: '72px' }} />
                : <span className="text-2xl font-black text-[var(--text-secondary)]">{client.name[0]}</span>}
            </div>
            <p className="text-xs text-center font-semibold text-[var(--text-primary)] leading-tight">{client.name}</p>
            <div className="flex gap-2">
              <button onClick={() => openForm(client)} className="btn-outline text-xs py-1 px-2"><Edit size={11} /></button>
              <button onClick={() => handleDelete(client.id)} className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-500/10"><Trash2 size={11} /></button>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,12,24,0.9)' }}>
          <div className="glass-card rounded-2xl p-8 w-full max-w-md" style={{ border: '1px solid rgba(0,168,98,0.4)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-[var(--text-primary)]" style={{ fontFamily: 'Orbitron' }}>{editItem ? 'Edit' : 'Add'} Client</h2>
              <button onClick={() => setShowForm(false)}><X className="text-[var(--text-secondary)]" size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="form-label">Client Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="form-input" placeholder="e.g. Google, Microsoft" /></div>
              <div><label className="form-label">Logo Image</label>
                <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} className="form-input" />
                {editItem?.logo_url && !logoFile && <img src={`${apiBase}${editItem.logo_url}`} alt="" className="mt-2 w-16 h-16 object-contain" />}</div>
              <div><label className="form-label">Display Order</label>
                <input type="number" value={orderIndex} onChange={e => setOrderIndex(Number(e.target.value))} className="form-input w-24" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center"><Save size={16} /> {editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CHATBOT ADMIN
// ═══════════════════════════════════════════════════════
function ChatbotAdmin({ apiBase }: { apiBase: string }) {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editFaq, setEditFaq] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    loadFaqs();
    loadBotSettings();
    loadPhoto();
  }, []);

  const loadFaqs = async () => {
    const res = await fetch(`${apiBase}/api/faqs`);
    const data = await res.json();
    setFaqs(data);
  };

  const loadBotSettings = async () => {
    try {
      const res = await fetch(`${apiBase}/api/admin/bot-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSystemPrompt(data.system_prompt || defaultPrompt);
    } catch { setSystemPrompt(defaultPrompt); }
  };

  const loadPhoto = async () => {
    try {
      const res = await fetch(`${apiBase}/api/site-settings/chatbot_photo`);
      const data = await res.json();
      if (data.value) setPhotoUrl(data.value);
    } catch {}
  };

  const defaultPrompt = `You are the AI assistant for Tunji Ologun's WorkSpace portfolio website.
You are helpful, professional, and friendly.
You can:
1. Answer questions about projects, tutorials, products, and services
2. Help users navigate the website
3. Book appointments (collect: name, email, phone, preferred date/time, message)
4. Recommend relevant products or tutorials
When booking an appointment, collect all required info and confirm.
When you have collected appointment details, include in your response:
[APPOINTMENT_REQUEST: name="...", email="...", phone="...", date="...", time="...", message="..."]
Keep responses concise. Do not print the entire website — only answer what is asked.`;

  const openForm = (faq?: any) => {
    setEditFaq(faq || null);
    setQuestion(faq?.question || '');
    setAnswer(faq?.answer || '');
    setOrderIndex(faq?.order_index || faqs.length);
    setShowForm(true);
  };

  const handleFaqSubmit = async () => {
    if (!question || !answer) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('question', question);
    fd.append('answer', answer);
    fd.append('order_index', String(orderIndex));
    try {
      if (editFaq) {
        await fetch(`${apiBase}/api/admin/faqs/${editFaq.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
      } else {
        await fetch(`${apiBase}/api/admin/faqs`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      }
      setShowForm(false); loadFaqs();
    } finally { setSaving(false); }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!confirm('Delete this FAQ?')) return;
    await fetch(`${apiBase}/api/admin/faqs/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadFaqs();
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    const fd = new FormData();
    fd.append('system_prompt', systemPrompt);
    try {
      await fetch(`${apiBase}/api/admin/bot-settings`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
      alert('✅ Bot prompt saved!');
    } finally { setSavingPrompt(false); }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setSavingPhoto(true);
    const fd = new FormData();
    fd.append('photo', photoFile);
    try {
      const res = await fetch(`${apiBase}/api/admin/site-settings/chatbot_photo/upload`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd
      });
      const data = await res.json();
      if (data.url) setPhotoUrl(data.url);
      alert('✅ Photo uploaded!');
    } finally { setSavingPhoto(false); }
  };

  return (
    <div className="space-y-8">
      {/* Bot Photo */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--green)', fontFamily: 'Orbitron' }}>Bot Profile Photo</h3>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center" style={{ border: '2px solid var(--cyan)', background: 'var(--blue-mid)' }}>
            {photoUrl ? <img src={`${apiBase}${photoUrl}`} alt="Bot" className="w-full h-full object-cover" /> : <Bot size={36} style={{ color: 'var(--cyan)' }} />}
          </div>
          <div className="flex-1">
            <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="form-input mb-2" />
            <button onClick={handlePhotoUpload} disabled={!photoFile || savingPhoto} className="btn-primary text-sm py-2 px-4">
              {savingPhoto ? 'Uploading...' : 'Upload Photo'}
            </button>
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg" style={{ color: 'var(--green)', fontFamily: 'Orbitron' }}>Quick FAQs ({faqs.length}/4)</h3>
          {faqs.length < 4 && <button onClick={() => openForm()} className="btn-primary text-sm py-2 px-4"><Plus size={14} /> Add FAQ</button>}
        </div>
        <div className="space-y-3">
          {faqs.map(f => (
            <div key={f.id} className="glass-card p-4 rounded-xl" style={{ border: '1px solid rgba(0,168,98,0.2)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{f.question}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{f.answer}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openForm(f)} className="text-[var(--cyan)] hover:opacity-80"><Edit size={14} /></button>
                  <button onClick={() => handleDeleteFaq(f.id)} className="text-red-400 hover:opacity-80"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {faqs.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No FAQs yet. Add up to 4 quick-reply buttons for the chatbot.</p>}
        </div>
      </div>

      {/* System Prompt */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--green)', fontFamily: 'Orbitron' }}>Bot System Prompt</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>This controls what the chatbot knows and how it behaves. Edit carefully.</p>
        <textarea
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          rows={12}
          className="form-input w-full resize-y font-mono text-xs"
          style={{ minHeight: '200px' }}
        />
        <button onClick={handleSavePrompt} disabled={savingPrompt} className="btn-primary text-sm py-2 px-4 mt-3">
          {savingPrompt ? 'Saving...' : <><Save size={14} /> Save Prompt</>}
        </button>
      </div>

      {/* FAQ Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass-card p-6 rounded-2xl w-full max-w-lg" style={{ border: '1px solid rgba(0,168,98,0.3)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--green)' }}>{editFaq ? 'Edit FAQ' : 'Add FAQ'}</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="form-label">Question</label>
                <input value={question} onChange={e => setQuestion(e.target.value)} className="form-input" placeholder="e.g. What services do you offer?" /></div>
              <div><label className="form-label">Answer</label>
                <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={4} className="form-input resize-none" placeholder="Short answer shown in chat..." /></div>
              <div><label className="form-label">Display Order</label>
                <input type="number" value={orderIndex} onChange={e => setOrderIndex(Number(e.target.value))} className="form-input" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleFaqSubmit} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : <><Save size={14} /> {editFaq ? 'Update' : 'Create'}</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
