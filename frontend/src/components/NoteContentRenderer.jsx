import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import MathViewer from './MathViewer';
import MermaidViewer from './MermaidViewer';

export default function NoteContentRenderer({ 
  content = '', 
  onJumpToPage = null 
}) {
  const [copiedId, setCopiedId] = useState(null);

  if (!content || !content.trim()) {
    return (
      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>
        No content available.
      </div>
    );
  }

  const handleCopyCode = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to parse inline styles (Bold, Italic, Code, Inline Math $...$, and [Page X] citations)
  const renderInlineStyles = (text, keyPrefix = 'inline') => {
    if (!text) return null;

    // Regex for:
    // 1. [Page X] citation badges
    // 2. Bold: **text**
    // 3. Inline code: `text`
    // 4. Inline math: $math$ (avoid matching standard currency like $10 unless enclosed)
    // 5. Italic: *text* or _text_
    const tokenRegex = /(\[Page\s+\d+(?:,\s*Page\s+\d+)*\]|\*\*[^*]+\*\*|`[^`]+`|\$(?:[^\$\n]+)\$|\*[^*]+\*|_[^_]+_)/g;
    const parts = [];
    let lastIdx = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index));
      }

      const token = match[0];

      if (token.startsWith('[Page') && token.endsWith(']')) {
        // Citation badge
        const pageMatches = token.match(/\d+/g);
        parts.push(
          <span
            key={`${keyPrefix}-badge-${match.index}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '1px 7px',
              margin: '0 3px',
              borderRadius: '6px',
              background: 'rgba(99, 102, 241, 0.25)',
              border: '1px solid rgba(99, 102, 241, 0.45)',
              color: '#c7d2fe',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: onJumpToPage && pageMatches ? 'pointer' : 'default',
              userSelect: 'none',
              verticalAlign: 'baseline',
              transition: 'all 0.15s ease'
            }}
            onClick={() => {
              if (onJumpToPage && pageMatches && pageMatches.length > 0) {
                const targetPageNum = parseInt(pageMatches[0], 10);
                onJumpToPage(targetPageNum - 1);
              }
            }}
            title={onJumpToPage && pageMatches ? `Jump to Page ${pageMatches[0]}` : undefined}
          >
            📖 {token}
          </span>
        );
      } else if (token.startsWith('**') && token.endsWith('**')) {
        // Bold
        const inner = token.slice(2, -2);
        parts.push(
          <strong key={`${keyPrefix}-b-${match.index}`} style={{ fontWeight: 700, color: '#f8fafc' }}>
            {renderInlineStyles(inner, `${keyPrefix}-b-${match.index}`)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        // Inline code
        const inner = token.slice(1, -1);
        parts.push(
          <code key={`${keyPrefix}-c-${match.index}`} style={{
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85em',
            color: '#38bdf8'
          }}>
            {inner}
          </code>
        );
      } else if (token.startsWith('$') && token.endsWith('$')) {
        // Inline Math
        const inner = token.slice(1, -1);
        parts.push(
          <MathViewer key={`${keyPrefix}-m-${match.index}`} math={inner} displayMode={false} />
        );
      } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
        // Italic
        const inner = token.slice(1, -1);
        parts.push(
          <em key={`${keyPrefix}-i-${match.index}`} style={{ fontStyle: 'italic', color: '#cbd5e1' }}>
            {inner}
          </em>
        );
      }

      lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx));
    }

    return parts;
  };

  // Helper to parse line-by-line block structures
  const renderFormattedBlocks = (rawContent) => {
    // 1. Separate code blocks (```...```) and display math blocks ($$...$$)
    const blockRegex = /(?:```([a-zA-Z0-9_-]*)\n([\s\S]*?)```|\$\$([\s\S]*?)\$\$)/g;
    const segments = [];
    let lastIdx = 0;
    let match;

    while ((match = blockRegex.exec(rawContent)) !== null) {
      if (match.index > lastIdx) {
        segments.push({ type: 'text', text: rawContent.slice(lastIdx, match.index) });
      }

      if (match[1] !== undefined || match[2] !== undefined) {
        // Triple backtick block
        segments.push({
          type: 'code',
          language: (match[1] || 'text').trim().toLowerCase(),
          code: (match[2] || '').trim()
        });
      } else if (match[3] !== undefined) {
        // $$ Display math block $$
        segments.push({
          type: 'math_display',
          code: match[3].trim()
        });
      }

      lastIdx = blockRegex.lastIndex;
    }

    if (lastIdx < rawContent.length) {
      segments.push({ type: 'text', text: rawContent.slice(lastIdx) });
    }

    return segments.map((seg, sIdx) => {
      if (seg.type === 'code') {
        const lang = seg.language;
        if (lang === 'mermaid') {
          return <MermaidViewer key={`mermaid-${sIdx}`} chartCode={seg.code} />;
        }
        if (lang === 'math' || lang === 'latex' || lang === 'katex') {
          return <MathViewer key={`math-${sIdx}`} math={seg.code} displayMode={true} />;
        }

        const codeId = `code-seg-${sIdx}`;
        return (
          <div
            key={codeId}
            style={{
              background: '#040711',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              overflow: 'hidden',
              margin: '10px 0',
              fontSize: '0.86rem'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 14px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'var(--text-dim)',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)'
            }}>
              <span>{seg.language || 'code'}</span>
              <button
                onClick={() => handleCopyCode(codeId, seg.code)}
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
              >
                {copiedId === codeId ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                <span>{copiedId === codeId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre style={{
              padding: '14px',
              margin: 0,
              overflowX: 'auto',
              fontFamily: 'var(--font-mono)',
              lineHeight: '1.5',
              color: '#e2e8f0'
            }}>
              <code>{seg.code}</code>
            </pre>
          </div>
        );
      }

      if (seg.type === 'math_display') {
        return <MathViewer key={`math-disp-${sIdx}`} math={seg.code} displayMode={true} />;
      }

      // Parse text segment into lines and markdown blocks
      const lines = seg.text.split('\n');
      const renderedLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          renderedLines.push(<div key={`sp-${sIdx}-${i}`} style={{ height: '8px' }} />);
          continue;
        }

        // Heading 1
        if (line.startsWith('# ')) {
          renderedLines.push(
            <h1 key={`h1-${sIdx}-${i}`} style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#f8fafc',
              margin: '18px 0 8px 0',
              paddingBottom: '6px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              {renderInlineStyles(line.slice(2), `h1-${sIdx}-${i}`)}
            </h1>
          );
        }
        // Heading 2
        else if (line.startsWith('## ')) {
          renderedLines.push(
            <h2 key={`h2-${sIdx}-${i}`} style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: '#e2e8f0',
              margin: '14px 0 6px 0'
            }}>
              {renderInlineStyles(line.slice(3), `h2-${sIdx}-${i}`)}
            </h2>
          );
        }
        // Heading 3
        else if (line.startsWith('### ')) {
          renderedLines.push(
            <h3 key={`h3-${sIdx}-${i}`} style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#cbd5e1',
              margin: '10px 0 4px 0'
            }}>
              {renderInlineStyles(line.slice(4), `h3-${sIdx}-${i}`)}
            </h3>
          );
        }
        // Horizontal Rule
        else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
          renderedLines.push(
            <hr key={`hr-${sIdx}-${i}`} style={{
              border: 'none',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              margin: '16px 0'
            }} />
          );
        }
        // Blockquote
        else if (line.startsWith('> ')) {
          renderedLines.push(
            <blockquote key={`bq-${sIdx}-${i}`} style={{
              borderLeft: '3px solid var(--accent-primary)',
              padding: '6px 14px',
              margin: '8px 0',
              background: 'rgba(99, 102, 241, 0.08)',
              borderRadius: '0 6px 6px 0',
              color: '#cbd5e1',
              fontStyle: 'italic'
            }}>
              {renderInlineStyles(line.slice(2), `bq-${sIdx}-${i}`)}
            </blockquote>
          );
        }
        // Bullet List
        else if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const contentText = trimmed.replace(/^[\*\-•]\s+/, '');
          renderedLines.push(
            <div key={`li-${sIdx}-${i}`} style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              margin: '3px 0 3px 8px',
              lineHeight: '1.65',
              color: 'var(--text-main)'
            }}>
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.85rem' }}>&bull;</span>
              <span style={{ flex: 1 }}>{renderInlineStyles(contentText, `li-${sIdx}-${i}`)}</span>
            </div>
          );
        }
        // Numbered List
        else if (/^\d+\.\s+/.test(trimmed)) {
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          renderedLines.push(
            <div key={`num-${sIdx}-${i}`} style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              margin: '3px 0 3px 8px',
              lineHeight: '1.65',
              color: 'var(--text-main)'
            }}>
              <span style={{ color: '#818cf8', fontWeight: 700, fontSize: '0.85rem', minWidth: '18px' }}>
                {numMatch ? numMatch[1] : '1'}.
              </span>
              <span style={{ flex: 1 }}>
                {renderInlineStyles(numMatch ? numMatch[2] : trimmed, `num-${sIdx}-${i}`)}
              </span>
            </div>
          );
        }
        // Normal Paragraph
        else {
          renderedLines.push(
            <p key={`p-${sIdx}-${i}`} style={{
              margin: '4px 0',
              lineHeight: '1.7',
              color: 'var(--text-main)'
            }}>
              {renderInlineStyles(line, `p-${sIdx}-${i}`)}
            </p>
          );
        }
      }

      return <div key={`seg-container-${sIdx}`}>{renderedLines}</div>;
    });
  };

  return (
    <div className="note-rendered-content" style={{
      fontFamily: 'var(--font-sans)',
      fontSize: '0.96rem',
      lineHeight: '1.7',
      color: 'var(--text-main)'
    }}>
      {renderFormattedBlocks(content)}
    </div>
  );
}
