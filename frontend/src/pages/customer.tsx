import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import Sidebar from '../components/Sidebar';
import type { NavItem } from '../components/Sidebar';
import { useTranslation } from '../lib/i18n';
import { getMockCustomer } from '../lib/mockData';
import { CATALOG_PRODUCTS, CATEGORY_COLORS } from '../lib/products';
import type { CatalogProduct } from '../lib/products';
import { getNotifications, markAllRead, getUnreadCount, type AppNotification } from '../lib/notificationStore';
import { getConsent, setConsent } from '../lib/consentStore';

// ─── Types ─────────────────────────────────────────────────────────────────────
type PortalTab = 'home' | 'inbox';

interface Profile {
  customer_id: string; name: string; segment: string; financial_health: string;
  risk_profile: string; income: number; savings: number;
  profiling_consent: boolean; existing_products: string[];
}
interface SpendItem { category: string; amount: number; }
interface Offer {
  offer_id: string; product_id: string; product_name: string; product_type: string;
  relevance_score: number; confidence_score: number; personalization_reason: string;
  rank: number; channel: string; cta_url: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
  return { Authorization: `Bearer ${token}` };
}

function isEligible(customer: NonNullable<ReturnType<typeof getMockCustomer>>, product: CatalogProduct): boolean {
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

function getMatchingProducts(customer: NonNullable<ReturnType<typeof getMockCustomer>>, max = 5): CatalogProduct[] {
  const existingNames = customer.existing_products.map(ep => ep.replace(/_/g, ' '));
  return CATALOG_PRODUCTS
    .filter(p => p.status === 'active')
    .filter(p => isEligible(customer, p))
    .filter(p => !existingNames.some(ep => p.name.toLowerCase().includes(ep)))
    .slice(0, max);
}

// ─── Constants ─────────────────────────────────────────────────────────────────
export async function getServerSideProps() { return { props: {} }; }

const PIE_COLORS = ['#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA', '#FB923C'];

const PLACEHOLDER_SPENDING: SpendItem[] = [
  { category: 'Food & Dining', amount: 640 },
  { category: 'Transport', amount: 280 },
  { category: 'Shopping', amount: 520 },
  { category: 'Utilities', amount: 190 },
  { category: 'Travel', amount: 340 },
  { category: 'Entertainment', amount: 145 },
];

const PLACEHOLDER_TRANSACTIONS = [
  { date: '2026-03-28', description: 'Lidl Supermarket', category: 'Food & Dining', amount: -42.30 },
  { date: '2026-03-27', description: 'Salary — March 2026', category: 'Income', amount: 3800.00 },
  { date: '2026-03-26', description: 'Uber Ride', category: 'Transport', amount: -14.50 },
  { date: '2026-03-25', description: 'Netflix Subscription', category: 'Entertainment', amount: -15.99 },
  { date: '2026-03-24', description: 'Zara Online', category: 'Shopping', amount: -89.00 },
  { date: '2026-03-22', description: 'Electricity Bill', category: 'Utilities', amount: -76.20 },
  { date: '2026-03-21', description: 'Booking.com — Rome Hotel', category: 'Travel', amount: -230.00 },
  { date: '2026-03-20', description: 'Starbucks Coffee', category: 'Food & Dining', amount: -8.40 },
  { date: '2026-03-19', description: 'ATM Withdrawal', category: 'Other', amount: -200.00 },
  { date: '2026-03-18', description: 'Amazon Purchase', category: 'Shopping', amount: -63.45 },
  { date: '2026-03-15', description: 'Interest Payment — Savings', category: 'Income', amount: 12.80 },
  { date: '2026-03-14', description: 'Freelance Invoice #47', category: 'Income', amount: 450.00 },
];

const PRODUCT_DISPLAY: Record<string, { name: string; metric: string; value: string }> = {
  credit_card:       { name: 'Rewards Credit Card',    metric: 'Credit limit',    value: '€5,000'   },
  savings_deposit:   { name: 'High-Yield Savings',     metric: 'Balance',         value: '€12,400'  },
  mortgage:          { name: 'Home Mortgage',           metric: 'Monthly payment', value: '€780'     },
  personal_loan:     { name: 'Personal Loan',           metric: 'Outstanding',     value: '€8,200'   },
  life_insurance:    { name: 'Life Insurance',          metric: 'Monthly premium', value: '€45'      },
  travel_insurance:  { name: 'Travel Insurance',        metric: 'Valid until',     value: 'Dec 2026' },
  etf_starter:       { name: 'ETF Starter Portfolio',   metric: 'Portfolio value', value: '€3,200'   },
  etf_growth:        { name: 'ETF Growth Portfolio',    metric: 'Portfolio value', value: '€8,700'   },
  mutual_funds:      { name: 'Mutual Funds',            metric: 'Fund value',      value: '€7,800'   },
  managed_portfolio: { name: 'Managed Portfolio',       metric: 'Portfolio value', value: '€24,500'  },
  state_bonds:       { name: 'State Bonds',             metric: 'Bond value',      value: '€5,000'   },
  private_pension:   { name: 'Private Pension',         metric: 'Accumulated',     value: '€15,200'  },
  overdraft:         { name: 'Overdraft Facility',      metric: 'Available',       value: '€2,000'   },
};

const PLACEHOLDER_ACTIVE = [
  { id: 'savings_deposit', ...PRODUCT_DISPLAY.savings_deposit },
  { id: 'credit_card', ...PRODUCT_DISPLAY.credit_card },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled = false }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch" aria-checked={on}
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 12, flexShrink: 0,
        background: on ? '#185FA5' : 'var(--color-border-tertiary)',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s', opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20,
        borderRadius: '50%', background: 'white', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.20)', display: 'block',
      }} />
    </button>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 19, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 16, lineHeight: 1.2 }}>
      {children}
    </h2>
  );
}

