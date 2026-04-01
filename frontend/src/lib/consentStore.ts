// Shared localStorage-based consent store.
// Initializes from the deterministic formula on first access.
// All three portals read/write through this store.
// Key format: consent_{customerId}

export interface ConsentRecord {
  gdpr: boolean;
  marketing: boolean;
  profiling: boolean;
  analytics: boolean;
}

// Deterministic seed — matches legacy getPlaceholderConsent formula
function seedConsent(id: string): ConsentRecord {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return { gdpr: (n % 3) !== 0, marketing: (n % 4) !== 0, profiling: (n % 5) !== 0, analytics: (n % 7) !== 0 };
}

const storeKey = (customerId: string) => `consent_${customerId}`;

export function getConsent(customerId: string): ConsentRecord {
  if (typeof window === 'undefined') return seedConsent(customerId);
  try {
    const raw = localStorage.getItem(storeKey(customerId));
    if (raw) return JSON.parse(raw) as ConsentRecord;
  } catch { /* fall through */ }
  // First access — seed from formula and persist
  const seed = seedConsent(customerId);
  localStorage.setItem(storeKey(customerId), JSON.stringify(seed));
  return seed;
}

export function setConsent(customerId: string, updates: Partial<ConsentRecord>): ConsentRecord {
  if (typeof window === 'undefined') return seedConsent(customerId);
  const current = getConsent(customerId);
  const next = { ...current, ...updates };
  localStorage.setItem(storeKey(customerId), JSON.stringify(next));
  return next;
}
