import { $, db, emptyState, esc, fail, guard, publish, skeleton, todayISO, ui } from './core';
import type { Row, View } from './core';
import { contactButtons, prettyDate, setStatus, statusChip, statusSelect } from './appointments';

const safe = async (p: PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<Row[]> => {
  const { data, error } = await p;
  return error ? [] : ((data ?? []) as Row[]);
};

const weekStart = (d: Date): Date => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
};

function weeklyChart(requests: Row[]): string {
  const now = weekStart(new Date());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const s = new Date(now);
    s.setDate(s.getDate() - (7 - i) * 7);
    return { start: s, n: 0 };
  });
  for (const r of requests) {
    const t = new Date(r.created_at).getTime();
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (t >= weeks[i].start.getTime()) { weeks[i].n += 1; break; }
    }
  }
  const max = Math.max(1, ...weeks.map((w) => w.n));
  const bars = weeks.map((w, i) => {
    const h = Math.round((w.n / max) * 90);
    const x = 12 + i * 38;
    return `<g><rect x="${x}" y="${110 - h}" width="26" height="${h}" rx="5" fill="#46563a"/><text x="${x + 13}" y="${104 - h}" text-anchor="middle" font-size="11" fill="#2b3524">${w.n}</text>
      <text x="${x + 13}" y="128" text-anchor="middle" font-size="9" fill="#5a6b4a">${w.start.getDate()}/${w.start.getMonth() + 1}</text></g>`;
  }).join('');
  return `<svg viewBox="0 0 320 136" class="w-full" role="img" aria-label="Requests per week for the last 8 weeks. ${weeks.map((w) => w.n).join(', ')}">${bars}</svg>`;
}

function topTreatments(requests: Row[]): string {
  const counts = new Map<string, number>();
  for (const r of requests) {
    const k = String(r.treatment || '').trim();
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) return '<p class="text-sm text-olive-600">No requests yet.</p>';
  return top.map(([name, n]) => `<div class="mb-2.5"><div class="flex justify-between gap-3 text-sm text-olive-800"><span class="truncate">${esc(name)}</span><span class="font-semibold">${n}</span></div>
    <div class="mt-1 h-2.5 rounded-full bg-sage-100"><div class="h-2.5 rounded-full bg-gold-500" style="width:${Math.round((n / top[0][1]) * 100)}%"></div></div></div>`).join('');
}

