import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// Only a real https:// address and a non-empty key count as "configured".
// Anything else returns null, so importing this file can never throw.
export const supabaseConfigured = Boolean(url && url.startsWith('https://') && key && key.trim());

const clients = new Map<string, SupabaseClient | null>();

/** One shared, safe Supabase client per kind: "site" (build time, no session) or "browser" (keeps the login). */
export function getSupabase(kind: 'site' | 'browser' = 'site'): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!clients.has(kind)) {
    try {
      clients.set(
        kind,
        createClient(url as string, key as string, {
          auth: { persistSession: kind === 'browser', autoRefreshToken: kind === 'browser', detectSessionInUrl: false },
        })
      );
    } catch (e) {
      console.warn('[supabase] Could not create the client:', e);
      clients.set(kind, null);
    }
  }
  return clients.get(kind) ?? null;
}
