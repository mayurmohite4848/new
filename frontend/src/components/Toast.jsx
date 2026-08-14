import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 2000,
      maxWidth: '420px',
      width: '100%'
    }}>
      {toasts.map(toast => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: isError ? '#881337' : isSuccess ? '#064e3b' : '#1e293b',
              color: '#ffffff',
              border: `1px solid ${isError ? '#f43f5e' : isSuccess ? '#10b981' : '#475569'}`,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isError && <AlertCircle size={18} color="#fda4af" />}
              {isSuccess && <CheckCircle2 size={18} color="#6ee7b7" />}
              {!isError && !isSuccess && <Info size={18} color="#93c5fd" />}
              <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{toast.message}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
