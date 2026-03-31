import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../lib/useAppState';
import type { Lang } from '../lib/i18n';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  displayName: string;
  portalLabel: string;
  onSignOut: () => void;
  signOutLabel: string;
}

const LANGS: { code: Lang; native: string }[] = [
  { code: 'en', native: 'English' },
  { code: 'de', native: 'Deutsch' },
  { code: 'ro', native: 'Română' },
];

// ── Icons ──────────────────────────────────────────────────────────────────
function IcoBriefcase() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}
function IcoSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function IcoMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function IcoGlobe() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}
function IcoLogOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IcoChevron() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IcoCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────
export default function Sidebar({
  items,
  activeId,
  onSelect,
  displayName,
  portalLabel,
  onSignOut,
  signOutLabel,
}: Props) {
  const { theme, toggleTheme, lang, setLang } = useAppState();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Shared styles
  const navBtn = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
    boxShadow: isActive ? 'inset 3px 0 0 var(--color-action)' : 'none',
    transition: 'background 0.15s, color 0.15s',
    fontSize: 13,
    fontWeight: isActive ? 500 : 400,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  });

  const btmBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--sidebar-text)',
    transition: 'color 0.15s, background 0.15s',
    fontSize: 12,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const iconBox: React.CSSProperties = {
    width: 20,
    height: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  return (
    <nav
      className="nav-sidebar"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 12px 16px',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'var(--color-action)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: 'white',
          }}
        >
          <IcoBriefcase />
        </div>
        <div className="sb-label" style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
            BankOffer AI
          </p>
          <p style={{ fontSize: 10, color: 'var(--sidebar-text)', marginTop: 1 }}>{portalLabel}</p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div
        style={{
          height: 1,
          background: 'var(--sidebar-border)',
          margin: '0 12px 8px',
          flexShrink: 0,
        }}
      />

      {/* ── Nav items ── */}
      <div
        style={{
          flex: 1,
          padding: '4px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="sb-btn"
              style={navBtn(isActive)}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLElement).style.background =
                    'var(--sidebar-hover-bg)';
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span style={iconBox}>{item.icon}</span>
              <span className="sb-label" style={{ flex: 1 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Bottom controls ── */}
      <div style={{ padding: '8px 8px 14px', flexShrink: 0 }}>
        <div
          style={{ height: 1, background: 'var(--sidebar-border)', margin: '4px 4px 8px' }}
        />

        {/* Theme toggle */}
        <button
          className="sb-btn"
          onClick={toggleTheme}
          style={btmBtn}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = 'transparent')
          }
        >
          <span style={iconBox}>{theme === 'dark' ? <IcoSun /> : <IcoMoon />}</span>
          <span className="sb-label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {/* Language */}
        <div ref={langRef} style={{ position: 'relative' }}>
          <button
            className="sb-btn"
            onClick={() => setLangOpen((o) => !o)}
            style={{ ...btmBtn, justifyContent: 'flex-start' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'transparent')
            }
          >
            <span style={iconBox}>
              <IcoGlobe />
            </span>
            <span
              className="sb-label"
              style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}
            >
              {lang.toUpperCase()} <IcoChevron />
            </span>
          </button>

          {langOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 40,
                left: 70,
                minWidth: 150,
                background: 'var(--color-background-primary)',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-dropdown)',
                zIndex: 200,
              }}
            >
              {LANGS.map((l, i) => {
                const isAct = lang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setLangOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '9px 14px',
                      background: isAct
                        ? 'var(--color-background-secondary)'
                        : 'transparent',
                      borderTop:
                        i > 0 ? '1px solid var(--color-border-tertiary)' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isAct ? 'var(--color-action)' : 'var(--color-text-primary)',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{l.code.toUpperCase()}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                      {l.native}
                    </span>
                    {isAct && <IcoCheck />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{ height: 1, background: 'var(--sidebar-border)', margin: '8px 4px' }}
        />

        {/* User */}
        <div
          className="sb-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 12px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              flexShrink: 0,
              background: 'rgba(75,139,245,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-action)',
            }}
          >
            {initials}
          </div>
          <span
            className="sb-label"
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.80)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {displayName}
          </span>
        </div>

        {/* Sign out */}
        <button
          className="sb-btn"
          onClick={onSignOut}
          style={{ ...btmBtn, color: 'rgba(255,255,255,0.32)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.32)';
          }}
        >
          <span style={iconBox}>
            <IcoLogOut />
          </span>
          <span className="sb-label">{signOutLabel}</span>
        </button>
      </div>
    </nav>
  );
}
