import { treatments as starterTreatments } from '../data/treatments';
import type { Treatment, Category } from '../data/treatments';
import { faqs as starterFaqs } from '../data/faqs';
import type { Faq } from '../data/faqs';
import { reviews as starterReviews } from '../data/reviews';
import type { Review } from '../data/reviews';
import { starterPrices } from '../data/prices';
import type { PriceItem } from '../data/prices';
import { doctor as starterDoctor } from '../data/doctor';
import type { DoctorInfo } from '../data/doctor';
import { getSupabase } from './supabase';
import { fetchSingleRow } from './remote';

export interface GalleryPhoto {
  image: string;
  caption: string;
}

export type GallerySection = 'therapy' | 'clinic' | 'doctor';

const cache = new Map<string, Promise<any[] | null>>();

function fetchTable(table: string): Promise<any[] | null> {
  let p = cache.get(table);
  if (!p) {
    p = (async () => {
      const sb = getSupabase('site');
      if (!sb) return null;
      try {
        const { data, error } = await sb
          .from(table)
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
          .abortSignal(AbortSignal.timeout(8000));
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

/** Active price items, or the built-in list when the database has none. */
export async function getPriceItems(): Promise<PriceItem[]> {
  const rows = await fetchTable('price_items');
  if (!rows || rows.length === 0) return starterPrices;
  return rows.map((r) => ({
    id: r.id,
    category: r.category as Category,
    group_name: r.group_name ?? '',
    service: r.service ?? '',
    duration: r.duration ?? '',
    price: r.price ?? null,
    pkg3: r.pkg3 ?? null,
    pkg5: r.pkg5 ?? null,
    pkg7: r.pkg7 ?? null,
    note: r.note ?? '',
  }));
}

/** The raw site_settings row (or null). src/data/site.ts already merges it over the defaults. */
export const getSettings = (): Promise<Record<string, any> | null> => fetchSingleRow('site_settings');

/** Doctor profile: built-in values from src/data/doctor.ts, overridden by non-empty database fields. */
export async function getDoctor(): Promise<DoctorInfo> {
  const r = await fetchSingleRow('doctor_profile');
  if (!r) return starterDoctor;
  const text = (v: unknown, fb: string | undefined): string => (typeof v === 'string' && v.trim() ? v.trim() : fb ?? '');
  const list = (v: unknown, fb: string[] | undefined): string[] => (Array.isArray(v) && v.length ? v.map(String) : fb ?? []);
  return {
    name: text(r.name, starterDoctor.name),
    qualification: text(r.qualification, starterDoctor.qualification),
    title: text(r.title, starterDoctor.title),
    specialisation: text(r.specialisation, starterDoctor.specialisation),
    experience: text(r.experience, starterDoctor.experience),
    college: text(r.college, starterDoctor.college),
    languages: list(r.languages, starterDoctor.languages),
    registration: text(r.registration, starterDoctor.registration),
    focusAreas: list(r.focus_areas, starterDoctor.focusAreas),
    bio: list(r.bio, starterDoctor.bio),
    quote: text(r.quote, starterDoctor.quote),
  };
}

// Local photos used until photos are uploaded in the admin panel.
const localGallery: Record<GallerySection, GalleryPhoto[]> = {
  therapy: [
    { image: '/images/therapy-centre/therapy-room.png', caption: 'Therapy room' },
    { image: '/images/therapy-centre/therapy-treatment.png', caption: 'Treatment area' },
    { image: '/images/therapy-centre/therapy-1.png', caption: 'Therapy centre' },
  ],
  clinic: [
    { image: '/images/clinic/clinic-facade.png', caption: 'Our clinic on Amruth Nagar Main Road' },
    { image: '/images/clinic/pharmacy.png', caption: 'In-house Ayurvedic pharmacy' },
  ],
  doctor: [{ image: '/images/clinic/dr-gayathri.jpg', caption: '' }],
};

export async function getGallery(section: GallerySection = 'therapy'): Promise<GalleryPhoto[]> {
  const rows = await fetchTable('gallery');
  const mine = (rows ?? []).filter((r) => r.section === section).map((r) => ({ image: r.image as string, caption: (r.caption ?? '') as string }));
  return mine.length ? mine : localGallery[section];
}
