import React, { useState } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'crisishield@2024';

const loginCSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#060910; }

  .login-root {
    min-height: 100vh;
    background: #060910;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .login-grid {
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(255,59,59,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,59,59,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .login-glow {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(255,59,59,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  .login-box {
    position: relative;
    z-index: 2;
    background: #0d1117;
    border: 1px solid #1a2332;
    border-radius: 16px;
    padding: 48px 40px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.6);
  }

  .login-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 40px;
    justify-content: center;
  }

  .login-logo-icon {
    width: 40px; height: 40px;
    background: #ff3b3b;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
  }

  .login-logo-text {
    font-size: 22px; font-weight: 800;
    letter-spacing: -0.5px; color: #f8fafc;
  }
  .login-logo-text span { color: #ff3b3b; }

  .login-title {
    font-size: 13px; font-weight: 700;
    letter-spacing: 3px; text-transform: uppercase;
    color: #2d3748; text-align: center;
    margin-bottom: 32px;
    font-family: 'JetBrains Mono', monospace;
  }

  .login-field { margin-bottom: 16px; }

  .login-label {
    display: block;
    font-size: 10px; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase;
    color: #4a5568; margin-bottom: 8px;
    font-family: 'JetBrains Mono', monospace;
  }

  .login-input {
    width: 100%;
    background: #060910;
    border: 1px solid #1e2d3d;
    border-radius: 8px;
    padding: 12px 16px;
    color: #e2e8f0;
    font-size: 14px;
    font-family: 'JetBrains Mono', monospace;
    outline: none;
    transition: border-color 0.2s;
  }

  .login-input:focus { border-color: #ff3b3b40; }

  .login-btn {
    width: 100%;
    background: #ff3b3b;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 14px;
    font-size: 13px; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase;
    font-family: 'Syne', sans-serif;
    cursor: pointer;
    margin-top: 24px;
    transition: background 0.2s, transform 0.1s;
  }

  .login-btn:hover { background: #e63535; }
  .login-btn:active { transform: scale(0.98); }

  .login-error {
    margin-top: 16px;
    background: #ff3b3b15;
    border: 1px solid #ff3b3b40;
    color: #ff6b6b;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    text-align: center;
  }
`;

function LoginPage({ onLogin }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      onLogin();
    } else {
      setError('Invalid credentials. Access denied.');
    }
  };

  return (
    <>
      <style>{loginCSS}</style>
      <div className="login-root">
        <div className="login-grid" />
        <div className="login-glow" />
        <div className="login-box">
          <div className="login-logo">
            <div className="login-logo-icon">⚠</div>
            <div className="login-logo-text">Crisis<span>Shield</span></div>
          </div>
          <div className="login-title">Admin Access</div>

          <div className="login-field">
            <label className="login-label">Username</label>
            <input
              className="login-input"
              type="text"
              value={user}
              onChange={e => setUser(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter username"
              autoComplete="off"
            />
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              className="login-input"
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter password"
            />
          </div>

          <button className="login-btn" onClick={handleLogin}>
            Access Dashboard
          </button>

          {error && <div className="login-error">{error}</div>}
        </div>
      </div>
    </>
  );
}

function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('cs_auth') === '1');

  const handleLogin = () => {
    sessionStorage.setItem('cs_auth', '1');
    setAuthed(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('cs_auth');
    setAuthed(false);
  };

  if (!authed) return <LoginPage onLogin={handleLogin} />;
  return <Dashboard onLogout={handleLogout} />;
}

export default App;