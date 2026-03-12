'use client';
import { useEffect, useRef, useCallback } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Heading2, Heading3, Quote, Minus, Undo, Redo, AlignLeft, AlignCenter, Code, FileCode } from 'lucide-react';

interface RichEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const ToolBtn = ({ onClick, title, children }: any) => (
  <button type="button" title={title}
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    style={{ padding: '4px 7px', borderRadius: '5px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,255,0.1)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
    {children}
  </button>
);

const Sep = () => <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 3px' }} />;

export default function RichEditor({ value, onChange, placeholder = 'Write here...', minHeight = '150px' }: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const internal = useRef(false);

  useEffect(() => {
    if (!ref.current || internal.current) { internal.current = false; return; }
    if (ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || '';
  }, [value]);

  const exec = useCallback((cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    internal.current = true;
    onChange(ref.current?.innerHTML || '');
  }, [onChange]);

  const insertInlineCode = useCallback(() => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const selected = range.toString();
      const code = document.createElement('code');
      code.style.cssText = 'background:rgba(0,200,255,0.12);color:var(--cyan);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.85em;';
      code.textContent = selected || 'code';
      range.deleteContents();
      range.insertNode(code);
    }
    internal.current = true;
    onChange(ref.current?.innerHTML || '');
  }, [onChange]);

  const insertCodeBlock = useCallback(() => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const selected = range.toString();
      const pre = document.createElement('pre');
      pre.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid rgba(0,200,255,0.2);border-radius:8px;padding:16px;overflow-x:auto;margin:12px 0;';
      const code = document.createElement('code');
      code.style.cssText = 'color:var(--cyan);font-family:monospace;font-size:0.85em;white-space:pre;';
      code.textContent = selected || '// your code here';
      pre.appendChild(code);
      range.deleteContents();
      range.insertNode(pre);
    }
    internal.current = true;
    onChange(ref.current?.innerHTML || '');
  }, [onChange]);

  return (
    <div style={{ border: '1px solid rgba(0,200,255,0.2)', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px', padding: '6px 8px', borderBottom: '1px solid rgba(0,200,255,0.12)', background: 'rgba(0,0,0,0.2)' }}>
        <ToolBtn onClick={() => exec('undo')} title="Undo"><Undo size={13} /></ToolBtn>
        <ToolBtn onClick={() => exec('redo')} title="Redo"><Redo size={13} /></ToolBtn>
        <Sep />
        <ToolBtn onClick={() => exec('formatBlock', 'h2')} title="H2"><Heading2 size={13} /></ToolBtn>
        <ToolBtn onClick={() => exec('formatBlock', 'h3')} title="H3"><Heading3 size={13} /></ToolBtn>
        <ToolBtn onClick={() => exec('formatBlock', 'p')} title="Paragraph"><AlignLeft size={13} /></ToolBtn>
        <Sep />
        <ToolBtn onClick={() => exec('bold')} title="Bold"><Bold size={13} /></ToolBtn>
        <ToolBtn onClick={() => exec('italic')} title="Italic"><Italic size={13} /></ToolBtn>
        <ToolBtn onClick={() => exec('underline')} title="Underline"><Underline size={13} /></ToolBtn>
        <Sep />
        <ToolBtn onClick={() => exec('insertUnorderedList')} title="Bullet list"><List size={13} /></ToolBtn>
        <ToolBtn onClick={() => exec('insertOrderedList')} title="Numbered list"><ListOrdered size={13} /></ToolBtn>
        <ToolBtn onClick={() => exec('formatBlock', 'blockquote')} title="Quote"><Quote size={13} /></ToolBtn>
        <ToolBtn onClick={() => exec('insertHorizontalRule')} title="Divider"><Minus size={13} /></ToolBtn>
        <Sep />
        <ToolBtn onClick={insertInlineCode} title="Inline code"><Code size={13} /></ToolBtn>
        <ToolBtn onClick={insertCodeBlock} title="Code block"><FileCode size={13} /></ToolBtn>
        <Sep />
        <ToolBtn onClick={() => exec('justifyLeft')} title="Left"><AlignLeft size={13} /></ToolBtn>
        <ToolBtn onClick={() => exec('justifyCenter')} title="Center"><AlignCenter size={13} /></ToolBtn>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={() => { internal.current = true; onChange(ref.current?.innerHTML || ''); }}
        onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); exec(e.shiftKey ? 'outdent' : 'indent'); } }}
        data-placeholder={placeholder}
        style={{ minHeight, padding: '12px 14px', color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.7, outline: 'none', overflowY: 'auto' }}
        className="rich-editor-body" />
      <style>{`
        .rich-editor-body:empty:before { content: attr(data-placeholder); color: rgba(148,163,184,0.4); pointer-events: none; }
        .rich-editor-body h2 { font-size:1.15rem; font-weight:700; margin:10px 0 5px; }
        .rich-editor-body h3 { font-size:1rem; font-weight:600; margin:8px 0 4px; color:var(--green); }
        .rich-editor-body ul { list-style:disc; padding-left:1.4rem; margin:5px 0; }
        .rich-editor-body ol { list-style:decimal; padding-left:1.4rem; margin:5px 0; }
        .rich-editor-body blockquote { border-left:3px solid var(--green); padding-left:0.9rem; margin:8px 0; color:var(--text-secondary); font-style:italic; }
        .rich-editor-body hr { border:none; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0; }
        .rich-editor-body b,.rich-editor-body strong { font-weight:700; }
        .rich-editor-body pre { background:rgba(0,0,0,0.4); border:1px solid rgba(0,200,255,0.2); border-radius:8px; padding:14px; overflow-x:auto; margin:10px 0; }
        .rich-editor-body pre code { color:var(--cyan); font-family:monospace; font-size:0.82em; white-space:pre; }
        .rich-editor-body code { background:rgba(0,200,255,0.12); color:var(--cyan); padding:2px 5px; border-radius:4px; font-family:monospace; font-size:0.85em; }
      `}</style>
    </div>
  );
}
