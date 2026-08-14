import React from 'react';
import { 
  Sparkles, 
  PlusCircle, 
  UploadCloud, 
  RefreshCw, 
  Database,
  Layers
} from 'lucide-react';

export default function Navbar({ 
  backendOnline, 
  onOpenUpload, 
  onOpenManualNote, 
  onRefresh, 
  refreshing 
}) {
  return (
    <header className="glass-panel" style={{
      padding: '16px 24px',
      marginBottom: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      {/* Brand & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
        }}>
          <Layers size={22} color="#ffffff" />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              letterSpacing: '-0.02em',
              background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline'
            }}>
              NoteExtract AI
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: backendOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: backendOnline ? '#6ee7b7' : '#fda4af',
              border: `1px solid ${backendOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: backendOnline ? '#10b981' : '#f43f5e'
              }} />
              {backendOnline ? 'Flask & SQLite Active' : 'Backend Offline'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Image Metadata Inspector & Extracted Notes Hub
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={refreshing}
          title="Reload notes and stats"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-pulse-subtle' : ''} />
          <span>Refresh</span>
        </button>

        <button 
          className="btn btn-secondary btn-sm"
          onClick={onOpenManualNote}
        >
          <PlusCircle size={15} />
          <span>New Note</span>
        </button>

        <button 
          className="btn btn-primary btn-sm"
          onClick={onOpenUpload}
        >
          <UploadCloud size={16} />
          <span>Upload Image</span>
        </button>
      </div>
    </header>
  );
}