export const dashboardView: View = (() => {
  let timer = 0;
  let root: HTMLElement;
  let requests: Row[] = [];

  async function load(): Promise<string> {
    const c = db();
    const [req, treatments, prices, faqs, reviews, doctor, pubs, g, s] = await Promise.all([
      safe(c.from('appointment_requests').select('*').order('created_at', { ascending: false }).limit(1000)),
      safe(c.from('treatments').select('id,name,image,is_active,updated_at')),
      safe(c.from('price_items').select('id,service,price,is_active,updated_at')),
      safe(c.from('faqs').select('id,is_active,updated_at')),
      safe(c.from('testimonials').select('id,is_active,updated_at')),
      safe(c.from('doctor_profile').select('*').eq('id', 1)),
      safe(c.from('publish_requests').select('created_at').order('created_at', { ascending: false }).limit(1)),
      safe(c.from('gallery').select('updated_at,is_active')),
      safe(c.from('site_settings').select('updated_at')),
    ]);
    requests = req;
    const today = todayISO();
    const weekAgo = Date.now() - 7 * 864e5;
    const newCount = req.filter((r) => r.status === 'new').length;
    const todayCount = req.filter((r) => new Date(r.created_at).toDateString() === new Date().toDateString()).length;
    const weekCount = req.filter((r) => new Date(r.created_at).getTime() >= weekAgo).length;
    const confirmed = req.filter((r) => r.status === 'confirmed' && r.preferred_date && r.preferred_date >= today).length;
    const upcoming = req
      .filter((r) => ['new', 'contacted', 'confirmed'].includes(r.status) && r.preferred_date && r.preferred_date >= today)
      .sort((a, b) => String(a.preferred_date).localeCompare(String(b.preferred_date)) || String(a.preferred_time).localeCompare(String(b.preferred_time)))
      .slice(0, 6);

    const latestContent = [...treatments, ...prices, ...faqs, ...reviews, ...g, ...s, ...doctor].map((r) => String(r.updated_at ?? '')).filter(Boolean).sort().pop() ?? '';
    const lastPublish = String(pubs[0]?.created_at ?? '');
    const unpublished = latestContent && (!lastPublish || latestContent > lastPublish);

    const d = doctor[0] ?? {};
    const emptyDoc = ['specialisation', 'experience', 'college', 'registration'].filter((k) => !String(d[k] ?? '').trim()).length + (d.languages?.length ? 0 : 1) + (d.bio?.length ? 0 : 1);
    const hidden = [...treatments, ...prices, ...faqs, ...reviews, ...g].filter((r) => r.is_active === false).length;
    const noPhoto = treatments.filter((t) => !String(t.image ?? '').trim()).length;
    const noPrice = prices.filter((p) => p.is_active && (p.price === null || p.price === undefined)).length;
    const warn: [string, string][] = [];
    if (noPhoto) warn.push([`${noPhoto} treatment${noPhoto > 1 ? 's' : ''} without a photo`, '#/treatments']);
    if (noPrice) warn.push([`${noPrice} price item${noPrice > 1 ? 's' : ''} without a price`, '#/prices']);
    if (emptyDoc) warn.push([`${emptyDoc} doctor profile field${emptyDoc > 1 ? 's are' : ' is'} empty`, '#/doctor']);
    if (hidden) warn.push([`${hidden} item${hidden > 1 ? 's are' : ' is'} hidden from the website`, '#/treatments']);
    if (faqs.length < 5) warn.push([`Only ${faqs.length} FAQ${faqs.length === 1 ? '' : 's'} added`, '#/faqs']);
    if (reviews.length < 3) warn.push([`Only ${reviews.length} patient review${reviews.length === 1 ? '' : 's'} added`, '#/reviews']);

    const kpi = (n: number, text: string, href: string): string => `<a href="${href}" class="${ui.card} block transition hover:border-gold-500"><p class="font-display text-4xl font-semibold text-olive-800">${n}</p><p class="mt-1 text-sm text-olive-700">${text}</p></a>`;
    const item = (r: Row): string => `<li class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/70 p-3" data-id="${r.id}">
      <div class="min-w-0"><p class="truncate font-semibold text-olive-800">${esc(r.name)} ${statusChip(r.status)}</p>
      <p class="truncate text-sm text-olive-700">${esc(prettyDate(r.preferred_date))} ${esc(r.preferred_time)} &middot; ${esc(r.treatment || r.department || 'Not given')}</p></div>
      <div class="flex flex-wrap items-center gap-2">${contactButtons(r)}</div></li>`;

    const quick = [['#/photos', 'Add photo'], ['#/prices', 'Edit prices'], ['#/faqs?open=new', 'Add FAQ']].map(([h, t]) => `<a href="${h}" class="${ui.btn}">${t}</a>`).join('');
    return `
      ${unpublished ? `<div class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-500 bg-gold-300/30 p-4"><p class="font-semibold text-olive-800">You have unpublished changes. The website does not show them yet.</p><button data-act="publish" class="${ui.gold}">Publish now</button></div>` : ''}
      <div class="mb-5 flex flex-wrap gap-2" aria-label="Quick actions">${quick}<button data-act="publish" class="${ui.primary}">Publish</button></div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">${kpi(newCount, 'New requests', '#/appointments')}${kpi(todayCount, "Today's requests", '#/appointments')}${kpi(weekCount, 'This week', '#/appointments')}${kpi(confirmed, 'Confirmed upcoming', '#/appointments')}</div>
      <div class="mt-5 grid gap-5 lg:grid-cols-2">
        <section class="${ui.card}" aria-labelledby="up-h"><h3 id="up-h" class="font-display text-xl font-semibold text-olive-800">Upcoming appointments</h3>
          <ul class="mt-3 space-y-2">${upcoming.length ? upcoming.map(item).join('') : '<li class="text-sm text-olive-600">Nothing booked ahead yet.</li>'}</ul></section>
        <section class="${ui.card}" aria-labelledby="late-h"><h3 id="late-h" class="font-display text-xl font-semibold text-olive-800">Latest requests</h3>
          <ul class="mt-3 space-y-2">${req.slice(0, 5).map((r) => `<li class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/70 p-3"><div class="min-w-0"><p class="truncate font-semibold text-olive-800">${esc(r.name)}</p><p class="truncate text-sm text-olive-700">${esc(r.treatment || r.department || 'Not given')}</p></div>${statusSelect(r)}</li>`).join('') || '<li class="text-sm text-olive-600">No requests yet.</li>'}</ul></section>
        <section class="${ui.card}" aria-labelledby="wk-h"><h3 id="wk-h" class="font-display text-xl font-semibold text-olive-800">Requests per week</h3><div class="mt-3">${weeklyChart(req)}</div></section>
        <section class="${ui.card}" aria-labelledby="top-h"><h3 id="top-h" class="font-display text-xl font-semibold text-olive-800">Most requested treatments</h3><div class="mt-3">${topTreatments(req)}</div></section>
      </div>
      <section class="${ui.card} mt-5" aria-labelledby="health-h"><h3 id="health-h" class="font-display text-xl font-semibold text-olive-800">Content health</h3>
        ${warn.length ? `<ul class="mt-3 space-y-2">${warn.map(([t, h]) => `<li><a href="${h}" class="flex items-center justify-between gap-3 rounded-xl bg-gold-300/25 px-4 py-2.5 text-sm font-medium text-olive-800 hover:bg-gold-300/50"><span>${esc(t)}</span><span aria-hidden="true">&rarr;</span></a></li>`).join('')}</ul>` : '<p class="mt-3 text-sm text-olive-700">Everything looks complete.</p>'}
        <p class="mt-3 text-xs text-olive-600">${treatments.length} treatments &middot; ${faqs.length} FAQs &middot; ${reviews.length} reviews</p></section>`;
  }

  async function refresh(first: boolean): Promise<void> {
    const area = $('dash-area');
    if (!area) return;
    // Do not redraw while the doctor is choosing a status
    if (!first && area.contains(document.activeElement) && document.activeElement?.tagName === 'SELECT') return;
    try {
      area.innerHTML = await load();
    } catch (e) {
      area.innerHTML = emptyState('The dashboard could not load. Has the admin-v2.sql file been run in Supabase?');
      if (first) fail(e);
    }
  }

  return {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-4H4z',
    title: 'Dashboard',
    async render(el) {
      root = el;
      const now = new Date();
      const h = now.getHours();
      const hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
      el.innerHTML = `<p class="mb-5 text-olive-700">${hello}, Doctor. Today is ${esc(now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}.</p><div id="dash-area">${skeleton(4)}</div>`;
      await refresh(true);
      el.onclick = (e) => {
        if ((e.target as HTMLElement).closest('[data-act="publish"]')) void guard(publish).then(() => void refresh(false));
      };
      el.onchange = (e) => {
        const t = e.target as HTMLSelectElement;
        if (t.dataset.status) void guard(async () => { await setStatus(t.dataset.status as string, t.value); await refresh(false); });
      };
      timer = window.setInterval(() => { if (!document.hidden) void refresh(false); }, 60000);
    },
    dispose() {
      window.clearInterval(timer);
      if (root) { root.onclick = null; root.onchange = null; }
    },
  };
})();
