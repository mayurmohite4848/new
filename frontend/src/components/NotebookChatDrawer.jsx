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
  HelpCircle,
  FileQuestion,
  Lightbulb,
  X,
  Maximize2,
  Minimize2,
  ArrowDown,
  Target,
  Globe,
  Code2,
  Compass
} from 'lucide-react';
import { api } from '../services/api';

const QUICK_PROMPT_PRESETS = [
  { id: 'summary', icon: Lightbulb, label: 'Key Takeaways', getPrompt: (pg) => 'Summarize the core concepts and key takeaways from these notes with exact page citations.' },
  { id: 'curr_page', icon: Target, label: (pg) => `Explain Page ${pg}`, getPrompt: (pg) => `Explain the main concepts and equations found specifically on Page ${pg} in depth with citations.` },
  { id: 'quiz', icon: FileQuestion, label: 'Quiz Me', getPrompt: (pg) => 'Generate a 3-question active-recall study quiz based strictly on these notes, with an answer key citing exact pages.' },
  { id: 'formulas', icon: Code2, label: 'Formulas & Math', getPrompt: (pg) => 'Extract and explain all mathematical equations, algorithms, or formulas mentioned in these notes with page citations.' },
  { id: 'definitions', icon: HelpCircle, label: 'Key Definitions', getPrompt: (pg) => 'List and define all important terms, vocabulary, and concepts found in this notebook with page citations.' },
  { id: 'simplify', icon: Sparkles, label: 'Simplify (ELIF5)', getPrompt: (pg) => 'Explain the hardest concept in these notes in very simple, intuitive terms as if teaching a beginner, citing relevant pages.' }
];

