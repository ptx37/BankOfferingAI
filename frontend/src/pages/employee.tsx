import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import type { NavItem } from '../components/Sidebar';
import { useTranslation } from '../lib/i18n';
import { CATALOG_PRODUCTS, CATEGORY_COLORS } from '../lib/products';

type TabId = 'dashboard' | 'products' | 'customers';

interface Customer {
  customer_id: string;
  name: string;
  initials: string;
  segment: 'Premium' | 'Standard' | 'Other';
  financial_health: string;
  match_score: number;
}

interface Offer {
  offer_id: string;
  product_id: string;
  product_name: string;
  product_type: string;
  relevance_score: number;
  confidence_score: number;
  personalization_reason: string;
  rank: number;
  channel: string;
  cta_url: string;
}

interface AuditRecord {
  audit_id: string;
  timestamp: string;
  customer_id: string;
  model_version: string;
  llm_used: boolean;
  llm_model: string | null;
  compliance: Record<string, unknown>;
}

// --- PLACEHOLDER DATA ---
// Deterministic consent flags derived from customer_id (demo only — replace with real API)
function getPlaceholderConsent(id: string) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    gdpr: (n % 3) !== 0,
    marketing: (n % 4) !== 0,
    profiling: (n % 5) !== 0,
    analytics: (n % 7) !== 0,
  };
}

const AVATAR_BG: Record<string, string> = {
  Premium: '#185FA5',
  Standard: '#3B6D11',
  Other: '#854F0B',
};

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
  return { Authorization: `Bearer ${token}` };
}

function StarRating({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const stars = ['★', '★', '★', '★', '★'];
  return (
    <div style={{ position: 'relative', display: 'inline-flex', lineHeight: 1 }}>
      <div style={{ display: 'flex', gap: 1, color: 'var(--color-border-tertiary)', fontSize: 14, letterSpacing: 1 }}>
        {stars.map((s, i) => <span key={i}>{s}</span>)}
      </div>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        overflow: 'hidden', width: `${pct}%`,
        display: 'flex', gap: 1,
        color: '#F59E0B', fontSize: 14, letterSpacing: 1, whiteSpace: 'nowrap',
      }}>
        {stars.map((s, i) => <span key={i}>{s}</span>)}
      </div>
    </div>
  );
}

function ConsentDot({ value }: { value: boolean }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: value ? 'var(--color-positive)' : 'var(--color-border-tertiary)',
    }} />
  );
}

// ── Nav Icons ──────────────────────────────────────────────────────────────
function IcoDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IcoProducts() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function IcoCustomers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export async function getServerSideProps() { return { props: {} }; }

