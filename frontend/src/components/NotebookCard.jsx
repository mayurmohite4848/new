import React from 'react';
import { 
  BookOpen, 
  FileText, 
  Download, 
  Trash2, 
  Calendar, 
  Layers, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function NotebookCard({ notebook, onOpen, onDelete, showToast }) {
  const pageCount = notebook.page_count || 0;
  const coverColor = notebook.cover_color || '#6366f1';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleDownloadPdf = (e) => {
    e.stopPropagation();
    window.open(api.getExportPdfUrl(notebook.id), '_blank');
    if (showToast) showToast('Generating PDF download...', 'info');
  };

  const handleDownloadMd = (e) => {
    e.stopPropagation();
    window.open(api.getExportMdUrl(notebook.id), '_blank');
    if (showToast) showToast('Downloading Markdown bundle...', 'info');
  };

  return (
    <div 
      className="glass-panel glass-panel-hover"
      onClick={() => onOpen(notebook)}
      style={{
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        overflow: 'hidden',
        minHeight: '260px',
        position: 'relative',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Notebook Spine / Cover Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${coverColor} 0%, rgba(15, 23, 42, 0.95) 100%)`,
        padding: '18px 20px',
        position: 'relative',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '3px 8px',
            borderRadius: '4px',
            background: 'rgba(0, 0, 0, 0.35)',
            color: '#ffffff'
          }}>
            {notebook.subject_tag || 'Notebook'}
          </span>

          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '3px 8px',
            borderRadius: '12px'
          }}>
            <Layers size={13} />
            <span>{pageCount} {pageCount === 1 ? 'Page' : 'Pages'}</span>
          </span>
        </div>

        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: 800,
          color: '#ffffff',
          marginTop: '12px',
          lineHeight: '1.3',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {notebook.title || 'Untitled Notebook'}
        </h3>
      </div>

      {/* Body: Description */}
      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <p style={{
          fontSize: '0.84rem',
          color: 'var(--text-muted)',
          lineHeight: '1.5',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: '12px'
        }}>
          {notebook.description || `${pageCount} handwritten pages digitized and formatted into clean notes.`}
        </p>

        {/* Action Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
          marginTop: '8px',
          fontSize: '0.78rem',
          color: 'var(--text-dim)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} />
            <span>{formatDate(notebook.updated_at || notebook.created_at)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={handleDownloadPdf}
              title="Download PDF document"
              style={{ color: '#818cf8', padding: '5px' }}
            >
              <Download size={15} />
            </button>

            <button
              className="btn btn-ghost btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                if (onDelete) onDelete(notebook.id);
              }}
              title="Delete Notebook"
              style={{ color: 'var(--text-dim)', padding: '5px' }}
            >
              <Trash2 size={15} />
            </button>

            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '4px 10px', fontSize: '0.78rem', marginLeft: '4px' }}
            >
              <span>Read</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
