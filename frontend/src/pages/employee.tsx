import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import type { NavItem } from '../components/Sidebar';
import { useTranslation } from '../lib/i18n';
import { CATALOG_PRODUCTS, CATEGORY_COLORS } from '../lib/products';
import type { CatalogProduct } from '../lib/products';
import { MOCK_CUSTOMERS, type MockCustomer } from '../lib/mockData';
import { addNotification, getNotifications, type AppNotification } from '../lib/notificationStore';
import { getConsent } from '../lib/consentStore';

type TabId = 'dashboard' | 'products' | 'customers';
type Customer = MockCustomer;

interface AuditRecord {
  audit_id: string;
  timestamp: string;
  customer_id: string;
  model_version: string;
  llm_used: boolean;
  llm_model: string | null;
  compliance: Record<string, unknown>;
}


// --- Eligibility scoring ---
function isEligible(customer: Customer, product: CatalogProduct): boolean {
  const elig = (product.eligibility ?? '').toLowerCase();
  const incomeMatch = elig.match(/income\s*[>≥]\s*€?([\d,]+)/);
  if (incomeMatch && customer.income <= parseInt(incomeMatch[1].replace(',', ''))) return false;
  const ageMatch = elig.match(/age\s*[≥>]\s*(\d+)/);
  if (ageMatch && customer.age < parseInt(ageMatch[1])) return false;
  const savingsMatch = elig.match(/savings\s*[>≥]\s*€?([\d,]+)/);
  if (savingsMatch && customer.savings <= parseInt(savingsMatch[1].replace(',', ''))) return false;
  if (elig.includes('no existing mortgage') && customer.existing_products.includes('mortgage')) return false;
  return true;
}

function getMatchingProducts(customer: Customer, max = 5): CatalogProduct[] {
  const existingNames = customer.existing_products.map(ep => ep.replace(/_/g, ' '));
  return CATALOG_PRODUCTS
    .filter(p => p.status === 'active')
    .filter(p => isEligible(customer, p))
    .filter(p => !existingNames.some(ep => p.name.toLowerCase().includes(ep)))
    .slice(0, max);
}

const AVATAR_BG: Record<string, string> = {
  Premium: '#185FA5', Standard: '#3B6D11', Other: '#854F0B',
};

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
  return { Authorization: `Bearer ${token}` };
}

// --- Sub-components ---
function StarRating({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const stars = ['★', '★', '★', '★', '★'];
  return (
    <div style={{ position: 'relative', display: 'inline-flex', lineHeight: 1 }}>
      <div style={{ display: 'flex', gap: 1, color: 'var(--color-border-tertiary)', fontSize: 14, letterSpacing: 1 }}>
        {stars.map((s, i) => <span key={i}>{s}</span>)}
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden', width: `${pct}%`, display: 'flex', gap: 1, color: '#F59E0B', fontSize: 14, letterSpacing: 1, whiteSpace: 'nowrap' }}>
        {stars.map((s, i) => <span key={i}>{s}</span>)}
      </div>
    </div>
  );
}

function ConsentDot({ value }: { value: boolean }) {
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: value ? 'var(--color-positive)' : 'var(--color-border-tertiary)' }} />;
}

