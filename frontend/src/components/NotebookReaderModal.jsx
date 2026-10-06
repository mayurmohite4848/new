import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Save, 
  Trash2, 
  Plus, 
  Sparkles, 
  BookOpen,
  Copy,
  Check,
  Edit3,
  UploadCloud,
  Loader2,
  Columns2,
  Eye,
  Maximize2,
  Bot,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import NotebookChatDrawer from './NotebookChatDrawer';

export default function NotebookReaderModal({ notebookId, onClose, onNotebookUpdated, showToast }) {
  const [notebook, setNotebook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingPages, setAddingPages] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [savingPage, setSavingPage] = useState(false);
  const [copied, setCopied] = useState(false);

  // 3-Way View Layout: 'split' | 'notes' | 'photo'
  const [viewLayout, setViewLayout] = useState('split');
  
  // AI Grounded RAG Chat Drawer Toggle & Expand
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  // Active page editing state
  const [pageTitle, setPageTitle] = useState('');
  const [pageContent, setPageContent] = useState('');
  const uploadInputRef = useRef(null);

  // Fetch full notebook with all pages
  const fetchNotebook = useCallback(async (targetPageIndex = null) => {
    try {
      const res = await api.getNotebookById(notebookId);
      const nb = res.notebook;
      setNotebook(nb);
      if (nb.pages && nb.pages.length > 0) {
        const idx = targetPageIndex !== null ? targetPageIndex : activePageIndex;
        const safeIdx = Math.min(idx, nb.pages.length - 1);
        const p = nb.pages[safeIdx] || nb.pages[0];
        setPageTitle(p.title || `Page ${p.page_number}`);
        setPageContent(p.content || p.extracted_text || '');
        if (targetPageIndex !== null) {
          setActivePageIndex(safeIdx);
        }
      }
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to load notebook.', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [notebookId, activePageIndex, showToast, onClose]);

  useEffect(() => {
    fetchNotebook();
  }, [fetchNotebook]);

  const activePage = notebook?.pages?.[activePageIndex] || null;
  const totalPages = notebook?.pages?.length || 0;
  const hasImage = !!activePage?.image_path;

  // If active page has no image, force notes view
  const currentLayout = hasImage ? viewLayout : 'notes';

  // Change active page
  const handleSelectPage = (index) => {
    if (!notebook?.pages || index < 0 || index >= notebook.pages.length) return;
    setActivePageIndex(index);
    const p = notebook.pages[index];
    setPageTitle(p.title || `Page ${p.page_number}`);
    setPageContent(p.content || p.extracted_text || '');
  };

  // Keyboard navigation for page flip & layout switching
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        handleSelectPage(activePageIndex - 1);
      } else if (e.key === 'ArrowRight') {
        handleSelectPage(activePageIndex + 1);
      } else if (e.key === '1') {
        setViewLayout('notes');
      } else if (e.key === '2' && hasImage) {
        setViewLayout('split');
      } else if (e.key === '3' && hasImage) {
        setViewLayout('photo');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePageIndex, notebook, hasImage]);

  // Save current page changes
  const handleSavePage = async () => {
    if (!activePage) return;
    setSavingPage(true);
    try {
      await api.updateNotebookPage(notebookId, activePage.id, {
        title: pageTitle.trim(),
        content: pageContent.trim()
      });
      if (showToast) showToast(`Page ${activePage.page_number} saved!`, 'success');
      fetchNotebook();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to save page changes.', 'error');
    } finally {
      setSavingPage(false);
    }
  };

  // Delete current page
  const handleDeletePage = async () => {
    if (!activePage) return;
    if (totalPages <= 1) {
      if (showToast) showToast('A notebook must have at least 1 page. Delete the entire notebook instead.', 'error');
      return;
    }

    try {
      await api.deleteNotebookPage(notebookId, activePage.id);
      if (showToast) showToast(`Page ${activePage.page_number} deleted.`, 'info');
      setActivePageIndex(Math.max(0, activePageIndex - 1));
      fetchNotebook();
    } catch (err) {
      if (showToast) showToast('Failed to delete page.', 'error');
    }
  };

  // Add blank text page to notebook
  const handleAddBlankPage = async () => {
    try {
      await api.addNotebookPage(notebookId, {
        title: `Page ${totalPages + 1}`,
        content: '# New Page\nWrite additional notes here...'
      });
      if (showToast) showToast('New page added to notebook!', 'success');
      await fetchNotebook(totalPages);
    } catch (err) {
      if (showToast) showToast('Failed to add new page.', 'error');
    }
  };

  // Upload multiple new photos or PDF to append to notebook
  const handleUploadNewPages = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAddingPages(true);
    try {
      const res = await api.addNotebookPages(notebookId, Array.from(files));
      const addedCount = res.pages ? res.pages.length : 1;
      if (showToast) showToast(`Added and transcribed ${addedCount} new page(s)!`, 'success');
      await fetchNotebook(totalPages);
      if (onNotebookUpdated) onNotebookUpdated();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to add pages from images.', 'error');
    } finally {
      setAddingPages(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(pageContent);
    setCopied(true);
    if (showToast) showToast('Page text copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
          <p style={{ color: 'var(--text-muted)' }}>Opening notebook reader...</p>
        </div>
      </div>
    );
  }

  if (!notebook) return null;

  // Compute Grid Columns dynamically
  const getGridTemplateColumns = () => {
    if (showChatDrawer && isChatExpanded) {
      return '1fr 1.6fr'; // Wide chat view alongside notes
    }
    if (showChatDrawer) {
      if (currentLayout === 'split') {
        return '1fr 0.9fr 400px';
      }
      return '1fr 400px';
    }
    return currentLayout === 'split' ? '1.1fr 0.9fr' : '1fr';
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: showChatDrawer ? (isChatExpanded ? '1540px' : '1420px') : '1280px',
          width: '96vw',
          height: '92vh',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
          position: 'relative',
          transition: 'max-width 0.2s ease'
        }}
      >
        {/* Hidden File Input for Adding Photo Pages */}
        <input
          ref={uploadInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={handleUploadNewPages}
        />

        {/* Top Header Bar */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)',
          gap: '16px',
          flexWrap: 'wrap',
          flexShrink: 0
        }}>
          {/* Title & Subject */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: notebook.cover_color || '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {notebook.title}
                </h2>
                <span className="tag-badge" style={{ fontSize: '0.72rem' }}>
                  {notebook.subject_tag || 'Notebook'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Page {activePageIndex + 1} of {totalPages} &bull; Shortcuts: [1] Notes &bull; [2] Split &bull; [3] Photo
              </p>
            </div>
          </div>

          {/* 3-Way Layout Switcher (Notes Only | Split View | Photo Only) */}
          {hasImage && !isChatExpanded && (
            <div style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.8)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '3px'
            }}>
              <button
                onClick={() => setViewLayout('notes')}
                title="Full-Width Notes Only (Key 1)"
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: currentLayout === 'notes' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                  color: currentLayout === 'notes' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={13} />
                <span>Notes Only</span>
              </button>

              <button
                onClick={() => setViewLayout('split')}
                title="Side-by-Side Split View (Key 2)"
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: currentLayout === 'split' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                  color: currentLayout === 'split' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Columns2 size={13} />
                <span>Split View</span>
              </button>

              <button
                onClick={() => setViewLayout('photo')}
                title="Full Photo View (Key 3)"
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: currentLayout === 'photo' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                  color: currentLayout === 'photo' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                <ImageIcon size={13} />
                <span>Photo Only</span>
              </button>
            </div>
          )}

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Grounded RAG Chat Toggle Button */}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setShowChatDrawer(prev => !prev);
                if (showChatDrawer) setIsChatExpanded(false);
              }}
              title="Chat with Notebook via Grounded RAG"
              style={{
                background: showChatDrawer 
                  ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' 
                  : 'linear-gradient(135deg, var(--accent-primary) 0%, #06b6d4 100%)',
                boxShadow: showChatDrawer ? '0 0 12px rgba(6, 182, 212, 0.4)' : 'none',
                gap: '6px'
              }}
            >
              <Bot size={15} />
              <span>{showChatDrawer ? 'Hide Chat' : '💬 Chat AI (RAG)'}</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => uploadInputRef.current?.click()}
              disabled={addingPages}
              title="Upload handwritten photos or PDF to append new pages"
              style={{ borderColor: 'rgba(99, 102, 241, 0.4)' }}
            >
              {addingPages ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Transcribing...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={14} color="#818cf8" />
                  <span>+ Add Pages</span>
                </>
              )}
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCopyText}
              title="Copy current page text"
            >
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => window.open(api.getExportPdfUrl(notebook.id), '_blank')}
              title="Download full notebook as PDF document"
              style={{ color: '#818cf8' }}
            >
              <Download size={14} />
              <span>PDF</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => window.open(api.getExportMdUrl(notebook.id), '_blank')}
              title="Download full notebook as Markdown"
            >
              <FileText size={14} />
              <span>.MD</span>
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleSavePage}
              disabled={savingPage}
            >
              <Save size={14} />
              <span>{savingPage ? 'Saving...' : 'Save'}</span>
            </button>

            <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close Reader">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Body: Dynamic Grid Container with minHeight: 0 and minWidth: 0 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: getGridTemplateColumns(),
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden',
          background: 'var(--bg-surface)'
        }}>
          {/* Column 1: Plain-Text Notes Editor (Shown when not in photo-only mode) */}
          {(currentLayout !== 'photo' || isChatExpanded) && (
            <div style={{
              padding: '20px 24px',
              overflowY: 'auto',
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              borderRight: (currentLayout === 'split' || showChatDrawer) ? '1px solid var(--border-subtle)' : 'none'
            }}>
              {/* Informative banner when photo is hidden */}
              {hasImage && currentLayout === 'notes' && !isChatExpanded && (
                <div style={{
                  padding: '8px 14px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={14} color="#818cf8" />
                    <span>Original photo is hidden (Full-Width Focus Mode)</span>
                  </div>
                  <button
                    onClick={() => setViewLayout('split')}
                    style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                  >
                    Show Photo in Split View &rarr;
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <input
                  type="text"
                  className="input"
                  value={pageTitle}
                  onChange={e => setPageTitle(e.target.value)}
                  placeholder="Page Title..."
                  style={{ fontSize: '1.15rem', fontWeight: 700, flex: 1 }}
                />

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowChatDrawer(true)}
                  title="Ask AI questions about this page"
                  style={{
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    color: '#c7d2fe',
                    fontSize: '0.78rem',
                    gap: '5px'
                  }}
                >
                  <Bot size={14} color="#818cf8" />
                  <span>Ask AI</span>
                </button>

                <button
                  className="btn btn-danger btn-sm btn-icon"
                  onClick={handleDeletePage}
                  title="Delete this page"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  PAGE CONTENT (EDITABLE PLAIN TEXT):
                </label>
                <textarea
                  className="textarea"
                  value={pageContent}
                  onChange={e => setPageContent(e.target.value)}
                  placeholder="Write or edit notes for this page..."
                  style={{
                    flex: 1,
                    minHeight: '280px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.94rem',
                    lineHeight: '1.7',
                    padding: '16px'
                  }}
                />
              </div>
            </div>
          )}

          {/* Column 2: Original Handwritten Photo (Shown in 'photo' and 'split' modes when chat isn't expanded) */}
          {hasImage && currentLayout !== 'notes' && !isChatExpanded && (
            <div style={{
              background: '#040711',
              padding: '16px',
              minHeight: 0,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              gap: '10px',
              borderRight: showChatDrawer ? '1px solid var(--border-subtle)' : 'none'
            }}>
              <div style={{
                flex: 1,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                borderRadius: '8px',
                background: '#000000'
              }}>
                <img 
                  src={activePage.image_path}
                  alt={`Original Page ${activePage.page_number}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '6px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <span>Untouched Original Photo &bull; Page {activePage.page_number}</span>
                {currentLayout === 'photo' && (
                  <button
                    onClick={() => setViewLayout('split')}
                    style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Back to Split View
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Column 3: Grounded RAG AI Chat Drawer with Independent Scroll */}
          {showChatDrawer && (
            <div style={{ minHeight: 0, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <NotebookChatDrawer
                notebookId={notebook.id}
                notebookTitle={notebook.title}
                totalPages={totalPages}
                currentPage={activePageIndex + 1}
                currentPageTitle={pageTitle || `Page ${activePageIndex + 1}`}
                currentPageContent={pageContent}
                onJumpToPage={(targetIdx) => handleSelectPage(targetIdx)}
                onClose={() => {
                  setShowChatDrawer(false);
                  setIsChatExpanded(false);
                }}
                isExpanded={isChatExpanded}
                onToggleExpand={() => setIsChatExpanded(prev => !prev)}
                showToast={showToast}
              />
            </div>
          )}
        </div>

        {/* Bottom Filmstrip / Page Turner Navigation */}
        <div style={{
          padding: '10px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexShrink: 0
        }}>
          {/* Previous Page Button */}
          <button
            className="btn btn-secondary btn-sm"
            disabled={activePageIndex === 0}
            onClick={() => handleSelectPage(activePageIndex - 1)}
          >
            <ChevronLeft size={16} />
            <span>Prev Page</span>
          </button>

          {/* Center Thumbnail Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            padding: '4px',
            maxWidth: '600px'
          }}>
            {notebook.pages?.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => handleSelectPage(idx)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: idx === activePageIndex ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: idx === activePageIndex ? 'rgba(99, 102, 241, 0.3)' : 'rgba(30, 41, 59, 0.6)',
                  color: idx === activePageIndex ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                Page {p.page_number}
              </button>
            ))}

            <button
              onClick={() => uploadInputRef.current?.click()}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--accent-secondary)', whiteSpace: 'nowrap' }}
              title="Upload photos or PDF to append as new pages"
            >
              <UploadCloud size={14} />
              <span>+ Add Photos</span>
            </button>

            <button
              onClick={handleAddBlankPage}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
              title="Add a blank text page"
            >
              <Plus size={14} />
              <span>+ Blank</span>
            </button>
          </div>

          {/* Next Page Button */}
          <button
            className="btn btn-secondary btn-sm"
            disabled={activePageIndex >= totalPages - 1}
            onClick={() => handleSelectPage(activePageIndex + 1)}
          >
            <span>Next Page</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
