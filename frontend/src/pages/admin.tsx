import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import type { NavItem } from '../components/Sidebar';
import { useTranslation } from '../lib/i18n';
import { CATALOG_PRODUCTS, CATEGORY_COLORS } from '../lib/products';
import type { CatalogProduct, ProductCategory, ProductStatus } from '../lib/products';
import { MOCK_CUSTOMERS } from '../lib/mockData';
import { getConsent } from '../lib/consentStore';
import { addNotification } from '../lib/notificationStore';

type AdminTab = 'killswitch' | 'catalog' | 'productdetail' | 'productform' | 'users' | 'audit' | 'compliance' | 'agents';

interface User { user_id: string; role: string; display_name: string; is_active: boolean; }
interface KillSwitch { active: boolean; reason?: string; set_by?: string; set_at?: string; }
interface AuditRecord {
  audit_id: string; timestamp: string; customer_id: string;
  model_version: string; llm_used: boolean; llm_model: string | null;
  compliance: Record<string, unknown>;
}

interface AgentRun {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  users_notified: number;
  result_summary: any;
  triggered_by: string;
}

interface AgentInfo {
  agent_id: string;
  name: string;
  description: string;
  schedule: string;
  last_run: AgentRun | null;
  history: AgentRun[];
}

interface ProductForm {
  name: string;
  category: ProductCategory | '';
  status: ProductStatus;
  description: string;
  attributes: { label: string; value: string }[];
  interestRate: string;
  creditLimit: string;
  eligibility: string;
  channel: string;
  priority: string;
  triggerSignals: string;
  code: string;
  effectiveDate: string;
}

interface FormErrors {
  name?: string;
  category?: string;
  description?: string;
  code?: string;
  effectiveDate?: string;
}

const EMPTY_FORM: ProductForm = {
  name: '', category: '', status: 'active', description: '',
  attributes: [{ label: '', value: '' }],
  interestRate: '', creditLimit: '', eligibility: '',
  channel: '', priority: 'medium', triggerSignals: '',
  code: '', effectiveDate: '',
};

const ALL_CATEGORIES: ProductCategory[] = [
  'Investments', 'Savings', 'Retirement', 'Lending', 'Cards', 'Insurance',
];

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
  return { Authorization: `Bearer ${token}` };
}

// ── Nav Icons ──────────────────────────────────────────────────────────────
function IcoPower() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

function IcoTable() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="9" x2="9" y2="21" />
    </svg>
  );
}

function IcoPencil() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IcoUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IcoShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IcoCompliance() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function IcoAgent() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}


export async function getServerSideProps() { return { props: {} }; }

