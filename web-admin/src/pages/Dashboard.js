import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
const SERVER = 'https://crisis-shield-hackthon.onrender.com';

const SEV_CONFIG = {
  high:   { bg: '#ff3b3b22', border: '#ff3b3b', text: '#ff6b6b', dot: '#ff3b3b', label: 'HIGH' },
  medium: { bg: '#ff9f0a22', border: '#ff9f0a', text: '#ffb830', dot: '#ff9f0a', label: 'MED' },
  low:    { bg: '#30d15822', border: '#30d158', text: '#34d862', dot: '#30d158', label: 'LOW' },
};

const STATUS_PIPELINE = ['PENDING', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED'];
const STATUS_CONFIG = {
  PENDING:    { bg: '#4a556822', text: '#94a3b8', icon: '⏳', label: 'Pending' },
  DISPATCHED: { bg: '#0a84ff22', text: '#409cff', icon: '📡', label: 'Dispatched' },
  EN_ROUTE:   { bg: '#ff9f0a22', text: '#ffb830', icon: '🚨', label: 'En Route' },
  ARRIVED:    { bg: '#bf5af222', text: '#da8fff', icon: '📍', label: 'Arrived' },
  RESOLVED:   { bg: '#30d15822', text: '#34d862', icon: '✅', label: 'Completed' },
};

const SERVICES_ICONS = {
  police: '🚔', fire: '🚒', ambulance: '🚑',
  disaster: '🏚', electricity: '⚡', coast: '⛵',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#060910; color:#e2e8f0; font-family:'Syne',sans-serif; min-height:100vh; }
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:#0d1117; }
  ::-webkit-scrollbar-thumb { background:#1e2d3d; border-radius:2px; }
  .cs-root { min-height:100vh; background:#060910; position:relative; overflow-x:hidden; }
  .cs-grid-bg {
    position:fixed; inset:0;
    background-image: linear-gradient(rgba(255,59,59,0.03) 1px, transparent 1px), linear-gradient(90deg,rgba(255,59,59,0.03) 1px, transparent 1px);
    background-size:40px 40px; pointer-events:none; z-index:0;
  }
  .cs-scanline {
    position:fixed; inset:0;
    background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.07) 2px,rgba(0,0,0,0.07) 4px);
    pointer-events:none; z-index:1;
  }
  .cs-content { position:relative; z-index:2; }
  .cs-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 32px; height:64px; border-bottom:1px solid #ff3b3b18;
    background:rgba(6,9,16,0.92); backdrop-filter:blur(12px);
    position:sticky; top:0; z-index:100;
  }
  .cs-logo { display:flex; align-items:center; gap:12px; }
  .cs-logo-icon { width:32px; height:32px; background:#ff3b3b; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
  .cs-logo-text { font-size:18px; font-weight:800; letter-spacing:-0.5px; color:#f8fafc; }
  .cs-logo-text span { color:#ff3b3b; }
  .cs-header-right { display:flex; align-items:center; gap:12px; }
  .cs-live-badge { display:flex; align-items:center; gap:6px; background:#ff3b3b15; border:1px solid #ff3b3b40; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; font-family:'JetBrains Mono',monospace; color:#ff6b6b; letter-spacing:1px; }
  .cs-live-dot { width:6px; height:6px; background:#ff3b3b; border-radius:50%; animation:livePulse 1.4s ease-in-out infinite; }
  .cs-reporter-btn { background:#30d15815; border:1px solid #30d15840; color:#34d862; padding:6px 14px; border-radius:6px; font-size:11px; font-weight:700; font-family:'Syne',sans-serif; cursor:pointer; letter-spacing:1px; text-transform:uppercase; transition:all 0.15s; text-decoration:none; display:flex; align-items:center; gap:6px; }
  .cs-reporter-btn:hover { background:#30d15825; border-color:#30d15860; }
  .cs-logout-btn { background:#ff3b3b15; border:1px solid #ff3b3b30; color:#ff6b6b; padding:6px 14px; border-radius:6px; font-size:11px; font-weight:700; font-family:'Syne',sans-serif; cursor:pointer; letter-spacing:1px; text-transform:uppercase; transition:all 0.15s; }
  .cs-logout-btn:hover { background:#ff3b3b25; border-color:#ff3b3b60; }
  .cs-time { font-family:'JetBrains Mono',monospace; font-size:12px; color:#4a5568; }
  @keyframes livePulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.7); } }
  .cs-stats { display:grid; grid-template-columns:repeat(5,1fr); gap:1px; background:#ff3b3b10; border-bottom:1px solid #ff3b3b18; }
  .cs-stat { background:#060910; padding:20px 24px; position:relative; overflow:hidden; transition:background 0.2s; cursor:default; }
  .cs-stat::after { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:var(--accent); transform:scaleX(0); transition:transform 0.3s; transform-origin:left; }
  .cs-stat:hover::after { transform:scaleX(1); }
  .cs-stat:hover { background:#0d1117; }
  .cs-stat-num { font-size:38px; font-weight:800; font-family:'JetBrains Mono',monospace; color:var(--accent); line-height:1; margin-bottom:6px; letter-spacing:-2px; }
  .cs-stat-label { font-size:10px; font-weight:600; color:#4a5568; letter-spacing:2px; text-transform:uppercase; }
  .cs-stat-bg-num { position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:70px; font-weight:800; font-family:'JetBrains Mono',monospace; color:var(--accent); opacity:0.04; line-height:1; pointer-events:none; letter-spacing:-4px; }
  .cs-toolbar { display:flex; align-items:center; justify-content:space-between; padding:14px 32px; border-bottom:1px solid #ffffff08; gap:12px; flex-wrap:wrap; }
  .cs-toolbar-left { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .cs-filter-btn { background:#0d1117; border:1px solid #1e2d3d; color:#94a3b8; padding:6px 12px; border-radius:6px; font-size:11px; font-family:'Syne',sans-serif; font-weight:600; cursor:pointer; transition:all 0.15s; letter-spacing:0.5px; }
  .cs-filter-btn:hover,.cs-filter-btn.active { background:#ff3b3b15; border-color:#ff3b3b40; color:#ff6b6b; }
  .cs-filter-btn.sev-high.active  { background:#ff3b3b22; border-color:#ff3b3b60; color:#ff6b6b; }
  .cs-filter-btn.sev-medium.active{ background:#ff9f0a22; border-color:#ff9f0a60; color:#ffb830; }
  .cs-filter-btn.sev-low.active   { background:#30d15822; border-color:#30d15860; color:#34d862; }
  .cs-divider { width:1px; height:20px; background:#1e2d3d; }
  .cs-count { font-family:'JetBrains Mono',monospace; font-size:12px; color:#4a5568; }
  .cs-section-header { padding:20px 32px 0; display:flex; align-items:center; gap:12px; }
  .cs-section-title { font-size:11px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#2d3748; }
  .cs-section-line { flex:1; height:1px; background:#1a2332; }
  .cs-list { padding:20px 32px; display:flex; flex-direction:column; gap:14px; }
  .cs-empty { text-align:center; padding:80px 0; color:#2d3748; }
  .cs-empty-icon { font-size:48px; margin-bottom:16px; opacity:0.3; }
  .cs-empty-text { font-size:13px; font-weight:600; letter-spacing:2px; text-transform:uppercase; }
  .cs-card { background:#0d1117; border:1px solid #1a2332; border-radius:14px; padding:0; position:relative; overflow:hidden; transition:all 0.2s; animation:cardIn 0.4s ease both; }
  @keyframes cardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  .cs-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--sev-color); border-radius:14px 0 0 14px; }
  .cs-card:hover { border-color:#1e2d3d; background:#0f1520; transform:translateY(-1px); }
  .cs-card.new-flash { border-color:#ff3b3b60; background:#ff3b3b08; animation:newFlash 0.6s ease both; }
  @keyframes newFlash { 0% { box-shadow:0 0 0 0 #ff3b3b44; } 50% { box-shadow:0 0 24px 6px #ff3b3b22; } 100% { box-shadow:none; } }
  .cs-card-inner { padding:20px 24px 20px 28px; }
  .cs-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; }
  .cs-card-title { font-size:15px; font-weight:700; color:#f1f5f9; letter-spacing:-0.2px; line-height:1.3; }
  .cs-badges { display:flex; gap:6px; flex-shrink:0; flex-wrap:wrap; align-items:center; }
  .cs-badge { font-size:10px; font-weight:700; padding:3px 9px; border-radius:4px; letter-spacing:1px; text-transform:uppercase; font-family:'JetBrains Mono',monospace; border:1px solid transparent; }
  .cs-card-meta { display:flex; align-items:center; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
  .cs-meta-item { display:flex; align-items:center; gap:5px; font-size:11px; color:#4a5568; font-family:'JetBrains Mono',monospace; }
  .cs-meta-dot { width:3px; height:3px; border-radius:50%; background:#2d3748; }
  .cs-desc { font-size:13px; color:#64748b; line-height:1.6; margin-bottom:12px; }
  .cs-services { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }
  .cs-service-tag { background:#ffffff08; border:1px solid #1e2d3d; padding:3px 10px; border-radius:20px; font-size:11px; color:#64748b; font-family:'JetBrains Mono',monospace; }
  .cs-photo { width:100%; max-height:180px; object-fit:cover; border-radius:8px; margin-bottom:14px; border:1px solid #1e2d3d; }
  .cs-pipeline { display:flex; align-items:center; gap:0; margin-bottom:16px; background:#060910; border-radius:8px; padding:10px 14px; border:1px solid #1a2332; overflow-x:auto; }
  .cs-pipeline-step { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; min-width:60px; position:relative; cursor:pointer; transition:opacity 0.15s; }
  .cs-pipeline-step .step-icon { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; border:2px solid #1e2d3d; background:#0d1117; transition:all 0.2s; }
  .cs-pipeline-step.done .step-icon { background:var(--step-color); border-color:var(--step-color); }
  .cs-pipeline-step.active .step-icon { border-color:var(--step-color); box-shadow:0 0 12px var(--step-color); background:color-mix(in srgb, var(--step-color) 20%, transparent); }
  .cs-pipeline-step .step-label { font-size:9px; color:#2d3748; font-weight:600; letter-spacing:1px; text-transform:uppercase; font-family:'JetBrains Mono',monospace; text-align:center; }
  .cs-pipeline-step.done .step-label, .cs-pipeline-step.active .step-label { color:var(--step-color); }
  .cs-pipeline-line { flex:1; height:1px; background:#1e2d3d; min-width:12px; margin-top:-16px; }
  .cs-pipeline-line.done { background:var(--line-color); }
  .cs-card-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  .cs-map-link { display:flex; align-items:center; gap:6px; font-size:11px; color:#0a84ff; text-decoration:none; font-family:'JetBrains Mono',monospace; font-weight:500; padding:5px 10px; background:#0a84ff12; border:1px solid #0a84ff25; border-radius:5px; transition:all 0.15s; }
  .cs-map-link:hover { background:#0a84ff22; border-color:#0a84ff50; color:#409cff; }
  .cs-no-loc { font-size:11px; color:#2d3748; font-family:'JetBrains Mono',monospace; }
  .cs-status-sel { background:#060910; color:#94a3b8; border:1px solid #1e2d3d; border-radius:6px; padding:5px 24px 5px 10px; font-size:11px; font-family:'Syne',sans-serif; font-weight:600; cursor:pointer; transition:all 0.15s; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234a5568' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 8px center; }
  .cs-status-sel:hover { border-color:#2d3748; color:#e2e8f0; }
  .cs-toast { position:fixed; bottom:24px; right:24px; background:#0d1117; border:1px solid #ff3b3b40; color:#ff6b6b; padding:12px 18px; border-radius:8px; font-size:12px; font-family:'JetBrains Mono',monospace; font-weight:500; z-index:9999; display:flex; align-items:center; gap:8px; animation:toastIn 0.3s ease; max-width:320px; box-shadow:0 8px 32px rgba(0,0,0,0.5); }
  @keyframes toastIn { from { opacity:0; transform:translateY(10px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  .cs-toast-dot { width:6px; height:6px; background:#ff3b3b; border-radius:50%; flex-shrink:0; animation:livePulse 1.4s ease-in-out infinite; }
  @media(max-width:768px) {
    .cs-stats { grid-template-columns:repeat(3,1fr); }
    .cs-header { padding:0 16px; }
    .cs-list { padding:12px 16px; }
    .cs-toolbar { padding:10px 16px; }
    .cs-section-header { padding:14px 16px 0; }
  }
`;

const STEP_COLORS = {
  PENDING:    '#4a5568',
  DISPATCHED: '#0a84ff',
  EN_ROUTE:   '#ff9f0a',
  ARRIVED:    '#bf5af2',
  RESOLVED:   '#30d158',
};

const NGROK_HEADER = {};

function StatusPipeline({ currentStatus, alertId, onStatusChange }) {
  const currentIdx = STATUS_PIPELINE.indexOf(currentStatus);
  return (
    <div className="cs-pipeline">
      {STATUS_PIPELINE.map((step, i) => {
        const cfg = STATUS_CONFIG[step];
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        const color = STEP_COLORS[step];
        return (
          <React.Fragment key={step}>
            <div
              className={`cs-pipeline-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
              style={{ '--step-color': color }}
              title={`Set to ${cfg.label}`}
              onClick={() => onStatusChange(alertId, step)}
            >
              <div className="step-icon">{cfg.icon}</div>
              <div className="step-label">{cfg.label}</div>
            </div>
            {i < STATUS_PIPELINE.length - 1 && (
              <div
                className={`cs-pipeline-line ${isDone ? 'done' : ''}`}
                style={{ '--line-color': color }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function Dashboard({ onLogout }) {
  const [alerts, setAlerts]       = useState([]);
  const [newId, setNewId]         = useState(null);
  const [sevFilter, setSevFilter] = useState('');
  const [staFilter, setStaFilter] = useState('');
  const [toast, setToast]         = useState('');
  const [time, setTime]           = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch(`${SERVER}/api/alerts`, { headers: NGROK_HEADER })
      .then(r => r.json())
      .then(d => setAlerts(d.alerts || []));

    socketRef.current = io(SERVER, { extraHeaders: NGROK_HEADER });

    socketRef.current.on('new_alert', a => {
      setAlerts(prev => [a, ...prev]);
      setNewId(a._id);
      showToast(`🚨 NEW — ${a.title || a.name}`);
      setTimeout(() => setNewId(null), 4000);
    });

    socketRef.current.on('alert_updated', updated => {
      setAlerts(prev => prev.map(a => a._id === updated._id ? updated : a));
    });

    socketRef.current.on('location_updated', ({ id, lat, lng }) => {
      setAlerts(prev => prev.map(a =>
        a._id === id ? { ...a, location: { ...a.location, lat, lng } } : a
      ));
      showToast('📍 Location Updated');
    });

    return () => socketRef.current?.disconnect();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const changeStatus = (id, status) => {
    fetch(`${SERVER}/api/alerts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...NGROK_HEADER },
      body: JSON.stringify({ status })
    });
    setAlerts(prev => prev.map(a => a._id === id ? { ...a, status } : a));
    showToast(`Status → ${STATUS_CONFIG[status]?.label}`);
  };

  const filtered = alerts.filter(a =>
    (!sevFilter || a.severity === sevFilter) &&
    (!staFilter || a.status === staFilter)
  );

  const stats = [
    { label: 'TOTAL',     value: alerts.length,                                      accent: '#ff3b3b' },
    { label: 'HIGH',      value: alerts.filter(a => a.severity === 'high').length,   accent: '#ff3b3b' },
    { label: 'PENDING',   value: alerts.filter(a => a.status === 'PENDING').length,  accent: '#4a5568' },
    { label: 'EN ROUTE',  value: alerts.filter(a => a.status === 'EN_ROUTE').length, accent: '#ff9f0a' },
    { label: 'COMPLETED', value: alerts.filter(a => a.status === 'RESOLVED').length, accent: '#30d158' },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="cs-root">
        <div className="cs-grid-bg" />
        <div className="cs-scanline" />
        <div className="cs-content">

          <header className="cs-header">
            <div className="cs-logo">
              <div className="cs-logo-icon">⚠</div>
              <div className="cs-logo-text">Crisis<span>Shield</span></div>
            </div>
            <div className="cs-header-right">
              <div className="cs-live-badge">
                <div className="cs-live-dot" />
                LIVE
              </div>
              <div className="cs-time">{time}</div>
              <a
                className="cs-reporter-btn"
                href={`${SERVER}/mobile.html`}
                target="_blank"
                rel="noreferrer"
              >
                📱 Reporter Page
              </a>
              <button className="cs-logout-btn" onClick={onLogout}>Logout</button>
            </div>
          </header>

          <div className="cs-stats">
            {stats.map(s => (
              <div key={s.label} className="cs-stat" style={{ '--accent': s.accent }}>
                <div className="cs-stat-num">{String(s.value).padStart(2, '0')}</div>
                <div className="cs-stat-label">{s.label}</div>
                <div className="cs-stat-bg-num">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="cs-toolbar">
            <div className="cs-toolbar-left">
              <span style={{ fontSize:'11px', color:'#2d3748', letterSpacing:'2px', fontWeight:700 }}>SEV</span>
              {['high','medium','low'].map(s => (
                <button
                  key={s}
                  className={`cs-filter-btn sev-${s} ${sevFilter === s ? 'active' : ''}`}
                  onClick={() => setSevFilter(sevFilter === s ? '' : s)}
                >
                  {s.toUpperCase()}
                </button>
              ))}
              <div className="cs-divider" />
              <span style={{ fontSize:'11px', color:'#2d3748', letterSpacing:'2px', fontWeight:700 }}>STATUS</span>
              {STATUS_PIPELINE.map(s => (
                <button
                  key={s}
                  className={`cs-filter-btn ${staFilter === s ? 'active' : ''}`}
                  onClick={() => setStaFilter(staFilter === s ? '' : s)}
                >
                  {STATUS_CONFIG[s].label.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="cs-count">{filtered.length} / {alerts.length} alerts</div>
          </div>

          <div className="cs-section-header">
            <span className="cs-section-title">Alert Feed</span>
            <div className="cs-section-line" />
          </div>

          <div className="cs-list">
            {filtered.length === 0 ? (
              <div className="cs-empty">
                <div className="cs-empty-icon">⚠</div>
                <div className="cs-empty-text">No alerts found</div>
              </div>
            ) : (
              filtered.map(alert => {
                const sc  = SEV_CONFIG[alert.severity] || SEV_CONFIG.high;
                const stc = STATUS_CONFIG[alert.status] || STATUS_CONFIG.PENDING;
                return (
                  <div
                    key={alert._id}
                    className={`cs-card ${alert._id === newId ? 'new-flash' : ''}`}
                    style={{ '--sev-color': sc.border }}
                  >
                    <div className="cs-card-inner">
                      <div className="cs-card-header">
                        <div className="cs-card-title">
                          {alert.title || `Alert by ${alert.name}`}
                        </div>
                        <div className="cs-badges">
                          <span className="cs-badge" style={{ background: sc.bg, color: sc.text, borderColor: sc.border + '40' }}>
                            {sc.label}
                          </span>
                          <span className="cs-badge" style={{ background: stc.bg, color: stc.text }}>
                            {stc.icon} {stc.label}
                          </span>
                        </div>
                      </div>

                      <div className="cs-card-meta">
                        <div className="cs-meta-item">
                          <span style={{ color: sc.dot, fontSize:'8px' }}>●</span>
                          {alert.name}
                        </div>
                        {alert.phone && (
                          <>
                            <div className="cs-meta-dot" />
                            <div className="cs-meta-item">📞 {alert.phone}</div>
                          </>
                        )}
                        <div className="cs-meta-dot" />
                        <div className="cs-meta-item">
                          {new Date(alert.createdAt).toLocaleString('en-IN', {
                            day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
                          })}
                        </div>
                        {alert.location?.lat && (
                          <>
                            <div className="cs-meta-dot" />
                            <div className="cs-meta-item" style={{ color:'#0a84ff' }}>
                              📍 {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                            </div>
                          </>
                        )}
                      </div>

                      {alert.description && (
                        <div className="cs-desc">{alert.description}</div>
                      )}

                      {alert.services?.length > 0 && (
                        <div className="cs-services">
                          {alert.services.map(s => (
                            <span key={s} className="cs-service-tag">
                              {SERVICES_ICONS[s] || '🔔'} {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {alert.photo && (
                        <img src={alert.photo} alt="Incident proof" className="cs-photo" />
                      )}

                      <StatusPipeline
                        currentStatus={alert.status}
                        alertId={alert._id}
                        onStatusChange={changeStatus}
                      />

                      <div className="cs-card-footer">
                        {alert.location?.lat ? (
                          <a
                            href={`https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="cs-map-link"
                          >
                            🗺 VIEW ON MAP
                          </a>
                        ) : (
                          <span className="cs-no-loc">No location data</span>
                        )}
                        <select
                          className="cs-status-sel"
                          value={alert.status}
                          onChange={e => changeStatus(alert._id, e.target.value)}
                        >
                          {STATUS_PIPELINE.map(s => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {toast && (
          <div className="cs-toast">
            <div className="cs-toast-dot" />
            {toast}
          </div>
        )}
      </div>
    </>
  );
}
