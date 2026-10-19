import { getSupabase } from './supabase';

// Tiny build-time loaders for the single-row tables. This file imports nothing from src/data,
// so src/data/site.ts can use it without creating an import cycle.

const cache = new Map<string, Promise<Record<string, any> | null>>();

export function fetchSingleRow(table: 'site_settings' | 'doctor_profile'): Promise<Record<string, any> | null> {
  let p = cache.get(table);
  if (!p) {
    p = (async () => {
      const sb = getSupabase('site');
      if (!sb) return null;
      try {
        const { data, error } = await sb.from(table).select('*').eq('id', 1).abortSignal(AbortSignal.timeout(8000)).maybeSingle();
        if (error) {
          console.warn(`[content] Could not load "${table}": ${error.message}. Using built-in content.`);
          return null;
        }
        return data;
      } catch {
        console.warn(`[content] Could not reach Supabase for "${table}". Using built-in content.`);
        return null;
      }
    })();
    cache.set(table, p);
  }
  return p;
}

/** Use the remote value only when it is a non-empty string. */
export const pick = (remote: unknown, fallback: string): string =>
  typeof remote === 'string' && remote.trim() ? remote.trim() : fallback;
