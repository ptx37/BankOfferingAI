import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import TopBarControls from '../components/TopBarControls';
import { useTranslation } from '../lib/i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  customer_id: string; name: string; segment: string; financial_health: string;
  risk_profile: string; income: number; savings: number;
  profiling_consent: boolean; existing_products: string[];
}
interface SpendItem { category: string; amount: number; isOther?: boolean; }
interface Offer {
  offer_id: string; product_id: string; product_name: string; product_type: string;
  relevance_score: number; confidence_score: number; personalization_reason: string;
  rank: number; channel: string; cta_url: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
  return { Authorization: `Bearer ${token}` };
}

export async function getServerSideProps() { return { props: {} }; }

const PIE_COLORS = ['#60A5FA', '#34D399', '#F472B6', '#FBBF24', '#A78BFA', '#FB923C'];

const PLACEHOLDER_SPENDING: SpendItem[] = [
  { category: 'Food & Dining',  amount: 640 },
  { category: 'Transport',      amount: 280 },
  { category: 'Shopping',       amount: 520 },
  { category: 'Utilities',      amount: 190 },
  { category: 'Travel',         amount: 340 },
  { category: 'Entertainment',  amount: 145 },
];

const PLACEHOLDER_TRANSACTIONS = [
  { date: '2026-03-28', description: 'Lidl Supermarket',          category: 'Food & Dining',  amount: -42.30 },
  { date: '2026-03-27', description: 'Salary — March 2026',       category: 'Income',         amount: 3800.00 },
  { date: '2026-03-26', description: 'Uber Ride',                 category: 'Transport',      amount: -14.50 },
  { date: '2026-03-25', description: 'Netflix Subscription',      category: 'Entertainment',  amount: -15.99 },
  { date: '2026-03-24', description: 'Zara Online',               category: 'Shopping',       amount: -89.00 },
  { date: '2026-03-22', description: 'Electricity Bill',          category: 'Utilities',      amount: -76.20 },
  { date: '2026-03-21', description: 'Booking.com — Rome Hotel',  category: 'Travel',         amount: -230.00 },
  { date: '2026-03-20', description: 'Starbucks Coffee',          category: 'Food & Dining',  amount: -8.40 },
  { date: '2026-03-19', description: 'ATM Withdrawal',            category: 'Other',          amount: -200.00 },
  { date: '2026-03-18', description: 'Amazon Purchase',           category: 'Shopping',       amount: -63.45 },
  { date: '2026-03-15', description: 'Interest Payment — Savings',category: 'Income',         amount: 12.80 },
  { date: '2026-03-14', description: 'Freelance Invoice #47',     category: 'Income',         amount: 450.00 },
];

const PLACEHOLDER_SUGGESTIONS = [
  {
    id: 'travel_rewards',
    name: 'Travel Rewards Card',
    description: 'Earn 2× points on every purchase abroad. No foreign transaction fees.',
    cta: 'Get offer',
    badge: 'Popular',
  },
  {
    id: 'home_loan',
    name: 'Home Loan',
    description: 'Fixed-rate mortgage from 3.9% p.a. with flexible repayment terms.',
    cta: 'Learn more',
    badge: 'Low rate',
  },
  {
    id: 'premium_savings',
    name: 'Premium Savings Account',
    description: 'Lock in 5.2% p.a. on deposits of €5,000+ with no fees.',
    cta: 'Open account',
    badge: '5.2% p.a.',
  },
];

// Maps API product IDs → human-readable display info
const PRODUCT_DISPLAY: Record<string, { name: string; metric: string; value: string }> = {
  credit_card:       { name: 'Rewards Credit Card',    metric: 'Credit limit',     value: '€5,000'   },
  savings_deposit:   { name: 'High-Yield Savings',     metric: 'Balance',          value: '€12,400'  },
  mortgage:          { name: 'Home Mortgage',           metric: 'Monthly payment',  value: '€780'     },
  personal_loan:     { name: 'Personal Loan',           metric: 'Outstanding',      value: '€8,200'   },
  life_insurance:    { name: 'Life Insurance',          metric: 'Monthly premium',  value: '€45'      },
  travel_insurance:  { name: 'Travel Insurance',        metric: 'Valid until',      value: 'Dec 2026' },
  etf_starter:       { name: 'ETF Starter Portfolio',   metric: 'Portfolio value',  value: '€3,200'   },
  etf_growth:        { name: 'ETF Growth Portfolio',    metric: 'Portfolio value',  value: '€8,700'   },
  mutual_funds:      { name: 'Mutual Funds',            metric: 'Fund value',       value: '€7,800'   },
  managed_portfolio: { name: 'Managed Portfolio',       metric: 'Portfolio value',  value: '€24,500'  },
  state_bonds:       { name: 'State Bonds',             metric: 'Bond value',       value: '€5,000'   },
  private_pension:   { name: 'Private Pension',         metric: 'Accumulated',      value: '€15,200'  },
  overdraft:         { name: 'Overdraft Facility',      metric: 'Available',        value: '€2,000'   },
};

