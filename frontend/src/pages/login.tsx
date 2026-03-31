import React, { useState } from 'react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'User not found');
      }
      const data = await res.json();
      localStorage.clear();
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user_id', data.customer_id);
      localStorage.setItem('role', data.role);
      localStorage.setItem('display_name', data.display_name);

      if (data.role === 'admin') window.location.href = '/admin';
      else if (data.role === 'employee') window.location.href = '/employee';
      else window.location.href = '/customer';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    background: 'var(--color-background-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 12,
        padding: '36px 40px',
        width: '100%',
        maxWidth: 360,
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: '#0C447C',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                BankOffer AI
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Secure Sign In</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="e.g. demo-001"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#378ADD')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border-tertiary)')}
            />
          </div>
          {error && (
            <p style={{ fontSize: 11, color: 'var(--color-negative)', lineHeight: 1.4, margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            style={{
              width: '100%',
              background: loading || !username.trim() ? 'var(--color-text-muted)' : '#185FA5',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              fontWeight: 500,
              cursor: loading || !username.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            Demo accounts:<br />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>demo-001</span> — Employee<br />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>admin-001</span> — Admin<br />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>CUST-001</span> — Customer
          </p>
        </div>
      </div>
    </div>
  );
}
