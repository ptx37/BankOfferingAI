import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Customer {
  customer_id: string;
  name: string;
  initials: string;
  segment: 'Premium' | 'Standard' | 'Other';
  financial_health: string;
  match_score: number;
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

const AVATAR_BG: Record<string, string> = {
  Premium: '#185FA5',
  Standard: '#3B6D11',
  Other: '#854F0B',
};

const PRODUCT_LABEL: Record<string, string> = {
  investment: 'Investment',
  savings_account: 'Savings',
  credit_card: 'Credit Card',
  mortgage: 'Mortgage',
  personal_loan: 'Personal Loan',
  insurance: 'Insurance',
  overdraft: 'Overdraft',
};

const BAR_OPACITIES = [1.0, 0.7, 0.5, 0.35, 0.25];

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
  return { Authorization: `Bearer ${token}` };
}

function getOfferBadge(offer: Offer, isTop: boolean) {
  if (isTop) return { label: 'TOP PICK', bg: '#E6F1FB', text: '#185FA5' };
  if (offer.relevance_score >= 0.7) return { label: 'GOOD FIT', bg: 'var(--color-badge-good-bg)', text: 'var(--color-badge-good-text)' };
  if (offer.relevance_score >= 0.4) return { label: 'CONSIDER', bg: 'var(--color-badge-consider-bg)', text: 'var(--color-badge-consider-text)' };
  return { label: 'REVIEW', bg: 'var(--color-background-secondary)', text: 'var(--color-text-muted)' };
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function EmployeePortal() {
  const [displayName, setDisplayName] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [sentOffers, setSentOffers] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!localStorage.getItem('auth_token') || (role !== 'employee' && role !== 'admin')) {
      window.location.href = '/login';
      return;
    }
    setDisplayName(localStorage.getItem('display_name') || localStorage.getItem('user_id') || 'Employee');
  }, []);

  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ['customers'],
    queryFn: () =>
      fetch('/api/customers', { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load customers');
        return r.json();
      }),
    enabled: !!displayName,
    staleTime: 5 * 60 * 1000,
  });

  const customers: Customer[] = customersData?.customers ?? [];

  useEffect(() => {
    if (!selectedId && customers.length > 0) {
      setSelectedId(customers[0].customer_id);
    }
  }, [customers, selectedId]);

  const selectedCustomer = customers.find(c => c.customer_id === selectedId);

  const { data: spendingData } = useQuery<{ spending: SpendItem[] }>({
    queryKey: ['spending', selectedId],
    queryFn: () =>
      fetch(`/api/customers/${selectedId}/spending`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load spending');
        return r.json();
      }),
    enabled: !!selectedId,
    staleTime: 5 * 60 * 1000,
  });

  const spending: SpendItem[] = spendingData?.spending ?? [];
  const maxSpend = Math.max(...spending.map(s => s.amount), 1);

  const { data: offersData, isLoading: offersLoading } = useQuery<{ offers: Offer[] }>({
    queryKey: ['offers', selectedId],
    queryFn: () =>
      fetch(`/api/offers/${selectedId}`, { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Failed to load offers');
        return r.json();
      }),
    enabled: !!selectedId,
    staleTime: 2 * 60 * 1000,
  });

  const offers: Offer[] = (offersData?.offers ?? []).slice(0, 4);

  function sendOffer(offer: Offer) {
    setSentOffers(prev => ({ ...prev, [offer.offer_id]: true }));
    const customerName = selectedCustomer?.name ?? selectedId;
    const msg = `Offer "${offer.product_name}" sent to ${customerName} via email.`;
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  function signOut() {
    localStorage.clear();
    window.location.href = '/login';
  }

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
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: 'var(--font-sans)', fontSize: 13,
      background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#185FA5', color: 'white',
          padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: '#0C447C', height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          </svg>
          <span style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>Customer Offer Center</span>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginLeft: 4 }}>Employee Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Signed in as:</span>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 500 }}>{displayName}</span>
          <button onClick={signOut} style={{ color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
            Sign out
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: 220, flexShrink: 0,
          background: 'var(--color-background-primary)',
          borderRight: '0.5px solid var(--color-border-tertiary)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '10px 12px 8px', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <p style={sectionLabel}>Customers ({customers.length})</p>
          </div>
          {customers.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '12px 10px' }}>Loading customers…</p>
          )}
          {customers.map(c => {
            const isActive = c.customer_id === selectedId;
            const bg = AVATAR_BG[c.segment] ?? AVATAR_BG.Other;
            return (
              <button key={c.customer_id} onClick={() => setSelectedId(c.customer_id)} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 10px', background: isActive ? '#E6F1FB' : 'transparent',
                border: 'none', borderBottom: '0.5px solid var(--color-border-tertiary)',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: bg + '28', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 500, color: bg, flexShrink: 0,
                }}>
                  {c.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{c.segment}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#185FA5', flexShrink: 0 }}>{c.match_score}%</span>
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'ACCEPTANCE RATE', value: '7.4%', sub: '+1.3% vs last month', subColor: 'var(--color-positive)' },
              { label: 'PROFILE COVERAGE', value: '94.2%', sub: 'Active customer profiles', subColor: 'var(--color-text-muted)' },
              { label: 'SENT (7 DAYS)', value: '12,841', sub: '98.7% delivery rate', subColor: 'var(--color-text-muted)' },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ ...sectionLabel, marginBottom: 6 }}>{m.label}</p>
                <p style={{ fontSize: 22, fontWeight: 500, lineHeight: 1.2 }}>{m.value}</p>
                <p style={{ fontSize: 11, color: m.subColor, marginTop: 4 }}>{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Spending */}
          <div style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={sectionLabel}>Spending Patterns — {selectedCustomer?.name ?? selectedId}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Last 30 days</p>
            </div>
            {spending.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No spending data available.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {spending.map((item, idx) => (
                  <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 108, fontSize: 12, color: 'var(--color-text-primary)', flexShrink: 0 }}>{item.category}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 3, background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                      <div style={{
                        height: 8, borderRadius: 3, width: `${(item.amount / maxSpend) * 100}%`,
                        background: item.isOther ? '#B4B2A9' : `rgba(55, 138, 221, ${BAR_OPACITIES[idx] ?? 0.25})`,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span style={{ width: 68, fontSize: 12, textAlign: 'right', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                      €{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offers */}
          <div style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={sectionLabel}>Product Recommendations</p>
              {offersLoading && <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Scoring…</p>}
            </div>
            {!offersLoading && offers.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>No recommendations available.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {offers.map(offer => {
                  const isTop = offer.rank === 1;
                  const badge = getOfferBadge(offer, isTop);
                  const pLabel = PRODUCT_LABEL[offer.product_type] ?? offer.product_type;
                  const isSent = sentOffers[offer.offer_id];
                  return (
                    <div key={offer.offer_id} style={{
                      border: isTop ? '2px solid #378ADD' : '0.5px solid var(--color-border-tertiary)',
                      borderRadius: 8, padding: '10px 12px',
                      display: 'flex', flexDirection: 'column', gap: 7,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
                          background: badge.bg, color: badge.text, padding: '2px 6px', borderRadius: 4,
                        }}>{badge.label}</span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{pLabel}</span>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, color: 'var(--color-text-primary)' }}>{offer.product_name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.55, flex: 1 }}>{offer.personalization_reason}</p>
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                        ⓘ Această explicație a fost generată automat de un sistem AI
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          Match: <span style={{ color: isTop ? '#185FA5' : 'var(--color-text-secondary)', fontWeight: 500 }}>
                            {Math.round(offer.relevance_score * 100)}%
                          </span>
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => {
                              const reason = window.prompt(`Override reason for "${offer.product_name}":`);
                              if (!reason) return;
                              fetch('/api/compliance/override', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...authHeader() },
                                body: JSON.stringify({
                                  customer_id: selectedId,
                                  offer_id: offer.offer_id,
                                  product_id: offer.product_id,
                                  product_name: offer.product_name,
                                  reason,
                                }),
                              }).then(() => alert('Override logged.'));
                            }}
                            style={{
                              fontSize: 11, fontWeight: 500, background: 'transparent',
                              color: '#A32D2D', border: '1px solid #A32D2D',
                              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                            }}
                          >
                            Override
                          </button>
                          <button
                            onClick={() => !isSent && sendOffer(offer)}
                            disabled={isSent}
                            style={{
                              fontSize: 11, fontWeight: 500,
                              background: isSent ? '#3B6D11' : (isTop ? '#0C447C' : '#185FA5'),
                              color: 'white', border: 'none', borderRadius: 8,
                              padding: '4px 12px', cursor: isSent ? 'default' : 'pointer',
                            }}
                          >
                            {isSent ? 'Sent ✓' : 'Send'}
                          </button>
                        </div>
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