const PLACEHOLDER_ACTIVE = [
  { id: 'savings_deposit', ...PRODUCT_DISPLAY.savings_deposit },
  { id: 'credit_card',     ...PRODUCT_DISPLAY.credit_card },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled = false }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 12, flexShrink: 0,
        background: on ? '#185FA5' : 'var(--color-border-tertiary)',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: on ? 22 : 2, width: 20, height: 20,
        borderRadius: '50%', background: 'white',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
        display: 'block',
      }} />
    </button>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 19, fontWeight: 500,
      color: 'var(--color-text-primary)',
      marginBottom: 16, lineHeight: 1.2,
    }}>
      {children}
    </h2>
  );
}

function ActiveBadge() {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 9px',
      borderRadius: 20, letterSpacing: '0.03em',
      background: 'var(--color-badge-good-bg)',
      color: 'var(--color-badge-good-text)',
    }}>
      Active
    </span>
  );
}

interface PieTooltipProps { active?: boolean; payload?: Array<{ name: string; value: number }>; }
function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const total = PLACEHOLDER_SPENDING.reduce((s, d) => s + d.amount, 0);
  const pct = ((item.value / total) * 100).toFixed(1);
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '1px solid var(--color-border-tertiary)',
      borderRadius: 8, padding: '9px 13px',
      fontSize: 12, lineHeight: 1.6,
      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 2 }}>{item.name}</p>
      <p style={{ color: 'var(--color-text-secondary)' }}>€{item.value.toLocaleString()} &nbsp;·&nbsp; {pct}%</p>
    </div>
  );
}

