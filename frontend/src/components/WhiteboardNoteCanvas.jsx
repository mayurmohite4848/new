import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Printer, 
  Download, 
  Layers, 
  Type, 
  Grid, 
  AlignLeft, 
  Square,
  CheckCircle,
  Lightbulb,
  FileText,
  Eye,
  Edit3
} from 'lucide-react';

export default function WhiteboardNoteCanvas({ 
  note, 
  onUpdateStyle, 
  showToast 
}) {
  const [paperStyle, setPaperStyle] = useState('paper-blank'); // 'paper-blank' | 'paper-ruled' | 'paper-dots'
  const [fontStyle, setFontStyle] = useState(note?.handwriting_style || 'font-caveat');
  const [showAiSticky, setShowAiSticky] = useState(true);
  const [showCleanedInk, setShowCleanedInk] = useState(Boolean(note?.cleaned_image_filename || note?.image_filename));
  const [inkOpacity, setInkOpacity] = useState(100);

  const canvasRef = useRef(null);

  const cleanedImageUrl = note?.cleaned_image_filename 
    ? `/api/uploads/${note.cleaned_image_filename}` 
    : (note?.image_filename ? `/api/uploads/${note.image_filename}` : null);

  const aiInsights = note?.ai_insights || null;
  const keyTakeaways = aiInsights?.key_takeaways || [];
  const coreConcept = aiInsights?.core_concept || '';
  const diagramData = aiInsights?.diagram_data || null;

  const handlePrint = () => {
    window.print();
  };

  const handleFontChange = (styleKey) => {
    setFontStyle(styleKey);
    if (onUpdateStyle) {
      onUpdateStyle(styleKey);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Canvas Controls Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(15, 23, 42, 0.8)',
        padding: '10px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Paper Style Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Paper:</span>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '2px', borderRadius: '6px' }}>
            <button
              onClick={() => setPaperStyle('paper-blank')}
              style={{
                background: paperStyle === 'paper-blank' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: paperStyle === 'paper-blank' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Pure White Canvas"
            >
              <Square size={13} /> Plain
            </button>
            <button
              onClick={() => setPaperStyle('paper-ruled')}
              style={{
                background: paperStyle === 'paper-ruled' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: paperStyle === 'paper-ruled' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Ruled Notebook Lines"
            >
              <AlignLeft size={13} /> Ruled
            </button>
            <button
              onClick={() => setPaperStyle('paper-dots')}
              style={{
                background: paperStyle === 'paper-dots' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: paperStyle === 'paper-dots' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Dot Grid Pattern"
            >
              <Grid size={13} /> Dot Grid
            </button>
          </div>
        </div>

        {/* Handwriting Style Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Handwriting Style:</span>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '2px', borderRadius: '6px' }}>
            <button
              onClick={() => handleFontChange('font-caveat')}
              style={{
                background: fontStyle === 'font-caveat' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: fontStyle === 'font-caveat' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'var(--font-hand-caveat)',
                fontSize: '0.95rem'
              }}
            >
              Caveat (Flowing)
            </button>
            <button
              onClick={() => handleFontChange('font-kalam')}
              style={{
                background: fontStyle === 'font-kalam' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: fontStyle === 'font-kalam' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'var(--font-hand-kalam)',
                fontSize: '0.85rem'
              }}
            >
              Kalam (Pen)
            </button>
            <button
              onClick={() => handleFontChange('font-architect')}
              style={{
                background: fontStyle === 'font-architect' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: fontStyle === 'font-architect' ? '#ffffff' : 'var(--text-muted)',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'var(--font-hand-architect)',
                fontSize: '0.8rem'
              }}
            >
              Architect (Sketch)
            </button>
          </div>
        </div>

        {/* Toggles & Print Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {cleanedImageUrl && (
            <button
              onClick={() => setShowCleanedInk(!showCleanedInk)}
              className="btn btn-secondary btn-sm"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                background: showCleanedInk ? 'rgba(99, 102, 241, 0.25)' : 'transparent'
              }}
            >
              <Eye size={13} />
              <span>{showCleanedInk ? 'Hide Cleaned Ink' : 'Show Cleaned Ink'}</span>
            </button>
          )}

          {keyTakeaways.length > 0 && (
            <button
              onClick={() => setShowAiSticky(!showAiSticky)}
              className="btn btn-secondary btn-sm"
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                background: showAiSticky ? 'rgba(234, 179, 8, 0.2)' : 'transparent',
                color: showAiSticky ? '#fde047' : 'var(--text-muted)'
              }}
            >
              <Lightbulb size={13} />
              <span>{showAiSticky ? 'AI Notes On' : 'AI Notes Off'}</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            title="Print or Export to PDF"
          >
            <Printer size={13} />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* The Printable White Note Canvas */}
      <div 
        ref={canvasRef}
        className={`white-paper-canvas ${paperStyle}`}
        style={{
          minHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Header on White Paper */}
        <div style={{
          borderBottom: '2px solid #0f172a',
          paddingBottom: '14px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div>
            <h1 className={`handwriting-text ${fontStyle}`} style={{
              fontSize: '2.1rem',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.2,
              margin: 0
            }}>
              {note.title}
            </h1>
            <div style={{
              fontSize: '0.88rem',
              fontFamily: 'var(--font-hand-architect)',
              color: '#475569',
              marginTop: '4px'
            }}>
              📅 Date: {note.created_at ? note.created_at.split(' ')[0] : 'Today'}
              {note.tags && note.tags.length > 0 && (
                <span style={{ marginLeft: '12px' }}>
                  🏷️ {note.tags.map(t => `#${t}`).join('  ')}
                </span>
              )}
            </div>
          </div>

          {/* Minimal Watermark / Stamp */}
          <div style={{
            border: '2px dashed #94a3b8',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-hand-architect)',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            transform: 'rotate(2deg)'
          }}>
            Digitized Whiteboard Note
          </div>
        </div>

        {/* Canvas Body Layout: Inked Scan & Natural Handwritten Notes + Minimal AI Sticky */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: showAiSticky && keyTakeaways.length > 0 ? '1fr 280px' : '1fr',
          gap: '28px',
          alignItems: 'start'
        }}>
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Cleaned Inked Scan on Pure White Canvas */}
            {cleanedImageUrl && showCleanedInk && (
              <div style={{
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                padding: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <img
                  src={cleanedImageUrl}
                  alt="Extracted Ink on White Canvas"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '380px',
                    objectFit: 'contain',
                    filter: `contrast(1.05)`
                  }}
                />
                <span style={{
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-hand-architect)',
                  color: '#64748b'
                }}>
                  ✨ Background removed • Extracted ink on pure white canvas
                </span>
              </div>
            )}

            {/* Natural Handwriting Text Notes */}
            <div style={{ padding: '8px 0' }}>
              <div className={`handwriting-text ${fontStyle}`} style={{
                color: '#1e293b',
                whiteSpace: 'pre-wrap',
                fontSize: fontStyle === 'font-caveat' ? '1.5rem' : fontStyle === 'font-kalam' ? '1.3rem' : '1.18rem',
                lineHeight: fontStyle === 'font-caveat' ? 1.7 : 1.6
              }}>
                {note.content || 'No handwritten notes transcribed yet.'}
              </div>
            </div>

            {/* Extracted OCR text if different from content */}
            {note.extracted_text && note.extracted_text !== note.content && (
              <div style={{
                marginTop: '12px',
                padding: '14px 18px',
                background: '#f8fafc',
                borderRadius: '8px',
                borderLeft: '3px solid #6366f1'
              }}>
                <div style={{
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#64748b',
                  marginBottom: '4px',
                  fontWeight: 600
                }}>
                  ORIGINAL TRANSCRIBED TEXT:
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#334155',
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5
                }}>
                  {note.extracted_text}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Minimal AI Sticky Note */}
          {showAiSticky && keyTakeaways.length > 0 && (
            <aside className="ai-sticky-note" style={{ alignSelf: 'start' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                marginBottom: '10px',
                color: '#854d0e',
                borderBottom: '1px dashed #ca8a04',
                paddingBottom: '6px'
              }}>
                <Sparkles size={15} color="#ca8a04" />
                <span>AI Key Takeaways (Minimal)</span>
              </div>

              {coreConcept && (
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#713f12',
                  marginBottom: '10px',
                  background: 'rgba(255, 255, 255, 0.4)',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  💡 Concept: {coreConcept}
                </div>
              )}

              <ul style={{
                margin: 0,
                paddingLeft: '18px',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {keyTakeaways.map((point, idx) => (
                  <li key={idx} style={{ color: '#713f12' }}>
                    {point}
                  </li>
                ))}
              </ul>

              {/* Minimal Concept Diagram Box if available */}
              {diagramData && diagramData.steps && (
                <div style={{
                  marginTop: '14px',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '6px',
                  border: '1px solid rgba(202, 138, 4, 0.3)',
                  fontSize: '0.74rem'
                }}>
                  <div style={{ fontWeight: 600, color: '#854d0e', marginBottom: '4px' }}>
                    Flow Structure:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {diagramData.steps.map((step, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <span style={{
                          background: '#fef9c3',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #ca8a04',
                          fontWeight: 500
                        }}>
                          {step}
                        </span>
                        {sIdx < diagramData.steps.length - 1 && <span>→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                marginTop: '12px',
                fontSize: '0.7rem',
                color: '#a16207',
                textAlign: 'right',
                fontFamily: 'var(--font-hand-architect)'
              }}>
                Zero Cost • 100% Local AI
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
