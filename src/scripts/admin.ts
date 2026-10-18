import { createClient } from '@supabase/supabase-js';
import { treatments as starterTreatments } from '../data/treatments';
import { faqs as starterFaqs } from '../data/faqs';
import { reviews as starterReviews } from '../data/reviews';

type Row = { id: string; is_active: boolean; sort_order: number; [key: string]: any };
type FieldType = 'text' | 'textarea' | 'list' | 'checks' | 'image';

interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
}

interface Section {
  id: string;
  label: string;
  table: string;
  singular: string;
  plural: string;
  intro: string;
  titleKey: string;
  imageKey?: string;
  bulkImages?: boolean;
  fields: Field[];
  defaults: Record<string, unknown>;
  starter?: Record<string, unknown>[];
}

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const configured = Boolean(url && anon);
const sb = createClient(url ?? 'https://placeholder.supabase.co', anon ?? 'placeholder');
const BUCKET = 'site-images';

const sections: Section[] = [
  {
    id: 'gallery',
    label: 'Therapy photos',
    table: 'gallery',
    singular: 'photo',
    plural: 'photos',
    intro: 'Photos shown in the Therapy Centre section. Upload several at once; they are resized automatically.',
    titleKey: 'caption',
    imageKey: 'image',
    bulkImages: true,
    fields: [
      { key: 'image', label: 'Photo', type: 'image', help: 'The photo is saved as soon as you choose it.' },
      { key: 'caption', label: 'Caption', type: 'text', help: 'Short text under the photo, for example "Shirodhara therapy room".' },
    ],
    defaults: { section: 'therapy', caption: '' },
  },
  {
    id: 'treatments',
    label: 'Treatments',
    table: 'treatments',
    singular: 'treatment',
    plural: 'treatments',
    intro: 'The therapies shown on the Treatments pages. Use the arrows to change the order.',
    titleKey: 'name',
    imageKey: 'image',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      {
        key: 'categories',
        label: 'Where it appears',
        type: 'checks',
        required: true,
        options: [
          { value: 'body', label: 'Body & Head' },
          { value: 'skin', label: 'Skin Care' },
          { value: 'womens', label: "Women's Care" },
          { value: 'weight', label: 'Weight Management' },
        ],
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
  },
  {
    id: 'faqs',
    label: 'FAQs',
    table: 'faqs',
    singular: 'question',
    plural: 'questions',
    intro: 'Questions and answers shown on the FAQ page and the home page.',
    titleKey: 'question',
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
    ],
    defaults: { question: 'New question', answer: 'Write the answer here.' },
    starter: starterFaqs.map((f) => ({ question: f.question, answer: f.answer })),
  },
  {
    id: 'testimonials',
    label: 'Patient reviews',
    table: 'testimonials',
    singular: 'review',
    plural: 'reviews',
    intro: 'Reviews shown in the Testimonials section. Only add reviews patients have agreed to share.',
    titleKey: 'name',
    fields: [
      { key: 'name', label: 'Patient name', type: 'text', required: true },
      { key: 'quote', label: 'Review', type: 'textarea', required: true },
      { key: 'short', label: 'One-line highlight', type: 'text', help: 'Shown in the scrolling strip. Leave empty to use the start of the review.' },
    ],
    defaults: { name: 'Patient name', quote: 'Write the review here.', short: '' },
    starter: starterReviews.map((r) => ({ name: r.name, quote: r.quote, short: r.short })),
  },
];

