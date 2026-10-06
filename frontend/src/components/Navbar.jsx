import React, { useState } from 'react';
import { Sparkles, Key, FileText, Check, X, RefreshCw, AlertCircle, Loader2, BookOpen, Layers, Globe, Activity } from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({ 
  onNewNote, 
  onOpenManualNote, 
  onNewUpload, 
  onOpenUpload, 
  onOpenBatchNotebook,
  onOpenGlobalChat,
  onOpenTelemetry,
  activeTab = 'notes', // 'notes' | 'notebooks'
  onChangeTab,
  stats, 
  showToast,
  backendOnline,
  onRefresh,
  refreshing 
}) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const handleOpenNote = () => {
    if (onNewNote) onNewNote();
    else if (onOpenManualNote) onOpenManualNote();
  };

  const handleOpenUpload = () => {
    if (onNewUpload) onNewUpload();
    else if (onOpenUpload) onOpenUpload();
  };

  const handleTestKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setVerifyResult({ valid: false, message: 'Please enter an API key to test.' });
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.verifyKey(trimmed);
      setVerifyResult({ valid: true, message: res.message || 'Key is valid and active!' });
    } catch (err) {
      setVerifyResult({ valid: false, message: err.message || 'Verification failed. Please check your key.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveKey = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
      if (showToast) showToast('Gemini API Key saved! Handwriting transcription enabled.', 'success');
    } else {
      localStorage.removeItem('gemini_api_key');
      if (showToast) showToast('Gemini API Key removed. Using local OCR engine.', 'info');
    }
    setShowKeyModal(false);
  };

  const hasKey = !!localStorage.getItem('gemini_api_key');

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(10, 15, 29, 0.92)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      marginBottom: '20px'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '66px',
        gap: '12px'
      }}>
        {/* Brand & Tab Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(99, 102, 241, 0.35)',
              flexShrink: 0
            }}>
              <BookOpen size={18} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', whiteSpace: 'nowrap' }}>
                NoteExtract <span style={{ color: 'var(--accent-secondary)' }}>AI</span>
              </span>
              <span style={{
                display: 'block',
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}>
                Grounded Notes & Notebooks RAG
              </span>
            </div>
          </div>

          {/* Tab Navigation: Single Notes vs Multi-Page Notebooks */}
          {onChangeTab && (
            <div style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '2px',
              marginLeft: '6px'
            }}>
              <button
                onClick={() => onChangeTab('notes')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  background: activeTab === 'notes' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                  color: activeTab === 'notes' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileText size={13} />
                <span>Single Notes</span>
              </button>

              <button
                onClick={() => onChangeTab('notebooks')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  background: activeTab === 'notebooks' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                  color: activeTab === 'notebooks' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Layers size={13} />
                <span>Notebooks ({stats?.total_notebooks || 0})</span>
              </button>
            </div>
          )}
        </div>

        {/* Actions Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {onOpenGlobalChat && (
            <button
              id="btn-global-ai-hub"
              className="btn btn-secondary btn-sm"
              onClick={onOpenGlobalChat}
              title="Search and chat across all notebooks & notes with Grounded Federated RAG (Ctrl+K)"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(6, 182, 212, 0.18) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.45)',
                color: '#e0e7ff',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.15)',
                fontWeight: 700,
                padding: '6px 11px',
                whiteSpace: 'nowrap',
                gap: '5px'
              }}
            >
              <Globe size={14} color="#67e8f9" />
              <span>AI Hub</span>
              <kbd style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '4px',
                padding: '1px 5px',
                fontSize: '0.66rem',
                color: 'var(--text-dim)',
                marginLeft: '1px',
                fontFamily: 'var(--font-mono)'
              }}>
                Ctrl+K
              </kbd>
            </button>
          )}

          {onOpenTelemetry && (
            <button
              id="btn-llmops-telemetry"
              className="btn btn-secondary btn-sm"
              onClick={onOpenTelemetry}
              title="LLMOps Telemetry & Hybrid Fallback Engine"
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34d399',
                padding: '6px 11px',
                whiteSpace: 'nowrap',
                fontSize: '0.8rem',
                gap: '5px',
                fontWeight: 600
              }}
            >
              <Activity size={13} color="#34d399" />
              <span>Telemetry</span>
            </button>
          )}

          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setVerifyResult(null);
              setShowKeyModal(true);
            }}
            style={{
              borderColor: hasKey ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
              whiteSpace: 'nowrap',
              padding: '6px 10px',
              fontSize: '0.8rem',
              gap: '5px'
            }}
            title={hasKey ? 'Google Gemini API key is active' : 'Configure Gemini API Key'}
          >
            <Key size={13} color={hasKey ? '#34d399' : 'currentColor'} />
            <span>{hasKey ? 'Key Active' : 'API Key'}</span>
          </button>

          {onRefresh && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={onRefresh}
              title="Refresh from SQLite"
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}

          {activeTab === 'notebooks' ? (
            <button 
              className="btn btn-primary btn-sm" 
              onClick={onOpenBatchNotebook}
              style={{ whiteSpace: 'nowrap', padding: '6px 13px', fontSize: '0.8rem' }}
            >
              <Sparkles size={14} />
              <span>+ New Notebook</span>
            </button>
          ) : (
            <>
              <button 
                id="btn-add-text-note"
                className="btn btn-secondary btn-sm" 
                onClick={handleOpenNote}
                style={{ whiteSpace: 'nowrap', padding: '6px 11px', fontSize: '0.8rem' }}
              >
                + Note
              </button>

              <button 
                id="btn-transcribe-photo"
                className="btn btn-primary btn-sm" 
                onClick={handleOpenUpload}
                style={{ whiteSpace: 'nowrap', padding: '6px 13px', fontSize: '0.8rem' }}
              >
                <Sparkles size={14} />
                <span>Transcribe Photo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Free Gemini Key Modal */}
      {showKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="modal-content" style={{ maxWidth: '520px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Google Gemini API Key (100% Free)</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowKeyModal(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '16px' }}>
              Gemini Flash reads messy and cursive handwriting into clean English text across single notes and multi-page notebooks.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                Gemini API Key:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  className="input"
                  value={apiKey}
                  onChange={e => {
                    setApiKey(e.target.value);
                    setVerifyResult(null);
                  }}
                  placeholder="AIzaSy..."
                  style={{ flex: 1 }}
                />
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleTestKey}
                  disabled={verifying || !apiKey.trim()}
                >
                  {verifying ? <Loader2 size={14} className="animate-spin" /> : 'Test Key'}
                </button>
              </div>
              
              {verifyResult && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  background: verifyResult.valid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                  color: verifyResult.valid ? '#34d399' : '#fb7185',
                  border: `1px solid ${verifyResult.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
                }}>
                  {verifyResult.valid ? <Check size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />}
                  <span>{verifyResult.message}</span>
                </div>
              )}

              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Don't have a key? Get one for free at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)', textDecoration: 'underline' }}>Google AI Studio</a>.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowKeyModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveKey}>
                <Check size={14} />
                <span>Save Key</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
