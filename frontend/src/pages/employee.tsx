import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import TopBarControls from '../components/TopBarControls';
import { useTranslation } from '../lib/i18n';

interface Customer {
  customer_id: string; name: string; initials: string;
  segment: 'Premium' | 'Standard' | 'Other'; financial_health: string; match_score: number;
}
interface SpendItem { category: string; amount: number; isOther?: boolean; }
interface Offer {
  offer_id: string; product_id: string; product_name: string; product_type: string;
  relevance_score: number; confidence_score: number; personalization_reason: string;
  rank: number; channel: string; cta_url: string;
}

const AVATAR_BG: Record<string, string> = { Premium: '#185FA5', Standard: '#3B6D11', Other: '#854F0B' };
const BAR_OPACITIES = [1.0, 0.7, 0.5, 0.35, 0.25];

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
  return { Authorization: `Bearer ${token}` };
}

export async function getServerSideProps() { return { props: {} }; }

export default function EmployeePortal() {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [sentOffers, setSentOffers] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!localStorage.getItem('auth_token') || (role !== 'employee' && role !== 'admin')) {
      window.location.href = '/login'; return;
    }
    setDisplayName(localStorage.getItem('display_name') || localStorage.getItem('user_id') || 'Employee');
  }, []);

  const { data: customersData } = useQuery<{ customers: Customer[] }>({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/customers', { headers: authHeader() }).then(r => {
      if (!r.ok) throw new Error('Failed'); return r.json();
    }),
    enabled: !!displayName, staleTime: 5 * 60 * 1000,
  });
  const customers = customersData?.customers ?? [];

  useEffect(() => {
    if (!selectedId && customers.length > 0) setSelectedId(customers[0].customer_id);
  }, [customers, selectedId]);

  const selectedCustomer = customers.find(c => c.customer_id === selectedId);

  const { data: spendingData } = useQuery<{ spending: SpendItem[] }>({
    queryKey: ['spending', selectedId],
    queryFn: () => fetch(`/api/customers/${selectedId}/spending`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!selectedId, staleTime: 5 * 60 * 1000,
  });
  const spending = spendingData?.spending ?? [];
  const maxSpend = Math.max(...spending.map(s => s.amount), 1);

  const { data: offersData, isLoading: offersLoading } = useQuery<{ offers: Offer[] }>({
    queryKey: ['offers', selectedId],
    queryFn: () => fetch(`/api/offers/${selectedId}`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!selectedId, staleTime: 2 * 60 * 1000,
  });
  const offers = (offersData?.offers ?? []).slice(0, 4);

  function sendOffer(offer: Offer) {
    setSentOffers(prev => ({ ...prev, [offer.offer_id]: true }));
    const msg = t('emp.sentToast').replace('{name}', selectedCustomer?.name ?? selectedId);
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  function signOut() { localStorage.clear(); window.location.href = '/login'; }

  function getBadge(offer: Offer, isTop: boolean) {
    if (isTop) return { label: t('common.topPick'), bg: 'var(--color-background-light-info)', text: 'var(--color-action)' };
    if (offer.relevance_score >= 0.7) return { label: t('common.goodFit'), bg: 'var(--color-badge-good-bg)', text: 'var(--color-badge-good-text)' };
    if (offer.relevance_score >= 0.4) return { label: t('common.consider'), bg: 'var(--color-badge-consider-bg)', text: 'var(--color-badge-consider-text)' };
    return { label: t('common.review'), bg: 'var(--color-background-secondary)', text: 'var(--color-text-muted)' };
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--color-text-secondary)',
  };
  const panel: React.CSSProperties = {
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 12, padding: '12px 16px',
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
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{
        background: 'var(--color-header-bg)', height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
          </svg>
          <span style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{t('nav.offerCenter')}</span>
          <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, marginLeft: 2 }}>{t('nav.employeePortal')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{t('nav.signedAs')}</span>
          <span style={{ color: 'rgba(255,255,255,0.90)', fontSize: 12, fontWeight: 500 }}>{displayName}</span>
          <TopBarControls onSignOut={signOut} signOutLabel={t('nav.signOut')} />
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
            <p style={sectionLabel}>{t('emp.customers')} ({customers.length})</p>
          </div>
          {customers.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '12px 10px' }}>{t('emp.loadingCustomers')}</p>
          )}
          {customers.map(c => {
            const isActive = c.customer_id === selectedId;
            const bg = AVATAR_BG[c.segment] ?? AVATAR_BG.Other;
            return (
              <button key={c.customer_id} onClick={() => setSelectedId(c.customer_id)} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 10px',
                background: isActive ? 'var(--color-sidebar-active)' : 'transparent',
                border: 'none', borderBottom: '0.5px solid var(--color-border-tertiary)',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: bg + '28', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 500, color: bg, flexShrink: 0,
                }}>{c.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{c.segment}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-action)', flexShrink: 0 }}>{c.match_score}%</span>
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: t('emp.acceptanceRate'), value: '7.4%', sub: t('emp.vsLastMonth'), subColor: 'var(--color-positive)' },
              { label: t('emp.profileCoverage'), value: '94.2%', sub: t('emp.activeProfiles'), subColor: 'var(--color-text-muted)' },
              { label: t('emp.sent7Days'), value: '12,841', sub: t('emp.deliveryRate'), subColor: 'var(--color-text-muted)' },
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
              <p style={sectionLabel}>{t('emp.spendingPatterns')} — {selectedCustomer?.name ?? selectedId}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t('emp.last30Days')}</p>
            </div>
            {spending.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('emp.noSpending')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {spending.map((item, idx) => (
                  <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 108, fontSize: 12, color: 'var(--color-text-primary)', flexShrink: 0 }}>{item.category}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 3, background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                      <div style={{
                        height: 8, borderRadius: 3, width: `${(item.amount / maxSpend) * 100}%`,
                        background: item.isOther ? 'var(--color-neutral-bar)' : `rgba(55,138,221,${BAR_OPACITIES[idx] ?? 0.25})`,
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
              <p style={sectionLabel}>{t('emp.recommendations')}</p>
              {offersLoading && <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t('emp.scoring')}</p>}
            </div>
            {!offersLoading && offers.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>{t('emp.noRecommendations')}</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {offers.map(offer => {
                  const isTop = offer.rank === 1;
                  const badge = getBadge(offer, isTop);
                  const isSent = sentOffers[offer.offer_id];
                  return (
                    <div key={offer.offer_id} style={{
                      border: isTop
                        ? '2px solid var(--color-accent)'
                        : '0.5px solid var(--color-border-tertiary)',
                      borderRadius: 8, padding: '10px 12px',
                      display: 'flex', flexDirection: 'column', gap: 7,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
                          background: badge.bg, color: badge.text, padding: '2px 6px', borderRadius: 4,
                        }}>{badge.label}</span>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{offer.product_name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.55, flex: 1 }}>{offer.personalization_reason}</p>
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{t('emp.aiDisclosure')}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {t('emp.match')}: <span style={{ color: isTop ? 'var(--color-action)' : 'var(--color-text-secondary)', fontWeight: 500 }}>
                            {Math.round(offer.relevance_score * 100)}%
                          </span>
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => {
                              const reason = window.prompt(`${t('emp.overridePrompt')} "${offer.product_name}":`);
                              if (!reason) return;
                              fetch('/api/compliance/override', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...authHeader() },
                                body: JSON.stringify({ customer_id: selectedId, offer_id: offer.offer_id, product_id: offer.product_id, product_name: offer.product_name, reason }),
                              }).then(() => alert(t('emp.overrideLogged')));
                            }}
                            style={{
                              fontSize: 11, fontWeight: 500, background: 'transparent',
                              color: 'var(--color-negative)', border: '1px solid var(--color-negative)',
                              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                            }}
                          >{t('emp.override')}</button>
                          <button
                            onClick={() => !isSent && sendOffer(offer)}
                            disabled={isSent}
                            style={{
                              fontSize: 11, fontWeight: 500,
                              background: isSent ? '#3B6D11' : (isTop ? '#0C447C' : '#185FA5'),
                              color: 'white', border: 'none', borderRadius: 8,
                              padding: '4px 12px', cursor: isSent ? 'default' : 'pointer',
                            }}
                          >{isSent ? t('emp.sent') : t('emp.send')}</button>
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
