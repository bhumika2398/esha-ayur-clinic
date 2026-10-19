import { treatments as starterTreatments, categoryLabels } from '../../data/treatments';
import { faqs as starterFaqs } from '../../data/faqs';
import { reviews as starterReviews } from '../../data/reviews';
import { linkedPrices } from '../../lib/pricing';
import type { PriceItem } from '../../data/prices';
import type { Treatment } from '../../data/treatments';
import { esc, fmtINR, selectAll } from './core';
import { listView } from './editor';

const I = {
  treatments: 'M12 3c4 3 5 8 0 15-5-7-4-12 0-15zM12 7v10',
  faqs: 'M9 9a3 3 0 115 2c-1 1-2 1.5-2 3M12 18h.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  reviews: 'M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z',
};

/** Read-only list of the prices linked to a treatment (the matching rule is in src/lib/pricing.ts). */
function linkedHtml(row: Record<string, any>, ctx: unknown): string {
  const prices = (ctx as PriceItem[] | null) ?? [];
  const t: Treatment = {
    slug: row.slug ?? '',
    name: row.name ?? '',
    categories: row.categories ?? [],
    image: row.image ?? '',
    duration: row.duration ?? '',
    description: row.description ?? '',
    includes: row.includes ?? [],
  };
  const items = linkedPrices(t, prices);
  const body = items.length
    ? `<ul class="mt-2 space-y-1 text-sm text-olive-800">${items.slice(0, 8).map((p) => `<li class="flex justify-between gap-3"><span>${esc(p.service)}</span><span class="shrink-0 font-semibold">${p.price ? fmtINR(p.price) : 'Ask the clinic'}</span></li>`).join('')}${items.length > 8 ? `<li class="text-olive-600">and ${items.length - 8} more</li>` : ''}</ul>`
    : '<p class="mt-2 text-sm text-olive-600">No prices are linked to this treatment yet.</p>';
  return `<div class="rounded-xl bg-sage-100/70 p-4"><p class="text-sm font-semibold text-olive-800">Linked prices (read only)</p>${body}<a href="#/prices" class="mt-3 inline-block text-sm font-semibold text-olive-700 underline-offset-4 hover:underline">Edit in the Price list</a></div>`;
}

export const treatmentsView = listView({
  id: 'treatments',
  label: 'Treatments',
  icon: I.treatments,
  title: 'Treatments',
  table: 'treatments',
  singular: 'treatment',
  plural: 'treatments',
  intro: 'The therapies shown on the Treatments page. Prices are managed in the Price list.',
  titleKey: 'name',
  imageKey: 'image',
  searchKeys: ['name', 'description'],
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    {
      key: 'categories',
      label: 'Categories',
      type: 'checks',
      help: 'Choose where this treatment appears.',
      options: Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
    },
    { key: 'duration', label: 'Duration', type: 'text', help: 'For example: 45 min to 1 hr' },
    { key: 'image', label: 'Photo', type: 'image', help: 'The photo is saved as soon as you choose it.' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'includes', label: 'Includes', type: 'list', help: 'One item per line, for example: Sarvanga (full body)' },
  ],
  defaults: { name: 'New treatment', categories: ['body'], duration: '', description: '', includes: [] },
  starter: starterTreatments.map((t) => ({
    slug: t.slug,
    name: t.name,
    categories: t.categories,
    image: t.image,
    duration: t.duration,
    description: t.description,
    includes: t.includes,
  })),
  loadContext: async () => {
    try {
      return await selectAll('price_items', [['sort_order', true]]);
    } catch {
      return []; // the price table may not exist yet
    }
  },
  extra: linkedHtml,
});

export const faqsView = listView({
  id: 'faqs',
  label: 'FAQs',
  icon: I.faqs,
  title: 'FAQs',
  table: 'faqs',
  singular: 'question',
  plural: 'questions',
  intro: 'Questions and answers shown on the FAQ page and the home page.',
  titleKey: 'question',
  searchKeys: ['question', 'answer'],
  fields: [
    { key: 'question', label: 'Question', type: 'text', required: true },
    { key: 'answer', label: 'Answer', type: 'textarea', required: true },
  ],
  defaults: { question: 'New question', answer: 'Write the answer here.' },
  starter: starterFaqs.map((f) => ({ question: f.question, answer: f.answer })),
});

export const reviewsView = listView({
  id: 'reviews',
  label: 'Patient reviews',
  icon: I.reviews,
  title: 'Patient reviews',
  table: 'testimonials',
  singular: 'review',
  plural: 'reviews',
  intro: 'Reviews shown in the Testimonials section. Only add reviews patients have agreed to share.',
  titleKey: 'name',
  searchKeys: ['name', 'quote'],
  fields: [
    { key: 'name', label: 'Patient name', type: 'text', required: true },
    { key: 'quote', label: 'Review', type: 'textarea', required: true },
    { key: 'short', label: 'One-line highlight', type: 'text', help: 'Shown in the scrolling strip. Leave empty to use the start of the review.' },
  ],
  defaults: { name: 'Patient name', quote: 'Write the review here.', short: '' },
  starter: starterReviews.map((r) => ({ name: r.name, quote: r.quote, short: r.short })),
});