export default function AdminPortal() {
  const router = useRouter();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const queryClient = useQueryClient();

  // Tab state (URL-persisted)
  const [activeTab, setActiveTab] = useState<AdminTab>('killswitch');

  // Kill switch state
  const [killReason, setKillReason] = useState('');

  // Product Catalog: expanded desc
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Product Detail view
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const selectedProduct = CATALOG_PRODUCTS.find(p => p.id === selectedProductId) ?? null;

  useEffect(() => {
    const tab = router.query.tab as AdminTab;
    if (tab && ['killswitch', 'catalog', 'productdetail', 'productform', 'users', 'audit', 'compliance', 'agents'].includes(tab)) {
      if (tab === 'productdetail' && !selectedProductId) {
        setActiveTab('catalog');
      } else {
        setActiveTab(tab);
      }
    }
  }, [router.query.tab, selectedProductId]);

  function goToTab(tab: AdminTab) {
    setActiveTab(tab);
    router.push({ pathname: '/admin', query: { tab } }, undefined, { shallow: true });
  }

  function viewProduct(p: CatalogProduct) {
    setSelectedProductId(p.id);
    goToTab('productdetail');
  }

  // Product Definition Form
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formToast, setFormToast] = useState('');

  // Audit
  const [auditCustomerId, setAuditCustomerId] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Agents
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!localStorage.getItem('auth_token') || role !== 'admin') {
      window.location.href = '/login'; return;
    }
    setDisplayName(localStorage.getItem('display_name') || 'Admin');
  }, []);

  // ── Kill switch ──
  const { data: ksData, refetch: refetchKs } = useQuery<KillSwitch>({
    queryKey: ['kill-switch'],
    queryFn: () => fetch('/api/compliance/kill-switch', { headers: authHeader() }).then(r => r.json()),
    enabled: !!displayName, staleTime: 10_000,
  });

  const ksMutation = useMutation({
    mutationFn: ({ active, reason }: { active: boolean; reason: string }) =>
      fetch('/api/compliance/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ active, reason }),
      }).then(r => r.json()),
    onSuccess: () => { refetchKs(); setKillReason(''); },
  });

  // ── Users ──
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ['admin-users'],
    queryFn: () => fetch('/api/admin/users', { headers: authHeader() }).then(r => r.json()),
    enabled: activeTab === 'users' && !!displayName, staleTime: 30_000,
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

  // ── Audit ──
  const { data: auditData, refetch: refetchAudit, isFetching: auditFetching } = useQuery<{ audit_records: AuditRecord[]; total: number }>({
    queryKey: ['admin-audit', auditSearch],
    queryFn: () => fetch(`/api/admin/audit?customer_id=${auditSearch}`, { headers: authHeader() }).then(r => r.json()),
    enabled: false,
  });

  // ── Agents ──
  const { data: agentsData, refetch: refetchAgents } = useQuery<{ agents: AgentInfo[] }>({
    queryKey: ['admin-agents'],
    queryFn: () => fetch('/api/admin/agents', { headers: authHeader() }).then(r => r.json()),
    enabled: activeTab === 'agents' && !!displayName, staleTime: 10_000,
  });

  const triggerAgentMutation = useMutation({
    mutationFn: (agentId: string) =>
      fetch(`/api/admin/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
      }).then(r => r.json()),
    onSuccess: (data) => {
      refetchAgents();
      // Push notifications to eligible customers via localStorage store
      if (data.status === 'completed' && data.eligible_customers && data.message) {
        for (const cid of data.eligible_customers) {
          const normalizedId = cid.replace(/^CUST-0*/i, '') || cid;
          addNotification(normalizedId, {
            productName: 'ETF Starter Portfolio',
            productId: 'PROD-001',
            message: data.message,
            sentBy: 'ETF Agent',
          });
        }
        setFormToast(`Agent completed — ${data.users_notified} customers notified`);
      } else if (data.status === 'failed') {
        setFormToast(`Agent failed: ${data.error || 'Unknown error'}`);
      } else {
        setFormToast('Agent run triggered');
      }
      setTimeout(() => setFormToast(''), 4000);
    },
  });

  function signOut() { localStorage.removeItem('auth_token'); localStorage.removeItem('role'); localStorage.removeItem('display_name'); localStorage.removeItem('customer_id'); window.location.href = '/login'; }

  // ── Form helpers ──
  function validateForm(f: ProductForm): FormErrors {
    const errors: FormErrors = {};
    if (!f.name.trim()) errors.name = t('admin.errName');
    else if (f.name.length > 80) errors.name = t('admin.errName');
    if (!f.category) errors.category = t('admin.errCategory');
    if (f.description.length > 300) errors.description = t('admin.errDescLen');
    if (!f.code.trim()) errors.code = t('admin.errCode');
    else if (!/^[A-Z0-9]{4,12}$/.test(f.code)) errors.code = t('admin.errCode');
    if (!f.effectiveDate) errors.effectiveDate = t('admin.errDatePast');
    else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(f.effectiveDate) < today) errors.effectiveDate = t('admin.errDatePast');
    }
    return errors;
  }

  function handleEdit(p: CatalogProduct) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category: p.category,
      status: p.status,
      description: p.description,
      attributes: p.attributes.map(a => ({ label: a.label, value: a.value })),
      interestRate: p.interestRate?.toString() ?? '',
      creditLimit: p.creditLimit?.toString() ?? '',
      eligibility: p.eligibility ?? '',
      channel: p.channel ?? '',
      priority: p.priority ?? 'medium',
      triggerSignals: p.triggerSignals ?? '',
      code: p.code,
      effectiveDate: p.effectiveDate,
    });
    setFormErrors({});
    goToTab('productform');
  }

  function handleSave() {
    const errors = validateForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    // In production: POST/PUT /api/admin/products
    setFormToast(t('admin.productSaved'));
    setTimeout(() => setFormToast(''), 3500);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleCancel() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    goToTab('catalog');
  }

  function updateAttr(idx: number, field: 'label' | 'value', val: string) {
    setForm(prev => {
      const attrs = [...prev.attributes];
      attrs[idx] = { ...attrs[idx], [field]: val };
      return { ...prev, attributes: attrs };
    });
  }

  // ── Styles ──
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--color-text-secondary)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8,
    padding: '8px 10px', fontSize: 13, outline: 'none',
    background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
    transition: 'border-color 0.15s',
  };

  const fieldLabel: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 500,
    color: 'var(--color-text-secondary)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 6,
  };

  const errorText: React.CSSProperties = {
    fontSize: 11, color: 'var(--color-negative)', marginTop: 4,
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left',
    fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--color-text-secondary)',
    borderBottom: '0.5px solid var(--color-border-tertiary)',
  };

  const editingProduct = CATALOG_PRODUCTS.find(p => p.id === editingId);

  const NAV_ITEMS: NavItem[] = [
    { id: 'killswitch',  label: t('admin.killSwitch'),        icon: <IcoPower /> },
    { id: 'catalog',     label: t('admin.products'),          icon: <IcoTable /> },
    { id: 'productform', label: t('admin.productDefinition'), icon: <IcoPencil /> },
    { id: 'users',       label: t('admin.users'),             icon: <IcoUser /> },
    { id: 'audit',       label: t('admin.auditTrail'),        icon: <IcoShield /> },
    { id: 'compliance',  label: 'Compliance Stats',           icon: <IcoCompliance /> },
    { id: 'agents',      label: 'Scheduled Agents',           icon: <IcoAgent /> },
  ];

  const TAB_LABELS: Record<AdminTab, string> = {
    killswitch:    t('admin.killSwitch'),
    catalog:       t('admin.products'),
    productdetail: selectedProduct ? selectedProduct.name : 'Product Detail',
    productform:   t('admin.productDefinition'),
    users:         t('admin.users'),
    audit:         t('admin.auditTrail'),
    compliance:    'Compliance Statistics',
    agents:        'Scheduled Agents',
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'row', minHeight: '100vh',
      fontFamily: 'var(--font-sans)', fontSize: 13,
      background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
    }}>

      {/* Form success toast */}
      {formToast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#3B6D11', color: 'white',
          padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>{formToast}</div>
      )}

      {/* Sidebar */}
      <Sidebar
        items={NAV_ITEMS}
        activeId={activeTab === 'productdetail' ? 'catalog' : (activeTab === 'productform' ? 'productform' : activeTab)}
        onSelect={(id) => goToTab(id as AdminTab)}
        displayName={displayName}
        portalLabel={t('nav.adminPortal')}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {TAB_LABELS[activeTab]}
            </span>
            {activeTab === 'productform' && editingId && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--color-action)', display: 'inline-block', flexShrink: 0,
              }} />
            )}
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>
              BankOffer AI / {t('nav.adminPortal')}
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: 24, maxWidth: 1000, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

            {/* ═══════════════ KILL SWITCH ═══════════════ */}
            {activeTab === 'killswitch' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  background: 'var(--color-background-primary)',
                  border: `2px solid ${ksData?.active ? '#A32D2D' : '#3B6D11'}`,
                  borderRadius: 12, padding: '20px 24px',
                }}>
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t('admin.engineTitle')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: ksData?.active ? '#A32D2D' : '#3B6D11' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: ksData?.active ? 'var(--color-negative)' : 'var(--color-positive)' }}>
                        {ksData?.active ? t('admin.engineHalted') : t('admin.engineRunning')}
                      </span>
                    </div>
                  </div>

                  {ksData?.active && (
                    <div style={{
                      fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 16,
                      background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px',
                    }}>
                      <span style={{ fontWeight: 500 }}>{t('admin.setBy')}</span> {ksData.set_by} &nbsp;·&nbsp;
                      <span style={{ fontWeight: 500 }}>{t('admin.at')}</span> {ksData.set_at ? new Date(ksData.set_at).toLocaleString() : ''}<br />
                      <span style={{ fontWeight: 500 }}>Reason:</span> {ksData.reason}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ ...sectionLabel, display: 'block', marginBottom: 6 }}>{t('admin.reason')}</label>
                      <input
                        type="text"
                        value={killReason}
                        onChange={e => setKillReason(e.target.value)}
                        placeholder={t('admin.reasonPlaceholder')}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8,
                          padding: '8px 10px', fontSize: 13, outline: 'none',
                          background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)',
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
                        color: 'white', opacity: !killReason.trim() ? 0.4 : 1, whiteSpace: 'nowrap',
                      }}
                    >
                      {ksData?.active ? t('admin.resumeEngine') : t('admin.haltEngine')}
                    </button>
                  </div>
                </div>

                <div style={{
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 12, padding: '14px 20px',
                  fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7,
                }}>
                  <p style={{ ...sectionLabel, marginBottom: 6 }}>{t('admin.complianceNote')}</p>
                  {t('admin.complianceText')}
                </div>
              </div>
            )}

            {/* ═══════════════ PRODUCT CATALOG ═══════════════ */}
            {activeTab === 'catalog' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <p style={{ fontSize: 15, fontWeight: 600 }}>{t('admin.products')}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <p style={sectionLabel}>{t('admin.products_count').replace('{n}', String(CATALOG_PRODUCTS.length))}</p>
                    <button
                      onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setFormErrors({}); goToTab('productform'); }}
                      style={{
                        fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 6,
                        background: '#185FA5', color: 'white', border: 'none', cursor: 'pointer',
                      }}
                    >{t('admin.newProduct')}</button>
                  </div>
                </div>

                <div style={{
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-background-secondary)' }}>
                        <th style={thStyle}>{t('admin.formName')}</th>
                        <th style={{ ...thStyle, width: 120 }}>{t('admin.formCategory')}</th>
                        <th style={{ ...thStyle, width: 80 }}>{t('admin.formStatus')}</th>
                        <th style={{ ...thStyle, width: 80 }}>Channel</th>
                        <th style={{ ...thStyle }}>Description</th>
                        <th style={{ ...thStyle, width: 70, textAlign: 'right' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {CATALOG_PRODUCTS.map(p => {
                        const catColor = CATEGORY_COLORS[p.category];
                        const isExpanded = expanded[p.id];
                        const shortDesc = p.description.length > 80
                          ? p.description.slice(0, 80) + '…'
                          : p.description;
                        const isEditing = editingId === p.id;
                        return (
                          <tr key={p.id} style={{
                            borderBottom: '0.5px solid var(--color-border-tertiary)',
                            background: isEditing ? 'var(--color-sidebar-active)' : 'transparent',
                          }}>
                            <td style={{ padding: '11px 14px' }}>
                              <p
                                onClick={() => viewProduct(p)}
                                style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer', color: 'var(--color-action)' }}
                              >{p.name}</p>
                              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{p.code}</p>
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{
                                fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                                padding: '2px 7px', borderRadius: 10,
                                background: catColor.bg, color: catColor.text,
                              }}>{p.category.toUpperCase()}</span>
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{
                                fontSize: 11, fontWeight: 500,
                                color: p.status === 'active' ? 'var(--color-positive)' : 'var(--color-text-muted)',
                              }}>
                                {p.status === 'active' ? t('admin.enabled') : p.status}
                              </span>
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.channel}</span>
                            </td>
                            <td style={{ padding: '11px 14px', maxWidth: 300 }}>
                              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                                {isExpanded ? p.description : shortDesc}
                              </p>
                              {p.description.length > 80 && (
                                <button
                                  onClick={() => setExpanded(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 11, color: 'var(--color-action)', padding: 0, marginTop: 3,
                                  }}
                                >{isExpanded ? t('admin.showLess') : t('admin.showMore')}</button>
                              )}
                            </td>
                            <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                              <button
                                onClick={() => handleEdit(p)}
                                style={{
                                  fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 6,
                                  background: isEditing ? 'var(--color-action)' : 'transparent',
                                  color: isEditing ? 'white' : 'var(--color-action)',
                                  border: '1px solid var(--color-action)', cursor: 'pointer',
                                }}
                              >{t('admin.editBtn')}</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ═══════════════ PRODUCT DETAIL ═══════════════ */}
            {activeTab === 'productdetail' && selectedProduct && (() => {
              const targetAttr = selectedProduct.attributes.find(a => a.label === 'Target');
              const catColor = CATEGORY_COLORS[selectedProduct.category];
              const detailSections = [
                { label: 'Category', value: selectedProduct.category },
                { label: 'Target Customer', value: targetAttr?.value ?? '—' },
                { label: 'Eligibility Criteria', value: selectedProduct.eligibility ?? '—' },
                { label: 'Suitability Criteria', value: selectedProduct.suitability ?? '—' },
                { label: 'Trigger Signals', value: selectedProduct.triggerSignals ?? '—' },
              ];
              return (
                <div>
                  {/* Back + title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <button
                      onClick={() => goToTab('catalog')}
                      style={{
                        fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 6,
                        background: 'transparent', color: 'var(--color-action)',
                        border: '1px solid var(--color-action)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 15, lineHeight: 1 }}>&larr;</span> Back to Catalog
                    </button>
                  </div>

                  {/* Product header card */}
                  <div style={{
                    background: 'var(--color-background-primary)',
                    border: '0.5px solid var(--color-border-tertiary)',
                    borderRadius: 12, padding: '24px 28px', marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                        padding: '2px 8px', borderRadius: 10,
                        background: catColor.bg, color: catColor.text,
                      }}>{selectedProduct.category.toUpperCase()}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 500,
                        color: selectedProduct.status === 'active' ? 'var(--color-positive)' : 'var(--color-text-muted)',
                      }}>
                        {selectedProduct.status === 'active' ? '● Active' : selectedProduct.status}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                        {selectedProduct.code}
                      </span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, marginBottom: 6 }}>
                      {selectedProduct.name}
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {selectedProduct.description}
                    </p>
                  </div>

                  {/* Detail sections */}
                  <div style={{
                    background: 'var(--color-background-primary)',
                    border: '0.5px solid var(--color-border-tertiary)',
                    borderRadius: 12, overflow: 'hidden',
                  }}>
                    {detailSections.map((section, idx) => (
                      <div
                        key={section.label}
                        style={{
                          padding: '16px 28px',
                          borderBottom: idx < detailSections.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                          display: 'flex', flexDirection: 'column', gap: 6,
                        }}
                      >
                        <span style={{
                          fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                          letterSpacing: '0.06em', color: 'var(--color-text-muted)',
                        }}>
                          {section.label}
                        </span>
                        {section.label === 'Trigger Signals' && section.value !== '—' ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {section.value.split(',').map(s => s.trim()).filter(Boolean).map(signal => (
                              <span key={signal} style={{
                                fontSize: 11, fontWeight: 500, fontFamily: 'monospace',
                                padding: '3px 10px', borderRadius: 6,
                                background: 'var(--color-background-secondary)',
                                border: '0.5px solid var(--color-border-tertiary)',
                                color: 'var(--color-text-secondary)',
                              }}>{signal}</span>
                            ))}
                          </div>
                        ) : section.label === 'Category' ? (
                          <span style={{
                            fontSize: 13, fontWeight: 500,
                            color: catColor.text,
                          }}>{section.value}</span>
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                            {section.value}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Edit button */}
                  <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleEdit(selectedProduct)}
                      style={{
                        fontSize: 13, fontWeight: 500, padding: '9px 24px', borderRadius: 8,
                        background: '#185FA5', color: 'white', border: 'none', cursor: 'pointer',
                      }}
                    >{t('admin.editBtn')}</button>
                  </div>
                </div>
              );
            })()}

            {/* ═══════════════ PRODUCT DEFINITION FORM ═══════════════ */}
            {activeTab === 'productform' && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{t('admin.productDefinition')}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {editingProduct
                      ? t('admin.editingProduct').replace('{name}', editingProduct.name)
                      : t('admin.newProduct')}
                  </p>
                </div>

                <div style={{
                  background: 'var(--color-background-primary)',
                  border: editingId ? '1px solid var(--color-action)' : '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 12, padding: '22px 26px',
                  display: 'flex', flexDirection: 'column', gap: 20,
                }}>

                  {/* Name + Category */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                    <div>
                      <label style={fieldLabel}>
                        {t('admin.formName')} <span style={{ color: 'var(--color-negative)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        maxLength={80}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. ETF Growth Portfolio"
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = 'var(--color-action)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--color-border-tertiary)')}
                      />
                      {formErrors.name && <p style={errorText}>{formErrors.name}</p>}
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3 }}>{form.name.length}/80</p>
                    </div>
                    <div>
                      <label style={fieldLabel}>
                        {t('admin.formCategory')} <span style={{ color: 'var(--color-negative)' }}>*</span>
                      </label>
                      <select
                        value={form.category}
                        onChange={e => setForm(p => ({ ...p, category: e.target.value as ProductCategory }))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="">— Select —</option>
                        {ALL_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {formErrors.category && <p style={errorText}>{formErrors.category}</p>}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label style={fieldLabel}>{t('admin.formStatus')}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['active', 'draft', 'archived'] as ProductStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setForm(p => ({ ...p, status: s }))}
                          style={{
                            fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 6,
                            border: `1px solid ${form.status === s ? 'var(--color-action)' : 'var(--color-border-tertiary)'}`,
                            background: form.status === s ? 'var(--color-action)' : 'transparent',
                            color: form.status === s ? 'white' : 'var(--color-text-secondary)',
                            cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                          }}
                        >{s}</button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label style={fieldLabel}>{t('admin.formDesc')}</label>
                    <textarea
                      value={form.description}
                      maxLength={300}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Short product description…"
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
                    />
                    {formErrors.description && <p style={errorText}>{formErrors.description}</p>}
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3 }}>{form.description.length}/300</p>
                  </div>

                  {/* Attributes */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={fieldLabel}>{t('admin.formAttribs')}</label>
                      <button
                        onClick={() => setForm(p => ({ ...p, attributes: [...p.attributes, { label: '', value: '' }] }))}
                        style={{
                          fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6,
                          background: 'transparent', color: 'var(--color-action)',
                          border: '1px solid var(--color-action)', cursor: 'pointer',
                        }}
                      >{t('admin.addAttrib')}</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {form.attributes.map((attr, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="text"
                            value={attr.label}
                            onChange={e => updateAttr(idx, 'label', e.target.value)}
                            placeholder="Label"
                            style={{ ...inputStyle, width: '38%', flexShrink: 0 }}
                          />
                          <input
                            type="text"
                            value={attr.value}
                            onChange={e => updateAttr(idx, 'value', e.target.value)}
                            placeholder="Value"
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          {form.attributes.length > 1 && (
                            <button
                              onClick={() => setForm(p => ({ ...p, attributes: p.attributes.filter((_, i) => i !== idx) }))}
                              style={{
                                fontSize: 11, padding: '5px 10px', borderRadius: 6, flexShrink: 0,
                                background: 'transparent', color: 'var(--color-negative)',
                                border: '1px solid var(--color-negative)', cursor: 'pointer',
                              }}
                            >{t('admin.removeAttrib')}</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interest Rate + Credit Limit */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={fieldLabel}>{t('admin.formRate')}</label>
                      <input
                        type="number"
                        value={form.interestRate}
                        onChange={e => setForm(p => ({ ...p, interestRate: e.target.value }))}
                        min={0} max={100} step={0.01}
                        placeholder="e.g. 4.25"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabel}>{t('admin.formLimit')}</label>
                      <input
                        type="number"
                        value={form.creditLimit}
                        onChange={e => setForm(p => ({ ...p, creditLimit: e.target.value }))}
                        min={0} step={100}
                        placeholder="e.g. 25000"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Channel + Priority */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={fieldLabel}>Channel</label>
                      <input
                        type="text"
                        value={form.channel}
                        onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
                        placeholder="e.g. app, RM, branch"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={fieldLabel}>Priority</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {['high', 'medium', 'low'].map(pr => (
                          <button
                            key={pr}
                            onClick={() => setForm(p => ({ ...p, priority: pr }))}
                            style={{
                              fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 6,
                              border: `1px solid ${form.priority === pr ? 'var(--color-action)' : 'var(--color-border-tertiary)'}`,
                              background: form.priority === pr ? 'var(--color-action)' : 'transparent',
                              color: form.priority === pr ? 'white' : 'var(--color-text-secondary)',
                              cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                            }}
                          >{pr}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Eligibility */}
                  <div>
                    <label style={fieldLabel}>{t('admin.formElig')}</label>
                    <textarea
                      value={form.eligibility}
                      maxLength={500}
                      onChange={e => setForm(p => ({ ...p, eligibility: e.target.value }))}
                      placeholder="Eligibility criteria…"
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
                    />
                  </div>

                  {/* Trigger Signals */}
                  <div>
                    <label style={fieldLabel}>Trigger Signals</label>
                    <input
                      type="text"
                      value={form.triggerSignals}
                      onChange={e => setForm(p => ({ ...p, triggerSignals: e.target.value }))}
                      placeholder="e.g. idle_cash_high, salary_increase"
                      style={inputStyle}
                    />
                  </div>

                  {/* Code + Effective Date */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={fieldLabel}>
                        {t('admin.formCode')} <span style={{ color: 'var(--color-negative)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={form.code}
                        onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. ETFGROW"
                        maxLength={12}
                        style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.05em' }}
                      />
                      {formErrors.code && <p style={errorText}>{formErrors.code}</p>}
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3 }}>
                        ^[A-Z0-9]&#123;4,12&#125;
                      </p>
                    </div>
                    <div>
                      <label style={fieldLabel}>
                        {t('admin.formDate')} <span style={{ color: 'var(--color-negative)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={form.effectiveDate}
                        onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))}
                        style={inputStyle}
                      />
                      {formErrors.effectiveDate && <p style={errorText}>{formErrors.effectiveDate}</p>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button
                      onClick={handleSave}
                      style={{
                        fontSize: 13, fontWeight: 500, padding: '9px 24px', borderRadius: 8,
                        background: '#185FA5', color: 'white', border: 'none', cursor: 'pointer',
                      }}
                    >{t('admin.saveProduct')}</button>
                    <button
                      onClick={handleCancel}
                      style={{
                        fontSize: 13, fontWeight: 500, padding: '9px 20px', borderRadius: 8,
                        background: 'transparent', color: 'var(--color-text-secondary)',
                        border: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer',
                      }}
                    >{t('admin.cancelEdit')}</button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ USERS ═══════════════ */}
            {activeTab === 'users' && (
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{t('admin.userMgmt')}</p>
                <p style={{ ...sectionLabel, marginBottom: 10 }}>
                  {t('admin.users_count').replace('{n}', String(usersData?.users.length ?? 0))}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(usersData?.users ?? []).map(u => (
                    <div key={u.user_id} style={{
                      background: 'var(--color-background-primary)',
                      border: '0.5px solid var(--color-border-tertiary)',
                      borderRadius: 8, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      opacity: u.is_active ? 1 : 0.45,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'var(--color-background-light-info)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 600, color: 'var(--color-action)', flexShrink: 0,
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
                        >{u.is_active ? t('admin.deactivate') : t('admin.activate')}</button>
                      </div>
                    </div>
                  ))}
                  {!usersData && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('admin.loadingUsers')}</p>}
                </div>
              </div>
            )}

            {/* ═══════════════ AUDIT TRAIL ═══════════════ */}
            {activeTab === 'audit' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 15, fontWeight: 600 }}>{t('admin.auditTrail')}</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...sectionLabel, display: 'block', marginBottom: 6 }}>
                      {t('admin.auditCustomerId')}
                    </label>
                    <input
                      type="text"
                      value={auditCustomerId}
                      onChange={e => setAuditCustomerId(e.target.value)}
                      placeholder={t('admin.auditPlaceholder')}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && auditCustomerId.trim()) {
                          setAuditSearch(auditCustomerId.trim());
                          setTimeout(() => refetchAudit(), 0);
                        }
                      }}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        border: '0.5px solid var(--color-border-tertiary)', borderRadius: 8,
                        padding: '8px 10px', fontSize: 13, outline: 'none',
                        background: 'var(--color-background-primary)', color: 'var(--color-text-primary)',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => { setAuditSearch(auditCustomerId.trim()); setTimeout(() => refetchAudit(), 0); }}
                    disabled={!auditCustomerId.trim() || auditFetching}
                    style={{
                      fontSize: 13, fontWeight: 500, padding: '8px 20px', borderRadius: 8,
                      border: 'none', background: 'var(--color-action)', color: 'white',
                      cursor: !auditCustomerId.trim() ? 'not-allowed' : 'pointer',
                      opacity: !auditCustomerId.trim() ? 0.4 : 1,
                    }}
                  >{auditFetching ? t('admin.auditSearching') : t('admin.auditSearch')}</button>
                </div>

                {auditData && (
                  <div>
                    <p style={{ ...sectionLabel, marginBottom: 10 }}>
                      {t('admin.auditRecords').replace('{n}', String(auditData.total)).replace('{id}', auditSearch)}
                    </p>
                    {auditData.audit_records.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('admin.noAudit')}</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {auditData.audit_records.map(r => (
                          <div key={r.audit_id} style={{
                            background: 'var(--color-background-primary)',
                            border: '0.5px solid var(--color-border-tertiary)',
                            borderRadius: 8, padding: '12px 16px',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 500, fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{r.audit_id}</span>
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{new Date(r.timestamp).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                              {[
                                { label: t('admin.modelVersion'), value: r.model_version },
                                { label: t('admin.llmUsed'), value: r.llm_used ? `Yes (${r.llm_model})` : 'No (rule-based)' },
                                { label: t('admin.consent'), value: r.compliance?.profiling_consent_given ? 'Yes' : 'No' },
                              ].map(item => (
                                <div key={item.label}>
                                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{item.label}</p>
                                  <p style={{ fontSize: 12, fontWeight: 500 }}>{String(item.value)}</p>
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

            {/* ═══════════════ COMPLIANCE STATISTICS ═══════════════ */}
            {activeTab === 'compliance' && (() => {
              const total = MOCK_CUSTOMERS.length;
              const consentTypes = [
                { key: 'gdpr',       label: 'GDPR / Data Processing', description: 'Consent to process personal and financial data for personalised recommendations.' },
                { key: 'marketing',  label: 'Marketing Communications', description: 'Consent to receive marketing messages via email, SMS, and push.' },
                { key: 'profiling',  label: 'AI Profiling',            description: 'Consent to use AI models to build behavioural and financial profiles.' },
                { key: 'analytics',  label: 'Analytics',               description: 'Consent to use anonymised transaction data for product analytics.' },
              ] as const;

              const stats = consentTypes.map(ct => {
                const agreed = MOCK_CUSTOMERS.filter(c => getConsent(c.customer_id)[ct.key]).length;
                return { ...ct, agreed, declined: total - agreed, pct: Math.round((agreed / total) * 100) };
              });

              const overallPct = Math.round(stats.reduce((s, st) => s + st.pct, 0) / stats.length);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Summary banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {[
                      { label: 'Total Customers', value: String(total), color: 'var(--color-action)' },
                      { label: 'Avg Opt-in Rate', value: `${overallPct}%`, color: '#3B6D11' },
                      { label: 'Consent Types', value: String(consentTypes.length), color: '#7C3AED' },
                    ].map(card => (
                      <div key={card.label} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '16px 20px' }}>
                        <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 8 }}>{card.label}</p>
                        <p style={{ fontSize: 28, fontWeight: 700, color: card.color }}>{card.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Per-consent-type cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {stats.map(st => (
                      <div key={st.key} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '18px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{st.label}</p>
                            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', maxWidth: 500 }}>{st.description}</p>
                          </div>
                          <span style={{ fontSize: 22, fontWeight: 700, color: st.pct >= 70 ? '#3B6D11' : st.pct >= 40 ? '#854F0B' : '#A32D2D', marginLeft: 20, flexShrink: 0 }}>{st.pct}%</span>
                        </div>

                        {/* Progress bar */}
                        <div style={{ height: 10, borderRadius: 5, background: 'var(--color-background-secondary)', overflow: 'hidden', marginBottom: 10 }}>
                          <div style={{ height: '100%', width: `${st.pct}%`, background: st.pct >= 70 ? '#3B6D11' : st.pct >= 40 ? '#F59E0B' : '#A32D2D', borderRadius: 5, transition: 'width 0.4s' }} />
                        </div>

                        {/* Agreed / Declined counts */}
                        <div style={{ display: 'flex', gap: 24 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#3B6D11', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              <span style={{ fontWeight: 600, color: '#3B6D11' }}>{st.agreed}</span> agreed
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: '#A32D2D', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                              <span style={{ fontWeight: 600, color: '#A32D2D' }}>{st.declined}</span> declined
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>out of {total} customers</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '14px 20px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                    <p style={{ ...sectionLabel, marginBottom: 6 }}>Note</p>
                    Consent data is derived from the current customer dataset. Statistics are computed at page load and reflect the snapshot at that moment. Individual consent changes take effect immediately across all recommendation channels.
                  </div>
                </div>
              );
            })()}

          {/* ═══════════════ SCHEDULED AGENTS ═══════════════ */}
          {activeTab === 'agents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Scheduled Agents</p>
                <p style={sectionLabel}>
                  {agentsData?.agents?.length ?? 0} agent{(agentsData?.agents?.length ?? 0) !== 1 ? 's' : ''} registered
                </p>
              </div>

              {!agentsData && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Loading agents...</p>
              )}

              {(agentsData?.agents ?? []).map(agent => (
                <div key={agent.agent_id} style={{
                  background: 'var(--color-background-primary)',
                  border: '0.5px solid var(--color-border-tertiary)',
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  {/* Agent header */}
                  <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <p style={{ fontSize: 14, fontWeight: 600 }}>{agent.name}</p>
                        <span style={{
                          fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                          padding: '2px 8px', borderRadius: 10,
                          background: '#185FA522', color: '#185FA5',
                        }}>{agent.schedule.toUpperCase()}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {agent.description}
                      </p>
                      {agent.last_run && (
                        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                          <div>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last run</span>
                            <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                              {agent.last_run.started_at ? new Date(agent.last_run.started_at).toLocaleString() : '—'}
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</span>
                            <p style={{
                              fontSize: 12, fontWeight: 500, marginTop: 2,
                              color: agent.last_run.status === 'completed' ? 'var(--color-positive)' : agent.last_run.status === 'failed' ? 'var(--color-negative)' : 'var(--color-text-primary)',
                            }}>
                              {agent.last_run.status === 'completed' ? 'Completed' : agent.last_run.status === 'running' ? 'Running...' : agent.last_run.status === 'failed' ? 'Failed' : agent.last_run.status}
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Users notified</span>
                            <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{agent.last_run.users_notified}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => triggerAgentMutation.mutate(agent.agent_id)}
                        disabled={triggerAgentMutation.isPending}
                        style={{
                          fontSize: 13, fontWeight: 500, padding: '9px 20px', borderRadius: 8,
                          background: '#185FA5', color: 'white', border: 'none',
                          cursor: triggerAgentMutation.isPending ? 'not-allowed' : 'pointer',
                          opacity: triggerAgentMutation.isPending ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >{triggerAgentMutation.isPending ? 'Running...' : 'Run Now'}</button>
                      <button
                        onClick={() => setExpandedAgent(expandedAgent === agent.agent_id ? null : agent.agent_id)}
                        style={{
                          fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 6,
                          background: 'transparent', color: 'var(--color-action)',
                          border: '1px solid var(--color-action)', cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >{expandedAgent === agent.agent_id ? 'Hide History' : 'Run History'}</button>
                    </div>
                  </div>

                  {/* Run history (expandable) */}
                  {expandedAgent === agent.agent_id && (
                    <div style={{
                      borderTop: '0.5px solid var(--color-border-tertiary)',
                      padding: '14px 24px',
                      background: 'var(--color-background-secondary)',
                    }}>
                      {agent.history.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>No runs yet.</p>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle, background: 'transparent' }}>Started</th>
                              <th style={{ ...thStyle, background: 'transparent' }}>Status</th>
                              <th style={{ ...thStyle, background: 'transparent' }}>Users</th>
                              <th style={{ ...thStyle, background: 'transparent' }}>Triggered By</th>
                              <th style={{ ...thStyle, background: 'transparent' }}>Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agent.history.map(run => {
                              const duration = run.started_at && run.completed_at
                                ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                                : '—';
                              return (
                                <tr key={run.id} style={{ borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                                  <td style={{ padding: '8px 14px', fontSize: 12 }}>
                                    {run.started_at ? new Date(run.started_at).toLocaleString() : '—'}
                                  </td>
                                  <td style={{ padding: '8px 14px' }}>
                                    <span style={{
                                      fontSize: 11, fontWeight: 500,
                                      color: run.status === 'completed' ? 'var(--color-positive)' : run.status === 'failed' ? 'var(--color-negative)' : 'var(--color-text-primary)',
                                    }}>{run.status}</span>
                                  </td>
                                  <td style={{ padding: '8px 14px', fontSize: 12 }}>{run.users_notified}</td>
                                  <td style={{ padding: '8px 14px', fontSize: 12 }}>{run.triggered_by}</td>
                                  <td style={{ padding: '8px 14px', fontSize: 12 }}>{duration}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  );
}
