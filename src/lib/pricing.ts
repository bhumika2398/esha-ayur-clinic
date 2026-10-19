import type { PriceItem } from '../data/prices';
import type { Treatment } from '../data/treatments';

/** 1800 -> "₹1,800" */
export const formatINR = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Linking rule (kept deliberately simple): a price item belongs to a treatment when its group name or its
 * service name matches the treatment's main name (the text before any bracket), ignoring case, spaces and punctuation.
 * "Matches" means one contains the other, so group "Shirodhara and Head" and service "Shiro Dhara" both link to
 * the treatment "Shirodhara (...)". A price item also links when it equals one of the treatment's "includes" entries.
 */
export function linkedPrices(t: Treatment, items: PriceItem[]): PriceItem[] {
  const key = norm(t.name.split('(')[0]);
  if (!key) return [];
  const includes = t.includes.map(norm).filter(Boolean);
  return items.filter((p) => {
    const g = norm(p.group_name);
    const s = norm(p.service);
    if (g && (g.includes(key) || key.includes(g))) return true;
    if (s && (s.includes(key) || key.includes(s))) return true;
    return includes.some((i) => i === s);
  });
}

/** The lowest session price among the given items, or null when none has a price. */
export function fromPrice(items: PriceItem[]): number | null {
  const prices = items.map((p) => p.price).filter((p): p is number => typeof p === 'number' && p > 0);
  return prices.length ? Math.min(...prices) : null;
}
