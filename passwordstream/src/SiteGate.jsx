/**
 * SiteGate.jsx
 * A global security gate that protects the entire application.
 * Users must enter the global site password (stored in the backend .env) 
 * before they can access the login or signup pages.
 */
import React, { useState } from 'react';

export default function SiteGate({ children }) {
  const [siteAccess, setSiteAccess] = useState(sessionStorage.getItem('site_access') === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyPassword = async () => {
    if (!passwordInput) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/verify-site-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      
      const data = await res.json();
      if (res.ok && data.valid) {
        sessionStorage.setItem('site_access', 'true');
        setSiteAccess(true);
      } else {
        setError(data.message || 'Incorrect password');
      }
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!siteAccess) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f1f5f9' }}>
        <div style={{ textAlign: 'center', padding: '2.5rem 2rem', maxWidth: '400px', width: '100%', background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
          <h2 style={{ marginBottom: '1.5rem', color: '#0f172a', fontSize: '1.5rem', fontWeight: 'bold' }}>Test Environment</h2>
          <input
            type="password"
            className="auth-input"
            placeholder="Enter test password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') verifyPassword();
            }}
            disabled={loading}
            style={{ width: '100%', padding: '0.875rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', marginBottom: '1.5rem', outline: 'none', transition: 'border-color 0.2s' }}
          />
          {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
          <button 
            className="login-btn"
            onClick={verifyPassword}
            disabled={loading}
            style={{ width: '100%', padding: '0.875rem', background: '#0ea5e9', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: loading ? 'wait' : 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'background-color 0.2s' }}
          >
            {loading ? 'Verifying...' : 'Enter Site'}
          </button>
        </div>
      </div>
    );
  }

  return children;
}
