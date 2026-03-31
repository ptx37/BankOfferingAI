import React, { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const [agentId, setAgentId] = useState('demo-001');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/token?customer_id=${agentId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Auth failed');
      const data = await res.json();
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('customer_id', data.customer_id);
      router.push('/Dashboard');
    } catch {
      setError('Sign in failed. Verify the agent ID and ensure the service is available.');
    } finally {
      setLoading(false);
    }
  }

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
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#0C447C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
                Customer Offer Center
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Internal Banking Tool</p>
            </div>
          </div>
          <p style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
          }}>
            Agent Sign In
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 6,
            }}>
              Agent ID
            </label>
            <input
              type="text"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              autoComplete="off"
              style={{
                width: '100%',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 13,
                color: 'var(--color-text-primary)',
                background: 'var(--color-background-primary)',
                outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = '#378ADD')}
              onBlur={e => (e.target.style.borderColor = 'var(--color-border-tertiary)')}
              placeholder="e.g. demo-001"
            />
          </div>

          {error && (
            <p style={{ fontSize: 11, color: 'var(--color-negative)', marginBottom: 14, lineHeight: 1.4 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !agentId.trim()}
            style={{
              width: '100%',
              background: loading || !agentId.trim() ? 'var(--color-text-muted)' : '#185FA5',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              fontWeight: 500,
              cursor: loading || !agentId.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: '0.5px solid var(--color-border-tertiary)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Demo access — agent ID: <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>demo-001</span>
          </p>
        </div>
      </div>
    </div>
  );
}
