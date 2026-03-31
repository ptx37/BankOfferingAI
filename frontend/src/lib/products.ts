// Source of truth: AI_Hackathon_Product_Offering_Engine_Dataset_v1.xlsx
// Sheets: "Product Catalog" + "Product definition"
// DO NOT manually add/alter/remove products — sync from Excel only.

export type ProductCategory =
  | 'Investments'
  | 'Savings'
  | 'Retirement'
  | 'Lending'
  | 'Cards'
  | 'Insurance';

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface ProductAttribute {
  label: string;
  value: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  attributes: ProductAttribute[];
  status: ProductStatus;
  interestRate?: number;
  creditLimit?: number;
  eligibility?: string;
  suitability?: string;
  triggerSignals?: string;
  channel: string;
  priority: string;
  lifecycleStage: string;
  financialHealthRequired: string;
  riskBucket: string;
  code: string;
  effectiveDate: string;
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'PROD-001',
    name: 'ETF Starter Portfolio',
    category: 'Investments',
    description: 'Entry-level investing with diversified ETFs — ideal for first-time investors looking for moderate growth.',
    attributes: [
      { label: 'Target', value: 'First-time investors' },
      { label: 'Min. Savings', value: '€5,000' },
      { label: 'Risk', value: 'Moderate' },
      { label: 'Investor Readiness', value: 'Medium / High' },
    ],
    status: 'active',
    eligibility: 'age ≥ 18, income > €3,000, active account',
    suitability: 'savings > €5,000, monthly savings > €300, debt-to-income < 1, risk = moderate/high',
    triggerSignals: 'idle_cash_high, salary_increase, monthly_savings_consistent',
    channel: 'app',
    priority: 'high',
    lifecycleStage: 'onboarding',
    financialHealthRequired: 'healthy',
    riskBucket: 'moderate',
    code: 'ETFSTR',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-002',
    name: 'ETF Growth Portfolio',
    category: 'Investments',
    description: 'High-return investment strategy for experienced investors with significant idle capital.',
    attributes: [
      { label: 'Target', value: 'Experienced investors' },
      { label: 'Min. Savings', value: '€10,000' },
      { label: 'Risk', value: 'High' },
      { label: 'Investor Readiness', value: 'High' },
    ],
    status: 'active',
    eligibility: 'income > €5,000, active account',
    suitability: 'savings > €10,000, monthly savings > €500, risk = high',
    triggerSignals: 'idle_cash_high, investment_gap',
    channel: 'app',
    priority: 'high',
    lifecycleStage: 'growth',
    financialHealthRequired: 'healthy',
    riskBucket: 'high',
    code: 'ETFGROW',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-003',
    name: 'Mutual Funds',
    category: 'Investments',
    description: 'Guided investing for beginners — professionally managed fund with broad diversification.',
    attributes: [
      { label: 'Target', value: 'Clients needing guidance' },
      { label: 'Min. Savings', value: '€5,000' },
      { label: 'Risk', value: 'Low / Moderate' },
      { label: 'Channel', value: 'Branch / RM' },
    ],
    status: 'active',
    eligibility: 'age ≥ 18, income > €3,000',
    suitability: 'savings > €5,000, moderate behavior, low/moderate risk',
    triggerSignals: 'idle_cash_high, investment_gap, monthly_savings_consistent',
    channel: 'RM / branch',
    priority: 'high',
    lifecycleStage: 'onboarding',
    financialHealthRequired: 'healthy',
    riskBucket: 'low / moderate',
    code: 'MUTFND',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-004',
    name: 'Managed Portfolio',
    category: 'Investments',
    description: 'Advisory-based investment strategy for high-value clients with complex financial needs.',
    attributes: [
      { label: 'Target', value: 'High-value clients' },
      { label: 'Min. Savings', value: '€20,000' },
      { label: 'Risk', value: 'Moderate / High' },
      { label: 'Channel', value: 'RM only' },
    ],
    status: 'active',
    eligibility: 'income > €8,000',
    suitability: 'savings > €20,000, risk = moderate/high',
    triggerSignals: 'high_income_no_investments',
    channel: 'RM',
    priority: 'high',
    lifecycleStage: 'premium',
    financialHealthRequired: 'healthy',
    riskBucket: 'moderate / high',
    code: 'MGDPRT',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-005',
    name: 'State Bonds / Treasury Bills',
    category: 'Savings',
    description: 'Capital protection against inflation — government-backed instruments with fixed returns.',
    attributes: [
      { label: 'Target', value: 'Risk-averse clients' },
      { label: 'Min. Savings', value: '€5,000' },
      { label: 'Risk', value: 'Low' },
      { label: 'Channel', value: 'Branch / Phone' },
    ],
    status: 'active',
    interestRate: 4.5,
    eligibility: 'age ≥ 18, active account',
    suitability: 'risk = low, savings > €5,000',
    triggerSignals: 'idle_cash_high, inflation_exposed',
    channel: 'branch / phone',
    priority: 'high',
    lifecycleStage: 'retention',
    financialHealthRequired: 'healthy / watchlist',
    riskBucket: 'low',
    code: 'STBOND',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-006',
    name: 'Savings Deposit',
    category: 'Savings',
    description: 'Safe savings with fixed return — ideal for clients seeking capital preservation and predictable yield.',
    attributes: [
      { label: 'Target', value: 'Risk-averse savers' },
      { label: 'Min. Savings', value: '€3,000' },
      { label: 'Risk', value: 'Low' },
      { label: 'Channel', value: 'App' },
    ],
    status: 'active',
    interestRate: 3.0,
    eligibility: 'active account',
    suitability: 'savings > €3,000, low risk',
    triggerSignals: 'idle_cash_high, no_investments',
    channel: 'app',
    priority: 'medium',
    lifecycleStage: 'onboarding',
    financialHealthRequired: 'healthy / watchlist',
    riskBucket: 'low',
    code: 'SAVDEP',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-007',
    name: 'Private Pension (Pillar III)',
    category: 'Retirement',
    description: 'Long-term retirement savings with tax advantages — voluntary private pension plan.',
    attributes: [
      { label: 'Target', value: 'Long-term savers' },
      { label: 'Min. Monthly', value: '€500' },
      { label: 'Risk', value: 'Low / Moderate' },
      { label: 'Channel', value: 'App / RM' },
    ],
    status: 'active',
    eligibility: 'income > €3,000',
    suitability: 'monthly savings > €500, risk = low/moderate',
    triggerSignals: 'monthly_savings_consistent',
    channel: 'app / RM',
    priority: 'medium',
    lifecycleStage: 'growth',
    financialHealthRequired: 'healthy',
    riskBucket: 'low / moderate',
    code: 'PRIVPEN',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-008',
    name: 'Personal Loan',
    category: 'Lending',
    description: 'Flexible financing for personal needs — fast approval for qualified customers.',
    attributes: [
      { label: 'Target', value: 'Customers needing liquidity' },
      { label: 'Min. Income', value: '€3,000/mo' },
      { label: 'Risk', value: 'Any' },
      { label: 'Channel', value: 'App / RM' },
    ],
    status: 'active',
    interestRate: 8.5,
    eligibility: 'income > €3,000',
    suitability: 'stable income, acceptable debt',
    triggerSignals: 'high_expenses, large_purchase',
    channel: 'app / RM',
    priority: 'high',
    lifecycleStage: 'need-based',
    financialHealthRequired: 'watchlist / healthy',
    riskBucket: 'any',
    code: 'PRSLOAN',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-009',
    name: 'Mortgage',
    category: 'Lending',
    description: 'Financing for home purchase — competitive rates for renters with strong, stable income.',
    attributes: [
      { label: 'Target', value: 'Renters with strong income' },
      { label: 'Min. Income', value: '€6,000/mo' },
      { label: 'Condition', value: 'No existing mortgage' },
      { label: 'Channel', value: 'RM only' },
    ],
    status: 'active',
    interestRate: 4.5,
    eligibility: 'income > €6,000, no existing mortgage',
    suitability: 'stable income, low debt-to-income',
    triggerSignals: 'bonus_event, rent_pattern',
    channel: 'RM',
    priority: 'high',
    lifecycleStage: 'milestone',
    financialHealthRequired: 'healthy',
    riskBucket: 'any',
    code: 'MORTG',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-010',
    name: 'Credit Card (Installments)',
    category: 'Cards',
    description: 'Flexible payments and installments for active spenders — revolving credit with cashback.',
    attributes: [
      { label: 'Target', value: 'Active spenders' },
      { label: 'Min. Income', value: '€2,500/mo' },
      { label: 'Risk', value: 'Any' },
      { label: 'Channel', value: 'App' },
    ],
    status: 'active',
    interestRate: 18.9,
    creditLimit: 10000,
    eligibility: 'income > €2,500, active account',
    suitability: 'frequent transactions, moderate spending, no excessive debt',
    triggerSignals: 'high_transaction_volume, shopping_pattern, recurring_spend',
    channel: 'app',
    priority: 'high',
    lifecycleStage: 'engagement',
    financialHealthRequired: 'watchlist / healthy',
    riskBucket: 'any',
    code: 'CRDCARD',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-011',
    name: 'Life Insurance + Children Plan',
    category: 'Insurance',
    description: 'Financial protection for families with dependents — combined life and children savings plan.',
    attributes: [
      { label: 'Target', value: 'Families with dependents' },
      { label: 'Condition', value: 'Dependents > 0 OR married' },
      { label: 'Risk', value: 'Any' },
      { label: 'Channel', value: 'RM / Branch' },
    ],
    status: 'active',
    eligibility: 'age ≥ 18',
    suitability: 'dependents_count > 0 OR married',
    triggerSignals: 'child_event, family_context',
    channel: 'RM / branch',
    priority: 'high',
    lifecycleStage: 'protection',
    financialHealthRequired: 'healthy / watchlist',
    riskBucket: 'any',
    code: 'LIFEINS',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'PROD-012',
    name: 'Travel Insurance',
    category: 'Insurance',
    description: 'Coverage for travel risks — on-demand insurance for active travelers.',
    attributes: [
      { label: 'Target', value: 'Active travelers' },
      { label: 'Condition', value: 'Frequent travel spending' },
      { label: 'Risk', value: 'Any' },
      { label: 'Channel', value: 'App' },
    ],
    status: 'active',
    eligibility: 'active account',
    suitability: 'frequent travel spending',
    triggerSignals: 'travel_spike',
    channel: 'app',
    priority: 'medium',
    lifecycleStage: 'contextual',
    financialHealthRequired: 'any',
    riskBucket: 'any',
    code: 'TRVINS',
    effectiveDate: '2025-01-01',
  },
];

export const CATEGORY_COLORS: Record<ProductCategory, { bg: string; text: string }> = {
  Investments: { bg: '#185FA522', text: '#185FA5' },
  Savings:     { bg: '#3B6D1122', text: '#3B6D11' },
  Retirement:  { bg: '#7C3AED22', text: '#7C3AED' },
  Lending:     { bg: '#854F0B22', text: '#854F0B' },
  Cards:       { bg: '#0369A122', text: '#0369A1' },
  Insurance:   { bg: '#9D174D22', text: '#9D174D' },
};
