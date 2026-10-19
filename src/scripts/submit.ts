import { getSupabase } from '../lib/supabase';

export interface RequestInput {
  name: string;
  phone: string;
  department?: string;
  treatment?: string;
  visitType?: string;
  preferredDate?: string; // YYYY-MM-DD
  preferredTime?: string;
  message?: string;
  source: string;
  website?: string; // honeypot: real visitors leave it empty
}

// Optional Google Apps Script endpoint that appends the request to the clinic's Google Sheet
const endpoint = import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined;

const cut = (s: string | undefined, n: number): string => (s ?? '').trim().slice(0, n);

/**
 * Sends one appointment request to Supabase and to the Google Sheet endpoint at the same time.
 * Returns true when at least one of them accepted it. A "same phone within 2 minutes" rejection
 * counts as success, because the first request already reached the clinic.
 */
export async function submitRequest(input: RequestInput): Promise<boolean> {
  if (input.website) return true; // honeypot filled in: look successful, send nothing

  const row = {
    source: cut(input.source, 40),
    name: cut(input.name, 80),
    phone: input.phone.replace(/[^\d+]/g, '').slice(0, 16),
    department: cut(input.department, 80),
    treatment: cut(input.treatment, 160),
    visit_type: cut(input.visitType, 40),
    preferred_date: /^\d{4}-\d{2}-\d{2}$/.test(input.preferredDate ?? '') ? input.preferredDate : null,
    preferred_time: cut(input.preferredTime, 20),
    message: cut(input.message, 1000),
    status: 'new',
    consent: true,
  };

  const tasks: Promise<unknown>[] = [];

  const sb = getSupabase('site');
  if (sb) {
    tasks.push(
      (async () => {
        // No .select() after the insert: visitors are not allowed to read requests back
        const { error } = await sb.from('appointment_requests').insert(row);
        if (error && !/rate_limited/i.test(error.message)) throw error;
      })()
    );
  }

  if (endpoint) {
    tasks.push(
      fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors', // Apps Script does not send CORS headers; the request still arrives
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ ...row, preferred_date: row.preferred_date ?? '', consent: 'yes' }),
      })
    );
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((r) => {
    if (r.status === 'rejected') console.warn('[request] One destination failed:', r.reason);
  });
  return results.some((r) => r.status === 'fulfilled');
}
