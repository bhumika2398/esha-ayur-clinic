import { createClient } from '@supabase/supabase-js';
import { treatments as starterTreatments } from '../data/treatments';
import type { Treatment, Category } from '../data/treatments';
import { faqs as starterFaqs } from '../data/faqs';
import type { Faq } from '../data/faqs';
import { reviews as starterReviews } from '../data/reviews';
import type { Review } from '../data/reviews';

export interface GalleryPhoto {
  image: string;
  caption: string;
}

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const sb = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

const cache = new Map<string, Promise<any[] | null>>();

function fetchTable(table: string): Promise<any[] | null> {
  if (!sb) return Promise.resolve(null);
  let p = cache.get(table);
  if (!p) {
    p = (async () => {
      try {
        const { data, error } = await sb
          .from(table)
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
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

export async function getTreatments(): Promise<Treatment[]> {
  const rows = await fetchTable('treatments');
  if (!rows || rows.length === 0) return starterTreatments;
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    categories: (r.categories ?? []) as Category[],
    image: r.image ?? '',
    duration: r.duration ?? '',
    description: r.description ?? '',
    includes: r.includes ?? [],
  }));
}

export async function getFaqs(): Promise<Faq[]> {
  const rows = await fetchTable('faqs');
  if (!rows || rows.length === 0) return starterFaqs;
  return rows.map((r) => ({ question: r.question, answer: r.answer }));
}

export async function getReviews(): Promise<Review[]> {
  const rows = await fetchTable('testimonials');
  if (!rows || rows.length === 0) return starterReviews;
  return rows.map((r) => {
    const quote: string = r.quote;
    const short = (r.short ?? '').trim() || (quote.length > 110 ? `${quote.slice(0, 107)}...` : quote);
    return { name: r.name, quote, short };
  });
}

export async function getGallery(section = 'therapy'): Promise<GalleryPhoto[]> {
  const rows = await fetchTable('gallery');
  if (!rows) return [];
  return rows
    .filter((r) => r.section === section)
    .map((r) => ({ image: r.image, caption: r.caption ?? '' }));
}