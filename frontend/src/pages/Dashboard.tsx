import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  segment: 'Premium' | 'Standard' | 'Other';
  matchScore: number;
  initials: string;
}

interface SpendItem {
  category: string;
  amount: number;
  isOther?: boolean;
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

// ─── Static data ─────────────────────────────────────────────────────────────

const CUSTOMERS: Customer[] = [
  { id: 'demo-001', name: 'Maria Ionescu',   segment: 'Premium',  matchScore: 94, initials: 'MI' },
  { id: 'demo-002', name: 'Ion Popescu',     segment: 'Standard', matchScore: 78, initials: 'IP' },
  { id: 'demo-003', name: 'Ana Dumitrescu',  segment: 'Standard', matchScore: 65, initials: 'AD' },
  { id: 'demo-004', name: 'Radu Georgescu',  segment: 'Other',    matchScore: 52, initials: 'RG' },
  { id: 'demo-005', name: 'Elena Stanescu',  segment: 'Premium',  matchScore: 88, initials: 'ES' },
];

const SPENDING: Record<string, SpendItem[]> = {
  'demo-001': [
    { category: 'Groceries',  amount: 1240 },
    { category: 'Travel',     amount: 890 },
    { category: 'Dining',     amount: 560 },
    { category: 'Shopping',   amount: 430 },
    { category: 'Other',      amount: 280, isOther: true },
  ],
  'demo-002': [
    { category: 'Utilities',  amount: 980 },
    { category: 'Groceries',  amount: 740 },
    { category: 'Dining',     amount: 380 },
    { category: 'Transport',  amount: 210 },
    { category: 'Other',      amount: 160, isOther: true },
  ],
  'demo-003': [
    { category: 'Shopping',      amount: 1560 },
    { category: 'Dining',        amount: 820 },
    { category: 'Entertainment', amount: 490 },
    { category: 'Travel',        amount: 320 },
    { category: 'Other',         amount: 190, isOther: true },
  ],
  'demo-004': [
    { category: 'Rent',       amount: 2100 },
    { category: 'Groceries',  amount: 520 },
    { category: 'Transport',  amount: 310 },
    { category: 'Utilities',  amount: 240 },
    { category: 'Other',      amount: 180, isOther: true },
  ],
  'demo-005': [
    { category: 'Investments', amount: 3400 },
    { category: 'Travel',      amount: 1200 },
    { category: 'Dining',      amount: 680 },
    { category: 'Shopping',    amount: 440 },
    { category: 'Other',       amount: 260, isOther: true },
  ],
};

const MOCK_OFFERS: Record<string, Offer[]> = {
  'demo-002': [
    { offer_id: 'o1', product_id: 'savings_deposit', product_name: 'Savings Deposit',      product_type: 'savings_account', relevance_score: 0.88, confidence_score: 0.76, personalization_reason: 'Consistent savings patterns make a fixed-term deposit suitable for growing idle balances.',             rank: 1, channel: 'push',   cta_url: '/products/savings_deposit' },
    { offer_id: 'o2', product_id: 'credit_card',     product_name: 'Cashback Credit Card', product_type: 'credit_card',     relevance_score: 0.72, confidence_score: 0.65, personalization_reason: 'Frequent grocery and dining spend qualifies for up to 2% cashback rewards.',                            rank: 2, channel: 'email',  cta_url: '/products/credit_card' },
    { offer_id: 'o3', product_id: 'personal_loan',   product_name: 'Personal Loan',        product_type: 'personal_loan',   relevance_score: 0.54, confidence_score: 0.48, personalization_reason: 'Debt-to-income ratio is within acceptable range for a mid-term personal loan.',                        rank: 3, channel: 'in_app', cta_url: '/products/personal_loan' },
    { offer_id: 'o4', product_id: 'insurance',       product_name: 'Home Insurance',       product_type: 'insurance',       relevance_score: 0.45, confidence_score: 0.42, personalization_reason: 'Utility payment patterns suggest homeownership — suitable coverage options available.',                 rank: 4, channel: 'email',  cta_url: '/products/insurance' },
  ],
  'demo-003': [
    { offer_id: 'o1', product_id: 'credit_card',     product_name: 'Premium Rewards Card', product_type: 'credit_card',  relevance_score: 0.91, confidence_score: 0.82, personalization_reason: 'High shopping and dining spend strongly matches premium rewards programme eligibility criteria.',        rank: 1, channel: 'push',   cta_url: '/products/credit_card' },
    { offer_id: 'o2', product_id: 'travel_insurance',product_name: 'Travel Insurance',     product_type: 'insurance',    relevance_score: 0.75, confidence_score: 0.68, personalization_reason: 'Regular travel transactions indicate need for comprehensive travel protection coverage.',                  rank: 2, channel: 'email',  cta_url: '/products/travel_insurance' },
    { offer_id: 'o3', product_id: 'etf_starter',     product_name: 'ETF Starter Portfolio',product_type: 'investment',   relevance_score: 0.58, confidence_score: 0.51, personalization_reason: 'Income level supports initial investment allocation alongside current spending habits.',                  rank: 3, channel: 'in_app', cta_url: '/products/etf_starter' },
    { offer_id: 'o4', product_id: 'savings_deposit', product_name: 'Savings Deposit',      product_type: 'savings_account',relevance_score:0.41, confidence_score: 0.38, personalization_reason: 'Building an emergency fund would complement the current high discretionary spend level.',                rank: 4, channel: 'email',  cta_url: '/products/savings_deposit' },
  ],
  'demo-004': [
    { offer_id: 'o1', product_id: 'mortgage',        product_name: 'Home Mortgage',              product_type: 'mortgage',      relevance_score: 0.85, confidence_score: 0.79, personalization_reason: 'Current rental expense exceeds typical mortgage payment for equivalent property value in region.', rank: 1, channel: 'push',   cta_url: '/products/mortgage' },
    { offer_id: 'o2', product_id: 'personal_loan',   product_name: 'Debt Consolidation Loan',    product_type: 'personal_loan', relevance_score: 0.67, confidence_score: 0.60, personalization_reason: 'Consolidating existing credit obligations could reduce total monthly debt servicing costs.',        rank: 2, channel: 'email',  cta_url: '/products/personal_loan' },
    { offer_id: 'o3', product_id: 'savings_deposit', product_name: 'Regular Savings Plan',       product_type: 'savings_account',relevance_score:0.52, confidence_score: 0.47, personalization_reason: 'Establishing an automated savings plan supports long-term financial stability goals.',              rank: 3, channel: 'in_app', cta_url: '/products/savings_deposit' },
    { offer_id: 'o4', product_id: 'insurance',       product_name: 'Life Insurance',             product_type: 'insurance',     relevance_score: 0.44, confidence_score: 0.41, personalization_reason: 'Family context and current income level indicate a potential coverage gap to address.',             rank: 4, channel: 'email',  cta_url: '/products/insurance' },
  ],
  'demo-005': [
    { offer_id: 'o1', product_id: 'managed_portfolio',product_name: 'Managed Investment Portfolio',product_type: 'investment',relevance_score: 0.96, confidence_score: 0.89, personalization_reason: 'High income and existing investment behaviour indicate readiness for actively managed portfolio.',    rank: 1, channel: 'push',   cta_url: '/products/managed_portfolio' },
    { offer_id: 'o2', product_id: 'etf_growth',       product_name: 'ETF Growth Portfolio',        product_type: 'investment',relevance_score: 0.82, confidence_score: 0.75, personalization_reason: 'Diversified equity exposure complements current investment strategy and stated risk tolerance.',      rank: 2, channel: 'email',  cta_url: '/products/etf_growth' },
    { offer_id: 'o3', product_id: 'private_pension',  product_name: 'Private Pension Plan',        product_type: 'investment',relevance_score: 0.71, confidence_score: 0.64, personalization_reason: 'Income trajectory and age profile suggest optimal timing for increased pension contributions.',       rank: 3, channel: 'in_app', cta_url: '/products/private_pension' },
    { offer_id: 'o4', product_id: 'travel_insurance', product_name: 'Premium Travel Insurance',    product_type: 'insurance', relevance_score: 0.68, confidence_score: 0.62, personalization_reason: 'High travel spend warrants comprehensive multi-trip annual coverage for overall cost efficiency.',    rank: 4, channel: 'email',  cta_url: '/products/travel_insurance' },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_BG: Record<string, string> = {
  Premium:  '#185FA5',
  Standard: '#3B6D11',
  Other:    '#854F0B',
};

const PRODUCT_LABEL: Record<string, string> = {
  investment:      'Investment',
  savings_account: 'Savings',
  credit_card:     'Credit Card',
  mortgage:        'Mortgage',
  personal_loan:   'Personal Loan',
  insurance:       'Insurance',
  overdraft:       'Overdraft',
};

const BAR_OPACITIES = [1.0, 0.7, 0.5, 0.35, 0.25];

function getOfferBadge(offer: Offer, isTop: boolean) {
  if (isTop)                          return { label: 'TOP PICK', bg: '#E6F1FB',                     text: '#185FA5' };
  if (offer.relevance_score >= 0.7)   return { label: 'GOOD FIT', bg: 'var(--color-badge-good-bg)',    text: 'var(--color-badge-good-text)' };
  if (offer.relevance_score >= 0.4)   return { label: 'CONSIDER', bg: 'var(--color-badge-consider-bg)',text: 'var(--color-badge-consider-text)' };
  return                                     { label: 'REVIEW',   bg: 'var(--color-background-secondary)', text: 'var(--color-text-muted)' };
}

export async function getServerSideProps() {
  return { props: {} };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [authId, setAuthId]       = useState('');
  const [selectedId, setSelectedId] = useState('demo-001');

  useEffect(() => {
    if (!localStorage.getItem('auth_token')) {
      window.location.href = '/login';
      return;
    }
    const id = localStorage.getItem('customer_id') || 'demo-001';
    setAuthId(id);
  }, []);

  const { data: apiData, isLoading: apiLoading } = useQuery<{ offers: Offer[] }>({
    queryKey: ['offers', selectedId],
    queryFn: () =>
      fetch(`/api/offers/${selectedId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      }).then(r => r.json()),
    enabled: !!authId && selectedId === authId,
  });

  const customer  = CUSTOMERS.find(c => c.id === selectedId)!;
  const spending  = SPENDING[selectedId] ?? [];
  const maxSpend  = Math.max(...spending.map(s => s.amount), 1);
  const isLiveCustomer = selectedId === authId;
  const offers: Offer[] = isLiveCustomer
    ? (apiData?.offers ?? []).slice(0, 4)
    : (MOCK_OFFERS[selectedId] ?? []).slice(0, 4);

  function signOut() {
    localStorage.clear();
    window.location.href = '/login';
  }

  // ── Shared style tokens ───────────────────────────────────────────────────
  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-text-secondary)',
  };
  const panel: React.CSSProperties = {
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 12,
    padding: '12px 16px',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      background: 'var(--color-background-secondary)',
      color: 'var(--color-text-primary)',
    }}>

      {/* ── Top Navigation Bar ───────────────────────────────────────────── */}
      <header style={{
        background: '#0C447C',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          </svg>
          <span style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>Customer Offer Center</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Agent:</span>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 500 }}>{authId}</span>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 11, fontWeight: 500,
          }}>
            {authId.slice(0, 2).toUpperCase()}
          </div>
          <button
            onClick={signOut}
            style={{ color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside style={{
          width: 220,
          flexShrink: 0,
          background: 'var(--color-background-primary)',
          borderRight: '0.5px solid var(--color-border-tertiary)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '10px 12px 8px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <p style={sectionLabel}>Customers</p>
          </div>

          {CUSTOMERS.map(c => {
            const isActive = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 10px',
                  background: isActive ? '#E6F1FB' : 'transparent',
                  border: 'none',
                  borderBottom: '0.5px solid var(--color-border-tertiary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: AVATAR_BG[c.segment] + '28',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 500,
                  color: AVATAR_BG[c.segment],
                  flexShrink: 0,
                }}>
                  {c.initials}
                </div>
                {/* Name + segment */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{c.segment}</p>
                </div>
                {/* Match score */}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#185FA5', flexShrink: 0 }}>
                  {c.matchScore}%
                </span>
              </button>
            );
          })}
        </aside>

        {/* ── Content area ─────────────────────────────────────────────── */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>

          {/* Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'ACCEPTANCE RATE',  value: '7.4%',   sub: '+1.3% vs last month',    subColor: 'var(--color-positive)' },
              { label: 'PROFILE COVERAGE', value: '94.2%',  sub: 'Active customer profiles',subColor: 'var(--color-text-muted)' },
              { label: 'SENT (7 DAYS)',     value: '12,841', sub: '98.7% delivery rate',    subColor: 'var(--color-text-muted)' },
            ].map(m => (
              <div key={m.label} style={{
                background: 'var(--color-background-secondary)',
                borderRadius: 8,
                padding: '10px 12px',
              }}>
                <p style={{ ...sectionLabel, marginBottom: 6 }}>{m.label}</p>
                <p style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.2 }}>{m.value}</p>
                <p style={{ fontSize: 11, color: m.subColor, marginTop: 4 }}>{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Spending Pattern Panel */}
          <div style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={sectionLabel}>Spending Patterns — {customer?.name}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Last 30 days</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {spending.map((item, idx) => (
                <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 108, fontSize: 12, color: 'var(--color-text-primary)', flexShrink: 0 }}>
                    {item.category}
                  </span>
                  {/* Bar track */}
                  <div style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 3,
                    background: 'var(--color-background-secondary)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: 8,
                      borderRadius: 3,
                      width: `${(item.amount / maxSpend) * 100}%`,
                      background: item.isOther
                        ? '#B4B2A9'
                        : `rgba(55, 138, 221, ${BAR_OPACITIES[idx] ?? 0.25})`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ width: 68, fontSize: 12, textAlign: 'right', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                    ${item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Offer Recommendations */}
          <div style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={sectionLabel}>Product Recommendations</p>
              {isLiveCustomer && apiLoading && (
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Loading…</p>
              )}
            </div>

            {offers.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>
                No recommendations available for this customer.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {offers.map(offer => {
                  const isTop  = offer.rank === 1;
                  const badge  = getOfferBadge(offer, isTop);
                  const pLabel = PRODUCT_LABEL[offer.product_type] ?? offer.product_type;
                  return (
                    <div key={offer.offer_id} style={{
                      border: isTop ? '2px solid #378ADD' : '0.5px solid var(--color-border-tertiary)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 7,
                    }}>
                      {/* Tag row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: '0.04em',
                          background: badge.bg,
                          color: badge.text,
                          padding: '2px 6px',
                          borderRadius: 4,
                        }}>
                          {badge.label}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {pLabel}
                        </span>
                      </div>

                      {/* Title */}
                      <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: 'var(--color-text-primary)' }}>
                        {offer.product_name}
                      </p>

                      {/* Description */}
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.55, flex: 1 }}>
                        {offer.personalization_reason}
                      </p>

                      {/* Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          Match: <span style={{ color: isTop ? '#185FA5' : 'var(--color-text-secondary)', fontWeight: 500 }}>
                            {Math.round(offer.relevance_score * 100)}%
                          </span>
                        </span>
                        <button style={{
                          fontSize: 11,
                          fontWeight: 500,
                          background: isTop ? '#0C447C' : '#185FA5',
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          padding: '4px 12px',
                          cursor: 'pointer',
                        }}>
                          Send
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