export default function NotebookChatDrawer({ 
  notebookId, 
  notebookTitle,
  totalPages = 1,
  currentPage = 1,
  currentPageTitle = '',
  currentPageContent = '',
  onJumpToPage, 
  onClose,
  isExpanded = false,
  onToggleExpand,
  showToast 
}) {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [scope, setScope] = useState('all_pages'); // 'all_pages' | 'current_page'
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
    fetchChatHistory();
  }, [notebookId]);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - (scrollTop + clientHeight) > 120;
    setShowScrollBottom(isFarFromBottom);
  };

  const fetchChatHistory = async () => {
    try {
      const res = await api.getNotebookChatHistory(notebookId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
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
    
    // Optimistic user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: query,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.chatWithNotebook(notebookId, query, {
        currentPage,
        scope
      });
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
      if (showToast) showToast(err.message || 'Failed to get answer from AI.', 'error');
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
      await api.clearNotebookChatHistory(notebookId);
      setMessages([]);
      if (showToast) showToast('Conversation history cleared.', 'info');
    } catch (err) {
      if (showToast) showToast('Failed to clear chat.', 'error');
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (showToast) showToast('Copied to clipboard!', 'info');
  };

  // Helper to format text with Markdown, code blocks, and clickable [Page X] citation badges
  const renderFormattedMessage = (content, msgId) => {
    if (!content) return null;

    // Check for triple backtick code blocks
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
      }
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        code: match[2].trim()
      });
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', text: content.slice(lastIndex) });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {parts.map((part, pIdx) => {
          if (part.type === 'code') {
            return (
              <div 
                key={`code-${pIdx}`} 
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
                  <span>{part.language || 'code'}</span>
                  <button
                    onClick={() => handleCopy(`code-${msgId}-${pIdx}`, part.code)}
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
                    {copiedId === `code-${msgId}-${pIdx}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                    <span>{copiedId === `code-${msgId}-${pIdx}` ? 'Copied' : 'Copy'}</span>
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
                  <code>{part.code}</code>
                </pre>
              </div>
            );
          }

          // Process markdown lines (citations, bold, headings, bullets)
          const lines = part.text.split('\n');
          return (
            <div key={`txt-${pIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {lines.map((line, lIdx) => {
                const trimmed = line.trim();
                if (!trimmed) {
                  return <div key={lIdx} style={{ height: '4px' }} />;
                }

                // Process citations in line
                const lineParts = [];
                const citationRegex = /\[(?:Page|Pages)\s*([0-9,\s]+)\]/gi;
                let lineLastIdx = 0;
                let cMatch;

                while ((cMatch = citationRegex.exec(line)) !== null) {
                  if (cMatch.index > lineLastIdx) {
                    lineParts.push(line.slice(lineLastIdx, cMatch.index));
                  }

                  const numStrings = cMatch[1].split(/[,\s]+/).filter(Boolean);
                  const nums = numStrings.map(n => parseInt(n, 10)).filter(n => !isNaN(n));

                  lineParts.push(
                    <span key={`cite-${lIdx}-${cMatch.index}`} style={{ display: 'inline-flex', gap: '4px', margin: '0 3px', verticalAlign: 'middle' }}>
                      {nums.map((pageNum, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onJumpToPage && onJumpToPage(pageNum - 1)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.35) 0%, rgba(6, 182, 212, 0.35) 100%)',
                            color: '#ffffff',
                            border: '1px solid rgba(99, 102, 241, 0.6)',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                          }}
                          title={`Click to jump to Page ${pageNum} in reader`}
                        >
                          <span>Page {pageNum}</span>
                          <ExternalLink size={10} />
                        </button>
                      ))}
                    </span>
                  );

                  lineLastIdx = citationRegex.lastIndex;
                }

                if (lineLastIdx < line.length) {
                  lineParts.push(line.slice(lineLastIdx));
                }

                // Render Headings
                if (trimmed.startsWith('# ')) {
                  return <h3 key={lIdx} style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '6px 0 2px 0' }}>{lineParts}</h3>;
                }
                if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
                  return <h4 key={lIdx} style={{ fontSize: '0.95rem', fontWeight: 700, color: '#c7d2fe', margin: '4px 0 2px 0' }}>{lineParts}</h4>;
                }
                // Render Bullets
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                  return (
                    <div key={lIdx} style={{ display: 'flex', gap: '8px', paddingLeft: '6px', margin: '2px 0' }}>
                      <span style={{ color: '#818cf8', fontWeight: 800, fontSize: '0.9rem' }}>&bull;</span>
                      <span style={{ flex: 1 }}>{lineParts}</span>
                    </div>
                  );
                }
                // Render Blockquotes
                if (trimmed.startsWith('> ')) {
                  return (
                    <div key={lIdx} style={{
                      borderLeft: '3px solid #818cf8',
                      paddingLeft: '10px',
                      color: '#cbd5e1',
                      margin: '4px 0',
                      fontStyle: 'italic'
                    }}>
                      {lineParts}
                    </div>
                  );
                }

                return <p key={lIdx} style={{ margin: '2px 0', lineHeight: '1.65' }}>{lineParts}</p>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      minWidth: 0,
      background: 'rgba(11, 17, 33, 0.98)',
      borderLeft: '1px solid var(--border-subtle)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 1. Header Toolbar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(15, 23, 42, 0.95)',
        flexShrink: 0,
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
          }}>
            <Bot size={17} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Notebook AI Assistant
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>
              Grounded RAG &bull; Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {onToggleExpand && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={onToggleExpand}
              title={isExpanded ? 'Collapse side panel' : 'Expand chat width'}
              style={{ color: isExpanded ? 'var(--accent-secondary)' : 'var(--text-muted)', padding: '5px' }}
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          )}
          {messages.length > 0 && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={handleClearHistory}
              title="Clear Conversation History"
              style={{ color: 'var(--text-dim)', padding: '5px' }}
            >
              <Trash2 size={15} />
            </button>
          )}
          {onClose && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={onClose}
              title="Close AI Assistant"
              style={{ color: 'var(--text-dim)', padding: '5px' }}
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Scope Selector Bar */}
      <div style={{
        padding: '6px 14px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(15, 23, 42, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.74rem',
        flexShrink: 0
      }}>
        <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>QUERY SCOPE:</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setScope('all_pages')}
            style={{
              padding: '3px 9px',
              borderRadius: '6px',
              border: scope === 'all_pages' ? '1px solid #6366f1' : '1px solid transparent',
              background: scope === 'all_pages' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: scope === 'all_pages' ? '#ffffff' : 'var(--text-dim)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <Globe size={11} />
            <span>All {totalPages} Pages</span>
          </button>

          <button
            onClick={() => setScope('current_page')}
            style={{
              padding: '3px 9px',
              borderRadius: '6px',
              border: scope === 'current_page' ? '1px solid #06b6d4' : '1px solid transparent',
              background: scope === 'current_page' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
              color: scope === 'current_page' ? '#ffffff' : 'var(--text-dim)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <Target size={11} />
            <span>Page {currentPage} Only</span>
          </button>
        </div>
      </div>

      {/* 3. Message Stream (Isolated Smooth Scroll Container) */}
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
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          position: 'relative'
        }}
      >
        {fetchingHistory ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
            <span>Loading conversation history...</span>
          </div>
        ) : messages.length === 0 ? (
          /* Empty State */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: 'auto 0' }}>
            <div style={{
              textAlign: 'center',
              padding: '18px 14px',
              background: 'rgba(99, 102, 241, 0.06)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed rgba(99, 102, 241, 0.25)'
            }}>
              <Sparkles size={24} color="#818cf8" style={{ margin: '0 auto 8px auto' }} />
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Ask anything about "{notebookTitle || 'this Notebook'}"
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                Every answer extracts strict facts from your handwritten notes with clickable <span style={{ color: '#818cf8', fontWeight: 700 }}>[Page X]</span> source badges.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Recommended Starter Prompts:
              </span>
              {QUICK_PROMPT_PRESETS.slice(0, 4).map((item) => {
                const IconComp = item.icon;
                const labelText = typeof item.label === 'function' ? item.label(currentPage) : item.label;
                const promptText = item.getPrompt(currentPage);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSendMessage(promptText)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                    className="glass-panel-hover"
                  >
                    <IconComp size={15} color="#818cf8" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{labelText}</span>
                  </button>
                );
              })}
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
                  gap: '4px',
                  width: '100%'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  maxWidth: isUser ? '88%' : '96%',
                  flexDirection: isUser ? 'row-reverse' : 'row'
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: isUser ? 'var(--accent-primary)' : 'rgba(30, 41, 59, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                    border: isUser ? 'none' : '1px solid var(--border-subtle)'
                  }}>
                    {isUser ? <User size={13} color="#ffffff" /> : <Bot size={13} color="#818cf8" />}
                  </div>

                  {/* Message Bubble */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                    background: isUser 
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.9) 0%, rgba(79, 70, 229, 0.9) 100%)' 
                      : 'rgba(30, 41, 59, 0.85)',
                    color: '#ffffff',
                    border: isUser ? 'none' : '1px solid var(--border-subtle)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                    wordBreak: 'break-word',
                    fontSize: '0.88rem'
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
                    paddingLeft: '32px',
                    fontSize: '0.72rem',
                    color: 'var(--text-dim)',
                    marginTop: '2px'
                  }}>
                    <div>
                      {msg.citations && msg.citations.length > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#818cf8' }}>
                          <BookOpen size={11} />
                          <span>Sources: {msg.citations.map(c => `Page ${c}`).join(', ')}</span>
                        </span>
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
                        gap: '3px',
                        padding: '2px 4px',
                        borderRadius: '4px'
                      }}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '32px', padding: '6px 0' }}>
            <Loader2 size={16} className="animate-spin" color="#818cf8" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Reasoning over notebook pages & extracting citations...
            </span>
          </div>
        )}

        {/* Floating Jump to Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            style={{
              position: 'sticky',
              bottom: '10px',
              alignSelf: 'center',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid var(--accent-primary)',
              color: '#ffffff',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '0.74rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              zIndex: 10
            }}
          >
            <ArrowDown size={12} />
            <span>Latest Messages</span>
          </button>
        )}
      </div>

      {/* 4. Quick Action Chips (Always accessible above input) */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(15, 23, 42, 0.85)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        flexShrink: 0
      }}>
        {QUICK_PROMPT_PRESETS.map((item) => {
          const IconComp = item.icon;
          const labelText = typeof item.label === 'function' ? item.label(currentPage) : item.label;
          const promptText = item.getPrompt(currentPage);
          return (
            <button
              key={item.id}
              onClick={() => handleSendMessage(promptText)}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                fontSize: '0.73rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              className="glass-panel-hover"
              title={promptText}
            >
              <IconComp size={12} color="#818cf8" />
              <span>{labelText}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Input Bar */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(15, 23, 42, 0.98)',
        flexShrink: 0
      }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => {
                setInputQuery(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 38), 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={scope === 'current_page' ? `Ask about Page ${currentPage}... (Press Enter)` : 'Ask anything across all notes... (Press Enter)'}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                resize: 'none',
                minHeight: '38px',
                maxHeight: '120px',
                lineHeight: '1.4'
              }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={loading || !inputQuery.trim()}
            style={{ height: '38px', padding: '0 14px', flexShrink: 0 }}
            title="Send Query (Enter)"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
}