function ActiveBadge() {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, letterSpacing: '0.03em',
      background: 'var(--color-badge-good-bg)', color: 'var(--color-badge-good-text)',
    }}>Active</span>
  );
}

interface PieTooltipProps { active?: boolean; payload?: Array<{ name: string; value: number }>; total?: number; }
function PieTooltip({ active, payload, total = 1 }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct = ((item.value / total) * 100).toFixed(1);
  return (
    <div style={{
      background: 'var(--color-background-primary)', border: '1px solid var(--color-border-tertiary)',
      borderRadius: 8, padding: '9px 13px', fontSize: 12, lineHeight: 1.6, boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 2 }}>{item.name}</p>
      <p style={{ color: 'var(--color-text-secondary)' }}>€{item.value.toLocaleString()} · {pct}%</p>
    </div>
  );
}

function CustomLegend({ data }: { data: SpendItem[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', justifyContent: 'center', marginTop: 12 }}>
      {data.map((item, i) => (
        <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.category}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {((item.amount / total) * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// Nav icons
function IcoHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IcoInbox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const queryClient = useQueryClient();

  // Navigation
  const [activeTab, setActiveTab] = useState<PortalTab>('home');

  // Consent state (persisted via consentStore — gdpr/sms/email/inapp map to store fields gdpr/marketing/analytics/profiling)
  const [gdprConsent, setGdprConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [emailConsent, setEmailConsent] = useState(true);
  const [inAppConsent, setInAppConsent] = useState(true);

  // Mock transactions
  const [mockTransactions, setMockTransactions] = useState<Array<{
    date: string; amount: number; category: string; channel: string;
  }>>([]);

  // Guidelines drawer
  const [guidelinesProduct, setGuidelinesProduct] = useState<CatalogProduct | null>(null);

  // Inbox
  const [inbox, setInbox] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!localStorage.getItem('auth_token') || role !== 'customer') {
      window.location.href = '/login'; return;
    }
    const uid = localStorage.getItem('user_id') || '';
    // Normalize "CUST-001" → "1" so it matches mock data IDs ("1"–"50")
    const normalizedId = uid.replace(/^CUST-0*/i, '') || uid;
    setCustomerId(normalizedId);
    setDisplayName(localStorage.getItem('display_name') || uid);
  }, []);

  // Load transactions
  useEffect(() => {
    if (!customerId) return;
    fetch('/mock/transactions.csv')
      .then(r => r.text())
      .then(text => {
        const lines = text.trim().split('\n').slice(1);
        const txns = lines
          .map(line => {
            const parts = line.split(',');
            return { customer_id: parts[0], date: parts[1]?.slice(0, 10) ?? '', amount: parseFloat(parts[2] ?? '0'), category: parts[3] ?? 'other', channel: parts[4] ?? '' };
          })
          .filter(tx => tx.customer_id === customerId)
          .sort((a, b) => b.date.localeCompare(a.date));
        setMockTransactions(txns);
      })
      .catch(() => {});
  }, [customerId]);

  // Load & poll inbox
  useEffect(() => {
    if (!customerId) return;
    const refresh = () => {
      setInbox(getNotifications(customerId));
      setUnreadCount(getUnreadCount(customerId));
    };
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [customerId]);

  // Mark all read when inbox tab opened
  useEffect(() => {
    if (activeTab === 'inbox' && customerId) {
      setTimeout(() => {
        markAllRead(customerId);
        setUnreadCount(0);
        setInbox(getNotifications(customerId));
      }, 500);
    }
  }, [activeTab, customerId]);

  // ── API queries ──────────────────────────────────────────────────────────────
  const { data: profile } = useQuery<Profile>({
    queryKey: ['my-profile', customerId],
    queryFn: () => fetch(`/api/customers/${customerId}/profile`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!customerId, staleTime: 5 * 60 * 1000,
  });

  // Load consent from store when customerId is resolved
  useEffect(() => {
    if (!customerId) return;
    const c = getConsent(customerId);
    setGdprConsent(c.gdpr);
    setSmsConsent(c.marketing);
    setEmailConsent(c.analytics);
    setInAppConsent(c.profiling);
  }, [customerId]);

  const { data: spendingData } = useQuery<{ spending: SpendItem[] }>({
    queryKey: ['spending', customerId],
    queryFn: () => fetch(`/api/customers/${customerId}/spending`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!customerId, staleTime: 5 * 60 * 1000,
  });

  const consentMutation = useMutation({
    mutationFn: (value: boolean) =>
      fetch(`/api/customers/${customerId}/consent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ profiling_consent: value }),
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile', customerId] }),
  });

  function handleGdpr(v: boolean) { setGdprConsent(v); setConsent(customerId, { gdpr: v }); consentMutation.mutate(v); }
  function handleSms(v: boolean) { setSmsConsent(v); setConsent(customerId, { marketing: v }); }
  function handleEmail(v: boolean) { setEmailConsent(v); setConsent(customerId, { analytics: v }); }
  function handleInApp(v: boolean) { setInAppConsent(v); setConsent(customerId, { profiling: v }); }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const mockCustomer = customerId ? getMockCustomer(customerId) : undefined;

  const mockSpending: SpendItem[] = useMemo(() => {
    const agg: Record<string, number> = {};
    mockTransactions.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category.charAt(0).toUpperCase() + t.category.slice(1);
      agg[cat] = (agg[cat] || 0) + Math.abs(t.amount);
    });
    return Object.entries(agg).map(([category, amount]) => ({ category, amount: Math.round(amount) })).sort((a, b) => b.amount - a.amount);
  }, [mockTransactions]);

  const spendingForChart = spendingData?.spending?.length ? spendingData.spending : (mockSpending.length ? mockSpending : PLACEHOLDER_SPENDING);

  // Mock-based product suggestions (max 5)
  const suggestedProducts: CatalogProduct[] = useMemo(() => {
    if (!mockCustomer) return CATALOG_PRODUCTS.filter(p => p.status === 'active').slice(0, 5);
    return getMatchingProducts(mockCustomer, 5);
  }, [mockCustomer]);

  const existingIds = profile?.existing_products ?? mockCustomer?.existing_products ?? [];
  const activeProducts = existingIds.length
    ? existingIds.map(id => ({ id, ...(PRODUCT_DISPLAY[id] ?? { name: id.replace(/_/g, ' '), metric: 'Status', value: '—' }) }))
    : PLACEHOLDER_ACTIVE;

  const TX_LABEL: Record<string, string> = {
    salary: 'Salary Credit', rent: 'Rent Payment', food: 'Food & Dining',
    shopping: 'Shopping', travel: 'Travel', subscriptions: 'Subscription',
    utilities: 'Utilities', other: 'Other',
  };
  const displayTransactions = mockTransactions.length ? mockTransactions : PLACEHOLDER_TRANSACTIONS;

  function signOut() { localStorage.clear(); window.location.href = '/login'; }

  // ── Styles ───────────────────────────────────────────────────────────────────
  const section: React.CSSProperties = {
    background: 'var(--color-background-primary)',
    border: '1px solid var(--color-border-tertiary)',
    borderRadius: 14, padding: '24px 28px',
  };

  // NAV items with unread badge on inbox label
  const NAV_ITEMS: NavItem[] = [
    { id: 'home',  label: 'Dashboard', icon: <IcoHome /> },
    { id: 'inbox', label: unreadCount > 0 ? `Inbox (${unreadCount})` : 'Inbox', icon: <IcoInbox /> },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'row', minHeight: '100vh',
      fontFamily: 'var(--font-sans)', fontSize: 14,
      background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
    }}>

      {/* Sidebar */}
      <Sidebar
        items={NAV_ITEMS}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as PortalTab)}
        displayName={displayName}
        portalLabel={t('nav.myPortal')}
        onSignOut={signOut}
        signOutLabel={t('nav.signOut')}
      />

      {/* Right side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Slim top bar */}
        <div style={{
          height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--color-header-bg)', padding: '0 24px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
            <span style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{t('nav.bankOffer')}</span>
            <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, marginLeft: 2 }}>{t('nav.myPortal')}</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.90)', fontSize: 12, fontWeight: 500 }}>{displayName}</span>
        </div>

        {/* Scrollable body */}
        <main style={{
          flex: 1, overflowY: 'auto', padding: '28px 24px',
          display: 'flex', flexDirection: 'column', gap: 24,
          maxWidth: 920, width: '100%', margin: '0 auto', boxSizing: 'border-box',
        }}>

          {/* ══ HOME TAB ══════════════════════════════════════════════════ */}
          {activeTab === 'home' && (
            <>

              {/* SECTION 1 — Suggested products */}
              <section style={section}>
                <SectionHeading>Suggested for you</SectionHeading>

                {suggestedProducts.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No matching products at this time.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                    {suggestedProducts.map((product, idx) => {
                      const catColor = CATEGORY_COLORS[product.category];
                      return (
                        <div key={product.id} style={{
                          border: idx === 0 ? '2px solid var(--color-action)' : '1px solid var(--color-border-tertiary)',
                          borderRadius: 10, padding: '18px 20px',
                          display: 'flex', flexDirection: 'column', gap: 10,
                        }}>
                          {idx === 0 && (
                            <span style={{
                              alignSelf: 'flex-start', fontSize: 10, fontWeight: 700,
                              letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4,
                              background: 'var(--color-background-light-info)', color: 'var(--color-action)',
                            }}>TOP PICK</span>
                          )}
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: catColor.bg, color: catColor.text, alignSelf: 'flex-start' }}>
                            {product.category.toUpperCase()}
                          </span>
                          <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{product.name}</p>
                          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55, flex: 1 }}>
                            {product.description}
                          </p>
                          {product.interestRate !== undefined && (
                            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                              Rate: <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{product.interestRate}%</span>
                            </p>
                          )}
                          <button
                            onClick={() => setGuidelinesProduct(product)}
                            style={{
                              alignSelf: 'flex-start', marginTop: 4,
                              padding: '7px 16px', borderRadius: 8,
                              background: idx === 0 ? '#185FA5' : 'transparent',
                              color: idx === 0 ? 'white' : 'var(--color-action)',
                              border: idx === 0 ? 'none' : '1px solid var(--color-action)',
                              fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            }}
                          >Learn more</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* SECTION 2 — Active products */}
              <section style={section}>
                <SectionHeading>My active products</SectionHeading>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {activeProducts.map((prod, idx) => (
                    <div key={prod.id} style={{
                      display: 'flex', alignItems: 'center', padding: '14px 0', gap: 16,
                      borderTop: idx > 0 ? '1px solid var(--color-border-tertiary)' : 'none',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'var(--color-background-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, color: 'var(--color-action)',
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                          <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{prod.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {prod.metric}: <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{prod.value}</span>
                        </p>
                      </div>
                      <ActiveBadge />
                    </div>
                  ))}
                </div>
              </section>

              {/* SECTION 3 — Transactions */}
              <section style={section}>
                <SectionHeading>My transactions</SectionHeading>
                <div style={{ marginBottom: 32 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                    Spending breakdown — last 30 days
                  </p>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={spendingForChart} cx="50%" cy="50%" innerRadius={72} outerRadius={108} paddingAngle={3} dataKey="amount" nameKey="category" strokeWidth={0}>
                        {spendingForChart.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip total={spendingForChart.reduce((s, d) => s + d.amount, 0)} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <CustomLegend data={spendingForChart} />
                </div>

                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                    All transactions
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 140px 90px', padding: '6px 0 8px', borderBottom: '1px solid var(--color-border-tertiary)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', gap: 12 }}>
                    <span>Date</span><span>Description</span><span>Category</span><span style={{ textAlign: 'right' }}>Amount</span>
                  </div>
                  {displayTransactions.map((tx, i) => {
                    const isMock = 'channel' in tx;
                    const description = isMock
                      ? (TX_LABEL[(tx as { category: string }).category] ?? (tx as { category: string }).category)
                      : (tx as { description: string }).description;
                    const category = isMock
                      ? ((tx as { category: string }).category.charAt(0).toUpperCase() + (tx as { category: string }).category.slice(1))
                      : (tx as { category: string }).category;
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 140px 90px', padding: '11px 0', borderBottom: '1px solid var(--color-border-tertiary)', gap: 12, alignItems: 'center', fontSize: 13 }}>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                          {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                        <span style={{ color: 'var(--color-text-primary)', fontWeight: tx.amount > 0 ? 500 : 400 }}>{description}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', justifySelf: 'start' }}>
                          {category}
                        </span>
                        <span style={{ textAlign: 'right', fontWeight: 500, color: tx.amount > 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                          {tx.amount > 0 ? '+' : ''}€{Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* SECTION 4 — Consent */}
              <section style={section}>
                <SectionHeading>Privacy &amp; communication preferences</SectionHeading>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                  Control how the bank uses your data and reaches you. Changes take effect immediately.
                </p>
                {[
                  { key: 'gdpr', label: 'Data processing consent', description: 'I consent to the bank processing my personal and financial data to generate personalised product recommendations, as described in the Privacy Policy.', on: gdprConsent, onChange: handleGdpr, warning: !gdprConsent ? 'Turning this off will disable personalised recommendations.' : null },
                  { key: 'sms', label: 'SMS notifications', description: 'Allow the bank to contact me with offers and account updates via text message.', on: smsConsent, onChange: handleSms, warning: null },
                  { key: 'email', label: 'Email notifications', description: 'Allow the bank to send me personalised offers and important account information by email.', on: emailConsent, onChange: handleEmail, warning: null },
                  { key: 'inapp', label: 'In-app notifications', description: 'Show me personalised offers and alerts directly inside this app.', on: inAppConsent, onChange: handleInApp, warning: null },
                ].map((item, idx) => (
                  <div key={item.key}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 0', borderTop: idx > 0 ? '1px solid var(--color-border-tertiary)' : 'none' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{item.label}</p>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 580 }}>{item.description}</p>
                      </div>
                      <div style={{ paddingTop: 2, flexShrink: 0 }}>
                        <Toggle on={item.on} onChange={item.onChange} />
                      </div>
                    </div>
                    {item.warning && (
                      <div style={{ marginTop: -8, marginBottom: 8, padding: '8px 12px', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-warning-text)', lineHeight: 1.5 }}>
                        ⚠ {item.warning}
                      </div>
                    )}
                  </div>
                ))}
              </section>

            </>
          )}

          {/* ══ INBOX TAB ═════════════════════════════════════════════════ */}
          {activeTab === 'inbox' && (
            <section style={section}>
              <SectionHeading>Inbox</SectionHeading>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                Messages and product offers sent by your relationship manager.
              </p>

              {inbox.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>No messages yet</p>
                  <p style={{ fontSize: 13, marginTop: 6 }}>Your relationship manager will send you personalised offers here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {inbox.map(n => {
                    const product = CATALOG_PRODUCTS.find(p => p.id === n.productId);
                    const catColor = product ? CATEGORY_COLORS[product.category] : null;
                    return (
                      <div key={n.id} style={{
                        border: n.read ? '1px solid var(--color-border-tertiary)' : '1.5px solid var(--color-action)',
                        borderRadius: 12, padding: '18px 22px',
                        background: n.read ? 'var(--color-background-primary)' : 'var(--color-background-light-info, var(--color-background-secondary))',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              {!n.read && (
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-action)', display: 'inline-block', flexShrink: 0 }} />
                              )}
                              <p style={{ fontSize: 15, fontWeight: 600 }}>{n.productName}</p>
                              {catColor && (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: catColor.bg, color: catColor.text }}>
                                  {product?.category.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{n.message}</p>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                            {new Date(n.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {product && (
                            <button
                              onClick={() => setGuidelinesProduct(product)}
                              style={{
                                fontSize: 12, fontWeight: 500, padding: '6px 16px', borderRadius: 8,
                                background: '#185FA5', color: 'white', border: 'none', cursor: 'pointer',
                              }}
                            >View offer details</button>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            Sent by {n.sentBy}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

        </main>
      </div>

      {/* ═══ Guidelines drawer (right slide-in) ═══ */}
      {guidelinesProduct && (
        <>
          <div
            onClick={() => setGuidelinesProduct(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.30)', zIndex: 1000 }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, width: 480, height: '100vh',
            background: 'var(--color-background-primary)',
            borderLeft: '1px solid var(--color-border-tertiary)',
            zIndex: 1001, overflowY: 'auto',
            boxShadow: '-6px 0 32px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Drawer header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              padding: '20px 24px', borderBottom: '0.5px solid var(--color-border-tertiary)',
              flexShrink: 0, position: 'sticky', top: 0, background: 'var(--color-background-primary)', zIndex: 2,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 8,
                    background: CATEGORY_COLORS[guidelinesProduct.category].bg,
                    color: CATEGORY_COLORS[guidelinesProduct.category].text,
                  }}>{guidelinesProduct.category.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{guidelinesProduct.name}</p>
              </div>
              <button
                onClick={() => setGuidelinesProduct(null)}
                style={{ width: 30, height: 30, borderRadius: 6, border: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--color-text-secondary)', flexShrink: 0 }}
              >✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Description */}
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                {guidelinesProduct.description}
              </p>

              {/* Key metrics */}
              {(guidelinesProduct.interestRate !== undefined || guidelinesProduct.creditLimit !== undefined) && (
                <div style={{ display: 'flex', gap: 14 }}>
                  {guidelinesProduct.interestRate !== undefined && (
                    <div style={{ flex: 1, background: 'var(--color-background-secondary)', borderRadius: 10, padding: '14px 18px' }}>
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Interest Rate</p>
                      <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-action)' }}>{guidelinesProduct.interestRate}%</p>
                    </div>
                  )}
                  {guidelinesProduct.creditLimit !== undefined && (
                    <div style={{ flex: 1, background: 'var(--color-background-secondary)', borderRadius: 10, padding: '14px 18px' }}>
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Max Limit</p>
                      <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-action)' }}>€{guidelinesProduct.creditLimit.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Product attributes */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', marginBottom: 10 }}>Product details</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {guidelinesProduct.attributes.map((attr, idx) => (
                    <div key={attr.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx < guidelinesProduct.attributes.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{attr.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What happens next */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-secondary)', marginBottom: 12 }}>Next steps</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { step: '1', text: 'Click "I\'m interested" to flag this offer to your relationship manager.' },
                    { step: '2', text: 'Your RM will review your profile and contact you within 1–2 business days.' },
                    { step: '3', text: 'You\'ll receive a personalised quote and full terms before any commitment.' },
                  ].map(({ step, text }) => (
                    <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-action)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{step}</div>
                      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6, padding: '12px', background: 'var(--color-background-secondary)', borderRadius: 8 }}>
                ⓘ This product was recommended based on your financial profile by an AI system. Final eligibility and terms are subject to credit review and bank approval.
              </p>

            </div>

            {/* Sticky footer with CTA */}
            <div style={{ padding: '16px 24px', borderTop: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 }}>
              <button
                onClick={() => setGuidelinesProduct(null)}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  background: '#185FA5', color: 'white',
                  border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >I&apos;m interested — contact my RM</button>
              <button
                onClick={() => setGuidelinesProduct(null)}
                style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'transparent', color: 'var(--color-text-secondary)', border: 'none', fontSize: 13, cursor: 'pointer', marginTop: 8 }}
              >Close</button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
