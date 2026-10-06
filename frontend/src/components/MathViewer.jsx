import React from 'react';
import katex from 'katex';

export default function MathViewer({ math, displayMode = false }) {
  if (!math || !math.trim()) return null;

  try {
    const cleanMath = math.trim();
    const html = katex.renderToString(cleanMath, {
      throwOnError: false,
      displayMode: displayMode
    });

    if (displayMode) {
      return (
        <div 
          className="katex-display-block"
          style={{
            margin: '8px 0',
            padding: '10px 14px',
            background: 'rgba(6, 182, 212, 0.06)',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            borderRadius: '8px',
            overflowX: 'auto',
            textAlign: 'center'
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    return (
      <span 
        className="katex-inline"
        style={{
          display: 'inline-block',
          padding: '0 3px',
          verticalAlign: 'middle'
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (err) {
    return (
      <code style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
        {math}
      </code>
    );
  }
}