export default function EmployeePortal() {
  const router = useRouter();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [toast, setToast] = useState('');

  // Dashboard tab
  const [dashSortAsc, setDashSortAsc] = useState(false);

  // Customers tab
  const [searchQuery, setSearchQuery] = useState('');
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [sentOffers, setSentOffers] = useState<Record<string, boolean>>({});
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!localStorage.getItem('auth_token') || (role !== 'employee' && role !== 'admin')) {
      window.location.href = '/login'; return;
    }
    setDisplayName(localStorage.getItem('display_name') || 'Employee');
  }, []);

  useEffect(() => {
    const tab = router.query.tab as TabId;
    if (tab && ['dashboard', 'products', 'customers'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [router.query.tab]);

  function goToTab(tab: TabId) {
    setActiveTab(tab);
    router.push({ pathname: '/employee', query: { tab } }, undefined, { shallow: true });
  }

  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/customers', { headers: authHeader() }).then(r => {
      if (!r.ok) throw new Error('Failed'); return r.json();
    }),
    enabled: !!displayName,
    staleTime: 5 * 60 * 1000,
  });
  const customers = customersData?.customers ?? [];

  const { data: detailOffersData, isLoading: detailOffersLoading } = useQuery<{ offers: Offer[] }>({
    queryKey: ['emp-detail-offers', openCustomerId],
    queryFn: () => fetch(`/api/offers/${openCustomerId}`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!openCustomerId,
    staleTime: 2 * 60 * 1000,
  });
  const detailOffers = (detailOffersData?.offers ?? []).slice(0, 3);

  const { data: detailAuditData } = useQuery<{ audit_records: AuditRecord[]; total: number }>({
    queryKey: ['emp-detail-audit', openCustomerId],
    queryFn: () => fetch(`/api/admin/audit?customer_id=${openCustomerId}`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!openCustomerId,
    staleTime: 5 * 60 * 1000,
  });
  const detailAudit = detailAuditData?.audit_records ?? [];
  const detailAuditTotal = detailAuditData?.total ?? 0;
  const detailLlmCount = detailAudit.filter(r => r.llm_used).length;

  function openDetail(id: string) {
    const next = openCustomerId === id ? null : id;
    setOpenCustomerId(next);
    if (next) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }

  function sendOffer(offer: Offer) {
    const customer = customers.find(c => c.customer_id === openCustomerId);
    setSentOffers(prev => ({ ...prev, [offer.offer_id]: true }));
    const msg = t('emp.sentToast').replace('{name}', customer?.name ?? openCustomerId ?? '');
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  function signOut() { localStorage.clear(); window.location.href = '/login'; }

  // Dashboard: top-5 by match_score (sortable)
  const top5 = [...customers]
    .sort((a, b) => dashSortAsc ? a.match_score - b.match_score : b.match_score - a.match_score)
    .slice(0, 5);

  // Customers tab filtered list
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.customer_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCustomer = customers.find(c => c.customer_id === openCustomerId);
  const openConsent = openCustomerId ? getPlaceholderConsent(openCustomerId) : null;

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--color-text-secondary)',
  };

  const panel: React.CSSProperties = {
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 12, padding: '18px 20px',
  };

  const thStyle: React.CSSProperties = {
    padding: '9px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--color-text-secondary)',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
  };

  const NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: t('emp.tabDashboard'), icon: <IcoDashboard /> },
    { id: 'products',  label: t('emp.tabProducts'),  icon: <IcoProducts /> },
    { id: 'customers', label: t('emp.tabCustomers'), icon: <IcoCustomers /> },
  ];

  const TAB_LABELS: Record<TabId, string> = {
    dashboard: t('emp.tabDashboard'),
    products:  t('emp.tabProducts'),
    customers: t('emp.tabCustomers'),
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'row', minHeight: '100vh',
      fontFamily: 'var(--font-sans)', fontSize: 13,
      background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#185FA5', color: 'white',
          padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>{toast}</div>
      )}

      {/* Sidebar */}
      <Sidebar
        items={NAV_ITEMS}
        activeId={activeTab}
        onSelect={(id) => goToTab(id as TabId)}
        displayName={displayName}
        portalLabel={t('nav.employeePortal')}
        onSignOut={signOut}
        signOutLabel={t('nav.signOut')}
      />

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Thin top bar */}
        <div style={{
          height: 52, display: 'flex', alignItems: 'center',
          background: 'var(--color-background-primary)',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          padding: '0 24px', flexShrink: 0,
        }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {TAB_LABELS[activeTab]}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 10 }}>
              BankOffer AI / {t('nav.employeePortal')}
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: 24, maxWidth: 1080, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

            {/* ═══════════════ DASHBOARD TAB ═══════════════ */}
            {activeTab === 'dashboard' && (
              <div style={panel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={sectionLabel}>{t('emp.topRated')}</p>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {t('emp.totalCustomers').replace('{n}', String(customers.length))}
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>#</th>
                      <th style={thStyle}>{t('emp.name')}</th>
                      <th style={{ ...thStyle, width: 110 }}>{t('emp.segment')}</th>
                      <th style={{ ...thStyle, width: 170 }}>
                        <button
                          onClick={() => setDashSortAsc(p => !p)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
                            letterSpacing: '0.04em', color: 'var(--color-action)', padding: 0,
                          }}
                        >
                          {t('emp.rating')} {dashSortAsc ? '↑' : '↓'}
                        </button>
                      </th>
                      <th style={{ ...thStyle, width: 80, textAlign: 'right' }}>{t('emp.matchScore')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top5.map((c, idx) => {
                      const bg = AVATAR_BG[c.segment] ?? AVATAR_BG.Other;
                      return (
                        <tr key={c.customer_id}>
                          <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                            {idx + 1}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: bg + '28', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 11, fontWeight: 500, color: bg, flexShrink: 0,
                              }}>{c.initials}</div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</p>
                                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.customer_id}</p>
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 10,
                              background: bg + '20', color: bg, fontWeight: 500,
                            }}>{c.segment}</span>
                          </td>
                          <td style={tdStyle}><StarRating score={c.match_score} /></td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-action)' }}>{c.match_score}%</span>
                          </td>
                        </tr>
                      );
                    })}
                    {customers.length === 0 && (
                      <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)', padding: 28 }}>
                        {t('emp.loadingCustomers')}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ═══════════════ PRODUCTS TAB ═══════════════ */}
            {activeTab === 'products' && (
              <div>
                <p style={{ ...sectionLabel, marginBottom: 16 }}>{t('emp.productCatalog')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                  {CATALOG_PRODUCTS.map(p => {
                    const catColor = CATEGORY_COLORS[p.category];
                    return (
                      <div key={p.id} style={{
                        background: 'var(--color-background-primary)',
                        border: '0.5px solid var(--color-border-tertiary)',
                        borderRadius: 12, padding: '16px 18px',
                        display: 'flex', flexDirection: 'column', gap: 10,
                      }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, marginBottom: 5 }}>{p.name}</p>
                            <span style={{
                              display: 'inline-block', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                              padding: '2px 8px', borderRadius: 10,
                              background: catColor.bg, color: catColor.text,
                            }}>{p.category.toUpperCase()}</span>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 10, flexShrink: 0, marginTop: 2,
                            background: p.status === 'active' ? '#3B6D1118' : 'var(--color-background-secondary)',
                            color: p.status === 'active' ? '#3B6D11' : 'var(--color-text-muted)',
                          }}>{p.status === 'active' ? t('admin.enabled') : t('admin.disabled')}</span>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                          {p.description}
                        </p>

                        {/* Attributes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 2 }}>
                          {p.attributes.map(attr => (
                            <div key={attr.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{attr.label}</span>
                              <span style={{ fontSize: 11, fontWeight: 500 }}>{attr.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Footer */}
                        <div style={{
                          display: 'flex', gap: 20,
                          paddingTop: 10, marginTop: 2,
                          borderTop: '0.5px solid var(--color-border-tertiary)',
                        }}>
                          {p.interestRate !== undefined && (
                            <div>
                              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Rate</p>
                              <p style={{ fontSize: 12, fontWeight: 600 }}>{p.interestRate}%</p>
                            </div>
                          )}
                          {p.creditLimit !== undefined && (
                            <div>
                              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Max Limit</p>
                              <p style={{ fontSize: 12, fontWeight: 600 }}>€{p.creditLimit.toLocaleString()}</p>
                            </div>
                          )}
                          <div style={{ marginLeft: 'auto' }}>
                            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Code</p>
                            <p style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{p.code}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════ CUSTOMERS TAB ═══════════════ */}
            {activeTab === 'customers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Search */}
                <div style={{ maxWidth: 380 }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={t('emp.searchCustomers')}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8,
                      padding: '8px 12px', fontSize: 13, outline: 'none',
                      background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--color-action)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--color-border-tertiary)')}
                  />
                </div>

                {/* Customers table */}
                <div style={{
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-background-secondary)' }}>
                        {[
                          { label: t('emp.name'), align: 'left' },
                          { label: t('emp.segment'), align: 'left' },
                          { label: t('emp.rating'), align: 'left' },
                          { label: 'GDPR', align: 'center' },
                          { label: 'Mkt', align: 'center' },
                          { label: 'Prof', align: 'center' },
                          { label: 'Anl', align: 'center' },
                          { label: '', align: 'right' },
                        ].map((h, i) => (
                          <th key={i} style={{
                            padding: '10px 14px', textAlign: h.align as 'left' | 'center' | 'right',
                            fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
                            letterSpacing: '0.04em', color: 'var(--color-text-secondary)',
                            borderBottom: '0.5px solid var(--color-border-tertiary)',
                          }}>{h.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map(c => {
                        const bg = AVATAR_BG[c.segment] ?? AVATAR_BG.Other;
                        const consent = getPlaceholderConsent(c.customer_id);
                        const isOpen = openCustomerId === c.customer_id;
                        return (
                          <tr
                            key={c.customer_id}
                            style={{
                              borderBottom: '0.5px solid var(--color-border-tertiary)',
                              background: isOpen ? 'var(--color-sidebar-active)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%',
                                  background: bg + '28', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: 11, fontWeight: 500, color: bg, flexShrink: 0,
                                }}>{c.initials}</div>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</p>
                                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.customer_id}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 10,
                                background: bg + '20', color: bg, fontWeight: 500,
                              }}>{c.segment}</span>
                            </td>
                            <td style={{ padding: '10px 14px' }}><StarRating score={c.match_score} /></td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}><ConsentDot value={consent.gdpr} /></td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}><ConsentDot value={consent.marketing} /></td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}><ConsentDot value={consent.profiling} /></td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}><ConsentDot value={consent.analytics} /></td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <button
                                onClick={() => openDetail(c.customer_id)}
                                style={{
                                  fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6,
                                  background: isOpen ? 'var(--color-action)' : 'transparent',
                                  color: isOpen ? 'white' : 'var(--color-action)',
                                  border: '1px solid var(--color-action)', cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >{isOpen ? t('emp.close') : t('emp.openBtn')}</button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCustomers.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ padding: 28, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            {searchQuery ? t('emp.noResults') : t('emp.loadingCustomers')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ── Customer Detail Panel ── */}
                {openCustomerId && openCustomer && (
                  <div ref={detailRef} style={{
                    background: 'var(--color-background-primary)',
                    border: '1px solid var(--color-action)',
                    borderRadius: 12, padding: '20px 24px',
                    display: 'flex', flexDirection: 'column', gap: 20,
                  }}>
                    {/* Customer summary row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                        background: (AVATAR_BG[openCustomer.segment] ?? AVATAR_BG.Other) + '28',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, fontWeight: 600, color: AVATAR_BG[openCustomer.segment] ?? AVATAR_BG.Other,
                      }}>{openCustomer.initials}</div>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{openCustomer.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {openCustomer.customer_id} · {openCustomer.segment} · {openCustomer.financial_health}
                        </p>
                      </div>
                      {!openConsent?.gdpr && (
                        <span style={{
                          fontSize: 11, padding: '4px 10px', borderRadius: 6, fontWeight: 500,
                          background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)',
                          border: '1px solid var(--color-warning-border)',
                        }}>{t('emp.noGdpr')}</span>
                      )}
                      <div style={{ display: 'flex', gap: 14 }}>
                        {[
                          { label: 'GDPR', val: openConsent?.gdpr },
                          { label: 'Marketing', val: openConsent?.marketing },
                          { label: 'Profiling', val: openConsent?.profiling },
                          { label: 'Analytics', val: openConsent?.analytics },
                        ].map(({ label, val }) => (
                          <div key={label} style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 3 }}>{label}</p>
                            <ConsentDot value={!!val} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Recommendations */}
                    <div>
                      <p style={{ ...sectionLabel, marginBottom: 12 }}>{t('emp.recommendations')}</p>
                      {detailOffersLoading ? (
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('emp.scoring')}</p>
                      ) : detailOffers.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('emp.noRecommendations')}</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                          {detailOffers.map(offer => {
                            const isTop = offer.rank === 1;
                            const isSent = sentOffers[offer.offer_id];
                            const canSend = !!openConsent?.gdpr;
                            return (
                              <div key={offer.offer_id} style={{
                                border: isTop ? '2px solid var(--color-accent)' : '0.5px solid var(--color-border-tertiary)',
                                borderRadius: 8, padding: '12px 14px',
                                display: 'flex', flexDirection: 'column', gap: 6,
                              }}>
                                {isTop && (
                                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-action)', letterSpacing: '0.04em' }}>
                                    {t('common.topPick')}
                                  </span>
                                )}
                                <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{offer.product_name}</p>
                                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.55, flex: 1 }}>
                                  {offer.personalization_reason}
                                </p>
                                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                  {t('emp.aiDisclosure')}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                    {t('emp.match')}: <span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                      {Math.round(offer.relevance_score * 100)}%
                                    </span>
                                  </span>
                                  <button
                                    onClick={() => !isSent && canSend && sendOffer(offer)}
                                    disabled={isSent || !canSend}
                                    title={!canSend ? t('emp.noGdpr') : undefined}
                                    style={{
                                      fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
                                      background: isSent ? '#3B6D11' : (!canSend ? 'var(--color-text-muted)' : '#185FA5'),
                                      color: 'white', border: 'none',
                                      cursor: isSent || !canSend ? 'not-allowed' : 'pointer',
                                      opacity: !canSend && !isSent ? 0.4 : 1,
                                    }}
                                  >{isSent ? t('emp.sent') : t('emp.send')}</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Audit Log */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
                        <p style={sectionLabel}>{t('emp.auditLog')}</p>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {t('emp.auditTotal').replace('{n}', String(detailAuditTotal))}
                          {' · '}
                          {t('emp.auditLlm').replace('{n}', String(detailLlmCount))}
                        </span>
                      </div>
                      {detailAudit.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('emp.noAuditEntries')}</p>
                      ) : (
                        <div style={{
                          border: '0.5px solid var(--color-border-tertiary)',
                          borderRadius: 8, overflow: 'hidden',
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: 'var(--color-background-secondary)' }}>
                                {['Timestamp', 'Model', 'LLM', 'Consent'].map(h => (
                                  <th key={h} style={{
                                    padding: '7px 12px', textAlign: 'left',
                                    fontSize: 10, fontWeight: 500, textTransform: 'uppercase',
                                    letterSpacing: '0.04em', color: 'var(--color-text-secondary)',
                                    borderBottom: '0.5px solid var(--color-border-tertiary)',
                                  }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {detailAudit.slice(0, 6).map(r => (
                                <tr key={r.audit_id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                                  <td style={{ padding: '7px 12px', color: 'var(--color-text-muted)' }}>
                                    {new Date(r.timestamp).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: 'var(--color-text-secondary)', fontSize: 11 }}>
                                    {r.model_version}
                                  </td>
                                  <td style={{ padding: '7px 12px' }}>
                                    {r.llm_used
                                      ? <span style={{ color: 'var(--color-action)', fontWeight: 500 }}>Yes</span>
                                      : <span style={{ color: 'var(--color-text-muted)' }}>No</span>
                                    }
                                  </td>
                                  <td style={{ padding: '7px 12px' }}>
                                    <ConsentDot value={!!(r.compliance as Record<string, unknown>)?.profiling_consent_given} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
