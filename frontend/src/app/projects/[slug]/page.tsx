'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Github, ExternalLink, Download, Tag, BookOpen } from 'lucide-react';

export default function ProjectPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/projects/${slug}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setProject)
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020c18' }}>
      <div className="spinner w-12 h-12 border-4" />
    </div>
  );

  if (!project) return null;

  const imgSrc = project.image_url?.startsWith('/uploads')
    ? `${API}${project.image_url}`
    : project.image_url;

  const sourceCodeSrc = project.source_code_url ? `${API}${project.source_code_url}` : null;
  const notebookUrl = project.notebook_url ? `${API}${project.notebook_url}` : null;
  const isNotebook = project.notebook_url?.endsWith('.ipynb');

  return (
    <div style={{ background: '#020c18', minHeight: '100vh', color: 'var(--text-primary)' }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: '55vh', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        {imgSrc && (
          <>
            <div style={{ position: 'absolute', inset: 0 }}>
              <img src={imgSrc} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.22 }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #020c18 35%, rgba(2,12,24,0.6) 70%, rgba(2,12,24,0.3) 100%)' }} />
          </>
        )}
        <div style={{ position: 'absolute', top: '30%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,168,98,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="container-xl" style={{ position: 'relative', zIndex: 10, paddingBottom: '3rem', paddingTop: '7rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
            <ArrowLeft size={16} /> Back to Projects
          </Link>

          <div style={{ marginBottom: '1rem' }}>
            <span className="badge badge-green" style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {project.category?.replace(/_/g, ' ')}
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3.2rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '1.5rem', maxWidth: '800px', fontFamily: 'Orbitron, monospace' }}>
            {project.title}
          </h1>

          {/* SUMMARY FIRST */}
          {project.summary && (
            <div style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '680px', lineHeight: 1.75, marginBottom: '2rem' }}
              dangerouslySetInnerHTML={{ __html: project.summary.replace(/\n/g, '<br/>') }} />
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {project.live_url && (
              <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                View Live <ExternalLink size={16} />
              </a>
            )}
            {project.github_url && (
              <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Github size={16} /> GitHub
              </a>
            )}
            {sourceCodeSrc && (
              <a href={sourceCodeSrc} download style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(0,200,255,0.3)', color: 'var(--cyan)', textDecoration: 'none', fontSize: '0.9rem' }}>
                <Download size={16} /> Download Source
              </a>)}
            {isNotebook && notebookUrl && (
              <a href={`/projects/${project.slug}/notebook`} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(0,168,98,0.4)', color: 'var(--green)', textDecoration: 'none', fontSize: '0.9rem', background: 'rgba(0,168,98,0.08)' }}>
                <BookOpen size={16} /> View Notebook
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── BODY ── */}
      <section style={{ padding: '4rem 0', background: 'linear-gradient(to bottom, #020c18, #040f1e)' }}>
        <div className="container-xl">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'start' }}>

            {/* Main */}
            <div style={{ gridColumn: 'span 2' }}>
              {imgSrc && (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', marginBottom: '2.5rem', border: '1px solid rgba(0,200,255,0.15)' }}>
                  <img src={imgSrc} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {project.description && (
                <div>
                  <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.1rem', color: 'var(--green)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Project Details
                  </h2>
                  <div className="rich-content" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}
                    dangerouslySetInnerHTML={{ __html: project.description }} />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {project.tech_stack?.filter((t: string) => t.trim()).length > 0 && (
                <div style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(0,168,98,0.2)', background: 'rgba(0,0,0,0.25)' }}>
                  <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--green)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={12} /> Tech Stack
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {project.tech_stack.filter((t: string) => t.trim()).map((tech: string) => (
                      <span key={tech} style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: '20px', background: 'rgba(0,200,255,0.08)', color: 'var(--cyan)', border: '1px solid rgba(0,200,255,0.2)', fontWeight: 500 }}>
                        {tech.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(0,168,98,0.2)', background: 'rgba(0,0,0,0.25)' }}>
                <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--green)', marginBottom: '1rem' }}>Links</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {project.live_url && (
                    <a href={project.live_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                      <ExternalLink size={15} /> Live Demo
                    </a>
                  )}
                  {project.github_url && (
                    <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                      <Github size={15} /> Source on GitHub
                    </a>
                  )}
                  {sourceCodeSrc && (
                    <a href={sourceCodeSrc} download
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                      <Download size={15} /> Download Source Code
                    </a>
                  )}
                  {isNotebook && notebookUrl && (
                    <a href={`/projects/${project.slug}/notebook`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                      <BookOpen size={15} /> View Notebook (Read-Only)
                    </a>
                  )}
                </div>
              </div>

              <div style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(0,168,98,0.2)', background: 'rgba(0,0,0,0.25)' }}>
                <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--green)', marginBottom: '0.75rem' }}>Category</h3>
                <span className="badge badge-green">{project.category?.replace(/_/g, ' ')}</span>
              </div>

            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '3rem 0', background: '#020c18', textAlign: 'center' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '8px', border: '1px solid rgba(0,200,255,0.3)', color: 'var(--cyan)', textDecoration: 'none', fontSize: '0.9rem' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--green)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,200,255,0.3)')}>
          <ArrowLeft size={16} /> Back to All Projects
        </Link>
      </section>

    </div>
  );
}