function EligibilityBar({ product, customers }: { product: CatalogProduct; customers: Customer[] }) {
  const eligible = customers.filter(c => isEligible(c, product)).length;
  const total = customers.length;
  const pct = total > 0 ? Math.round((eligible / total) * 100) : 0;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
        <span style={{ color: '#3B6D11', fontWeight: 600 }}>{eligible} eligible</span>
        <span style={{ color: '#A32D2D', fontWeight: 600 }}>{total - eligible} ineligible</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${pct}%`, background: '#3B6D11', transition: 'width 0.4s' }} />
        <div style={{ flex: 1, background: '#A32D2D30' }} />
      </div>
    </div>
  );
}

// --- Nav Icons ---
function IcoDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IcoProducts() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  );
}
function IcoCustomers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
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

  // Dashboard
  const [dashSortAsc, setDashSortAsc] = useState(false);
  const [dashProductId, setDashProductId] = useState<string | null>(null);

  // Customers tab
  const [searchQuery, setSearchQuery] = useState('');
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [sentOffers, setSentOffers] = useState<Set<string>>(new Set());
  const [drawerNotifs, setDrawerNotifs] = useState<AppNotification[]>([]);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!localStorage.getItem('auth_token') || (role !== 'employee' && role !== 'admin')) {
      window.location.href = '/login'; return;
    }
    setDisplayName(localStorage.getItem('display_name') || 'Employee');
  }, []);

  useEffect(() => {
    const tab = router.query.tab as TabId;
    if (tab && ['dashboard', 'products', 'customers'].includes(tab)) setActiveTab(tab);
  }, [router.query.tab]);

  useEffect(() => {
    setDrawerNotifs(openCustomerId ? getNotifications(openCustomerId) : []);
    setSentOffers(new Set());
  }, [openCustomerId]);

  const { data: detailAuditData } = useQuery<{ audit_records: AuditRecord[]; total: number }>({
    queryKey: ['emp-detail-audit', openCustomerId],
    queryFn: () => fetch(`/api/admin/audit?customer_id=${openCustomerId}`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!openCustomerId,
    staleTime: 5 * 60 * 1000,
  });
  const detailAudit = detailAuditData?.audit_records ?? [];
  const detailAuditTotal = detailAuditData?.total ?? 0;
  const detailLlmCount = detailAudit.filter(r => r.llm_used).length;

  function goToTab(tab: TabId) {
    setActiveTab(tab);
    router.push({ pathname: '/employee', query: { tab } }, undefined, { shallow: true });
  }

  function openDetail(id: string) {
    setOpenCustomerId(prev => prev === id ? null : id);
  }

  function openCustomerFromDashboard(id: string) {
    setOpenCustomerId(id);
    setActiveTab('customers');
    router.push({ pathname: '/employee', query: { tab: 'customers' } }, undefined, { shallow: true });
  }

  function sendOffer(product: CatalogProduct) {
    if (!openCustomerId || sentOffers.has(product.id)) return;
    const consent = getConsent(openCustomerId);
    if (!consent.gdpr) return;
    addNotification(openCustomerId, {
      productName: product.name,
      productId: product.id,
      message: `Your relationship manager recommends the ${product.name} based on your financial profile.`,
      sentBy: displayName || 'Employee',
    });
    setSentOffers(prev => new Set([...prev, product.id]));
    setDrawerNotifs(getNotifications(openCustomerId));
    setToast(`Offer "${product.name}" sent to customer ${openCustomerId}`);
    setTimeout(() => setToast(''), 3500);
  }

  function signOut() { localStorage.clear(); window.location.href = '/login'; }

  // --- Computed data ---
  const customers: Customer[] = MOCK_CUSTOMERS;
  const filteredCustomers = customers.filter(c =>
    c.customer_id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const openCustomer = customers.find(c => c.customer_id === openCustomerId);
  const openConsent = openCustomerId ? getConsent(openCustomerId) : null;
  const customerRecommendations = openCustomer ? getMatchingProducts(openCustomer) : [];
  const sortedCustomers = [...customers].sort((a, b) =>
    dashSortAsc ? a.match_score - b.match_score : b.match_score - a.match_score
  );
  const dashProduct = CATALOG_PRODUCTS.find(p => p.id === dashProductId) ?? null;

  // --- Styles ---
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
    padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)',
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

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          height: 52, display: 'flex', alignItems: 'center',
          background: 'var(--color-background-primary)',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          padding: '0 24px', flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{TAB_LABELS[activeTab]}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 10 }}>
            BankOffer AI / {t('nav.employeePortal')}
          </span>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{
            padding: 24,
            ...(activeTab !== 'dashboard' ? { maxWidth: 1080, margin: '0 auto' } : {}),
            width: '100%', boxSizing: 'border-box',
          }}>

            {/* ═══════════════════ DASHBOARD ═══════════════════ */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

                {/* Left — Customer table */}
                <div style={panel}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <p style={sectionLabel}>All Customers · {customers.length}</p>
                    <button
                      onClick={() => setDashSortAsc(p => !p)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 500, color: 'var(--color-action)',
                        display: 'flex', alignItems: 'center', gap: 4,
                        textTransform: 'uppercase', letterSpacing: '0.04em', padding: 0,
                      }}
                    >
                      Match Score {dashSortAsc ? '↑' : '↓'}
                    </button>
                  </div>
                  <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--color-background-primary)', zIndex: 1 }}>
                        <tr>
                          <th style={thStyle}>Customer ID</th>
                          <th style={{ ...thStyle, width: 100 }}>Segment</th>
                          <th style={{ ...thStyle, width: 70, textAlign: 'right' }}>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCustomers.map((c, idx) => {
                          const bg = AVATAR_BG[c.segment] ?? AVATAR_BG.Other;
                          return (
                            <tr
                              key={c.customer_id}
                              onClick={() => openCustomerFromDashboard(c.customer_id)}
                              style={{ borderBottom: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-background-secondary)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td style={tdStyle}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{c.customer_id}</span>
                              </td>
                              <td style={tdStyle}>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: bg + '20', color: bg, fontWeight: 500 }}>
                                  {c.segment}
                                </span>
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-action)' }}>{c.match_score}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right — Product cards */}
                <div>
                  <p style={{ ...sectionLabel, marginBottom: 14 }}>Product Catalog — click to view details</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                    {CATALOG_PRODUCTS.map(p => {
                      const catColor = CATEGORY_COLORS[p.category];
                      return (
                        <div
                          key={p.id}
                          onClick={() => setDashProductId(p.id)}
                          style={{
                            background: 'var(--color-background-primary)',
                            border: '0.5px solid var(--color-border-tertiary)',
                            borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                            transition: 'border-color 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--color-action)';
                            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.10)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--color-border-tertiary)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <p style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>{p.name}</p>
                          <span style={{
                            fontSize: 9, fontWeight: 600, padding: '1px 7px', borderRadius: 8,
                            background: catColor.bg, color: catColor.text,
                          }}>{p.category.toUpperCase()}</span>
                          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                            {p.description.length > 80 ? p.description.slice(0, 80) + '…' : p.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════ PRODUCTS ═══════════════════ */}
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
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, marginBottom: 5 }}>{p.name}</p>
                            <span style={{
                              display: 'inline-block', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                              padding: '2px 8px', borderRadius: 10, background: catColor.bg, color: catColor.text,
                            }}>{p.category.toUpperCase()}</span>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 10,
                            flexShrink: 0, marginTop: 2,
                            background: p.status === 'active' ? '#3B6D1118' : 'var(--color-background-secondary)',
                            color: p.status === 'active' ? '#3B6D11' : 'var(--color-text-muted)',
                          }}>{p.status === 'active' ? t('admin.enabled') : t('admin.disabled')}</span>
                        </div>

                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{p.description}</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 2 }}>
                          {p.attributes.map(attr => (
                            <div key={attr.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{attr.label}</span>
                              <span style={{ fontSize: 11, fontWeight: 500 }}>{attr.value}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: 20, paddingTop: 10, marginTop: 2, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
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

                        {/* Eligibility bar */}
                        <EligibilityBar product={p} customers={customers} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══════════════════ CUSTOMERS ═══════════════════ */}
            {activeTab === 'customers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--color-action)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--color-border-tertiary)')}
                  />
                </div>

                <div style={{
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-background-secondary)' }}>
                        {[
                          { label: t('emp.customerId'), align: 'left' },
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
                        const consent = getConsent(c.customer_id);
                        const isOpen = openCustomerId === c.customer_id;
                        return (
                          <tr
                            key={c.customer_id}
                            style={{
                              borderBottom: '0.5px solid var(--color-border-tertiary)',
                              background: isOpen ? 'var(--color-sidebar-active)' : 'transparent',
                              cursor: 'pointer', transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--color-background-secondary)'; }}
                            onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                            onClick={() => openDetail(c.customer_id)}
                          >
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'monospace' }}>{c.customer_id}</span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: bg + '20', color: bg, fontWeight: 500 }}>
                                {c.segment}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}><StarRating score={c.match_score} /></td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}><ConsentDot value={consent.gdpr} /></td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}><ConsentDot value={consent.marketing} /></td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}><ConsentDot value={consent.profiling} /></td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}><ConsentDot value={consent.analytics} /></td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <span style={{
                                fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 500,
                                background: isOpen ? 'var(--color-action)' : 'transparent',
                                color: isOpen ? 'white' : 'var(--color-action)',
                                border: '1px solid var(--color-action)',
                              }}>{isOpen ? 'Viewing' : 'Open'}</span>
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
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ═══ Customer Detail Drawer (fixed right panel) ═══ */}
      {openCustomerId && openCustomer && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpenCustomerId(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.20)', zIndex: 900 }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', top: 0, right: 0, width: 500, height: '100vh',
            background: 'var(--color-background-primary)',
            borderLeft: '1px solid var(--color-border-tertiary)',
            zIndex: 1000, overflowY: 'auto',
            boxShadow: '-6px 0 32px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Drawer header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: '0.5px solid var(--color-border-tertiary)',
              flexShrink: 0, background: 'var(--color-background-primary)',
              position: 'sticky', top: 0, zIndex: 2,
            }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', marginBottom: 2 }}>
                  {openCustomer.customer_id}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {openCustomer.segment} · {openCustomer.financial_health} · Age {openCustomer.age}
                </p>
              </div>
              <button
                onClick={() => setOpenCustomerId(null)}
                style={{
                  width: 30, height: 30, borderRadius: 6, border: '0.5px solid var(--color-border-tertiary)',
                  background: 'var(--color-background-secondary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: 'var(--color-text-secondary)',
                }}
              >✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Consent flags */}
              <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                {!openConsent?.gdpr && (
                  <div style={{
                    marginBottom: 12, padding: '8px 12px', borderRadius: 8,
                    background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)',
                    fontSize: 12, color: 'var(--color-warning-text)',
                  }}>{t('emp.noGdpr')} — offer sending is disabled.</div>
                )}
                <div style={{ display: 'flex', gap: 20 }}>
                  {[
                    { label: 'GDPR', val: openConsent?.gdpr },
                    { label: 'Marketing', val: openConsent?.marketing },
                    { label: 'Profiling', val: openConsent?.profiling },
                    { label: 'Analytics', val: openConsent?.analytics },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</p>
                      <ConsentDot value={!!val} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Product recommendations */}
              <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  Recommended Products
                </p>
                {customerRecommendations.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No matching products for this customer.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {customerRecommendations.map((product, idx) => {
                      const isSent = sentOffers.has(product.id);
                      const canSend = !!openConsent?.gdpr;
                      const catColor = CATEGORY_COLORS[product.category];
                      return (
                        <div key={product.id} style={{
                          border: idx === 0 ? '1.5px solid var(--color-action)' : '0.5px solid var(--color-border-tertiary)',
                          borderRadius: 10, padding: '12px 16px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                            <div>
                              {idx === 0 && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-action)', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                                  {t('common.topPick')}
                                </span>
                              )}
                              <p style={{ fontSize: 13, fontWeight: 600 }}>{product.name}</p>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: catColor.bg, color: catColor.text, flexShrink: 0 }}>
                              {product.category.toUpperCase()}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: 10 }}>
                            {product.description}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 10 }}>
                            {t('emp.aiDisclosure')}
                          </p>
                          <button
                            onClick={() => sendOffer(product)}
                            disabled={isSent || !canSend}
                            title={!canSend ? t('emp.noGdpr') : undefined}
                            style={{
                              fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 6,
                              background: isSent ? '#3B6D11' : (!canSend ? 'var(--color-text-muted)' : '#185FA5'),
                              color: 'white', border: 'none',
                              cursor: isSent || !canSend ? 'not-allowed' : 'pointer',
                              opacity: !canSend && !isSent ? 0.4 : 1,
                            }}
                          >{isSent ? '✓ Sent' : t('emp.send')}</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notification log */}
              <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  Notification Log · {drawerNotifs.length}
                </p>
                {drawerNotifs.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No offers sent to this customer yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {drawerNotifs.map(n => (
                      <div key={n.id} style={{
                        padding: '10px 14px', borderRadius: 8,
                        background: 'var(--color-background-secondary)',
                        border: '0.5px solid var(--color-border-tertiary)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 600 }}>{n.productName}</p>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                            {new Date(n.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Sent by {n.sentBy}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit log */}
              <div style={{ padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}>
                    {t('emp.auditLog')}
                  </p>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {t('emp.auditTotal').replace('{n}', String(detailAuditTotal))}
                    {' · '}
                    {t('emp.auditLlm').replace('{n}', String(detailLlmCount))}
                  </span>
                </div>
                {detailAudit.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('emp.noAuditEntries')}</p>
                ) : (
                  <div style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--color-background-secondary)' }}>
                          {['Timestamp', 'Model', 'LLM', 'Consent'].map(h => (
                            <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detailAudit.slice(0, 6).map(r => (
                          <tr key={r.audit_id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                            <td style={{ padding: '7px 12px', color: 'var(--color-text-muted)' }}>{new Date(r.timestamp).toLocaleString()}</td>
                            <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: 'var(--color-text-secondary)', fontSize: 11 }}>{r.model_version}</td>
                            <td style={{ padding: '7px 12px' }}>
                              {r.llm_used ? <span style={{ color: 'var(--color-action)', fontWeight: 500 }}>Yes</span> : <span style={{ color: 'var(--color-text-muted)' }}>No</span>}
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
          </div>
        </>
      )}

      {/* ═══ Dashboard product detail modal ═══ */}
      {dashProduct && (
        <div
          onClick={() => setDashProductId(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)',
            zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-background-primary)',
              borderRadius: 16, padding: '28px 32px',
              maxWidth: 560, width: '100%',
              boxShadow: '0 8px 48px rgba(0,0,0,0.30)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{dashProduct.name}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 10,
                    background: CATEGORY_COLORS[dashProduct.category].bg, color: CATEGORY_COLORS[dashProduct.category].text,
                  }}>{dashProduct.category.toUpperCase()}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 10,
                    background: dashProduct.status === 'active' ? '#3B6D1118' : 'var(--color-background-secondary)',
                    color: dashProduct.status === 'active' ? '#3B6D11' : 'var(--color-text-muted)',
                  }}>{dashProduct.status}</span>
                </div>
              </div>
              <button
                onClick={() => setDashProductId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', lineHeight: 1, padding: 4 }}
              >✕</button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65, marginBottom: 20 }}>
              {dashProduct.description}
            </p>

            {/* Key metrics */}
            {(dashProduct.interestRate !== undefined || dashProduct.creditLimit !== undefined) && (
              <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                {dashProduct.interestRate !== undefined && (
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 10, padding: '12px 16px' }}>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Interest Rate</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-action)' }}>{dashProduct.interestRate}%</p>
                  </div>
                )}
                {dashProduct.creditLimit !== undefined && (
                  <div style={{ background: 'var(--color-background-secondary)', borderRadius: 10, padding: '12px 16px' }}>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Max Limit</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-action)' }}>€{dashProduct.creditLimit.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {/* Attributes */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', marginBottom: 10 }}>Attributes</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {dashProduct.attributes.map(attr => (
                  <div key={attr.label} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 3 }}>{attr.label}</p>
                    <p style={{ fontSize: 12, fontWeight: 500 }}>{attr.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Eligibility + Suitability */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Eligibility', value: dashProduct.eligibility },
                { label: 'Suitability', value: dashProduct.suitability },
                { label: 'Trigger Signals', value: dashProduct.triggerSignals },
              ].map(item => item.value ? (
                <div key={item.label}>
                  <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.55 }}>{item.value}</p>
                </div>
              ) : null)}
            </div>

            {/* Eligibility bar */}
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Customer Eligibility ({customers.length} customers)</p>
              <EligibilityBar product={dashProduct} customers={customers} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
