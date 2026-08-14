import React from 'react';
import { 
  Star, 
  Trash2, 
  Eye, 
  Calendar, 
  Image as ImageIcon, 
  FileText,
  Copy,
  Check
} from 'lucide-react';

export default function NoteCard({ 
  note, 
  onSelect, 
  onToggleFavorite, 
  onDelete, 
  showToast 
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    const textToCopy = note.extracted_text || note.content || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (showToast) showToast('Copied text to clipboard!', 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasImage = Boolean(note.image_filename);
  const metadata = note.image_metadata || {};
  const tags = note.tags || [];

  return (
    <div 
      className="glass-panel"
      onClick={() => onSelect(note)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Thumbnail Banner if image exists */}
      {hasImage && (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '180px',
          background: '#040711',
          borderBottom: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src={`/api/uploads/${note.image_filename}`} 
            alt={note.title}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />

          {/* Metadata Overlay Badges */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap'
          }}>
            {metadata.format && (
              <span className="meta-chip" style={{ background: 'rgba(0,0,0,0.7)', color: '#67e8f9' }}>
                {metadata.format}
              </span>
            )}
            {metadata.width && metadata.height ? (
              <span className="meta-chip" style={{ background: 'rgba(0,0,0,0.7)' }}>
                {metadata.width}×{metadata.height}
              </span>
            ) : null}
            {metadata.file_size_human && (
              <span className="meta-chip" style={{ background: 'rgba(0,0,0,0.7)' }}>
                {metadata.file_size_human}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Card Body */}
      <div style={{
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: '12px'
      }}>
        {/* Header Title & Favorite Button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <h3 style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            lineHeight: 1.3,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {note.title}
          </h3>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(note.id, !note.is_favorite);
            }}
            title={note.is_favorite ? 'Remove favorite' : 'Mark as favorite'}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: note.is_favorite ? '#f59e0b' : 'var(--text-dim)',
              padding: '2px',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Star size={18} fill={note.is_favorite ? '#f59e0b' : 'none'} />
          </button>
        </div>

        {/* Content Snippet */}
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: hasImage ? 3 : 5,
          WebkitBoxOrient: 'vertical',
          flex: 1,
          whiteSpace: 'pre-wrap'
        }}>
          {note.content}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
            {tags.slice(0, 4).map(t => (
              <span key={t} className="tag-badge">
                #{t}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="meta-chip">+{tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Card Footer: Date & Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
          marginTop: '6px',
          fontSize: '0.76rem',
          color: 'var(--text-dim)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Calendar size={13} />
            <span>{note.created_at ? note.created_at.split(' ')[0] : 'Recent'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Copy snippet */}
            <button
              onClick={handleCopy}
              className="btn btn-ghost btn-icon"
              style={{ width: '28px', height: '28px' }}
              title="Copy text"
            >
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            </button>

            {/* Quick Delete */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete note "${note.title}"?`)) {
                  onDelete(note.id);
                }
              }}
              className="btn btn-ghost btn-icon"
              style={{ width: '28px', height: '28px', color: 'var(--text-dim)' }}
              title="Delete Note"
              onMouseEnter={(e) => e.currentTarget.style.color = '#f43f5e'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
