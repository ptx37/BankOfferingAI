import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface User {
  user_id: string;
  role: string;
  display_name: string;
  is_active: boolean;
}

interface Product {
  product_id: string;
  product_name: string;
  category: string;
  description: string;
  recommended_channel: string;
  enabled: boolean;
}

interface KillSwitch {
  active: boolean;
  reason?: string;
  set_by?: string;
  set_at?: string;
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

type Tab = 'killswitch' | 'products' | 'users' | 'audit';

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
  return { Authorization: `Bearer ${token}` };
}

export async function getServerSideProps() {
  return { props: {} };
}

export default function AdminPortal() {
  const [tab, setTab] = useState<Tab>('killswitch');
  const [displayName, setDisplayName] = useState('');
  const [auditCustomerId, setAuditCustomerId] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [killReason, setKillReason] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!localStorage.getItem('auth_token') || role !== 'admin') {
      window.location.href = '/login';
      return;
    }
    setDisplayName(localStorage.getItem('display_name') || 'Admin');
  }, []);

  // Kill Switch
  const { data: ksData, refetch: refetchKs } = useQuery<KillSwitch>({
    queryKey: ['kill-switch'],
    queryFn: () =>
      fetch('/api/compliance/kill-switch', { headers: authHeader() }).then(r => r.json()),
    enabled: !!displayName,
    staleTime: 10_000,
  });

  const ksMutation = useMutation({
    mutationFn: ({ active, reason }: { active: boolean; reason: string }) =>
      fetch('/api/compliance/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ active, reason }),
      }).then(r => r.json()),
    onSuccess: () => {
      refetchKs();
      setKillReason('');
    },
  });

  // Users
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ['admin-users'],
    queryFn: () =>
      fetch('/api/admin/users', { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      }),
    enabled: tab === 'users' && !!displayName,
    staleTime: 30_000,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ user_id, role, is_active }: { user_id: string; role?: string; is_active?: boolean }) =>
      fetch(`/api/admin/users/${user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ role, is_active }),
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  // Products
  const { data: productsData } = useQuery<{ products: Product[] }>({
    queryKey: ['admin-products'],
    queryFn: () =>
      fetch('/api/admin/products', { headers: authHeader() }).then(r => {
        if (!r.ok) throw new Error('Unauthorized');
        return r.json();
      }),
    enabled: tab === 'products' && !!displayName,
    staleTime: 30_000,
  });

  const toggleProductMutation = useMutation({
    mutationFn: (product_id: string) =>
      fetch(`/api/admin/products/${product_id}/toggle`, {
        method: 'POST',
        headers: authHeader(),
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  // Audit
  const { data: auditData, refetch: refetchAudit, isFetching: auditFetching } = useQuery<{ audit_records: AuditRecord[]; total: number }>({
    queryKey: ['admin-audit', auditSearch],
    queryFn: () =>
      fetch(`/api/admin/audit?customer_id=${auditSearch}`, { headers: authHeader() }).then(r => r.json()),
    enabled: false,
  });

  function signOut() {
    localStorage.clear();
    window.location.href = '/login';
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    color: 'var(--color-text-secondary)',
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'killswitch', label: 'Kill Switch' },
    { id: 'products', label: 'Product Catalog' },
    { id: 'users', label: 'Users' },
    { id: 'audit', label: 'Audit Trail' },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      fontFamily: 'var(--font-sans)', fontSize: 13,
      background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
    }}>
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
          <span style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>BankOffer AI</span>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginLeft: 4 }}>Admin Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 500 }}>{displayName}</span>
          <button onClick={signOut} style={{ color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <div style={{
        background: 'var(--color-background-primary)',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        padding: '0 20px',
        display: 'flex', gap: 0,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 16px', fontSize: 13, fontWeight: 500,
            background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t.id ? '#185FA5' : 'var(--color-text-secondary)',
            borderBottom: tab === t.id ? '2px solid #185FA5' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 20, maxWidth: 960, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* ── Kill Switch ── */}
        {tab === 'killswitch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              background: 'var(--color-background-primary)',
              border: `2px solid ${ksData?.active ? '#A32D2D' : '#3B6D11'}`,
              borderRadius: 12, padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>AI Recommendation Engine</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: ksData?.active ? '#A32D2D' : '#3B6D11',
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: ksData?.active ? '#A32D2D' : '#3B6D11' }}>
                      {ksData?.active ? 'HALTED' : 'RUNNING'}
                    </span>
                  </div>
                </div>
              </div>

              {ksData?.active && (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                  <span style={{ fontWeight: 500 }}>Reason:</span> {ksData.reason}<br />
                  <span style={{ fontWeight: 500 }}>Set by:</span> {ksData.set_by} &nbsp;|&nbsp;
                  <span style={{ fontWeight: 500 }}>At:</span> {ksData.set_at ? new Date(ksData.set_at).toLocaleString() : ''}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...sectionLabel, display: 'block', marginBottom: 6 }}>Reason (required)</label>
                  <input
                    type="text"
                    value={killReason}
                    onChange={e => setKillReason(e.target.value)}
                    placeholder="e.g. Audit in progress, system maintenance…"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8,
                      padding: '8px 10px', fontSize: 13, outline: 'none',
                      background: 'var(--color-background-secondary)',
                      color: 'var(--color-text-primary)',
                    }}
                  />
                </div>
                <button
                  onClick={() => ksMutation.mutate({ active: !ksData?.active, reason: killReason })}
                  disabled={!killReason.trim() || ksMutation.isPending}
                  style={{
                    fontSize: 13, fontWeight: 500, padding: '8px 20px', borderRadius: 8,
                    border: 'none', cursor: !killReason.trim() ? 'not-allowed' : 'pointer',
                    background: ksData?.active ? '#3B6D11' : '#A32D2D',
                    color: 'white', opacity: !killReason.trim() ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ksData?.active ? 'Resume Engine' : 'Halt Engine'}
                </button>
              </div>
            </div>

            <div style={{
              background: 'var(--color-background-primary)',
              border: '0.5px solid var(--color-border-tertiary)',
              borderRadius: 12, padding: '16px 20px',
              fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7,
            }}>
              <p style={{ ...sectionLabel, marginBottom: 8 }}>Compliance Note</p>
              The kill switch immediately halts all AI-generated recommendations for all customers (EU AI Act Art. 14(4)).
              All activations are logged immutably. Halting the engine does not affect existing audit trail records.
            </div>
          </div>
        )}

        {/* ── Products ── */}
        {tab === 'products' && (
          <div>
            <p style={{ ...sectionLabel, marginBottom: 14 }}>Product Catalog — {productsData?.products.length ?? 0} products</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(productsData?.products ?? []).map(p => (
                <div key={p.product_id} style={{
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 8, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  opacity: p.enabled ? 1 : 0.55,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{p.product_name}</span>
                      <span style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 10,
                        background: 'var(--color-background-secondary)',
                        color: 'var(--color-text-muted)',
                      }}>
                        {p.category}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{p.description}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 500,
                      color: p.enabled ? '#3B6D11' : '#A32D2D',
                    }}>
                      {p.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => toggleProductMutation.mutate(p.product_id)}
                      disabled={toggleProductMutation.isPending}
                      style={{
                        fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 8,
                        border: `1px solid ${p.enabled ? '#A32D2D' : '#3B6D11'}`,
                        color: p.enabled ? '#A32D2D' : '#3B6D11',
                        background: 'transparent', cursor: 'pointer',
                      }}
                    >
                      {p.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
              {!productsData && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Loading products…</p>
              )}
            </div>
          </div>
        )}

        {/* ── Users ── */}
        {tab === 'users' && (
          <div>
            <p style={{ ...sectionLabel, marginBottom: 14 }}>User Management — {usersData?.users.length ?? 0} users</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(usersData?.users ?? []).map(u => (
                <div key={u.user_id} style={{
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 8, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  opacity: u.is_active ? 1 : 0.5,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: '#185FA520', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: '#185FA5', flexShrink: 0,
                  }}>
                    {u.display_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>{u.display_name}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{u.user_id}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <select
                      value={u.role}
                      onChange={e => updateUserMutation.mutate({ user_id: u.user_id, role: e.target.value })}
                      style={{
                        fontSize: 12, padding: '4px 8px', borderRadius: 6,
                        border: '0.5px solid var(--color-border-tertiary)',
                        background: 'var(--color-background-secondary)',
                        color: 'var(--color-text-primary)', cursor: 'pointer',
                      }}
                    >
                      <option value="customer">Customer</option>
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => updateUserMutation.mutate({ user_id: u.user_id, is_active: !u.is_active })}
                      style={{
                        fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 6,
                        border: `1px solid ${u.is_active ? '#A32D2D' : '#3B6D11'}`,
                        color: u.is_active ? '#A32D2D' : '#3B6D11',
                        background: 'transparent', cursor: 'pointer',
                      }}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
              {!usersData && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Loading users…</p>
              )}
            </div>
          </div>
        )}

        {/* ── Audit Trail ── */}
        {tab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...sectionLabel, display: 'block', marginBottom: 6 }}>Customer ID</label>
                <input
                  type="text"
                  value={auditCustomerId}
                  onChange={e => setAuditCustomerId(e.target.value)}
                  placeholder="e.g. CUST-001"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8,
                    padding: '8px 10px', fontSize: 13, outline: 'none',
                    background: 'var(--color-background-primary)',
                    color: 'var(--color-text-primary)',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && auditCustomerId.trim()) {
                      setAuditSearch(auditCustomerId.trim());
                      setTimeout(() => refetchAudit(), 0);
                    }
                  }}
                />
              </div>
              <button
                onClick={() => { setAuditSearch(auditCustomerId.trim()); setTimeout(() => refetchAudit(), 0); }}
                disabled={!auditCustomerId.trim() || auditFetching}
                style={{
                  fontSize: 13, fontWeight: 500, padding: '8px 20px', borderRadius: 8,
                  border: 'none', background: '#185FA5', color: 'white',
                  cursor: !auditCustomerId.trim() ? 'not-allowed' : 'pointer',
                  opacity: !auditCustomerId.trim() ? 0.5 : 1,
                }}
              >
                {auditFetching ? 'Searching…' : 'Search'}
              </button>
            </div>

            {auditData && (
              <div>
                <p style={{ ...sectionLabel, marginBottom: 10 }}>
                  {auditData.total} record{auditData.total !== 1 ? 's' : ''} for {auditSearch}
                </p>
                {auditData.audit_records.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No audit records found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {auditData.audit_records.map(r => (
                      <div key={r.audit_id} style={{
                        background: 'var(--color-background-primary)',
                        border: '0.5px solid var(--color-border-tertiary)',
                        borderRadius: 8, padding: '12px 16px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}>{r.audit_id}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {new Date(r.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {[
                            { label: 'Model', value: r.model_version },
                            { label: 'LLM Used', value: r.llm_used ? `Yes (${r.llm_model})` : 'No (rule-based)' },
                            { label: 'Consent', value: r.compliance?.profiling_consent_given ? 'Yes' : 'No' },
                          ].map(item => (
                            <div key={item.label}>
                              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {item.label}
                              </span>
                              <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{String(item.value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
