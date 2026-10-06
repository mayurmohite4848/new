import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  User, 
  Send, 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Loader2, 
  BookOpen, 
  Globe, 
  X, 
  ArrowDown, 
  HelpCircle, 
  FileQuestion, 
  Lightbulb, 
  Code2, 
  Layers, 
  FileText,
  Compass
} from 'lucide-react';
import { api } from '../services/api';
import MathViewer from './MathViewer';
import MermaidViewer from './MermaidViewer';

const WORKSPACE_STARTER_PROMPTS = [
  { id: 'synthesize', icon: Globe, label: 'Synthesize Entire Library', prompt: 'Synthesize the core themes and overarching concepts across all my notebooks and notes with exact cross-document citations.' },
  { id: 'connections', icon: Compass, label: 'Find Cross-Notebook Links', prompt: 'Identify relationships, dependencies, and connections between concepts discussed across different notebooks in my library.' },
  { id: 'formulas', icon: Code2, label: 'Extract All Formulas', prompt: 'Extract and categorize all mathematical formulas, equations, algorithms, and code mentioned anywhere across my notes with source citations.' },
  { id: 'quiz', icon: FileQuestion, label: 'Multi-Subject Study Quiz', prompt: 'Generate a 4-question active-recall study quiz covering concepts across all my notebooks, with answer keys referencing exact notebooks and pages.' },
  { id: 'cheatsheet', icon: Lightbulb, label: 'High-Yield Cheat Sheet', prompt: 'Create a high-yield exam review cheat sheet summarizing key definitions, core laws, and principles across all my subjects.' }
];