let sec: Section = sections[0];
let rows: Row[] = [];
let openId: string | null = null;
let busy = false;
let toastTimer = 0;

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const panel = $('panel');
const tabs = $('tabs');
const toastBox = $('toast');
const publishBtn = $<HTMLButtonElement>('publish');

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function toast(msg: string, bad = false): void {
  toastBox.textContent = msg;
  toastBox.className = `fixed bottom-5 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-full px-5 py-3 text-center text-sm font-semibold shadow-lg ${bad ? 'bg-red-700 text-white' : 'bg-olive-800 text-cream-50'}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastBox.classList.add('hidden'), 5000);
}

function fail(e: unknown): void {
  console.error(e);
  const msg = e instanceof Error ? e.message : (e as { message?: string })?.message;
  toast(msg || 'Something went wrong. Please try again.', true);
}

async function run(fn: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    await fn();
  } catch (e) {
    fail(e);
  } finally {
    busy = false;
  }
}

/* ---------- Photos: resize in the browser, then upload ---------- */

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

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

async function uploadImage(file: File, folder: string): Promise<string> {
  const blob = await compress(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: '31536000',
  });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function removeImage(imageUrl?: string): Promise<void> {
  const m = imageUrl?.match(new RegExp(`/storage/v1/object/public/${BUCKET}/(.+)$`));
  if (m) await sb.storage.from(BUCKET).remove([decodeURIComponent(m[1])]);
}

/* ---------- Data ---------- */

async function load(): Promise<void> {
  const { data, error } = await sb
    .from(sec.table)
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  rows = (data ?? []) as Row[];
}

async function insertRow(values: Record<string, unknown>): Promise<Row> {
  const next = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
  const { data, error } = await sb
    .from(sec.table)
    .insert({ ...sec.defaults, ...values, sort_order: next })
    .select()
    .single();
  if (error) throw error;
  return data as Row;
}

/* ---------- Screens ---------- */

function fieldHtml(f: Field, r: Row): string {
  const label = `<label class="mb-1.5 block text-sm font-semibold text-olive-800">${esc(f.label)}</label>`;
  const help = f.help ? `<p class="mt-1 text-xs text-olive-600">${esc(f.help)}</p>` : '';
  const base =
    'w-full rounded-xl border border-olive-700/20 bg-white px-4 py-2.5 text-olive-800 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-400/40';

  switch (f.type) {
    case 'text':
      return `<div>${label}<input data-field="${f.key}" value="${esc(r[f.key])}" class="${base}" />${help}</div>`;
    case 'textarea':
      return `<div>${label}<textarea data-field="${f.key}" rows="5" class="${base}">${esc(r[f.key])}</textarea>${help}</div>`;
    case 'list':
      return `<div>${label}<textarea data-field="${f.key}" rows="5" class="${base}">${esc((r[f.key] ?? []).join('\n'))}</textarea>${help}</div>`;
    case 'checks': {
      const boxes = (f.options ?? [])
        .map(
          (o) =>
            `<label class="flex items-center gap-2 rounded-full border border-olive-700/20 bg-white px-4 py-2 text-sm text-olive-800"><input type="checkbox" data-checks="${f.key}" value="${o.value}" ${(r[f.key] ?? []).includes(o.value) ? 'checked' : ''} />${esc(o.label)}</label>`
        )
        .join('');
      return `<div>${label}<div class="flex flex-wrap gap-3">${boxes}</div>${help}</div>`;
    }
    case 'image': {
      const preview = r[f.key]
        ? `<img src="${esc(r[f.key])}" alt="" class="h-24 w-32 rounded-xl object-cover" />`
        : '<div class="grid h-24 w-32 place-items-center rounded-xl bg-sage-100 text-xs text-olive-600">No photo</div>';
      return `<div>${label}<div class="flex flex-wrap items-center gap-4">${preview}<label class="cursor-pointer rounded-full border border-olive-700/40 px-5 py-2 text-sm font-semibold text-olive-800 hover:border-gold-500"><input type="file" accept="image/*" class="hidden" data-replace="${f.key}" />${r[f.key] ? 'Replace photo' : 'Upload photo'}</label></div>${help}</div>`;
    }
    default:
      return '';
  }
}

function rowHtml(r: Row, i: number): string {
  const open = r.id === openId;
  const title = String(r[sec.titleKey] ?? '').trim() || `Untitled ${sec.singular}`;
  const thumb =
    sec.imageKey && r[sec.imageKey]
      ? `<img src="${esc(r[sec.imageKey])}" alt="" class="h-14 w-20 shrink-0 rounded-lg object-cover" />`
      : '';
  const btn = 'rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-30';
  const normal = `${btn} border-olive-700/25 text-olive-800 hover:border-gold-500`;
  const danger = `${btn} border-red-300 text-red-700 hover:border-red-600`;

  return `
  <li data-id="${r.id}" class="rounded-2xl border border-olive-700/10 bg-cream-50 p-4 shadow-sm">
    <div class="flex flex-wrap items-center gap-3">
      ${thumb}
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold text-olive-800">${esc(title)}</p>
        ${r.is_active ? '' : '<span class="mt-0.5 inline-block rounded-full bg-sand-300 px-2 py-0.5 text-[11px] font-semibold text-olive-800">Hidden from website</span>'}
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="${normal}" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Move up">&uarr;</button>
        <button class="${normal}" data-act="down" ${i === rows.length - 1 ? 'disabled' : ''} aria-label="Move down">&darr;</button>
        <button class="${normal}" data-act="edit">${open ? 'Close' : 'Edit'}</button>
        <button class="${normal}" data-act="toggle">${r.is_active ? 'Hide' : 'Show'}</button>
        <button class="${danger}" data-act="delete">Delete</button>
      </div>
    </div>
    ${
      open
        ? `<div class="mt-4 space-y-4 border-t border-olive-700/10 pt-4">${sec.fields.map((f) => fieldHtml(f, r)).join('')}
           <div class="flex justify-end"><button data-act="save" class="rounded-full bg-olive-700 px-7 py-2.5 text-sm font-semibold text-cream-50 hover:bg-olive-800">Save changes</button></div></div>`
        : ''
    }
  </li>`;
}

function render(): void {
  const main = sec.bulkImages
    ? `<label class="cursor-pointer rounded-full bg-olive-700 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-olive-800"><input id="bulk" type="file" accept="image/*" multiple class="hidden" />+ Upload photos</label>`
    : `<button data-act="add" class="rounded-full bg-olive-700 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-olive-800">+ Add ${esc(sec.singular)}</button>`;
  const starter =
    sec.starter && rows.length === 0
      ? `<button data-act="import" class="rounded-full border border-olive-700/40 px-6 py-3 text-sm font-semibold text-olive-800 hover:border-gold-500">Import current website content</button>`
      : '';

  panel.innerHTML = `
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
      <p class="max-w-xl text-olive-700">${esc(sec.intro)}</p>
      <div class="flex flex-wrap gap-3">${main}${starter}</div>
    </div>
    ${
      rows.length
        ? `<ul class="space-y-3">${rows.map((r, i) => rowHtml(r, i)).join('')}</ul>`
        : `<p class="rounded-2xl border border-dashed border-olive-700/30 p-8 text-center text-olive-700">No ${esc(sec.plural)} yet.</p>`
    }`;
}

function renderTabs(): void {
  tabs.innerHTML = sections
    .map(
      (s) =>
        `<button data-tab="${s.id}" class="shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
          s.id === sec.id
            ? 'border-olive-700 bg-olive-700 text-cream-50'
            : 'border-olive-700/25 text-olive-800 hover:border-gold-500'
        }">${esc(s.label)}</button>`
    )
    .join('');
}

