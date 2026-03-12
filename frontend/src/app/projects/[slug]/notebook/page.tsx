'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string[];
  outputs?: any[];
  execution_count?: number | null;
}

interface NotebookData {
  cells: NotebookCell[];
  metadata?: any;
}

function MarkdownCell({ source }: { source: string }) {
  // Simple markdown renderer: headers, bold, italic, inline code, lists
  const html = source
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul]|<\/[hul]|<li)(.+)$/gm, '<p>$1</p>');
  return (
    <div className="rich-content nb-markdown" dangerouslySetInnerHTML={{ __html: html }}
      style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem' }} />
  );
}

function CodeCell({ source, outputs, execCount }: { source: string; outputs: any[]; execCount: number | null }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Input */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)', fontFamily: 'monospace', minWidth: '32px', paddingTop: '14px', textAlign: 'right' }}>
          [{execCount ?? ' '}]
        </span>
        <pre style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,200,255,0.15)', borderRadius: '8px', padding: '14px 16px', overflowX: 'auto', margin: 0 }}>
          <code style={{ color: '#a8d8ff', fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre' }}>
            {source}
          </code>
        </pre>
      </div>
      {/* Outputs */}
      {outputs?.length > 0 && outputs.map((out, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '4px' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(148,163,184,0.5)', fontFamily: 'monospace', minWidth: '32px', paddingTop: '10px', textAlign: 'right' }}>
            {out.execution_count ? `[${out.execution_count}]` : ''}
          </span>
          <div style={{ flex: 1 }}>
            {/* Stream output (print statements) */}
            {(out.output_type === 'stream' || out.output_type === 'execute_result' || out.output_type === 'display_data') && (
              <>
                {/* Text output */}
                {(out.text || out.data?.['text/plain']) && (
                  <pre style={{ background: 'rgba(0,168,98,0.06)', border: '1px solid rgba(0,168,98,0.15)', borderRadius: '6px', padding: '10px 14px', overflowX: 'auto', margin: 0, color: 'var(--green)', fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                    {(out.text || out.data?.['text/plain'])?.join?.('') || (out.text || out.data?.['text/plain'])}
                  </pre>
                )}
                {/* HTML output (tables, plotly, etc) */}
                {out.data?.['text/html'] && (
                  <div style={{ background: 'white', borderRadius: '6px', padding: '10px', overflowX: 'auto', color: '#000' }}
                    dangerouslySetInnerHTML={{ __html: Array.isArray(out.data['text/html']) ? out.data['text/html'].join('') : out.data['text/html'] }} />
                )}
                {/* Image output */}
                {out.data?.['image/png'] && (
                  <img src={`data:image/png;base64,${out.data['image/png']}`} alt="output"
                    style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '4px' }} />
                )}
              </>
            )}
            {/* Error output */}
            {out.output_type === 'error' && (
              <pre style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '10px 14px', color: '#f87171', fontFamily: 'monospace', fontSize: '0.8rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {out.traceback ? out.traceback.join('\n').replace(/\x1b\[[0-9;]*m/g, '') : `${out.ename}: ${out.evalue}`}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotebookViewer() {
  const { slug } = useParams();
  const [notebook, setNotebook] = useState<NotebookData | null>(null);
  const [notebookUrl, setNotebookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const API = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    if (!slug) return;
    // Fetch project to get notebook_url
    fetch(`/api/projects/${slug}`)
      .then(r => r.json())
      .then(async project => {
        if (!project.notebook_url) { setError('No notebook found for this project.'); setLoading(false); return; }
        const url = project.notebook_url.startsWith('/uploads') ? `${API}${project.notebook_url}` : project.notebook_url;
        setNotebookUrl(url);
        const nb = await fetch(url).then(r => r.json());
        setNotebook(nb);
      })
      .catch(() => setError('Failed to load notebook.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const kernelName = notebook?.metadata?.kernelspec?.display_name || 'Python';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#020c18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner w-12 h-12 border-4" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#020c18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      <Link href={`/projects/${slug}`} style={{ color: 'var(--green)' }}>← Back to project</Link>
    </div>
  );

  return (
    <div style={{ background: '#020c18', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(2,12,24,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,168,98,0.2)', padding: '12px 0' }}>
        <div className="container-xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href={`/projects/${slug}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
              <ArrowLeft size={15} /> Back to Project
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} style={{ color: 'var(--green)' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Jupyter Notebook</span>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '20px', background: 'rgba(0,168,98,0.15)', color: 'var(--green)', border: '1px solid rgba(0,168,98,0.3)' }}>
                {kernelName} · Read-Only
              </span>
            </div>
          </div>
          {notebookUrl && (
            <a href={notebookUrl} download
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(0,200,255,0.3)', color: 'var(--cyan)', textDecoration: 'none', fontSize: '0.8rem' }}>
              <Download size={14} /> Download .ipynb
            </a>
          )}
        </div>
      </div>

      {/* Notebook cells */}
      <div className="container-xl" style={{ padding: '2rem 0 4rem', maxWidth: '900px' }}>
        {notebook?.cells?.map((cell, idx) => (
          <div key={idx} style={{ marginBottom: '8px', borderRadius: '10px', overflow: 'hidden' }}>
            {cell.cell_type === 'markdown' && (
              <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)' }}>
                <MarkdownCell source={Array.isArray(cell.source) ? cell.source.join('') : cell.source} />
              </div>
            )}
            {cell.cell_type === 'code' && (
              <div style={{ padding: '12px 0' }}>
                <CodeCell
                  source={Array.isArray(cell.source) ? cell.source.join('') : cell.source}
                  outputs={cell.outputs || []}
                  execCount={cell.execution_count ?? null}
                />
              </div>
            )}
            {cell.cell_type === 'raw' && (
              <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.82rem', overflowX: 'auto' }}>
                {Array.isArray(cell.source) ? cell.source.join('') : cell.source}
              </pre>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .nb-markdown h1 { font-size:1.6rem; font-weight:800; margin:1rem 0 0.5rem; color:var(--text-primary); }
        .nb-markdown h2 { font-size:1.25rem; font-weight:700; margin:1rem 0 0.4rem; color:var(--text-primary); }
        .nb-markdown h3 { font-size:1rem; font-weight:600; margin:0.8rem 0 0.3rem; color:var(--green); }
        .nb-markdown ul { list-style:disc; padding-left:1.5rem; margin:0.5rem 0; }
        .nb-markdown li { margin:0.25rem 0; }
        .nb-markdown code { background:rgba(0,200,255,0.12); color:var(--cyan); padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.85em; }
        .nb-markdown strong { color:var(--text-primary); font-weight:700; }
        .nb-markdown p { margin:0.4rem 0; }
      `}</style>
    </div>
  );
}