export default function GlobalWorkspaceChatModal({ 
  onClose, 
  onOpenNotebook, 
  onOpenNote, 
  stats, 
  showToast 
}) {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const textareaRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const scrollToBottom = (smooth = true) => {
    if (scrollContainerRef.current) {
      if (smooth) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
  };

  useEffect(() => {
    fetchWorkspaceHistory();
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - (scrollTop + clientHeight) > 120;
    setShowScrollBottom(isFarFromBottom);
  };

  const fetchWorkspaceHistory = async () => {
    try {
      const res = await api.getWorkspaceChatHistory();
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load workspace chat history:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '38px';
    }

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: query,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.chatWithWorkspace(query);
      const assistantMsg = {
        id: res.assistant_message?.id || `resp-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        citations: res.citations || [],
        model_used: res.model || 'gemini-3.6-flash',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), res.user_message || tempUserMsg, assistantMsg]);
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to query global knowledge base.', 'error');
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Error:** ${err.message || 'Unable to process query. Please verify your Gemini API key in the navbar.'}`,
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom(true), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearWorkspaceChatHistory();
      setMessages([]);
      if (showToast) showToast('Global conversation history cleared.', 'info');
    } catch (err) {
      if (showToast) showToast('Failed to clear history.', 'error');
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (showToast) showToast('Copied to clipboard!', 'info');
  };

  // Helper to handle clicking cross-document citation badges
  const handleCitationClick = (citation) => {
    if (citation.type === 'notebook_page') {
      if (onOpenNotebook) {
        onOpenNotebook(citation.notebook_id, (citation.page_number || 1) - 1);
        onClose();
      }
    } else if (citation.type === 'note') {
      if (onOpenNote) {
        onOpenNote(citation.note_id);
        onClose();
      }
    }
  };

  // Inline Markdown parser supporting multi-document citation badges
  const renderInlineMarkdown = (text) => {
    if (!text) return null;

    // Matches: [Notebook: Title | Page X], [Note: Title], [Page X], **bold**, __bold__, `code`, *italic*, _italic_, $formula$
    const tokenRegex = /(\[(?:Notebook\s*:\s*)?[^|\]]+?\s*\|\s*Page\s*[0-9,\s]+\]|\[Note\s*:\s*[^\]]+?\]|\[(?:Page|Pages)\s*[0-9,\s]+\]|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\$[^$]+\$)/gi;

    const parts = [];
    let lastIdx = 0;
    let match;

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(text.slice(lastIdx, match.index));
      }

      const token = match[0];

      // 1. Cross-Notebook Citation: [Notebook: Title | Page X] or [Title | Page X]
      const nbMatch = token.match(/\[(?:Notebook\s*:\s*)?["\']?([^|\]]+?)["\']?\s*\|\s*Page\s*([0-9,\s]+)\]/i);
      if (nbMatch) {
        const title = nbMatch[1].trim();
        const numStr = nbMatch[2].trim();
        const nums = numStr.split(/[,\s]+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));

        parts.push(
          <span key={`nb-cite-${match.index}`} style={{ display: 'inline-flex', gap: '4px', margin: '0 3px', verticalAlign: 'middle' }}>
            {nums.map((pageNum, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (onOpenNotebook) {
                    onOpenNotebook(null, pageNum - 1, title);
                    onClose();
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(6, 182, 212, 0.4) 100%)',
                  color: '#ffffff',
                  border: '1px solid rgba(99, 102, 241, 0.7)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.3)'
                }}
                title={`Open notebook "${title}" at Page ${pageNum}`}
              >
                <BookOpen size={10} color="#a5b4fc" />
                <span>{title} • Page {pageNum}</span>
                <ExternalLink size={10} />
              </button>
            ))}
          </span>
        );
        lastIdx = tokenRegex.lastIndex;
        continue;
      }

      // 2. Standalone Note Citation: [Note: Title]
      const noteMatch = token.match(/\[Note\s*:\s*["\']?([^\]]+?)["\']?\]/i);
      if (noteMatch) {
        const noteTitle = noteMatch[1].trim();
        parts.push(
          <button
            key={`note-cite-${match.index}`}
            type="button"
            onClick={() => {
              if (onOpenNote) {
                onOpenNote(null, noteTitle);
                onClose();
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.35) 0%, rgba(6, 182, 212, 0.35) 100%)',
              color: '#ffffff',
              border: '1px solid rgba(16, 185, 129, 0.6)',
              borderRadius: '6px',
              padding: '2px 8px',
              margin: '0 3px',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
              verticalAlign: 'middle',
              transition: 'all 0.15s ease'
            }}
            title={`Open note "${noteTitle}"`}
          >
            <FileText size={10} color="#6ee7b7" />
            <span>Note: {noteTitle}</span>
            <ExternalLink size={10} />
          </button>
        );
        lastIdx = tokenRegex.lastIndex;
        continue;
      }

      // 3. Simple Page Citation: [Page X]
      if (token.startsWith('[Page') || token.startsWith('[Pages') || token.startsWith('[page')) {
        const numMatch = token.match(/[0-9]+/g);
        const nums = numMatch ? numMatch.map(n => parseInt(n, 10)).filter(n => !isNaN(n)) : [];
        parts.push(
          <span key={`cite-${match.index}`} style={{ display: 'inline-flex', gap: '4px', margin: '0 3px', verticalAlign: 'middle' }}>
            {nums.map((pageNum, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'rgba(99, 102, 241, 0.25)',
                  color: '#e0e7ff',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  borderRadius: '6px',
                  padding: '1px 6px',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}
              >
                Page {pageNum}
              </span>
            ))}
          </span>
        );
      } else if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
        // Bold
        const inner = token.slice(2, -2);
        parts.push(
          <strong key={`b-${match.index}`} style={{ fontWeight: 700, color: '#ffffff' }}>
            {inner}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        // Inline Code
        const inner = token.slice(1, -1);
        parts.push(
          <code key={`c-${match.index}`} style={{
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: '#38bdf8'
          }}>
            {inner}
          </code>
        );
      } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
        // Italic
        const inner = token.slice(1, -1);
        parts.push(
          <em key={`i-${match.index}`} style={{ fontStyle: 'italic', color: '#cbd5e1' }}>
            {inner}
          </em>
        );
      } else if (token.startsWith('$') && token.endsWith('$')) {
        // Math formula (KaTeX)
        const inner = token.slice(1, -1);
        parts.push(
          <MathViewer key={`m-${match.index}`} math={inner} displayMode={false} />
        );
      }

      lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      parts.push(text.slice(lastIdx));
    }

    return parts;
  };

  // Block formatter
  const renderFormattedMessage = (content, msgId) => {
    if (!content) return null;

    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const blocks = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({ type: 'text', text: content.slice(lastIndex, match.index) });
      }
      blocks.push({
        type: 'code',
        language: match[1] || 'text',
        code: match[2].trim()
      });
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      blocks.push({ type: 'text', text: content.slice(lastIndex) });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {blocks.map((block, bIdx) => {
          if (block.type === 'code') {
            const lang = (block.language || '').toLowerCase().trim();
            if (lang === 'mermaid') {
              return <MermaidViewer key={`mermaid-${bIdx}`} chartCode={block.code} />;
            }
            if (lang === 'math' || lang === 'latex' || lang === 'katex') {
              return <MathViewer key={`math-${bIdx}`} math={block.code} displayMode={true} />;
            }

            return (
              <div 
                key={`code-${bIdx}`} 
                style={{
                  background: '#040711',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  margin: '6px 0',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-dim)',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <span>{block.language || 'code'}</span>
                  <button
                    onClick={() => handleCopy(`code-${msgId}-${bIdx}`, block.code)}
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
                    {copiedId === `code-${msgId}-${bIdx}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                    <span>{copiedId === `code-${msgId}-${bIdx}` ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre style={{
                  padding: '12px',
                  margin: 0,
                  overflowX: 'auto',
                  fontFamily: 'var(--font-mono)',
                  color: '#38bdf8',
                  lineHeight: '1.5'
                }}>
                  <code>{block.code}</code>
                </pre>
              </div>
            );
          }

          const lines = block.text.split('\n');
          return (
            <div key={`txt-${bIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {lines.map((rawLine, lIdx) => {
                const trimmed = rawLine.trim();
                if (!trimmed) return <div key={lIdx} style={{ height: '4px' }} />;

                if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
                  return <hr key={lIdx} style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.12)', margin: '8px 0' }} />;
                }

                if (trimmed.startsWith('# ')) {
                  return <h3 key={lIdx} style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: '8px 0 3px 0' }}>{renderInlineMarkdown(trimmed.slice(2).trim())}</h3>;
                }
                if (trimmed.startsWith('## ')) {
                  return <h4 key={lIdx} style={{ fontSize: '1.0rem', fontWeight: 700, color: '#c7d2fe', margin: '6px 0 2px 0' }}>{renderInlineMarkdown(trimmed.slice(3).trim())}</h4>;
                }
                if (trimmed.startsWith('### ')) {
                  return <h5 key={lIdx} style={{ fontSize: '0.94rem', fontWeight: 700, color: '#93c5fd', margin: '5px 0 2px 0' }}>{renderInlineMarkdown(trimmed.slice(4).trim())}</h5>;
                }

                const bulletMatch = trimmed.match(/^[*+\-•]\s+(.*)$/);
                if (bulletMatch) {
                  return (
                    <div key={lIdx} style={{ display: 'flex', gap: '8px', paddingLeft: '6px', margin: '2px 0' }}>
                      <span style={{ color: '#818cf8', fontWeight: 800, fontSize: '0.9rem', lineHeight: '1.5' }}>&bull;</span>
                      <span style={{ flex: 1, lineHeight: '1.65' }}>{renderInlineMarkdown(bulletMatch[1])}</span>
                    </div>
                  );
                }

                const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
                if (numberMatch) {
                  return (
                    <div key={lIdx} style={{ display: 'flex', gap: '8px', paddingLeft: '6px', margin: '2px 0' }}>
                      <span style={{ color: '#818cf8', fontWeight: 700, fontSize: '0.84rem', minWidth: '18px' }}>{numberMatch[1]}.</span>
                      <span style={{ flex: 1, lineHeight: '1.65' }}>{renderInlineMarkdown(numberMatch[2])}</span>
                    </div>
                  );
                }

                if (trimmed.startsWith('> ')) {
                  return (
                    <div key={lIdx} style={{
                      borderLeft: '3px solid #818cf8',
                      background: 'rgba(99, 102, 241, 0.08)',
                      borderRadius: '0 6px 6px 0',
                      padding: '6px 12px',
                      color: '#cbd5e1',
                      margin: '4px 0',
                      fontStyle: 'italic',
                      lineHeight: '1.6'
                    }}>
                      {renderInlineMarkdown(trimmed.slice(2).trim())}
                    </div>
                  );
                }

                return <p key={lIdx} style={{ margin: '2px 0', lineHeight: '1.65' }}>{renderInlineMarkdown(trimmed)}</p>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '1080px',
          width: '95vw',
          height: '92vh',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.45)'
            }}>
              <Globe size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Global Workspace AI Knowledge Hub
                </h2>
                <span className="tag-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', borderColor: 'rgba(6, 182, 212, 0.35)', color: '#67e8f9' }}>
                  Federated RAG
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Searching across {stats?.total_notebooks || 0} Notebooks ({stats?.total_notebook_pages || 0} Pages) and {stats?.total_notes || 0} Standalone Notes
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {messages.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleClearHistory}
                title="Clear global conversation history"
              >
                <Trash2 size={14} />
                <span>Clear History</span>
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close Global Hub">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            scrollBehavior: 'smooth',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: 'var(--bg-surface)'
          }}
        >
          {fetchingHistory ? (
            <div style={{ textAlign: 'center', padding: '60px 10px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
              <span>Indexing and loading workspace conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: 'auto 0', maxWidth: '780px', alignSelf: 'center', width: '100%' }}>
              <div style={{
                textAlign: 'center',
                padding: '24px 20px',
                background: 'rgba(99, 102, 241, 0.07)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed rgba(99, 102, 241, 0.3)'
              }}>
                <Sparkles size={28} color="#818cf8" style={{ margin: '0 auto 10px auto' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Ask anything across your entire library of handwritten & digitized notes
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.6' }}>
                  The Global Federated RAG engine scans every notebook and page to synthesize cross-disciplinary insights, formulas, and connections with clickable multi-document citations.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Quick Multi-Document Prompts:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '10px' }}>
                  {WORKSPACE_STARTER_PROMPTS.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSendMessage(item.prompt)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px 14px',
                          background: 'rgba(30, 41, 59, 0.6)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                        className="glass-panel-hover"
                      >
                        <div style={{
                          padding: '6px',
                          borderRadius: '6px',
                          background: 'rgba(99, 102, 241, 0.2)',
                          color: '#818cf8',
                          flexShrink: 0
                        }}>
                          <IconComp size={16} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.86rem', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                            {item.label}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: '1.4', display: 'block' }}>
                            {item.prompt}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    gap: '6px',
                    width: '100%'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    maxWidth: isUser ? '85%' : '94%',
                    flexDirection: isUser ? 'row-reverse' : 'row'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: isUser ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                      border: isUser ? 'none' : '1px solid var(--border-subtle)'
                    }}>
                      {isUser ? <User size={15} color="#ffffff" /> : <Bot size={15} color="#818cf8" />}
                    </div>

                    {/* Message Bubble */}
                    <div style={{
                      padding: '12px 18px',
                      borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: isUser 
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(79, 70, 229, 0.95) 100%)' 
                        : 'rgba(30, 41, 59, 0.9)',
                      color: '#ffffff',
                      border: isUser ? 'none' : '1px solid var(--border-subtle)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                      wordBreak: 'break-word',
                      fontSize: '0.9rem'
                    }}>
                      {renderFormattedMessage(msg.content, msg.id || idx)}
                    </div>
                  </div>

                  {/* Assistant Footer: Sources & Copy */}
                  {!isUser && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      paddingLeft: '38px',
                      fontSize: '0.74rem',
                      color: 'var(--text-dim)',
                      marginTop: '2px'
                    }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        {msg.citations && msg.citations.length > 0 && (
                          <>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#818cf8', fontWeight: 600 }}>
                              <BookOpen size={12} />
                              <span>Indexed Sources:</span>
                            </span>
                            {msg.citations.map((c, cIdx) => (
                              <button
                                key={cIdx}
                                onClick={() => handleCitationClick(c)}
                                style={{
                                  background: 'rgba(99, 102, 241, 0.15)',
                                  border: '1px solid rgba(99, 102, 241, 0.35)',
                                  borderRadius: '4px',
                                  color: '#e0e7ff',
                                  padding: '1px 6px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="Click to jump to this source"
                              >
                                <span>{c.label || c.notebook_title || `Page ${c.page_number}`}</span>
                                <ExternalLink size={9} />
                              </button>
                            ))}
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}
                        title="Copy response"
                      >
                        {copiedId === msg.id ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '38px', padding: '8px 0' }}>
              <Loader2 size={18} className="animate-spin" color="#818cf8" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Synthesizing cross-document citations across all notebooks & notes...
              </span>
            </div>
          )}

          {showScrollBottom && (
            <button
              onClick={() => scrollToBottom(true)}
              style={{
                position: 'sticky',
                bottom: '12px',
                alignSelf: 'center',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid var(--accent-primary)',
                color: '#ffffff',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '0.76rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                zIndex: 10
              }}
            >
              <ArrowDown size={13} />
              <span>Latest Messages</span>
            </button>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(15, 23, 42, 0.85)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          flexShrink: 0
        }}>
          {WORKSPACE_STARTER_PROMPTS.map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleSendMessage(item.prompt)}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 12px',
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
                className="glass-panel-hover"
                title={item.prompt}
              >
                <IconComp size={13} color="#818cf8" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.98)',
          flexShrink: 0
        }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputQuery}
                onChange={(e) => {
                  setInputQuery(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 40), 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question across all your notebooks and notes... (Press Enter)"
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '40px',
                  maxHeight: '120px',
                  lineHeight: '1.45'
                }}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !inputQuery.trim()}
              style={{ height: '40px', padding: '0 18px', flexShrink: 0, gap: '6px' }}
              title="Search Knowledge Base (Enter)"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
