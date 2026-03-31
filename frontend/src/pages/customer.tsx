import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBarControls from '../components/TopBarControls';
import { useTranslation } from '../lib/i18n';

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

const BAR_OPACITIES = [1.0, 0.7, 0.5, 0.35, 0.25];
const HEALTH_COLOR: Record<string, string> = {
  healthy: '#3B6D11', watchlist: '#854F0B', fragile: '#A32D2D',
};

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
  return { Authorization: `Bearer ${token}` };
}

export async function getServerSideProps() { return { props: {} }; }

export default function CustomerPortal() {
  const { t } = useTranslation();
  const [customerId, setCustomerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [offerActions, setOfferActions] = useState<Record<string, 'accepted' | 'declined'>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!localStorage.getItem('auth_token') || role !== 'customer') {
      window.location.href = '/login'; return;
    }
    const uid = localStorage.getItem('user_id') || '';
    setCustomerId(uid);
    setDisplayName(localStorage.getItem('display_name') || uid);
  }, []);

  const { data: profile } = useQuery<Profile>({
    queryKey: ['my-profile', customerId],
    queryFn: () => fetch(`/api/customers/${customerId}/profile`, { headers: authHeader() }).then(r => r.json()),
    enabled: !!customerId, staleTime: 5 * 60 * 1000,
  });

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

  const spending = spendingData?.spending ?? [];
  const maxSpend = Math.max(...spending.map(s => s.amount), 1);
  const offers = (offersData?.offers ?? []).slice(0, 5);

  function signOut() { localStorage.clear(); window.location.href = '/login'; }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--color-text-secondary)',
  };
  const panel: React.CSSProperties = {
    background: 'var(--color-background-primary)',
    border: '0.5px solid var(--color-border-tertiary)',
    borderRadius: 12, padding: '12px 16px',
  };

  const healthColor = HEALTH_COLOR[profile?.financial_health ?? ''] ?? 'var(--color-text-secondary)';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      fontFamily: 'var(--font-sans)', fontSize: 13,
      background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
    }}>
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
          <span style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>{t('nav.bankOffer')}</span>
          <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: 11, marginLeft: 2 }}>{t('nav.myPortal')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'rgba(255,255,255,0.90)', fontSize: 12, fontWeight: 500 }}>{displayName}</span>
          <TopBarControls onSignOut={signOut} signOutLabel={t('nav.signOut')} />
        </div>
      </header>

      <div style={{
        flex: 1, padding: 16,
        display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16,
        maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box',
      }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Profile Card */}
          <div style={panel}>
            <p style={{ ...sectionLabel, marginBottom: 12 }}>{t('cust.myProfile')}</p>
            {profile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--color-background-light-info)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 600, color: 'var(--color-action)', flexShrink: 0,
                  }}>
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{profile.name || displayName}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{customerId}</p>
                  </div>
                </div>

                {[
                  { label: t('common.segment'), value: profile.segment },
                  { label: t('common.riskProfile'), value: profile.risk_profile },
                  { label: t('common.financialHealth'), value: profile.financial_health, color: healthColor },
                  { label: t('common.income'), value: `€${(profile.income ?? 0).toLocaleString()}` },
                  { label: t('common.savings'), value: `€${(profile.savings ?? 0).toLocaleString()}` },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: item.color ?? 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                      {item.value}
                    </span>
                  </div>
                ))}

                {(profile.existing_products ?? []).length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>{t('cust.currentProducts')}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {profile.existing_products.map(p => (
                        <span key={p} style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 12,
                          background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)',
                        }}>{p.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('cust.loadingProfile')}</p>
            )}
          </div>

          {/* Consent */}
          <div style={panel}>
            <p style={{ ...sectionLabel, marginBottom: 10 }}>{t('cust.consentTitle')}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
              {t('cust.consentDesc')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: profile?.profiling_consent ? 'var(--color-positive)' : 'var(--color-text-muted)' }}>
                {profile?.profiling_consent ? t('cust.consentEnabled') : t('cust.consentDisabled')}
              </span>
              <button
                onClick={() => consentMutation.mutate(!(profile?.profiling_consent ?? true))}
                disabled={consentMutation.isPending || !profile}
                style={{
                  fontSize: 11, fontWeight: 500,
                  background: profile?.profiling_consent ? '#A32D2D' : '#3B6D11',
                  color: 'white', border: 'none', borderRadius: 8,
                  padding: '5px 14px', cursor: 'pointer',
                  opacity: consentMutation.isPending ? 0.6 : 1,
                }}
              >
                {consentMutation.isPending ? '…' : profile?.profiling_consent ? t('cust.withdrawConsent') : t('cust.giveConsent')}
              </button>
            </div>
          </div>

          {/* Spending */}
          <div style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={sectionLabel}>{t('cust.spendingPatterns')}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t('cust.last30Days')}</p>
            </div>
            {spending.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('cust.noSpending')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {spending.map((item, idx) => (
                  <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 90, fontSize: 11, color: 'var(--color-text-primary)', flexShrink: 0 }}>{item.category}</span>
                    <div style={{ flex: 1, height: 7, borderRadius: 3, background: 'var(--color-background-secondary)', overflow: 'hidden' }}>
                      <div style={{
                        height: 7, borderRadius: 3, width: `${(item.amount / maxSpend) * 100}%`,
                        background: item.isOther ? 'var(--color-neutral-bar)' : `rgba(55,138,221,${BAR_OPACITIES[idx] ?? 0.25})`,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span style={{ width: 60, fontSize: 11, textAlign: 'right', color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                      €{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — Offers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={sectionLabel}>{t('cust.personalizedOffers')}</p>
              {offersLoading && <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{t('cust.scoring')}</p>}
            </div>

            {!profile?.profiling_consent && (
              <div style={{
                background: 'var(--color-warning-bg)',
                border: `0.5px solid var(--color-warning-border)`,
                borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                fontSize: 12, color: 'var(--color-warning-text)', lineHeight: 1.5,
              }}>
                {t('cust.noConsentWarning')}
              </div>
            )}

            {!offersLoading && offers.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>{t('cust.noOffers')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {offers.map(offer => {
                  const isTop = offer.rank === 1;
                  const action = offerActions[offer.offer_id];
                  return (
                    <div key={offer.offer_id} style={{
                      border: isTop ? '2px solid var(--color-accent)' : '0.5px solid var(--color-border-tertiary)',
                      borderRadius: 8, padding: '12px 14px',
                      opacity: action ? 0.65 : 1, transition: 'opacity 0.2s',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            {isTop && (
                              <span style={{ fontSize: 10, fontWeight: 500, background: 'var(--color-background-light-info)', color: 'var(--color-action)', padding: '2px 6px', borderRadius: 4 }}>
                                {t('common.topPick')}
                              </span>
                            )}
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {offer.channel}
                            </span>
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{offer.product_name}</p>
                          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: 6 }}>
                            {offer.personalization_reason}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            {t('cust.aiDisclosure')}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                          <span style={{ fontSize: 18, fontWeight: 600, color: isTop ? 'var(--color-action)' : 'var(--color-text-primary)' }}>
                            {Math.round(offer.relevance_score * 100)}%
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{t('cust.match')}</span>
                        </div>
                      </div>

                      {action ? (
                        <div style={{
                          marginTop: 10, padding: '6px 12px', borderRadius: 6,
                          background: action === 'accepted' ? 'var(--color-badge-good-bg)' : 'var(--color-background-secondary)',
                          color: action === 'accepted' ? 'var(--color-badge-good-text)' : 'var(--color-text-muted)',
                          fontSize: 12, fontWeight: 500, textAlign: 'center',
                        }}>
                          {action === 'accepted' ? t('cust.acceptedMsg') : t('cust.declinedMsg')}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button
                            onClick={() => setOfferActions(prev => ({ ...prev, [offer.offer_id]: 'accepted' }))}
                            style={{ flex: 1, fontSize: 12, fontWeight: 500, background: '#185FA5', color: 'white', border: 'none', borderRadius: 8, padding: '7px 0', cursor: 'pointer' }}
                          >{t('cust.accept')}</button>
                          <button
                            onClick={() => setOfferActions(prev => ({ ...prev, [offer.offer_id]: 'declined' }))}
                            style={{ flex: 1, fontSize: 12, fontWeight: 500, background: 'transparent', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8, padding: '7px 0', cursor: 'pointer' }}
                          >{t('cust.decline')}</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
