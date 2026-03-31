import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../lib/useAppState';
import { useTranslation } from '../lib/i18n';
import type { Lang } from '../lib/i18n';

const LANGS: { code: Lang; native: string }[] = [
  { code: 'en', native: 'English' },
  { code: 'de', native: 'Deutsch' },
  { code: 'ro', native: 'Română' },
];

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Login() {
  const { theme, toggleTheme, lang, setLang } = useAppState();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

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
        throw new Error(data.detail || t('login.userNotFound'));
      }
      const data = await res.json();
      localStorage.clear();
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user_id', data.customer_id);
      localStorage.setItem('role', data.role);
      localStorage.setItem('display_name', data.display_name);
      // Preserve theme/lang across sign-in
      if (theme !== 'light') localStorage.setItem('theme', theme);
      localStorage.setItem('lang', lang);

      if (data.role === 'admin') window.location.href = '/admin';
      else if (data.role === 'employee') window.location.href = '/employee';
      else window.location.href = '/customer';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('login.userNotFound'));
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    background: 'var(--color-background-secondary)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  const ctrlBtn: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 8,
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-text-secondary)',
    transition: 'background 0.15s, border-color 0.15s',
  };

  return (
    <div
      className="login-bg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >

      {/* Floating controls — top right */}
      <div style={{ position: 'fixed', top: 14, right: 16, display: 'flex', gap: 6, zIndex: 50 }}>
        <button
          onClick={toggleTheme}
          style={ctrlBtn}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-background-secondary)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-background-primary)';
          }}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        <div ref={langRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setLangOpen(o => !o)}
            style={{
              ...ctrlBtn, width: 'auto', padding: '0 10px', gap: 5,
              fontSize: 12, fontWeight: 600,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-background-secondary)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-background-primary)';
            }}
          >
            {lang.toUpperCase()} <ChevronDownIcon />
          </button>
          {langOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 38,
              minWidth: 148,
              background: 'var(--color-background-primary)',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 12, overflow: 'hidden',
              boxShadow: 'var(--shadow-dropdown)',
              zIndex: 200,
            }}>
              {LANGS.map((l, i) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setLangOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '9px 14px',
                    background: lang === l.code ? 'var(--color-background-secondary)' : 'transparent',
                    borderTop: i > 0 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                    border: 'none', cursor: 'pointer',
                    fontSize: 12,
                    color: lang === l.code ? 'var(--color-action)' : 'var(--color-text-primary)',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{l.code.toUpperCase()}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{l.native}</span>
                  {lang === l.code && <CheckIcon />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Login Card */}
      <div style={{
        background: 'var(--color-background-primary)',
        borderRadius: 16,
        padding: '40px 44px',
        width: '100%',
        maxWidth: 380,
        boxShadow: 'var(--shadow-dropdown)',
        border: '0.5px solid var(--color-border-tertiary)',
      }}>
        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--color-action)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              {t('nav.bankOffer')}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>{t('login.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 500,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7,
            }}>
              {t('login.username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="e.g. demo-001"
              style={inputStyle}
              onFocus={e => {
                e.target.style.borderColor = 'var(--color-action)';
                e.target.style.boxShadow = '0 0 0 3px rgba(43,95,232,0.12)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--color-border-tertiary)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: 'var(--color-negative)', lineHeight: 1.4, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim()}
            style={{
              width: '100%',
              background: loading || !username.trim() ? 'var(--color-text-muted)' : 'var(--color-action)',
              color: 'white', border: 'none', borderRadius: 9,
              padding: '11px 12px', fontSize: 13, fontWeight: 600,
              cursor: loading || !username.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, opacity 0.15s',
              marginTop: 2,
            }}
          >
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.9 }}>
            {t('login.demoTitle')}<br />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>demo-001</span>
            {' '}&mdash; {t('login.demoEmployee')}<br />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>admin-001</span>
            {' '}&mdash; {t('login.demoAdmin')}<br />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>CUST-001</span>
            {' '}&mdash; {t('login.demoCustomer')}
          </p>
        </div>
      </div>
    </div>
  );
}
