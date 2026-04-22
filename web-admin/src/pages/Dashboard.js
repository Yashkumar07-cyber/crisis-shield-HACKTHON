import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SERVER = 'https://crisis-shield-hackthon.onrender.com';

const SEV_CONFIG = {
  high:   { bg: 'rgba(220,38,38,0.08)',  border: '#dc2626', text: '#dc2626', label: 'HIGH', glow: 'rgba(220,38,38,0.15)' },
  medium: { bg: 'rgba(217,119,6,0.08)',  border: '#d97706', text: '#d97706', label: 'MED',  glow: 'rgba(217,119,6,0.15)' },
  low:    { bg: 'rgba(5,150,105,0.08)',  border: '#059669', text: '#059669', label: 'LOW',  glow: 'rgba(5,150,105,0.15)' },
};

const STATUS_PIPELINE = ['PENDING', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED'];
const STATUS_CONFIG = {
  PENDING:    { bg: 'rgba(100,116,139,0.1)', text: '#64748b', icon: '⏳', label: 'Pending',    color: '#64748b' },
  DISPATCHED: { bg: 'rgba(37,99,235,0.1)',   text: '#2563eb', icon: '📡', label: 'Dispatched', color: '#2563eb' },
  EN_ROUTE:   { bg: 'rgba(217,119,6,0.1)',   text: '#d97706', icon: '🚨', label: 'En Route',   color: '#d97706' },
  ARRIVED:    { bg: 'rgba(124,58,237,0.1)',  text: '#7c3aed', icon: '📍', label: 'Arrived',    color: '#7c3aed' },
  RESOLVED:   { bg: 'rgba(5,150,105,0.1)',   text: '#059669', icon: '✅', label: 'Completed',  color: '#059669' },
};

const SERVICES_ICONS = { police:'🚔', fire:'🚒', ambulance:'🚑', disaster:'🏚', electricity:'⚡', coast:'⛵' };

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');

  *,*::before,*::after { margin:0; padding:0; box-sizing:border-box }
  :root {
    --red:#dc2626; --blue:#2563eb; --green:#059669; --amber:#d97706; --purple:#7c3aed;
    --bg:#f1f5f9; --bg2:#ffffff; --bg3:#f8fafc;
    --border:#e2e8f0; --border2:#cbd5e1;
    --text:#1e293b; --text-mid:#64748b; --text-dim:#94a3b8;
    --shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);
    --shadow-md:0 4px 16px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04);
  }
  html,body { background:var(--bg); color:var(--text); font-family:'DM Sans',sans-serif; min-height:100vh; overflow-x:hidden }
  ::-webkit-scrollbar { width:4px }
  ::-webkit-scrollbar-track { background:transparent }
  ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:4px }

  .bg-root { min-height:100vh; background:var(--bg) }

  .hdr {
    display:flex; align-items:center; justify-content:space-between;
    padding:0 28px; height:60px;
    background:var(--bg2); border-bottom:1px solid var(--border);
    position:sticky; top:0; z-index:100;
    box-shadow:0 1px 0 var(--border),0 2px 8px rgba(0,0,0,0.04)
  }
  .logo { display:flex; align-items:center; gap:10px }
  .logo-icon {
    width:34px; height:34px;
    background:linear-gradient(135deg,#dc2626,#b91c1c);
    border-radius:9px; display:flex; align-items:center; justify-content:center;
    font-size:16px; box-shadow:0 2px 8px rgba(220,38,38,0.25)
  }
  .logo-name { font-size:15px; font-weight:700; color:var(--text) }
  .logo-name span { color:var(--red) }
  .hdr-nav { display:flex; gap:2px }
  .nav-btn {
    background:transparent; border:none; color:var(--text-mid);
    padding:6px 14px; border-radius:8px;
    font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500;
    cursor:pointer; transition:all 0.15s
  }
  .nav-btn:hover { background:var(--bg); color:var(--text) }
  .nav-btn.active { background:#eff6ff; color:var(--blue); font-weight:600 }
  .hdr-right { display:flex; align-items:center; gap:8px }
  .live-pill {
    display:flex; align-items:center; gap:6px;
    background:#fef2f2; border:1px solid #fecaca;
    padding:4px 12px; border-radius:20px;
    font-family:'DM Mono',monospace; font-size:11px; font-weight:500;
    color:var(--red); letter-spacing:1px
  }
  .live-dot {
    width:6px; height:6px; background:var(--red); border-radius:50%;
    animation:livePulse 1.5s ease-in-out infinite
  }
  @keyframes livePulse {
    0%,100% { opacity:1; transform:scale(1) }
    50% { opacity:0.4; transform:scale(0.6) }
  }
  .clock {
    font-family:'DM Mono',monospace; font-size:13px; color:var(--text-mid);
    padding:4px 10px; background:var(--bg); border:1px solid var(--border); border-radius:7px
  }
  .reporter-btn {
    display:flex; align-items:center; gap:6px;
    background:#f0fdf4; border:1px solid #bbf7d0; color:var(--green);
    padding:5px 13px; border-radius:8px; font-size:12px; font-weight:600;
    cursor:pointer; text-decoration:none; transition:all 0.15s
  }
  .reporter-btn:hover { background:#dcfce7; box-shadow:0 2px 8px rgba(5,150,105,0.15) }
  .logout-btn {
    background:#fef2f2; border:1px solid #fecaca; color:var(--red);
    padding:5px 14px; border-radius:8px; font-size:12px; font-weight:600;
    cursor:pointer; transition:all 0.15s; font-family:'DM Sans',sans-serif
  }
  .logout-btn:hover { background:#fee2e2; box-shadow:0 2px 8px rgba(220,38,38,0.15) }

  .stats-row {
    display:grid; grid-template-columns:repeat(5,1fr);
    background:var(--bg2); border-bottom:1px solid var(--border)
  }
  .stat {
    padding:20px 24px; position:relative; overflow:hidden;
    cursor:default; transition:background 0.2s; border-right:1px solid var(--border)
  }
  .stat:last-child { border-right:none }
  .stat:hover { background:var(--bg3) }
  .stat-num {
    font-family:'DM Mono',monospace; font-size:36px; font-weight:500;
    color:var(--sa); line-height:1; margin-bottom:4px;
    animation:fadeUp 0.5s ease both
  }
  .stat:nth-child(1) .stat-num { animation-delay:0.05s }
  .stat:nth-child(2) .stat-num { animation-delay:0.1s }
  .stat:nth-child(3) .stat-num { animation-delay:0.15s }
  .stat:nth-child(4) .stat-num { animation-delay:0.2s }
  .stat:nth-child(5) .stat-num { animation-delay:0.25s }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  .stat-label { font-size:10px; font-weight:600; color:var(--text-dim); letter-spacing:2px; text-transform:uppercase }
  .stat-bar {
    position:absolute; bottom:0; left:0; right:0; height:2px;
    background:var(--sa); opacity:0; transition:opacity 0.2s
  }
  .stat:hover .stat-bar { opacity:0.35 }

  .ai-strip {
    display:flex; align-items:center; gap:12px; padding:9px 28px;
    background:#eff6ff; border-bottom:1px solid #dbeafe
  }
  .ai-orb {
    width:28px; height:28px; flex-shrink:0;
    background:#dbeafe; border:1px solid #bfdbfe;
    border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px
  }
  .ai-lbl { font-family:'DM Mono',monospace; font-size:9px; font-weight:500; color:var(--blue); letter-spacing:2px; text-transform:uppercase; flex-shrink:0 }
  .ai-msg { font-size:12px; color:#3b82f6; flex:1 }
  .ai-msg b { color:var(--blue); font-weight:600 }
  .ai-timer {
    font-family:'DM Mono',monospace; font-size:11px; color:var(--blue);
    background:#dbeafe; border:1px solid #bfdbfe; padding:3px 10px; border-radius:6px; flex-shrink:0
  }

  .toolbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:10px 28px; border-bottom:1px solid var(--border);
    background:var(--bg2); flex-wrap:wrap; gap:8px
  }
  .tbar-l { display:flex; align-items:center; gap:6px; flex-wrap:wrap }
  .tbar-sep { width:1px; height:16px; background:var(--border2) }
  .tbar-lbl { font-size:10px; font-weight:600; color:var(--text-dim); letter-spacing:1.5px; text-transform:uppercase }
  .fb {
    background:var(--bg); border:1px solid var(--border); color:var(--text-mid);
    padding:4px 12px; border-radius:6px; font-size:11px; font-weight:500;
    cursor:pointer; transition:all 0.15s; font-family:'DM Sans',sans-serif
  }
  .fb:hover { background:var(--bg3); border-color:var(--border2); color:var(--text) }
  .fb.on-high   { background:#fef2f2; border-color:#fca5a5; color:var(--red) }
  .fb.on-medium { background:#fffbeb; border-color:#fcd34d; color:var(--amber) }
  .fb.on-low    { background:#f0fdf4; border-color:#86efac; color:var(--green) }
  .fb.on-s      { background:#eff6ff; border-color:#93c5fd; color:var(--blue) }
  .tbar-count   { font-family:'DM Mono',monospace; font-size:11px; color:var(--text-dim) }

  .layout { display:grid; grid-template-columns:1fr 290px; min-height:calc(100vh - 200px) }

  .list-col { padding:20px 24px; display:flex; flex-direction:column; gap:12px; border-right:1px solid var(--border) }
  .sec-hd { display:flex; align-items:center; gap:10px; margin-bottom:2px }
  .sec-title { font-size:10px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:var(--text-dim) }
  .sec-line { flex:1; height:1px; background:var(--border) }
  .empty-state { text-align:center; padding:80px 0 }
  .empty-icon { font-size:40px; margin-bottom:12px; opacity:0.25 }
  .empty-txt { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--text-dim) }

  .card {
    background:var(--bg2); border:1px solid var(--border); border-radius:12px;
    overflow:hidden; position:relative; transition:all 0.2s;
    box-shadow:var(--shadow);
    animation:cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both
  }
  @keyframes cardIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  .card:nth-child(1){ animation-delay:0.04s }
  .card:nth-child(2){ animation-delay:0.08s }
  .card:nth-child(3){ animation-delay:0.12s }
  .card:nth-child(4){ animation-delay:0.16s }
  .card:nth-child(5){ animation-delay:0.20s }
  .card:hover { border-color:var(--border2); transform:translateY(-2px); box-shadow:var(--shadow-md) }
  .card.flash { animation:flashNew 1s ease both }
  @keyframes flashNew {
    0%   { box-shadow:var(--shadow),0 0 0 3px rgba(220,38,38,0.25) }
    100% { box-shadow:var(--shadow) }
  }
  .card-accent { position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--sev-c) }
  .card-body { padding:16px 18px 16px 22px }
  .card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:8px }
  .card-title { font-size:15px; font-weight:600; color:var(--text); line-height:1.35 }
  .badges { display:flex; gap:5px; flex-shrink:0; flex-wrap:wrap }
  .badge {
    font-size:9px; font-weight:600; padding:2px 8px; border-radius:4px;
    letter-spacing:1px; text-transform:uppercase;
    font-family:'DM Mono',monospace; border:1px solid transparent
  }
  .card-meta { display:flex; align-items:center; gap:7px; margin-bottom:8px; flex-wrap:wrap }
  .mi { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--text-mid); font-family:'DM Mono',monospace }
  .ms { width:3px; height:3px; border-radius:50%; background:var(--border2) }
  .desc { font-size:13px; color:var(--text-mid); line-height:1.6; margin-bottom:10px }
  .services { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:12px }
  .svc {
    background:var(--bg); border:1px solid var(--border); padding:2px 9px;
    border-radius:20px; font-size:10px; color:var(--text-mid);
    font-family:'DM Mono',monospace; transition:all 0.15s; cursor:default
  }
  .svc:hover { background:var(--bg3); border-color:var(--border2) }
  .inc-photo { width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin-bottom:12px; border:1px solid var(--border) }
  .ai-tag {
    display:inline-flex; align-items:center; gap:5px; margin-bottom:10px;
    background:#eff6ff; border:1px solid #bfdbfe;
    padding:2px 9px; border-radius:20px;
    font-size:9px; font-weight:600; color:var(--blue);
    font-family:'DM Mono',monospace; letter-spacing:0.5px
  }
  .ai-tag-dot { width:4px; height:4px; background:var(--blue); border-radius:50%; animation:livePulse 1.5s ease-in-out infinite }

  .pipeline {
    display:flex; align-items:center;
    background:var(--bg); border-radius:10px;
    padding:10px 12px; border:1px solid var(--border);
    margin-bottom:12px; overflow-x:auto; gap:0
  }
  .ps { display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; min-width:52px; cursor:pointer; transition:all 0.15s }
  .ps:hover { transform:translateY(-2px) }
  .ps-icon {
    width:26px; height:26px; border-radius:50%;
    display:flex; align-items:center; justify-content:center; font-size:12px;
    border:2px solid var(--border); background:var(--bg2); transition:all 0.2s
  }
  .ps.done .ps-icon   { background:var(--pc); border-color:var(--pc) }
  .ps.active .ps-icon { border-color:var(--pc); background:var(--bg2); box-shadow:0 0 0 3px color-mix(in srgb,var(--pc),transparent 80%) }
  .ps-label {
    font-size:8px; font-weight:600; color:var(--text-dim);
    letter-spacing:0.5px; text-transform:uppercase;
    font-family:'DM Mono',monospace; text-align:center
  }
  .ps.done .ps-label,.ps.active .ps-label { color:var(--pc) }
  .pl { flex:1; height:2px; background:var(--border); min-width:8px; margin-top:-14px; border-radius:2px; transition:background 0.3s }
  .pl.done { background:var(--lc) }

  .card-ft { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap }
  .map-btn {
    display:flex; align-items:center; gap:5px; font-size:11px; color:var(--blue);
    text-decoration:none; font-family:'DM Mono',monospace; font-weight:500;
    padding:5px 11px; background:#eff6ff; border:1px solid #bfdbfe;
    border-radius:7px; transition:all 0.15s
  }
  .map-btn:hover { background:#dbeafe; box-shadow:0 2px 8px rgba(37,99,235,0.15) }
  .no-loc { font-size:10px; color:var(--text-dim); font-family:'DM Mono',monospace }
  .status-sel {
    background:var(--bg2); color:var(--text-mid); border:1px solid var(--border);
    border-radius:7px; padding:5px 24px 5px 10px; font-size:11px;
    font-family:'DM Sans',sans-serif; font-weight:500; cursor:pointer; transition:all 0.15s;
    appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 8px center;
    box-shadow:var(--shadow)
  }
  .status-sel:hover { border-color:var(--border2) }

  .right-col { background:var(--bg3); padding:20px 16px; display:flex; flex-direction:column; gap:18px; border-left:1px solid var(--border) }
  .panel-hd {
    font-size:10px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:var(--text-dim);
    margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--border)
  }

  .ai-card { background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:14px }
  .ai-card-hd { display:flex; align-items:center; gap:10px; margin-bottom:12px }
  .ai-avatar {
    width:34px; height:34px; background:#dbeafe; border:1px solid #bfdbfe;
    border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:17px
  }
  .ai-name { font-size:14px; font-weight:600; color:var(--blue) }
  .ai-status-txt { font-size:10px; color:#3b82f6; font-family:'DM Mono',monospace }
  .ai-status-txt b { color:var(--green) }
  .ai-log-feed { display:flex; flex-direction:column; gap:4px; max-height:140px; overflow-y:auto; margin-bottom:10px }
  .ai-log-entry {
    display:flex; gap:6px; padding:5px 8px; background:rgba(255,255,255,0.7);
    border-radius:7px; border:1px solid #bfdbfe;
    animation:logIn 0.25s ease
  }
  @keyframes logIn { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
  .log-dot { width:5px; height:5px; background:var(--blue); border-radius:50%; flex-shrink:0; margin-top:3px }
  .log-body { font-size:10px; font-family:'DM Mono',monospace; color:#3b82f6; line-height:1.4 }
  .log-body b { color:var(--blue) }
  .countdown-box { text-align:center; padding:10px; background:white; border:1px solid #bfdbfe; border-radius:8px }
  .countdown-lbl { font-size:9px; font-family:'DM Mono',monospace; color:var(--text-dim); letter-spacing:1.5px; margin-bottom:3px; text-transform:uppercase }
  .countdown-val { font-family:'DM Mono',monospace; font-size:26px; font-weight:500; color:var(--blue) }

  .qs-list { display:flex; flex-direction:column; gap:5px }
  .qs-row {
    display:flex; align-items:center; justify-content:space-between;
    padding:9px 11px; border-radius:9px;
    background:var(--bg2); border:1px solid var(--border);
    transition:all 0.15s; cursor:default
  }
  .qs-row:hover { background:var(--bg3); border-color:var(--border2) }
  .qs-lbl { font-size:12px; color:var(--text-mid); font-weight:500 }
  .qs-val { font-family:'DM Mono',monospace; font-size:14px; font-weight:500; color:var(--qc) }

  .act-list { display:flex; flex-direction:column; max-height:200px; overflow-y:auto }
  .act-row { display:flex; gap:8px; padding:7px 0; border-bottom:1px solid var(--border) }
  .act-dot { width:6px; height:6px; border-radius:50%; background:var(--ac); flex-shrink:0; margin-top:4px }
  .act-text { font-size:11px; color:var(--text-mid); line-height:1.4 }
  .act-time { font-size:9px; color:var(--text-dim); font-family:'DM Mono',monospace; margin-top:2px }

  .toast-wrap { position:fixed; bottom:20px; right:20px; display:flex; flex-direction:column; gap:6px; z-index:9999; pointer-events:none }
  .toast {
    display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px;
    font-size:12px; font-family:'DM Sans',sans-serif; font-weight:500;
    animation:toastIn 0.3s cubic-bezier(0.16,1,0.3,1);
    max-width:300px; box-shadow:0 4px 20px rgba(0,0,0,0.1),0 1px 4px rgba(0,0,0,0.06)
  }
  .toast.t-alert { background:white; border:1px solid #fca5a5; color:var(--red) }
  .toast.t-ai    { background:white; border:1px solid #93c5fd; color:var(--blue) }
  .toast.t-ok    { background:white; border:1px solid #86efac; color:var(--green) }
  .toast-dot { width:5px; height:5px; border-radius:50%; background:currentColor; flex-shrink:0; animation:livePulse 1.5s ease-in-out infinite }
  @keyframes toastIn { from { opacity:0; transform:translateX(12px) } to { opacity:1; transform:translateX(0) } }

  @media(max-width:960px){
    .layout { grid-template-columns:1fr }
    .right-col { display:none }
    .stats-row { grid-template-columns:repeat(3,1fr) }
    .hdr { padding:0 16px }
    .list-col { padding:14px }
    .hdr-nav { display:none }
  }
`;

const STEP_COLORS = {
  PENDING:'#64748b', DISPATCHED:'#2563eb', EN_ROUTE:'#d97706', ARRIVED:'#7c3aed', RESOLVED:'#059669'
};

function Pipeline({ status, alertId, onStatusChange }) {
  const idx = STATUS_PIPELINE.indexOf(status);
  return (
    <div className="pipeline">
      {STATUS_PIPELINE.map((step, i) => {
        const color = STEP_COLORS[step];
        return (
          <React.Fragment key={step}>
            <div
              className={`ps ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}`}
              style={{ '--pc': color }}
              onClick={() => onStatusChange(alertId, step)}
              title={STATUS_CONFIG[step].label}
            >
              <div className="ps-icon">{STATUS_CONFIG[step].icon}</div>
              <div className="ps-label">{STATUS_CONFIG[step].label}</div>
            </div>
            {i < STATUS_PIPELINE.length - 1 && (
              <div className={`pl ${i < idx ? 'done' : ''}`} style={{ '--lc': color }} />
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
  const [toasts, setToasts]       = useState([]);
  const [time, setTime]           = useState('');
  const [aiLogs, setAiLogs]       = useState([]);
  const [countdown, setCountdown] = useState(180);
  const [activity, setActivity]   = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCountdown(p => p <= 1 ? 180 : p - 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch(`${SERVER}/api/alerts`)
      .then(r => r.json())
      .then(d => setAlerts(d.alerts || []));

    socketRef.current = io(SERVER);

    socketRef.current.on('new_alert', a => {
      setAlerts(p => [a, ...p]);
      setNewId(a._id);
      pushToast(`🚨 NEW — ${a.title || a.name}`, 't-alert');
      pushAct(`New alert: ${a.title || a.name}`, '#dc2626');
      setTimeout(() => setNewId(null), 4000);
    });

    socketRef.current.on('alert_updated', u =>
      setAlerts(p => p.map(a => a._id === u._id ? u : a))
    );

    socketRef.current.on('ai_status_update', ({ title, oldStatus, newStatus }) => {
      const m = `${title || 'Alert'}: ${STATUS_CONFIG[oldStatus]?.label} → ${STATUS_CONFIG[newStatus]?.label}`;
      pushAiLog(m);
      pushToast(`🤖 ${m}`, 't-ai');
      pushAct(`🤖 AI: ${m}`, '#2563eb');
      setCountdown(180);
    });

    socketRef.current.on('location_updated', ({ id, lat, lng }) => {
      setAlerts(p => p.map(a => a._id === id ? { ...a, location: { ...a.location, lat, lng } } : a));
      pushToast('📍 Location updated', 't-ok');
    });

    return () => socketRef.current?.disconnect();
  }, []);

  const pushToast = (msg, type = 't-alert') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  const pushAiLog = msg => {
    const t = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    setAiLogs(p => [{ msg, t, id: Date.now() }, ...p].slice(0, 20));
  };

  const pushAct = (text, color) => {
    const t = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    setActivity(p => [{ text, color, t, id: Date.now() }, ...p].slice(0, 15));
  };

  const changeStatus = (id, status) => {
    fetch(`${SERVER}/api/alerts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setAlerts(p => p.map(a => a._id === id ? { ...a, status } : a));
    pushToast(`✅ → ${STATUS_CONFIG[status]?.label}`, 't-ok');
    pushAct(`Manual: → ${STATUS_CONFIG[status]?.label}`, '#059669');
  };

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const filtered = alerts.filter(a =>
    (!sevFilter || a.severity === sevFilter) && (!staFilter || a.status === staFilter)
  );
  const activeCount = alerts.filter(a => a.status !== 'RESOLVED').length;

  const stats = [
    { label: 'TOTAL',     val: alerts.length,                                     color: '#dc2626' },
    { label: 'HIGH',      val: alerts.filter(a => a.severity === 'high').length,  color: '#dc2626' },
    { label: 'PENDING',   val: alerts.filter(a => a.status === 'PENDING').length, color: '#64748b' },
    { label: 'EN ROUTE',  val: alerts.filter(a => a.status === 'EN_ROUTE').length,color: '#d97706' },
    { label: 'COMPLETED', val: alerts.filter(a => a.status === 'RESOLVED').length,color: '#059669' },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="bg-root">
        <header className="hdr">
          <div className="logo">
            <div className="logo-icon">⚠</div>
            <div className="logo-name">Crisis<span>Shield</span></div>
          </div>
          <nav className="hdr-nav">
            <button className="nav-btn active">Dashboard</button>
            <button className="nav-btn">Incidents</button>
            <button className="nav-btn">Reports</button>
          </nav>
          <div className="hdr-right">
            <div className="live-pill"><div className="live-dot" />LIVE</div>
            <div className="clock">{time}</div>
            <a className="reporter-btn" href={`${SERVER}/mobile.html`} target="_blank" rel="noreferrer">📱 Reporter</a>
            <button className="logout-btn" onClick={onLogout}>Logout</button>
          </div>
        </header>

        <div className="stats-row">
          {stats.map(s => (
            <div key={s.label} className="stat" style={{ '--sa': s.color }}>
              <div className="stat-num">{String(s.val).padStart(2, '0')}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-bar" />
            </div>
          ))}
        </div>

        <div className="ai-strip">
          <div className="ai-orb">🤖</div>
          <div className="ai-lbl">AI Tracker</div>
          <div className="ai-msg">Monitoring <b>{activeCount} active</b> incidents — auto updates every 3 min</div>
          <div className="ai-timer">Next: <b>{fmt(countdown)}</b></div>
        </div>

        <div className="toolbar">
          <div className="tbar-l">
            <span className="tbar-lbl">Severity</span>
            {['high', 'medium', 'low'].map(s => (
              <button key={s} className={`fb ${sevFilter === s ? `on-${s}` : ''}`}
                onClick={() => setSevFilter(sevFilter === s ? '' : s)}>
                {s}
              </button>
            ))}
            <div className="tbar-sep" />
            <span className="tbar-lbl">Status</span>
            {STATUS_PIPELINE.map(s => (
              <button key={s} className={`fb ${staFilter === s ? 'on-s' : ''}`}
                onClick={() => setStaFilter(staFilter === s ? '' : s)}>
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
          <div className="tbar-count">{filtered.length} / {alerts.length} alerts</div>
        </div>

        <div className="layout">
          <div className="list-col">
            <div className="sec-hd">
              <span className="sec-title">Live Alert Feed</span>
              <div className="sec-line" />
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛡️</div>
                <div className="empty-txt">All Clear — No Active Alerts</div>
              </div>
            ) : filtered.map(alert => {
              const sc  = SEV_CONFIG[alert.severity] || SEV_CONFIG.high;
              const stc = STATUS_CONFIG[alert.status] || STATUS_CONFIG.PENDING;
              return (
                <div key={alert._id}
                  className={`card ${alert._id === newId ? 'flash' : ''}`}
                  style={{ '--sev-c': sc.border }}
                >
                  <div className="card-accent" />
                  <div className="card-body">
                    <div className="card-top">
                      <div className="card-title">{alert.title || `Alert by ${alert.name}`}</div>
                      <div className="badges">
                        <span className="badge" style={{ background: sc.bg, color: sc.text, borderColor: sc.border + '40' }}>
                          {sc.label}
                        </span>
                        <span className="badge" style={{ background: stc.bg, color: stc.text }}>
                          {stc.icon} {stc.label}
                        </span>
                      </div>
                    </div>

                    <div className="card-meta">
                      <div className="mi">
                        <span style={{ color: sc.border, fontSize: '8px' }}>●</span> {alert.name}
                      </div>
                      {alert.phone && (
                        <><div className="ms" /><div className="mi">📞 {alert.phone}</div></>
                      )}
                      <div className="ms" />
                      <div className="mi">
                        {new Date(alert.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {alert.location?.lat && (
                        <><div className="ms" />
                        <div className="mi" style={{ color: '#2563eb' }}>
                          📍 {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                        </div></>
                      )}
                    </div>

                    {alert.description && <div className="desc">{alert.description}</div>}

                    {alert.services?.length > 0 && (
                      <div className="services">
                        {alert.services.map(s => (
                          <span key={s} className="svc">{SERVICES_ICONS[s] || '🔔'} {s}</span>
                        ))}
                      </div>
                    )}

                    {alert.photo && <img src={alert.photo} alt="Incident" className="inc-photo" />}

                    {alert.lastAIUpdate && (
                      <div className="ai-tag">
                        <div className="ai-tag-dot" />
                        🤖 AI Tracked · {new Date(alert.lastAIUpdate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}

                    <Pipeline status={alert.status} alertId={alert._id} onStatusChange={changeStatus} />

                    <div className="card-ft">
                      {alert.location?.lat ? (
                        
                          href={`https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}`}
                          target="_blank" rel="noreferrer" className="map-btn"
                        >
                          🗺 View on Map
                        </a>
                      ) : <span className="no-loc">No location</span>}

                      <select className="status-sel" value={alert.status}
                        onChange={e => changeStatus(alert._id, e.target.value)}>
                        {STATUS_PIPELINE.map(s => (
                          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="right-col">
            <div>
              <div className="panel-hd">AI Bot Status</div>
              <div className="ai-card">
                <div className="ai-card-hd">
                  <div className="ai-avatar">🤖</div>
                  <div>
                    <div className="ai-name">CrisisAI</div>
                    <div className="ai-status-txt"><b>● Online</b> — Tracking {activeCount} alerts</div>
                  </div>
                </div>
                <div className="ai-log-feed">
                  {aiLogs.length === 0
                    ? <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'DM Mono', padding: '8px', textAlign: 'center' }}>
                        Monitoring... waiting for events
                      </div>
                    : aiLogs.map(l => (
                        <div key={l.id} className="ai-log-entry">
                          <div className="log-dot" />
                          <div className="log-body"><b>{l.t}</b> {l.msg}</div>
                        </div>
                      ))
                  }
                </div>
                <div className="countdown-box">
                  <div className="countdown-lbl">Next Auto Update</div>
                  <div className="countdown-val">{fmt(countdown)}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="panel-hd">Quick Stats</div>
              <div className="qs-list">
                {[
                  { lbl: 'Active Incidents', val: activeCount,                                        c: '#dc2626' },
                  { lbl: 'Resolved Today',   val: alerts.filter(a => a.status === 'RESOLVED').length, c: '#059669' },
                  { lbl: 'High Priority',    val: alerts.filter(a => a.severity === 'high').length,   c: '#dc2626' },
                  { lbl: 'Avg Response',     val: '~3 min',                                           c: '#2563eb' },
                ].map(item => (
                  <div key={item.lbl} className="qs-row" style={{ '--qc': item.c }}>
                    <span className="qs-lbl">{item.lbl}</span>
                    <span className="qs-val">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="panel-hd">Activity Log</div>
              <div className="act-list">
                {activity.length === 0
                  ? <div style={{ fontSize: '11px', color: 'var(--text-dim)', padding: '8px 0' }}>No recent activity</div>
                  : activity.map(a => (
                      <div key={a.id} className="act-row">
                        <div className="act-dot" style={{ '--ac': a.color }} />
                        <div>
                          <div className="act-text">{a.text}</div>
                          <div className="act-time">{a.t}</div>
                        </div>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>
        </div>

        <div className="toast-wrap">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>
              <div className="toast-dot" />{t.msg}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}