function CustomLegend({ data }: { data: SpendItem[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '10px 20px',
      justifyContent: 'center', marginTop: 12,
    }}>
      {data.map((item, i) => (
        <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {item.category}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {((item.amount / total) * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerPortal() {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const queryClient = useQueryClient();

  // Consent state
  const [gdprConsent, setGdprConsent] = useState(false);
  const [smsConsent,    setSmsConsent]    = useState(false);
  const [emailConsent,  setEmailConsent]  = useState(true);
  const [inAppConsent,  setInAppConsent]  = useState(true);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!localStorage.getItem('auth_token') || role !== 'customer') {
      window.location.href = '/login'; return;
    }
    const uid = localStorage.getItem('user_id') || '';
    setCustomerId(uid);
    setDisplayName(localStorage.getItem('display_name') || uid);
  }, []);

  // ── API queries ────────────────────────────────────────────────────────────
  const { data: profile } = useQuery<Profile>({
    queryKey: ['my-profile', customerId],
    queryFn: () => fetch(`/api/customers/${customerId}/profile`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!customerId, staleTime: 5 * 60 * 1000,
  });

  // Sync GDPR consent with profile once loaded
  useEffect(() => {
    if (profile) setGdprConsent(profile.profiling_consent ?? false);
  }, [profile]);

  const { data: spendingData } = useQuery<{ spending: SpendItem[] }>({
    queryKey: ['spending', customerId],
    queryFn: () => fetch(`/api/customers/${customerId}/spending`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!customerId, staleTime: 5 * 60 * 1000,
  });

  const { data: offersData, isLoading: offersLoading } = useQuery<{ offers: Offer[] }>({
    queryKey: ['offers', customerId],
    queryFn: () => fetch(`/api/offers/${customerId}`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!customerId, staleTime: 2 * 60 * 1000,
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

  function handleGdpr(v: boolean) {
    console.log('[consent] GDPR profiling consent →', v);
    setGdprConsent(v);
    consentMutation.mutate(v);
  }
  function handleSms(v: boolean)   { console.log('[consent] SMS →', v);    setSmsConsent(v); }
  function handleEmail(v: boolean) { console.log('[consent] Email →', v);  setEmailConsent(v); }
  function handleInApp(v: boolean) { console.log('[consent] In-app →', v); setInAppConsent(v); }

  // ── Derived data ───────────────────────────────────────────────────────────
  const spendingForChart = spendingData?.spending?.length
    ? spendingData.spending
    : PLACEHOLDER_SPENDING;

  const apiOffers = offersData?.offers ?? [];
  const suggestedProducts = apiOffers.length >= 3 ? apiOffers.slice(0, 3) : null;

  const existingIds = profile?.existing_products ?? [];
  const activeProducts = existingIds.length
    ? existingIds.map(id => ({ id, ...(PRODUCT_DISPLAY[id] ?? { name: id.replace(/_/g, ' '), metric: 'Status', value: '—' }) }))
    : PLACEHOLDER_ACTIVE;

  function signOut() { localStorage.clear(); window.location.href = '/login'; }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const section: React.CSSProperties = {
    background: 'var(--color-background-primary)',
    border: '1px solid var(--color-border-tertiary)',
    borderRadius: 14, padding: '24px 28px',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      fontFamily: 'var(--font-sans)', fontSize: 14,
      background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        background: 'var(--color-header-bg)', height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          </svg>
          <span style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{t('nav.bankOffer')}</span>
          <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, marginLeft: 2 }}>{t('nav.myPortal')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'rgba(255,255,255,0.90)', fontSize: 12, fontWeight: 500 }}>{displayName}</span>
          <TopBarControls onSignOut={signOut} signOutLabel={t('nav.signOut')} />
        </div>
      </header>

      {/* ── Scrollable body ────────────────────────────────────────────────── */}
      <main style={{
        flex: 1, overflowY: 'auto',
        padding: '28px 24px',
        display: 'flex', flexDirection: 'column', gap: 24,
        maxWidth: 920, width: '100%', margin: '0 auto', boxSizing: 'border-box',
      }}>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — SUGGESTED PRODUCTS
        ══════════════════════════════════════════════════════════════════ */}
        <section style={section}>
          <SectionHeading>
            {offersLoading ? 'Loading suggestions…' : 'Suggested for you'}
          </SectionHeading>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
          }}>
            {/* API-driven offers if available, otherwise static placeholders */}
            {suggestedProducts
              ? suggestedProducts.map(offer => (
                <div key={offer.offer_id} style={{
                  border: offer.rank === 1
                    ? '2px solid var(--color-accent)'
                    : '1px solid var(--color-border-tertiary)',
                  borderRadius: 10, padding: '18px 20px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  {offer.rank === 1 && (
                    <span style={{
                      alignSelf: 'flex-start', fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4,
                      background: 'var(--color-background-light-info)',
                      color: 'var(--color-action)',
                    }}>
                      TOP PICK
                    </span>
                  )}
                  <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{offer.product_name}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55, flex: 1 }}>
                    {offer.personalization_reason}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    ⓘ Această explicație a fost generată automat de un sistem AI
                  </p>
                  <button style={{
                    alignSelf: 'flex-start', marginTop: 4,
                    padding: '7px 16px', borderRadius: 8,
                    background: offer.rank === 1 ? '#185FA5' : 'transparent',
                    color: offer.rank === 1 ? 'white' : 'var(--color-action)',
                    border: offer.rank === 1 ? 'none' : '1px solid var(--color-action)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}>
                    Get offer
                  </button>
                </div>
              ))
              : PLACEHOLDER_SUGGESTIONS.map(p => (
                <div key={p.id} style={{
                  border: '1px solid var(--color-border-tertiary)',
                  borderRadius: 10, padding: '18px 20px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <span style={{
                    alignSelf: 'flex-start', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4,
                    background: 'var(--color-background-light-info)',
                    color: 'var(--color-action)',
                  }}>
                    {p.badge}
                  </span>
                  <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3 }}>{p.name}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55, flex: 1 }}>
                    {p.description}
                  </p>
                  <button style={{
                    alignSelf: 'flex-start', marginTop: 4,
                    padding: '7px 16px', borderRadius: 8,
                    background: 'transparent', color: 'var(--color-action)',
                    border: '1px solid var(--color-action)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}>
                    {p.cta}
                  </button>
                </div>
              ))
            }
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — ACTIVE PRODUCTS
        ══════════════════════════════════════════════════════════════════ */}
        <section style={section}>
          <SectionHeading>My active products</SectionHeading>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activeProducts.map((prod, idx) => (
              <div key={prod.id} style={{
                display: 'flex', alignItems: 'center',
                padding: '14px 0', gap: 16,
                borderTop: idx > 0 ? '1px solid var(--color-border-tertiary)' : 'none',
              }}>
                {/* Icon circle */}
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

                {/* Name */}
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

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — MY TRANSACTIONS
        ══════════════════════════════════════════════════════════════════ */}
        <section style={section}>
          <SectionHeading>My transactions</SectionHeading>

          {/* 3a — Pie chart */}
          <div style={{ marginBottom: 32 }}>
            <p style={{
              fontSize: 12, fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 16,
            }}>
              Spending breakdown — last 30 days
            </p>

            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={spendingForChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={108}
                  paddingAngle={3}
                  dataKey="amount"
                  nameKey="category"
                  strokeWidth={0}
                >
                  {spendingForChart.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <CustomLegend data={spendingForChart} />
          </div>

          {/* 3b — Transaction list */}
          <div>
            <p style={{
              fontSize: 12, fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: 12,
            }}>
              All transactions
            </p>

            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 140px 90px',
              padding: '6px 0 8px',
              borderBottom: '1px solid var(--color-border-tertiary)',
              fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
              letterSpacing: '0.04em', color: 'var(--color-text-muted)',
              gap: 12,
            }}>
              <span>Date</span>
              <span>Description</span>
              <span>Category</span>
              <span style={{ textAlign: 'right' }}>Amount</span>
            </div>

            {PLACEHOLDER_TRANSACTIONS.map((tx, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 140px 90px',
                padding: '11px 0',
                borderBottom: '1px solid var(--color-border-tertiary)',
                gap: 12, alignItems: 'center',
                fontSize: 13,
              }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: tx.amount > 0 ? 500 : 400 }}>
                  {tx.description}
                </span>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 10,
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap', justifySelf: 'start',
                }}>
                  {tx.category}
                </span>
                <span style={{
                  textAlign: 'right', fontWeight: 500,
                  color: tx.amount > 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                }}>
                  {tx.amount > 0 ? '+' : ''}€{Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4 — CONSENT & PREFERENCES
        ══════════════════════════════════════════════════════════════════ */}
        <section style={section}>
          <SectionHeading>Privacy & communication preferences</SectionHeading>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
            Control how the bank uses your data and reaches you. Changes take effect immediately.
          </p>

          {[
            {
              key: 'gdpr',
              label: 'Data processing consent',
              description: 'I consent to the bank processing my personal and financial data to generate personalised product recommendations, as described in the Privacy Policy.',
              on: gdprConsent,
              onChange: handleGdpr,
              warning: !gdprConsent
                ? 'Turning this off will disable personalised recommendations.'
                : null,
            },
            {
              key: 'sms',
              label: 'SMS notifications',
              description: 'Allow the bank to contact me with offers and account updates via text message.',
              on: smsConsent,
              onChange: handleSms,
              warning: null,
            },
            {
              key: 'email',
              label: 'Email notifications',
              description: 'Allow the bank to send me personalised offers and important account information by email.',
              on: emailConsent,
              onChange: handleEmail,
              warning: null,
            },
            {
              key: 'inapp',
              label: 'In-app notifications',
              description: 'Show me personalised offers and alerts directly inside this app.',
              on: inAppConsent,
              onChange: handleInApp,
              warning: null,
            },
          ].map((item, idx, arr) => (
            <div key={item.key}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 16,
                padding: '18px 0',
                borderTop: idx > 0 ? '1px solid var(--color-border-tertiary)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 580 }}>
                    {item.description}
                  </p>
                </div>
                <div style={{ paddingTop: 2, flexShrink: 0 }}>
                  <Toggle on={item.on} onChange={item.onChange} />
                </div>
              </div>

              {item.warning && (
                <div style={{
                  marginTop: -8, marginBottom: 8,
                  padding: '8px 12px',
                  background: 'var(--color-warning-bg)',
                  border: '1px solid var(--color-warning-border)',
                  borderRadius: 8,
                  fontSize: 12, color: 'var(--color-warning-text)', lineHeight: 1.5,
                }}>
                  ⚠ {item.warning}
                </div>
              )}
            </div>
          ))}
        </section>

      </main>
    </div>
  );
}
