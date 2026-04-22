import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SERVER = 'https://crisis-shield-hackthon.onrender.com';

const SEV_CONFIG = {
  high:   { bg: '#FFF1F2', border: '#FDA4AF', text: '#BE123C', dot: '#E11D48', label: 'HIGH' },
  medium: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', dot: '#D97706', label: 'MED' },
  low:    { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', dot: '#16A34A', label: 'LOW' },
};

const STATUS_PIPELINE = ['PENDING', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'RESOLVED'];
const STATUS_CONFIG = {
  PENDING:    { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', icon: '⏳', label: 'Pending',    color: '#94A3B8' },
  DISPATCHED: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', icon: '📡', label: 'Dispatched', color: '#3B82F6' },
  EN_ROUTE:   { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', icon: '🚨', label: 'En Route',   color: '#F59E0B' },
  ARRIVED:    { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', icon: '📍', label: 'Arrived',    color: '#8B5CF6' },
  RESOLVED:   { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', icon: '✅', label: 'Completed',  color: '#22C55E' },
};

const SERVICES_ICONS = { police:'🚔', fire:'🚒', ambulance:'🚑', disaster:'🏚️', electricity:'⚡', coast:'⛵' };

const STEP_COLORS = {
  PENDING:'#94A3B8', DISPATCHED:'#3B82F6', EN_ROUTE:'#F59E0B', ARRIVED:'#8B5CF6', RESOLVED:'#22C55E'
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg-page: #F1F5F9;
    --bg-card: #FFFFFF;
    --bg-sidebar: #FAFBFC;
    --border: #E2E8F0;
    --border-strong: #CBD5E1;
    --text-primary: #0F172A;
    --text-secondary: #475569;
    --text-muted: #94A3B8;
    --red: #E11D48;
    --blue: #2563EB;
    --green: #16A34A;
    --amber: #D97706;
    --purple: #7C3AED;
    --shadow-sm: 0 1px 2px rgba(15,23,42,0.04), 0 1px 6px rgba(15,23,42,0.03);
    --shadow-md: 0 4px 12px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04);
    --shadow-lg: 0 8px 24px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.06);
    --radius: 12px;
    --radius-sm: 8px;
    --radius-xs: 6px;
  }

  html, body {
    background: var(--bg-page);
    color: var(--text-primary);
    font-family: 'Outfit', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }

  /* ── HEADER ── */
  .hdr {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px; height: 64px;
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 200;
    box-shadow: 0 1px 0 var(--border), 0 2px 12px rgba(15,23,42,0.04);
  }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #E11D48, #9F1239);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px;
    box-shadow: 0 2px 8px rgba(225,29,72,0.30);
  }
  .logo-wordmark { font-size: 16px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px; }
  .logo-wordmark span { color: var(--red); }

  /* ── GLOWING DASHBOARD HEADING ── */
  .dashboard-heading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dashboard-heading h1 {
    font-family: 'Outfit', sans-serif;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    background: linear-gradient(90deg, #2563EB 0%, #60A5FA 40%, #E11D48 70%, #FB7185 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    filter: drop-shadow(0 0 10px rgba(37,99,235,0.55)) drop-shadow(0 0 22px rgba(225,29,72,0.35));
    animation: headingGlow 3s ease-in-out infinite alternate;
    margin: 0;
  }
  @keyframes headingGlow {
    0%   { filter: drop-shadow(0 0 8px rgba(37,99,235,0.6)) drop-shadow(0 0 20px rgba(225,29,72,0.30)); }
    100% { filter: drop-shadow(0 0 16px rgba(37,99,235,0.9)) drop-shadow(0 0 32px rgba(225,29,72,0.55)); }
  }

  .hdr-right { display: flex; align-items: center; gap: 10px; }
  .live-pill {
    display: flex; align-items: center; gap: 7px;
    padding: 5px 13px; border-radius: 20px;
    background: #FFF1F2; border: 1px solid #FECDD3;
    font-size: 11px; font-weight: 700; color: var(--red);
    letter-spacing: 1.5px; font-family: 'JetBrains Mono', monospace;
  }
  .live-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--red);
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.6)} }
  .clock {
    font-family: 'JetBrains Mono', monospace; font-size: 13px;
    color: var(--text-secondary); background: var(--bg-page);
    border: 1px solid var(--border); border-radius: var(--radius-xs);
    padding: 5px 12px;
  }
  .reporter-btn {
    display: flex; align-items: center; gap: 6px;
    background: #F0FDF4; border: 1px solid #BBF7D0; color: var(--green);
    padding: 6px 14px; border-radius: var(--radius-sm);
    font-size: 12.5px; font-weight: 600; cursor: pointer;
    text-decoration: none; transition: all 0.15s;
  }
  .reporter-btn:hover { background: #DCFCE7; box-shadow: 0 2px 8px rgba(22,163,74,.15); }
  .logout-btn {
    background: var(--bg-page); border: 1px solid var(--border); color: var(--text-secondary);
    padding: 6px 14px; border-radius: var(--radius-sm);
    font-family: 'Outfit', sans-serif; font-size: 12.5px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
  }
  .logout-btn:hover { background: #FFF1F2; border-color: #FECDD3; color: var(--red); }

  /* ── STATS BAR ── */
  .stats-row {
    display: grid; grid-template-columns: repeat(5, 1fr);
    background: var(--bg-card); border-bottom: 1px solid var(--border);
  }
  .stat-card {
    padding: 22px 28px; border-right: 1px solid var(--border);
    position: relative; overflow: hidden; transition: background 0.2s; cursor: default;
  }
  .stat-card:last-child { border-right: none; }
  .stat-card:hover { background: #FAFBFC; }
  .stat-accent {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--sc);
  }
  .stat-num {
    font-family: 'JetBrains Mono', monospace; font-size: 38px; font-weight: 600;
    color: var(--sc); line-height: 1; margin-bottom: 6px;
    animation: slideUp 0.5s cubic-bezier(.16,1,.3,1) both;
  }
  .stat-card:nth-child(1) .stat-num { animation-delay: .05s }
  .stat-card:nth-child(2) .stat-num { animation-delay: .10s }
  .stat-card:nth-child(3) .stat-num { animation-delay: .15s }
  .stat-card:nth-child(4) .stat-num { animation-delay: .20s }
  .stat-card:nth-child(5) .stat-num { animation-delay: .25s }
  @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .stat-label {
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--text-muted);
  }

  /* ── AI STRIP ── */
  .ai-strip {
    display: flex; align-items: center; gap: 14px; padding: 10px 32px;
    background: linear-gradient(to right, #EFF6FF, #F5F3FF);
    border-bottom: 1px solid #DBEAFE;
  }
  .ai-orb {
    width: 30px; height: 30px; background: #DBEAFE; border: 1.5px solid #BFDBFE;
    border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;
  }
  .ai-badge {
    font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 600;
    letter-spacing: 2px; color: var(--blue); text-transform: uppercase; flex-shrink: 0;
    background: #BFDBFE; padding: 2px 8px; border-radius: 20px;
  }
  .ai-text { font-size: 12.5px; color: #3B82F6; flex: 1; }
  .ai-text b { color: var(--blue); font-weight: 600; }
  .ai-next {
    font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600;
    color: var(--blue); background: white; border: 1px solid #BFDBFE;
    padding: 4px 12px; border-radius: var(--radius-xs);
  }

  /* ── TOOLBAR ── */
  .toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 32px; border-bottom: 1px solid var(--border);
    background: var(--bg-card); gap: 12px; flex-wrap: wrap;
  }
  .tbar-l { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .tbar-lbl {
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--text-muted); padding: 0 4px;
  }
  .tbar-div { width: 1px; height: 18px; background: var(--border); }
  .chip {
    padding: 5px 14px; border-radius: 20px; font-size: 11.5px; font-weight: 600;
    border: 1.5px solid var(--border); background: var(--bg-page); color: var(--text-secondary);
    cursor: pointer; transition: all 0.15s; font-family: 'Outfit', sans-serif;
  }
  .chip:hover { border-color: var(--border-strong); color: var(--text-primary); }
  .chip.on-high   { background: #FFF1F2; border-color: #FDA4AF; color: var(--red); }
  .chip.on-medium { background: #FFFBEB; border-color: #FDE68A; color: var(--amber); }
  .chip.on-low    { background: #F0FDF4; border-color: #BBF7D0; color: var(--green); }
  .chip.on-s      { background: #EFF6FF; border-color: #93C5FD; color: var(--blue); }
  .tbar-count { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); }

  /* ── LAYOUT ── */
  .layout { display: grid; grid-template-columns: 1fr 300px; min-height: calc(100vh - 220px); }

  /* ── ALERT LIST ── */
  .list-col {
    padding: 24px 28px; display: flex; flex-direction: column; gap: 14px;
    border-right: 1px solid var(--border);
  }
  .section-hd { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
  .section-title {
    font-size: 10px; font-weight: 700; letter-spacing: 3px;
    text-transform: uppercase; color: var(--text-muted); white-space: nowrap;
  }
  .section-line { flex: 1; height: 1px; background: var(--border); }

  .empty-state { text-align: center; padding: 100px 0; }
  .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.2; }
  .empty-txt { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: var(--text-muted); }

  /* ── ALERT CARD ── */
  .card {
    background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--radius);
    overflow: hidden; position: relative; transition: all 0.2s;
    box-shadow: var(--shadow-sm);
    animation: cardIn 0.4s cubic-bezier(0.16,1,0.3,1) both;
  }
  @keyframes cardIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .card:nth-child(1){animation-delay:.04s} .card:nth-child(2){animation-delay:.08s}
  .card:nth-child(3){animation-delay:.12s} .card:nth-child(4){animation-delay:.16s}
  .card:nth-child(5){animation-delay:.20s}
  .card:hover { border-color: var(--border-strong); transform: translateY(-2px); box-shadow: var(--shadow-md); }
  .card.flash { animation: flashNew 1.2s ease both; }
  @keyframes flashNew {
    0%   { box-shadow: var(--shadow-sm), 0 0 0 4px rgba(225,29,72,.20); border-color: #FDA4AF; }
    100% { box-shadow: var(--shadow-sm); border-color: var(--border); }
  }
  .card-stripe { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--stripe); border-radius: 0; }
  .card-body { padding: 18px 20px 18px 24px; }

  .card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .card-title { font-size: 15.5px; font-weight: 700; color: var(--text-primary); line-height: 1.3; }
  .badges { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
  .badge {
    font-size: 9.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px;
    letter-spacing: 0.8px; text-transform: uppercase;
    font-family: 'JetBrains Mono', monospace; border: 1.5px solid transparent;
  }

  .card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
  .meta-item { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-secondary); }
  .meta-sep { width: 3px; height: 3px; border-radius: 50%; background: var(--border-strong); flex-shrink: 0; }
  .meta-loc { color: var(--blue); font-family: 'JetBrains Mono', monospace; font-size: 10.5px; }

  .desc { font-size: 13px; color: var(--text-secondary); line-height: 1.65; margin-bottom: 12px; }

  .services-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .svc-chip {
    background: var(--bg-page); border: 1.5px solid var(--border);
    padding: 3px 11px; border-radius: 20px;
    font-size: 10.5px; color: var(--text-secondary); font-weight: 500;
    transition: all 0.15s; cursor: default;
  }
  .svc-chip:hover { background: white; border-color: var(--border-strong); }

  .inc-photo { width: 100%; max-height: 160px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: 14px; border: 1.5px solid var(--border); }

  .ai-tag {
    display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px;
    background: #EFF6FF; border: 1.5px solid #BFDBFE;
    padding: 3px 10px; border-radius: 20px;
    font-size: 9.5px; font-weight: 700; color: var(--blue);
    font-family: 'JetBrains Mono', monospace; letter-spacing: 0.5px;
  }
  .ai-tag-dot { width: 5px; height: 5px; background: var(--blue); border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; }

  /* ── PIPELINE ── */
  .pipeline {
    display: flex; align-items: center;
    background: var(--bg-page); border: 1.5px solid var(--border);
    border-radius: var(--radius-sm); padding: 10px 14px;
    margin-bottom: 14px; overflow-x: auto; gap: 0;
  }
  .ps { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 54px; cursor: pointer; transition: all 0.15s; }
  .ps:hover { transform: translateY(-2px); }
  .ps-icon {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 12px;
    border: 2px solid var(--border); background: white; transition: all 0.2s;
  }
  .ps.done .ps-icon   { background: var(--pc); border-color: var(--pc); }
  .ps.active .ps-icon { border-color: var(--pc); background: white; box-shadow: 0 0 0 4px color-mix(in srgb, var(--pc), transparent 75%); }
  .ps-lbl { font-size: 8px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.5px; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; text-align: center; }
  .ps.done .ps-lbl, .ps.active .ps-lbl { color: var(--pc); }
  .pipe-line { flex: 1; height: 2px; background: var(--border); min-width: 10px; margin-top: -16px; border-radius: 2px; transition: background 0.3s; }
  .pipe-line.done { background: var(--lc); }

  .card-ft { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .map-link {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--blue);
    text-decoration: none; font-weight: 600;
    padding: 6px 13px; background: #EFF6FF; border: 1.5px solid #BFDBFE;
    border-radius: var(--radius-xs); transition: all 0.15s;
  }
  .map-link:hover { background: #DBEAFE; box-shadow: 0 2px 8px rgba(37,99,235,.15); }
  .no-loc { font-size: 11px; color: var(--text-muted); }
  .status-sel {
    background: white; color: var(--text-secondary); border: 1.5px solid var(--border);
    border-radius: var(--radius-xs); padding: 6px 28px 6px 11px;
    font-size: 12px; font-family: 'Outfit', sans-serif; font-weight: 600;
    cursor: pointer; transition: all 0.15s; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 9px center;
    box-shadow: var(--shadow-sm);
  }
  .status-sel:hover { border-color: var(--border-strong); }
  .status-sel:focus { outline: none; border-color: #93C5FD; box-shadow: 0 0 0 3px rgba(59,130,246,.15); }

  /* ── RIGHT SIDEBAR ── */
  .right-col {
    background: var(--bg-sidebar); padding: 22px 18px;
    display: flex; flex-direction: column; gap: 20px;
    border-left: 1px solid var(--border);
  }
  .panel { background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-sm); }
  .panel-head {
    padding: 13px 16px; border-bottom: 1px solid var(--border);
    font-size: 10px; font-weight: 700; letter-spacing: 2.5px;
    text-transform: uppercase; color: var(--text-muted);
    background: var(--bg-page);
    display: flex; align-items: center; justify-content: space-between;
  }
  .panel-head-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: pulse 2s ease-in-out infinite; }
  .panel-body { padding: 14px 16px; }

  /* AI Card */
  .ai-identity { display: flex; align-items: center; gap: 11px; margin-bottom: 14px; }
  .ai-avatar-lg {
    width: 38px; height: 38px; background: linear-gradient(135deg,#DBEAFE,#EDE9FE);
    border: 1.5px solid #BFDBFE; border-radius: 11px;
    display: flex; align-items: center; justify-content: center; font-size: 19px;
  }
  .ai-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
  .ai-online { font-size: 11px; color: var(--green); font-weight: 600; display: flex; align-items: center; gap: 4px; }
  .ai-online::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 2s ease-in-out infinite; }

  .ai-log-feed { max-height: 130px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  .log-entry {
    display: flex; gap: 7px; padding: 6px 9px;
    background: #F8FAFF; border: 1px solid #E0EAFF; border-radius: var(--radius-xs);
    animation: logIn 0.25s ease;
  }
  @keyframes logIn { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
  .log-dot-sm { width: 5px; height: 5px; border-radius: 50%; background: var(--blue); flex-shrink: 0; margin-top: 3px; }
  .log-text { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #3B82F6; line-height: 1.5; }
  .log-text b { color: var(--blue); }
  .idle-text { font-size: 10.5px; color: var(--text-muted); text-align: center; padding: 12px 0; font-family: 'JetBrains Mono', monospace; }

  .countdown-widget { background: var(--bg-page); border: 1.5px solid var(--border); border-radius: var(--radius-xs); padding: 12px; text-align: center; }
  .cd-lbl { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; }
  .cd-val { font-family: 'JetBrains Mono', monospace; font-size: 30px; font-weight: 600; color: var(--blue); line-height: 1; }

  /* Quick Stats */
  .qs-grid { display: flex; flex-direction: column; gap: 6px; }
  .qs-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 13px; background: var(--bg-page); border: 1.5px solid var(--border);
    border-radius: var(--radius-xs); transition: all 0.15s;
  }
  .qs-item:hover { background: white; border-color: var(--border-strong); }
  .qs-lbl { font-size: 12.5px; color: var(--text-secondary); font-weight: 500; }
  .qs-val { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 600; color: var(--qc); }

  /* Activity */
  .act-feed { max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; }
  .act-item { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); }
  .act-item:last-child { border-bottom: none; }
  .act-stripe { width: 3px; border-radius: 3px; flex-shrink: 0; background: var(--ac); }
  .act-body { flex: 1; }
  .act-text { font-size: 11.5px; color: var(--text-secondary); line-height: 1.4; }
  .act-time { font-size: 10px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-top: 2px; }

  /* ── TOASTS ── */
  .toast-wrap { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; pointer-events: none; }
  .toast {
    display: flex; align-items: center; gap: 10px; padding: 11px 16px;
    border-radius: var(--radius-sm); font-size: 12.5px; font-weight: 500;
    max-width: 310px; box-shadow: var(--shadow-lg);
    animation: toastIn 0.3s cubic-bezier(0.16,1,0.3,1);
    background: white;
  }
  .toast.t-alert { border: 1.5px solid #FECDD3; color: var(--red); }
  .toast.t-ai    { border: 1.5px solid #BFDBFE; color: var(--blue); }
  .toast.t-ok    { border: 1.5px solid #BBF7D0; color: var(--green); }
  .toast-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; animation: pulse 1.5s ease-in-out infinite; }
  @keyframes toastIn { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }

  /* ── RESPONSIVE ── */
  @media (max-width: 1000px) {
    .layout { grid-template-columns: 1fr; }
    .right-col { display: none; }
    .stats-row { grid-template-columns: repeat(3, 1fr); }
    .hdr { padding: 0 18px; }
    .list-col { padding: 16px; }
    .toolbar { padding: 10px 18px; }
    .ai-strip { padding: 10px 18px; }
    .dashboard-heading h1 { font-size: 16px; }
  }
`;

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
              <div className="ps-lbl">{STATUS_CONFIG[step].label}</div>
            </div>
            {i < STATUS_PIPELINE.length - 1 && (
              <div className={`pipe-line ${i < idx ? 'done' : ''}`} style={{ '--lc': color }} />
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
      pushAct(`New alert: ${a.title || a.name}`, '#E11D48');
      setTimeout(() => setNewId(null), 4000);
    });

    socketRef.current.on('alert_updated', u =>
      setAlerts(p => p.map(a => a._id === u._id ? u : a))
    );

    socketRef.current.on('ai_status_update', ({ title, oldStatus, newStatus }) => {
      const m = `${title || 'Alert'}: ${STATUS_CONFIG[oldStatus]?.label} → ${STATUS_CONFIG[newStatus]?.label}`;
      pushAiLog(m);
      pushToast(`🤖 ${m}`, 't-ai');
      pushAct(`🤖 AI: ${m}`, '#2563EB');
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
    pushAct(`Manual: → ${STATUS_CONFIG[status]?.label}`, '#16A34A');
  };

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const filtered = alerts.filter(a =>
    (!sevFilter || a.severity === sevFilter) && (!staFilter || a.status === staFilter)
  );
  const activeCount = alerts.filter(a => a.status !== 'RESOLVED').length;

  const stats = [
    { label: 'Total Alerts', val: alerts.length,                                     color: '#0F172A' },
    { label: 'High Priority', val: alerts.filter(a => a.severity === 'high').length,  color: '#E11D48' },
    { label: 'Pending',       val: alerts.filter(a => a.status === 'PENDING').length, color: '#94A3B8' },
    { label: 'En Route',      val: alerts.filter(a => a.status === 'EN_ROUTE').length,color: '#D97706' },
    { label: 'Completed',     val: alerts.filter(a => a.status === 'RESOLVED').length,color: '#16A34A' },
  ];

  return (
    <>
      <style>{css}</style>
      <div>

        {/* HEADER — nav tabs removed, glowing heading added */}
        <header className="hdr">
          <div className="logo">
            <div className="logo-icon">⚠</div>
            <div className="logo-wordmark">Crisis<span>Shield</span></div>
          </div>

          {/* ── GLOWING DASHBOARD HEADING ── */}
          <div className="dashboard-heading">
            <h1>Crisis Dashboard</h1>
          </div>

          <div className="hdr-right">
            <div className="live-pill"><div className="live-dot" />LIVE</div>
            <div className="clock">{time}</div>
            <a className="reporter-btn" href={`${SERVER}/mobile.html`} target="_blank" rel="noreferrer">📱 Reporter</a>
            <button className="logout-btn" onClick={onLogout}>Logout</button>
          </div>
        </header>

        {/* STATS */}
        <div className="stats-row">
          {stats.map(s => (
            <div key={s.label} className="stat-card" style={{ '--sc': s.color }}>
              <div className="stat-accent" />
              <div className="stat-num">{String(s.val).padStart(2, '0')}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* AI STRIP */}
        <div className="ai-strip">
          <div className="ai-orb">🤖</div>
          <span className="ai-badge">AI Tracker</span>
          <div className="ai-text">Monitoring <b>{activeCount} active</b> incidents — auto-updates every 3 min</div>
          <div className="ai-next">Next: <b>{fmt(countdown)}</b></div>
        </div>

        {/* TOOLBAR */}
        <div className="toolbar">
          <div className="tbar-l">
            <span className="tbar-lbl">Severity</span>
            {['high','medium','low'].map(s => (
              <button key={s} className={`chip ${sevFilter === s ? `on-${s}` : ''}`}
                onClick={() => setSevFilter(sevFilter === s ? '' : s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <div className="tbar-div" />
            <span className="tbar-lbl">Status</span>
            {STATUS_PIPELINE.map(s => (
              <button key={s} className={`chip ${staFilter === s ? 'on-s' : ''}`}
                onClick={() => setStaFilter(staFilter === s ? '' : s)}>
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
          <div className="tbar-count">{filtered.length} / {alerts.length} alerts</div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="layout">

          {/* ALERT LIST */}
          <div className="list-col">
            <div className="section-hd">
              <span className="section-title">Live Alert Feed</span>
              <div className="section-line" />
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛡️</div>
                <div className="empty-txt">All Clear — No Active Alerts</div>
              </div>
            ) : filtered.map(alert => {
              const sc  = SEV_CONFIG[alert.severity]  || SEV_CONFIG.high;
              const stc = STATUS_CONFIG[alert.status] || STATUS_CONFIG.PENDING;
              return (
                <div key={alert._id}
                  className={`card ${alert._id === newId ? 'flash' : ''}`}
                  style={{ '--stripe': sc.dot }}
                >
                  <div className="card-stripe" />
                  <div className="card-body">
                    <div className="card-top">
                      <div className="card-title">{alert.title || `Alert by ${alert.name}`}</div>
                      <div className="badges">
                        <span className="badge" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                          {sc.label}
                        </span>
                        <span className="badge" style={{ background: stc.bg, color: stc.text, borderColor: stc.border }}>
                          {stc.icon} {stc.label}
                        </span>
                      </div>
                    </div>

                    <div className="card-meta">
                      <div className="meta-item">👤 {alert.name}</div>
                      {alert.phone && (
                        <><div className="meta-sep"/><div className="meta-item">📞 {alert.phone}</div></>
                      )}
                      <div className="meta-sep"/>
                      <div className="meta-item">
                        🕒 {new Date(alert.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </div>
                      {alert.location?.lat && (
                        <><div className="meta-sep"/>
                        <div className="meta-item meta-loc">
                          📍 {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                        </div></>
                      )}
                    </div>

                    {alert.description && <div className="desc">{alert.description}</div>}

                    {alert.services?.length > 0 && (
                      <div className="services-row">
                        {alert.services.map(s => (
                          <span key={s} className="svc-chip">{SERVICES_ICONS[s] || '🔔'} {s}</span>
                        ))}
                      </div>
                    )}

                    {alert.photo && <img src={alert.photo} alt="Incident" className="inc-photo" />}

                    {alert.lastAIUpdate && (
                      <div className="ai-tag">
                        <div className="ai-tag-dot" />
                        🤖 AI Tracked · {new Date(alert.lastAIUpdate).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                      </div>
                    )}

                    <Pipeline status={alert.status} alertId={alert._id} onStatusChange={changeStatus} />

                    <div className="card-ft">
                      {alert.location?.lat ? (
                        <a href={`https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}`}
                          target="_blank" rel="noreferrer" className="map-link">
                          🗺 View on Map
                        </a>
                      ) : <span className="no-loc">No location data</span>}

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

          {/* SIDEBAR */}
          <div className="right-col">

            {/* AI Bot Panel */}
            <div className="panel">
              <div className="panel-head">
                AI Bot Status
                <div className="panel-head-dot" />
              </div>
              <div className="panel-body">
                <div className="ai-identity">
                  <div className="ai-avatar-lg">🤖</div>
                  <div>
                    <div className="ai-name">CrisisAI</div>
                    <div className="ai-online">Online — {activeCount} alerts</div>
                  </div>
                </div>
                <div className="ai-log-feed">
                  {aiLogs.length === 0
                    ? <div className="idle-text">Monitoring... waiting for events</div>
                    : aiLogs.map(l => (
                        <div key={l.id} className="log-entry">
                          <div className="log-dot-sm" />
                          <div className="log-text"><b>{l.t}</b> {l.msg}</div>
                        </div>
                      ))
                  }
                </div>
                <div className="countdown-widget">
                  <div className="cd-lbl">Next Auto Update</div>
                  <div className="cd-val">{fmt(countdown)}</div>
                </div>
              </div>
            </div>

            {/* Quick Stats Panel */}
            <div className="panel">
              <div className="panel-head">Quick Stats</div>
              <div className="panel-body">
                <div className="qs-grid">
                  {[
                    { lbl: 'Active Incidents', val: activeCount,                                          c: '#E11D48' },
                    { lbl: 'Resolved Today',   val: alerts.filter(a => a.status === 'RESOLVED').length,  c: '#16A34A' },
                    { lbl: 'High Priority',    val: alerts.filter(a => a.severity === 'high').length,    c: '#E11D48' },
                    { lbl: 'Avg Response',     val: '~3 min',                                             c: '#2563EB' },
                  ].map(item => (
                    <div key={item.lbl} className="qs-item" style={{ '--qc': item.c }}>
                      <span className="qs-lbl">{item.lbl}</span>
                      <span className="qs-val">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Panel */}
            <div className="panel">
              <div className="panel-head">Activity Log</div>
              <div className="panel-body" style={{ padding: '10px 16px' }}>
                <div className="act-feed">
                  {activity.length === 0
                    ? <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', padding: '8px 0' }}>No recent activity</div>
                    : activity.map(a => (
                        <div key={a.id} className="act-item">
                          <div className="act-stripe" style={{ '--ac': a.color }} />
                          <div className="act-body">
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
        </div>

        {/* TOASTS */}
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