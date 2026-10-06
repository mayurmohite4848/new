import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  X, 
  RefreshCw, 
  Trash2, 
  Zap, 
  Cpu, 
  Layers, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Server,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';

export default function LLMOpsModal({ onClose, showToast }) {
  const [telemetry, setTelemetry] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTelemetry = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        api.getTelemetryStats(),
        api.getTelemetryLogs(50)
      ]);
      setTelemetry(statsRes.telemetry || {});
      setLogs(logsRes.logs || []);
      if (isManual && showToast) {
        showToast('LLMOps telemetry metrics updated.', 'info');
      }
    } catch (err) {
      console.error('Failed to load telemetry:', err);
      if (showToast) showToast('Failed to load LLMOps telemetry.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handleClear = async () => {
    try {
      await api.clearTelemetryLogs();
      if (showToast) showToast('Historical LLMOps telemetry cleared.', 'info');
      fetchTelemetry();
    } catch (err) {
      if (showToast) showToast('Failed to clear logs.', 'error');
    }
  };

  const getLatencyColor = (ms) => {
    if (ms < 600) return '#34d399'; // Fast green
    if (ms < 1800) return '#facc15'; // Medium yellow
    return '#fb923c'; // Slower orange
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '1080px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)'
            }}>
              <Activity size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  LLMOps Telemetry & Hybrid Fallback Engine
                </h2>
                <span className="tag-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}>
                  Live Observability
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Real-time tracking of latency, token consumption, fallback health, and model routing.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => fetchTelemetry(true)}
              disabled={refreshing}
              title="Refresh telemetry metrics"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            {logs.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleClear}
                title="Clear all recorded telemetry"
              >
                <Trash2 size={14} />
                <span>Clear Logs</span>
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close Telemetry">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          background: 'var(--bg-surface)'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <p>Calculating LLMOps metrics and logs...</p>
            </div>
          ) : (
            <>
              {/* 5 Key Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                {/* 1. Invocations */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>TOTAL REQUESTS</span>
                    <Zap size={16} color="#818cf8" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
                    {telemetry?.total_requests || 0}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    OCR + RAG executions
                  </span>
                </div>

                {/* 2. Avg Latency */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>AVG LATENCY</span>
                    <Clock size={16} color="#38bdf8" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: getLatencyColor(telemetry?.avg_latency_ms || 0) }}>
                    {telemetry?.avg_latency_ms ? `${telemetry.avg_latency_ms}ms` : '0ms'}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Min: {telemetry?.min_latency_ms || 0}ms &bull; Max: {telemetry?.max_latency_ms || 0}ms
                  </span>
                </div>

                {/* 3. Fallback Health */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>HYBRID FALLBACKS</span>
                    <ShieldCheck size={16} color="#34d399" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
                    {telemetry?.fallback_count || 0} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 500 }}>({telemetry?.fallback_rate_pct || 0}%)</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Zero-downtime local executions
                  </span>
                </div>

                {/* 4. Total Tokens */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>TOKEN USAGE</span>
                    <TrendingUp size={16} color="#a855f7" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>
                    {telemetry?.total_tokens?.toLocaleString() || 0}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Prompt: {telemetry?.total_prompt_tokens || 0} &bull; Comp: {telemetry?.total_completion_tokens || 0}
                  </span>
                </div>

                {/* 5. Estimated Cost */}
                <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', fontSize: '0.78rem', fontWeight: 600 }}>
                    <span>ESTIMATED COST</span>
                    <DollarSign size={16} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
                    ${(telemetry?.total_estimated_cost_usd || 0).toFixed(4)}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    100% Free Gemini Flash Tier
                  </span>
                </div>
              </div>

              {/* Models Breakdown & Architecture Router */}
              <div className="glass-panel" style={{ padding: '18px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={16} color="#818cf8" />
                    <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Multi-Tier Model Routing Distribution
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    Autonomous Fallback & Load Balancer
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                  {telemetry?.models_breakdown?.map((m, idx) => (
                    <div 
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: m.model_used.includes('gemini') ? '#38bdf8' : '#34d399'
                        }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                          {m.model_used}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
                          {m.count} calls
                        </span>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          avg {Math.round(m.avg_latency)}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Telemetry Execution Log Feed */}
              <div className="glass-panel" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={16} color="#38bdf8" />
                    <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Execution Logs & Latency Profiler ({logs.length})
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    Chronological audit trail
                  </span>
                </div>

                {logs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    No execution telemetry recorded yet. Perform an OCR transcription or RAG query to generate live logs.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                          <th style={{ padding: '8px 10px' }}>REQUEST TYPE</th>
                          <th style={{ padding: '8px 10px' }}>MODEL ROUTE</th>
                          <th style={{ padding: '8px 10px' }}>STATUS</th>
                          <th style={{ padding: '8px 10px' }}>LATENCY</th>
                          <th style={{ padding: '8px 10px' }}>TOKENS</th>
                          <th style={{ padding: '8px 10px' }}>TIMESTAMP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr 
                            key={log.id} 
                            style={{ 
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              transition: 'background 0.1s ease'
                            }}
                            className="glass-panel-hover"
                          >
                            <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-main)' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                                fontSize: '0.72rem'
                              }}>
                                {log.request_type}
                              </span>
                            </td>
                            <td style={{ padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: '#38bdf8' }}>
                              {log.model_used}
                            </td>
                            <td style={{ padding: '10px' }}>
                              {log.is_fallback ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#fbbf24',
                                  fontSize: '0.72rem',
                                  background: 'rgba(251, 191, 36, 0.12)',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  <AlertTriangle size={11} />
                                  <span>Fallback ({log.fallback_reason})</span>
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#34d399',
                                  fontSize: '0.72rem',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  <CheckCircle2 size={11} />
                                  <span>Primary</span>
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '10px', fontWeight: 700, color: getLatencyColor(log.latency_ms) }}>
                              {log.latency_ms}ms
                            </td>
                            <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                              {log.total_tokens || 0} tok
                            </td>
                            <td style={{ padding: '10px', color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                              {new Date(log.created_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
