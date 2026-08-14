import React from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Star, 
  Tag as TagIcon,
  Filter
} from 'lucide-react';

export default function StatsBar({ 
  stats, 
  selectedTag, 
  onSelectTag, 
  showFavoritesOnly, 
  onToggleFavorites 
}) {
  const {
    total_notes = 0,
    notes_with_images = 0,
    favorite_notes = 0,
    unique_tags_count = 0,
    tags = []
  } = stats || {};

  return (
    <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 4 Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {/* Total Notes */}
        <div className="glass-panel" style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a5b4fc'
          }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Notes
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {total_notes}
            </div>
          </div>
        </div>

        {/* Images Uploaded */}
        <div className="glass-panel" style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#67e8f9'
          }}>
            <ImageIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Images Processed
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {notes_with_images}
            </div>
          </div>
        </div>

        {/* Favorite Notes */}
        <div 
          className="glass-panel" 
          onClick={onToggleFavorites}
          style={{
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            cursor: 'pointer',
            border: showFavoritesOnly ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
            background: showFavoritesOnly ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-surface)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fcd34d'
          }}>
            <Star size={22} fill={showFavoritesOnly ? '#f59e0b' : 'none'} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Favorites {showFavoritesOnly ? '(Filtering)' : ''}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {favorite_notes}
            </div>
          </div>
        </div>

        {/* Unique Tags */}
        <div className="glass-panel" style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6ee7b7'
          }}>
            <TagIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tags Indexed
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {unique_tags_count}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tag Filter Bar */}
      {tags.length > 0 && (
        <div className="glass-panel" style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.8rem', 
            color: 'var(--text-dim)',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}>
            <Filter size={14} />
            <span>Filter Tag:</span>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onSelectTag('')}
            style={{
              padding: '3px 10px',
              fontSize: '0.78rem',
              borderRadius: '999px',
              background: !selectedTag ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: !selectedTag ? '#ffffff' : 'var(--text-muted)',
              border: !selectedTag ? '1px solid var(--accent-primary)' : '1px solid transparent'
            }}
          >
            All Notes
          </button>

          {tags.map(t => {
            const isSelected = selectedTag.toLowerCase() === t.toLowerCase();
            return (
              <button
                key={t}
                onClick={() => onSelectTag(isSelected ? '' : t)}
                style={{
                  padding: '3px 10px',
                  fontSize: '0.78rem',
                  borderRadius: '999px',
                  background: isSelected ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                  color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                #{t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
