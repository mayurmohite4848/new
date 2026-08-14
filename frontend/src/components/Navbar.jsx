import React, { useState } from 'react';
import { Sparkles, Key, FileText, Check, X } from 'lucide-react';

export default function Navbar({ onNewNote, onNewUpload, stats, showToast }) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');

  const handleSaveKey = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
      showToast('Gemini API Key saved! Handwriting transcription enabled.', 'success');
    } else {
      localStorage.removeItem('gemini_api_key');
      showToast('Gemini API Key removed. Using local OCR engine.', 'info');
    }
    setShowKeyModal(false);
  };

  const hasKey = !!localStorage.getItem('gemini_api_key');

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(10, 15, 29, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <FileText size={20} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              NoteExtract <span style={{ color: 'var(--accent-secondary)' }}>AI</span>
            </span>
            <span style={{
              display: 'block',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontWeight: 500
            }}>
              Plain Text Notes & Handwriting Recognition
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowKeyModal(true)}
            style={{ borderColor: hasKey ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)' }}
          >
            <Key size={14} color={hasKey ? '#34d399' : 'currentColor'} />
            <span>{hasKey ? 'Gemini Free Tier (Active)' : 'Set Free Gemini Key'}</span>
          </button>

          <button className="btn btn-secondary btn-sm" onClick={onNewNote}>
            + Text Note
          </button>

          <button className="btn btn-primary btn-sm" onClick={onNewUpload}>
            <Sparkles size={15} />
            <span>Transcribe Photo</span>
          </button>
        </div>
      </div>

      {/* Free Gemini Key Modal */}
      {showKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Free Gemini API Key</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowKeyModal(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '16px' }}>
              Gemini Flash provides <strong>$0 free handwriting transcription</strong> that deciphers cursive handwriting into clean English plain text with 0 gibberish.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                Gemini API Key:
              </label>
              <input
                type="password"
                className="input"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
              />
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                Get a free key in 10 seconds at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)' }}>Google AI Studio</a>. Saved locally in your browser.
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
