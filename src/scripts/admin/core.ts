import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabase';

/* Shared helpers for every admin screen. Nothing here runs Supabase code at import time. */

export const sb: SupabaseClient | null = getSupabase('browser');
export const BUCKET = 'site-images';

export interface View {
  id: string;
  label: string;
  icon: string; // SVG path data
  title: string;
  render(root: HTMLElement): Promise<void>;
  dispose?(): void;
}

export type Row = { id: string; [key: string]: any };

export const db = (): SupabaseClient => {
  if (!sb) throw new Error('Supabase is not connected. Check the .env file.');
  return sb;
};

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

export const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const fmtINR = (n: number | null | undefined): string => (typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '');

export const ui = {
  input: 'w-full rounded-xl border border-olive-700/20 bg-white px-3.5 py-2.5 text-olive-800 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-400/40',
  btn: 'inline-flex items-center justify-center rounded-full border border-olive-700/25 px-4 py-2 text-sm font-semibold text-olive-800 transition hover:border-gold-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-700 disabled:opacity-40',
  primary: 'inline-flex items-center justify-center rounded-full bg-olive-700 px-5 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-olive-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-700 disabled:opacity-50',
  gold: 'inline-flex items-center justify-center rounded-full bg-gold-400 px-5 py-2.5 text-sm font-semibold text-olive-900 transition hover:bg-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-700 disabled:opacity-50',
  danger: 'inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-40',
  card: 'rounded-2xl border border-olive-700/10 bg-cream-50 p-5 shadow-sm',
  label: 'mb-1.5 block text-sm font-semibold text-olive-800',
  help: 'mt-1 text-xs text-olive-600',
};

/* ---------- Messages ---------- */

let toastTimer = 0;
export function toast(msg: string, bad = false): void {
  const box = $('toast');
  box.textContent = msg;
  box.setAttribute('role', bad ? 'alert' : 'status');
  box.className = `fixed bottom-5 left-1/2 z-[60] max-w-[92vw] -translate-x-1/2 rounded-2xl px-5 py-3 text-center text-sm font-semibold shadow-lg ${bad ? 'bg-red-700 text-white' : 'bg-olive-800 text-cream-50'}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => box.classList.add('hidden'), bad ? 8000 : 4500);
}

/** Show the real error text. */
export function fail(e: unknown): void {
  console.error(e);
  const msg = e instanceof Error ? e.message : (e as { message?: string })?.message;
  toast(msg || 'Something went wrong. Please try again.', true);
}

export async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    fail(e);
    return undefined;
  }
}

/* ---------- Unsaved changes ---------- */

let dirty = false;
export const isDirty = (): boolean => dirty;
export const setDirty = (v: boolean): void => {
  dirty = v;
};
window.addEventListener('beforeunload', (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
/** Ask before throwing away unsaved work. */
export function confirmLeave(): boolean {
  if (!dirty) return true;
  if (window.confirm('You have unsaved changes. Leave without saving?')) {
    dirty = false;
    return true;
  }
  return false;
}

/* ---------- Small UI pieces ---------- */

export const skeleton = (rows = 3): string =>
  `<div class="space-y-3" aria-busy="true" aria-label="Loading">${Array.from({ length: rows }, () => '<div class="h-20 animate-pulse rounded-2xl bg-sage-100"></div>').join('')}</div>`;

export const emptyState = (text: string, action = ''): string =>
  `<div class="rounded-2xl border border-dashed border-olive-700/30 p-8 text-center text-olive-700"><p>${esc(text)}</p>${action ? `<div class="mt-4 flex flex-wrap justify-center gap-3">${action}</div>` : ''}</div>`;

export const debounce = <A extends unknown[]>(fn: (...a: A) => void, ms = 200) => {
  let t = 0;
  return (...a: A): void => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...a), ms);
  };
};

/** Digits for wa.me: a 10-digit Indian number gets the 91 prefix. */
export const waDigits = (phone: string): string => {
  const d = phone.replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
};

export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ---------- Data ---------- */

export async function selectAll(table: string, order: [string, boolean][] = [['sort_order', true], ['created_at', true]]): Promise<Row[]> {
  let q = db().from(table).select('*');
  for (const [col, asc] of order) q = q.order(col, { ascending: asc });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Row[];
}

export async function publish(): Promise<void> {
  const { error } = await db().from('publish_requests').insert({ note: 'publish from admin' });
  if (error) throw error;
  toast('Publishing started. Your changes will be live in about 1 to 2 minutes.');
  document.dispatchEvent(new CustomEvent('admin:published'));
}

/* ---------- Photos: resize in the browser, then upload ---------- */

const canvasBlob = (c: HTMLCanvasElement, type: string, q: number): Promise<Blob | null> =>
  new Promise((resolve) => c.toBlob(resolve, type, q));

async function compress(file: File, max = 1400): Promise<Blob> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error('This photo type is not supported. Please use a JPG or PNG photo.');
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  let blob = await canvasBlob(canvas, 'image/webp', 0.82);
  if (!blob || blob.type !== 'image/webp') blob = await canvasBlob(canvas, 'image/jpeg', 0.85);
  if (!blob) throw new Error('Could not prepare the photo. Please try another one.');
  return blob;
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  const blob = await compress(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw error;
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function removeImage(imageUrl?: string): Promise<void> {
  const m = imageUrl?.match(new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)$`));
  if (m) await db().storage.from(BUCKET).remove([decodeURIComponent(m[1])]);
}
