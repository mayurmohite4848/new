import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Loader2, AlertCircle, Copy, Check } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#040711',
    primaryColor: '#6366f1',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#818cf8',
    lineColor: '#38bdf8',
    secondaryColor: '#06b6d4',
    tertiaryColor: '#1e293b'
  }
});

export default function MermaidViewer({ chartCode }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!chartCode || !chartCode.trim()) return;
      
      const cleanChart = chartCode.trim();
      const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;

      try {
        setError(null);
        const { svg } = await mermaid.render(uniqueId, cleanChart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err) {
        console.warn('Mermaid render error:', err);
        if (isMounted) {
          setError(err.message || 'Diagram syntax error');
        }
      }
    };

    renderDiagram();
    return () => { isMounted = false; };
  }, [chartCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(chartCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div style={{
        background: '#040711',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        margin: '8px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', color: '#fb7185', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            <span>Mermaid Diagram (Raw Source)</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="btn btn-ghost btn-sm"
            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
          >
            {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre style={{
          margin: 0,
          padding: '8px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '4px',
          color: '#cbd5e1',
          fontSize: '0.78rem',
          fontFamily: 'var(--font-mono)',
          overflowX: 'auto'
        }}>
          <code>{chartCode}</code>
        </pre>
      </div>
    );
  }

  return (
    <div style={{
      background: '#040711',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      borderRadius: '10px',
      overflow: 'hidden',
      margin: '10px 0',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Diagram Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        fontSize: '0.72rem',
        color: 'var(--text-dim)'
      }}>
        <span style={{ fontWeight: 600, color: '#818cf8' }}>📐 Interactive Architecture / Diagram</span>
        <button
          onClick={handleCopyCode}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.72rem'
          }}
          title="Copy Mermaid source code"
        >
          {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy Code'}</span>
        </button>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        style={{
          padding: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflowX: 'auto',
          minHeight: '80px'
        }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
