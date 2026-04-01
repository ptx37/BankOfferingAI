// Shared localStorage-based notification store.
// Employee writes → Customer reads via same localStorage key.
// Key format: notifications_{customerId}

export interface AppNotification {
  id: string;
  customerId: string;
  productName: string;
  productId: string;
  message: string;
  sentBy: string;
  timestamp: string;
  read: boolean;
}

const storeKey = (customerId: string) => `notifications_${customerId}`;

export function getNotifications(customerId: string): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(storeKey(customerId)) || '[]');
  } catch {
    return [];
  }
}

export function addNotification(
  customerId: string,
  payload: Pick<AppNotification, 'productName' | 'productId' | 'message' | 'sentBy'>
): void {
  if (typeof window === 'undefined') return;
  const existing = getNotifications(customerId);
  const notif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    customerId,
    timestamp: new Date().toISOString(),
    read: false,
    ...payload,
  };
  localStorage.setItem(storeKey(customerId), JSON.stringify([notif, ...existing]));
}

export function markAllRead(customerId: string): void {
  if (typeof window === 'undefined') return;
  const updated = getNotifications(customerId).map(n => ({ ...n, read: true }));
  localStorage.setItem(storeKey(customerId), JSON.stringify(updated));
}

export function getUnreadCount(customerId: string): number {
  return getNotifications(customerId).filter(n => !n.read).length;
}