async function showSection(id: string): Promise<void> {
  sec = sections.find((s) => s.id === id) ?? sections[0];
  openId = null;
  renderTabs();
  panel.innerHTML = '<p class="py-10 text-center text-olive-700">Loading...</p>';
  try {
    await load();
    render();
  } catch (e) {
    fail(e);
    panel.innerHTML = '';
  }
}

/* ---------- Actions ---------- */

async function saveRow(id: string, li: HTMLElement): Promise<void> {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  const payload: Record<string, unknown> = {};

  for (const f of sec.fields) {
    if (f.type === 'image') continue;
    let v: unknown;
    if (f.type === 'checks') {
      v = Array.from(li.querySelectorAll<HTMLInputElement>(`input[data-checks="${f.key}"]:checked`)).map((c) => c.value);
    } else {
      const el = li.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${f.key}"]`);
      const text = (el?.value ?? '').trim();
      v = f.type === 'list' ? text.split('\n').map((s) => s.trim()).filter(Boolean) : text;
    }
    if (f.required && (Array.isArray(v) ? v.length === 0 : !v)) throw new Error(`Please fill in: ${f.label}`);
    payload[f.key] = v;
  }

  if (sec.table === 'treatments' && String(row.slug).startsWith('treatment-')) {
    payload.slug = `${slugify(String(payload.name)) || 'treatment'}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { error } = await sb.from(sec.table).update(payload).eq('id', id);
  if (error) throw error;
  openId = null;
  await load();
  render();
  toast('Saved. Press "Publish changes" when you want the website to update.');
}

async function move(id: string, dir: -1 | 1): Promise<void> {
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const next = [...rows];
  [next[i], next[j]] = [next[j], next[i]];
  const results = await Promise.all(
    next.flatMap((r, idx) =>
      r.sort_order === idx ? [] : [sb.from(sec.table).update({ sort_order: idx }).eq('id', r.id)]
    )
  );
  const bad = results.find((r) => r.error);
  if (bad?.error) throw bad.error;
  await load();
  render();
}

async function act(action: string, id?: string, li?: HTMLElement | null): Promise<void> {
  const row = rows.find((r) => r.id === id);

  switch (action) {
    case 'edit':
      openId = openId === id ? null : id ?? null;
      render();
      break;
    case 'save':
      if (id && li) await saveRow(id, li);
      break;
    case 'toggle':
      if (!row) break;
      {
        const { error } = await sb.from(sec.table).update({ is_active: !row.is_active }).eq('id', row.id);
        if (error) throw error;
        await load();
        render();
        toast(row.is_active ? 'Hidden. Publish to update the website.' : 'Visible. Publish to update the website.');
      }
      break;
    case 'up':
      if (id) await move(id, -1);
      break;
    case 'down':
      if (id) await move(id, 1);
      break;
    case 'delete':
      if (!row || !confirm(`Delete this ${sec.singular}? This cannot be undone.`)) break;
      {
        const { error } = await sb.from(sec.table).delete().eq('id', row.id);
        if (error) throw error;
        if (sec.imageKey) await removeImage(row[sec.imageKey]);
        openId = null;
        await load();
        render();
        toast('Deleted. Publish to update the website.');
      }
      break;
    case 'add': {
      const values: Record<string, unknown> = {};
      if (sec.table === 'treatments') values.slug = `treatment-${crypto.randomUUID().slice(0, 8)}`;
      const created = await insertRow(values);
      openId = created.id;
      await load();
      render();
      toast(`New ${sec.singular} added. Fill it in and press Save.`);
      break;
    }
    case 'import': {
      if (!sec.starter || !confirm('Copy the current website content here so you can edit it?')) break;
      const { error } = await sb.from(sec.table).insert(sec.starter.map((r, i) => ({ ...r, sort_order: i })));
      if (error) throw error;
      await load();
      render();
      toast('Imported. You can now edit everything.');
      break;
    }
  }
}

async function bulkUpload(files: File[]): Promise<void> {
  let n = 0;
  for (const file of files) {
    n += 1;
    toast(`Uploading photo ${n} of ${files.length}...`);
    const image = await uploadImage(file, sec.table);
    await insertRow({ image });
  }
  await load();
  render();
  toast(`${files.length} photo(s) added. Press "Publish changes" to show them on the website.`);
}

async function replaceImage(id: string, key: string, file: File): Promise<void> {
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  toast('Uploading photo...');
  const newUrl = await uploadImage(file, sec.table);
  const { error } = await sb.from(sec.table).update({ [key]: newUrl }).eq('id', id);
  if (error) throw error;
  await removeImage(row[key]);
  await load();
  render();
  toast('Photo updated. Press "Publish changes" to show it on the website.');
}

/* ---------- Events ---------- */

panel.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!btn) return;
  const li = btn.closest<HTMLElement>('li[data-id]');
  void run(() => act(btn.dataset.act ?? '', li?.dataset.id, li));
});

panel.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  if (input.id === 'bulk') {
    const files = Array.from(input.files);
    void run(() => bulkUpload(files));
  } else if (input.dataset.replace) {
    const id = input.closest<HTMLElement>('li[data-id]')?.dataset.id;
    const key = input.dataset.replace;
    const file = input.files[0];
    if (id) void run(() => replaceImage(id, key, file));
  }
});

tabs.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
  if (b?.dataset.tab) void showSection(b.dataset.tab);
});

publishBtn.addEventListener('click', () => {
  void run(async () => {
    const { error } = await sb.from('publish_requests').insert({ note: 'publish from admin' });
    if (error) throw error;
    toast('Publishing started. Your changes will be live in about 1 to 2 minutes.');
    publishBtn.disabled = true;
    publishBtn.textContent = 'Publishing...';
    window.setTimeout(() => {
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publish changes';
    }, 60000);
  });
});

/* ---------- Login ---------- */

function showLogin(): void {
  const login = $('login');
  login.style.display = 'grid';
  login.classList.remove('hidden');
  $('app').classList.add('hidden');
}

async function enter(email: string): Promise<void> {
  $('login').style.display = 'none';
  $('app').classList.remove('hidden');
  $('who').textContent = email;
  await showSection(sec.id);
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('login-msg');
  msg.textContent = 'Signing in...';
  const { data, error } = await sb.auth.signInWithPassword({
    email: $<HTMLInputElement>('login-email').value.trim(),
    password: $<HTMLInputElement>('login-password').value,
  });
  if (error || !data.session) {
    msg.textContent = 'Incorrect email or password.';
    return;
  }
  msg.textContent = '';
  $<HTMLInputElement>('login-password').value = '';
  await enter(data.session.user.email ?? '');
});

$('logout').addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogin();
});

async function boot(): Promise<void> {
  if (!configured) {
    $('setup-warning').classList.remove('hidden');
    return;
  }
  const { data } = await sb.auth.getSession();
  if (data.session) await enter(data.session.user.email ?? '');
  else showLogin();
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') showLogin();
  });
}

void boot();