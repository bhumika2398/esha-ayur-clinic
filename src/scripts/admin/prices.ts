import { $, db, debounce, emptyState, esc, fail, fmtINR, guard, selectAll, setDirty, skeleton, toast, ui } from './core';
import type { Row, View } from './core';
import { starterPrices } from '../../data/prices';

type Cat = 'body' | 'skin' | 'womens' | 'weight';
const CATS: [Cat, string][] = [['body', 'Body and head'], ['skin', 'Skin care'], ['womens', "Women's care"], ['weight', 'Weight management']];
const NUM = ['price', 'pkg3', 'pkg5', 'pkg7'] as const;

interface PRow {
  id: string;
  isNew: boolean;
  edited: boolean;
  category: Cat;
  group_name: string;
  service: string;
  duration: string;
  price: number | null;
  pkg3: number | null;
  pkg5: number | null;
  pkg7: number | null;
  note: string;
  is_active: boolean;
  sort_order: number;
}

const toRow = (r: Row): PRow => ({
  id: r.id, isNew: false, edited: false, category: r.category, group_name: r.group_name ?? '', service: r.service ?? '', duration: r.duration ?? '',
  price: r.price ?? null, pkg3: r.pkg3 ?? null, pkg5: r.pkg5 ?? null, pkg7: r.pkg7 ?? null, note: r.note ?? '', is_active: r.is_active !== false, sort_order: r.sort_order ?? 0,
});

const blank = (category: Cat, group_name: string): PRow => ({
  id: `new-${crypto.randomUUID()}`, isNew: true, edited: true, category, group_name, service: '', duration: '', price: null, pkg3: null, pkg5: null, pkg7: null, note: '', is_active: true, sort_order: 0,
});

export const pricesView: View = (() => {
  let rows: PRow[] = [];
  let root: HTMLElement;
  let tab: 'all' | Cat = 'all';
  let query = '';
  let busy = false;

  const catRank = (c: Cat): number => CATS.findIndex((x) => x[0] === c);
  const find = (id: string): PRow | undefined => rows.find((r) => r.id === id);
  const hasEdits = (): boolean => rows.some((r) => r.edited);
  const mark = (): void => {
    setDirty(hasEdits());
    const b = $('price-save');
    if (b) b.textContent = hasEdits() ? `Save changes (${rows.filter((r) => r.edited).length})` : 'Save changes';
  };

  function cell(r: PRow, k: string, text: string, extra = ''): string {
    const v = (NUM as readonly string[]).includes(k) ? (r as any)[k] ?? '' : (r as any)[k];
    const hint = k === 'price' ? `<span class="hint text-xs text-olive-600">${fmtINR(r.price) || 'Ask the clinic'}</span>` : '';
    return `<div><label class="mb-1 block text-xs font-semibold text-olive-600 md:sr-only" for="${r.id}-${k}">${text}</label>
      <input id="${r.id}-${k}" data-k="${k}" value="${esc(v)}" ${(NUM as readonly string[]).includes(k) ? 'inputmode="numeric" placeholder="-"' : ''} class="${ui.input} !py-2 text-sm ${extra}" />${hint}</div>`;
  }

  function rowHtml(r: PRow, gi: number, gl: number): string {
    const lock = query.trim() !== '';
    return `<li data-rid="${r.id}" class="rounded-xl border p-3 ${r.edited ? 'border-gold-500 bg-gold-300/25' : 'border-olive-700/10 bg-white/70'}">
      <div class="grid gap-2 md:grid-cols-[2.2fr_1fr_1fr_1fr_1fr_1fr_auto] md:items-start">
        ${cell(r, 'service', 'Service')}${cell(r, 'duration', 'Duration')}${cell(r, 'price', 'Session price')}${cell(r, 'pkg3', '3-day price')}${cell(r, 'pkg5', '5-day price')}${cell(r, 'pkg7', '7-day price')}
        <div class="flex flex-wrap items-center gap-1.5 md:pt-1">
          <label class="mr-1 flex items-center gap-1.5 text-xs font-semibold text-olive-800"><input type="checkbox" data-k="is_active" ${r.is_active ? 'checked' : ''} />Active</label>
          <button data-act="up" class="${ui.btn} !px-2.5 !py-1" ${lock || gi === 0 ? 'disabled' : ''} aria-label="Move up">&uarr;</button>
          <button data-act="down" class="${ui.btn} !px-2.5 !py-1" ${lock || gi === gl - 1 ? 'disabled' : ''} aria-label="Move down">&darr;</button>
          <button data-act="dup" class="${ui.btn} !px-2.5 !py-1">Copy</button>
          <button data-act="del" class="${ui.danger} !px-2.5 !py-1" aria-label="Delete row">Delete</button>
        </div>
      </div>
      <div class="mt-2">${cell(r, 'note', 'Note (optional, shown under the service)')}</div>
    </li>`;
  }

  function paint(): void {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => (tab === 'all' || r.category === tab) && (!q || `${r.service} ${r.group_name}`.toLowerCase().includes(q)));
    const groups: { key: string; cat: Cat; name: string; items: PRow[] }[] = [];
    for (const r of list) {
      const key = `${r.category}|${r.group_name}`;
      let g = groups.find((x) => x.key === key);
      if (!g) groups.push((g = { key, cat: r.category, name: r.group_name, items: [] }));
      g.items.push(r);
    }
    $('price-list').innerHTML = groups.length
      ? groups.map((g) => `<section class="${ui.card} mb-4" data-group="${esc(g.key)}"><div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-display text-xl font-semibold text-olive-800">${esc(g.name || 'No group')} <span class="text-xs font-semibold uppercase tracking-wider text-olive-600">${esc(CATS[catRank(g.cat)][1])}</span></h3>
          <div class="flex gap-2"><button data-act="rename" class="${ui.btn} !py-1.5">Rename group</button><button data-act="addrow" class="${ui.btn} !py-1.5">+ Add row</button></div></div>
          <div class="mb-1 hidden grid-cols-[2.2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-olive-600 md:grid" aria-hidden="true"><span>Service</span><span>Duration</span><span>Session</span><span>3-day</span><span>5-day</span><span>7-day</span><span class="w-[19rem]">Actions</span></div>
          <ul class="space-y-2">${g.items.map((r, i) => rowHtml(r, i, g.items.length)).join('')}</ul></section>`).join('')
      : emptyState(rows.length ? 'No price items match.' : 'The price list is empty.', rows.length ? '' : `<button data-act="import" class="${ui.primary}">Import current price list</button>`);
  }

  async function save(): Promise<void> {
    const todo = rows.filter((r) => r.edited);
    if (!todo.length) return toast('Nothing to save.');
    const bad = todo.findIndex((r) => !r.service.trim());
    if (bad >= 0) throw new Error('Please fill in the service name for every row you edited.');
    rows.forEach((r, i) => { if (r.sort_order !== i) { r.sort_order = i; r.edited = true; } });
    const fields = (r: PRow) => ({ category: r.category, group_name: r.group_name.trim(), service: r.service.trim(), duration: r.duration.trim(), price: r.price, pkg3: r.pkg3, pkg5: r.pkg5, pkg7: r.pkg7, note: r.note.trim(), is_active: r.is_active, sort_order: r.sort_order });
    const fresh = rows.filter((r) => r.isNew);
    if (fresh.length) {
      const { error } = await db().from('price_items').insert(fresh.map(fields));
      if (error) throw error;
    }
    const results = await Promise.all(rows.filter((r) => r.edited && !r.isNew).map((r) => db().from('price_items').update(fields(r)).eq('id', r.id)));
    const failed = results.find((x) => x.error);
    if (failed?.error) throw failed.error;
    rows = (await selectAll('price_items', [['sort_order', true], ['created_at', true]])).map(toRow);
    setDirty(false);
    paint();
    mark();
    toast('Prices saved. Press "Publish" when you want the website to update.');
  }

  function swap(id: string, dir: -1 | 1): void {
    const r = find(id);
    if (!r) return;
    const i = rows.indexOf(r);
    let j = i + dir;
    while (j >= 0 && j < rows.length && (rows[j].category !== r.category || rows[j].group_name !== r.group_name)) j += dir;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    rows[i].edited = rows[j].edited = true;
    mark();
    paint();
  }

  async function act(a: string, id: string | undefined, groupKey: string | undefined): Promise<void> {
    const r = id ? find(id) : undefined;
    switch (a) {
      case 'up': case 'down': if (id) swap(id, a === 'up' ? -1 : 1); break;
      case 'dup': {
        if (!r) break;
        const copy = { ...blank(r.category, r.group_name), service: r.service, duration: r.duration, price: r.price, pkg3: r.pkg3, pkg5: r.pkg5, pkg7: r.pkg7, note: r.note };
        rows.splice(rows.indexOf(r) + 1, 0, copy);
        mark(); paint();
        break;
      }
      case 'del': {
        if (!r) break;
        if (r.isNew) rows = rows.filter((x) => x !== r);
        else {
          if (!window.confirm(`Delete "${r.service}"? This cannot be undone.`)) break;
          const { error } = await db().from('price_items').delete().eq('id', r.id);
          if (error) throw error;
          rows = rows.filter((x) => x !== r);
          toast('Deleted. Publish to update the website.');
        }
        mark(); paint();
        break;
      }
      case 'addrow': case 'rename': {
        const [cat, ...rest] = (groupKey ?? '').split('|');
        const name = rest.join('|');
        if (a === 'rename') {
          const next = window.prompt('New group name', name)?.trim();
          if (!next || next === name) break;
          rows.filter((x) => x.category === cat && x.group_name === name).forEach((x) => { x.group_name = next; x.edited = true; });
        } else {
          const last = rows.map((x, i) => (x.category === cat && x.group_name === name ? i : -1)).filter((i) => i >= 0).pop() ?? rows.length - 1;
          rows.splice(last + 1, 0, blank(cat as Cat, name));
        }
        mark(); paint();
        break;
      }
      case 'addgroup': {
        const name = window.prompt('Name of the new group (for example: Abhyanga)')?.trim();
        if (!name) break;
        const cat: Cat = tab === 'all' ? 'body' : tab;
        const last = rows.map((x, i) => (x.category === cat ? i : -1)).filter((i) => i >= 0).pop() ?? rows.length - 1;
        rows.splice(last + 1, 0, blank(cat, name));
        mark(); paint();
        break;
      }
      case 'import': {
        if (!window.confirm('Copy the current website price list here so you can edit it?')) break;
        const { error } = await db().from('price_items').insert(starterPrices.map(({ id: _id, ...p }, i) => ({ ...p, sort_order: i })));
        if (error) throw error;
        rows = (await selectAll('price_items', [['sort_order', true], ['created_at', true]])).map(toRow);
        paint();
        toast('Imported. You can now edit every price.');
        break;
      }
      case 'save': await save(); break;
    }
  }

  const repaint = debounce(() => paint(), 150);
  const run = (fn: () => Promise<void>): void => {
    if (busy) return;
    busy = true;
    void guard(fn).finally(() => { busy = false; });
  };

  return {
    id: 'prices',
    label: 'Price list',
    icon: 'M7 4h10M7 9h10M9 9c4 0 4 6-1 6l5 5M5 4v0',
    title: 'Price list',
    async render(el) {
      root = el;
      tab = 'all'; query = '';
      el.innerHTML = skeleton();
      try {
        rows = (await selectAll('price_items', [['sort_order', true], ['created_at', true]])).map(toRow);
      } catch (e) {
        el.innerHTML = emptyState('The price list could not be loaded. Has the admin-v2.sql file been run in Supabase?');
        return fail(e);
      }
      el.innerHTML = `
        <div class="sticky top-[3.75rem] z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-olive-700/10 bg-sage-100/95 px-4 py-3 backdrop-blur lg:top-0">
          <div class="flex flex-wrap gap-2" role="group" aria-label="Category">${[['all', 'All'], ...CATS].map(([v, l]) => `<button data-tab="${v}" aria-pressed="${v === 'all'}" class="${ui.btn} aria-pressed:border-olive-700 aria-pressed:bg-olive-700 aria-pressed:text-cream-50">${l}</button>`).join('')}</div>
          <div class="flex flex-wrap items-center gap-2"><button data-act="addgroup" class="${ui.btn}">+ Add group</button><button id="price-save" data-act="save" class="${ui.primary}">Save changes</button></div>
        </div>
        <div class="mb-4"><label for="price-q" class="sr-only">Search the price list</label><input id="price-q" type="search" placeholder="Search services" class="${ui.input} max-w-sm" /></div>
        <p class="mb-4 text-sm text-olive-700">Edit prices in rupees. Leave a price empty to show "Ask the clinic" on the website. Highlighted rows have unsaved changes.</p>
        <div id="price-list"></div>`;
      paint();
      el.onclick = (e) => {
        const t = e.target as HTMLElement;
        const tb = t.closest<HTMLElement>('[data-tab]');
        if (tb) {
          tab = tb.dataset.tab as typeof tab;
          el.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b === tb)));
          return paint();
        }
        const b = t.closest<HTMLElement>('[data-act]');
        if (!b) return;
        run(() => act(b.dataset.act ?? '', b.closest<HTMLElement>('[data-rid]')?.dataset.rid, b.closest<HTMLElement>('[data-group]')?.dataset.group));
      };
      el.oninput = (e) => {
        const t = e.target as HTMLInputElement;
        if (t.id === 'price-q') { query = t.value; return repaint(); }
        const li = t.closest<HTMLElement>('[data-rid]');
        const r = li ? find(li.dataset.rid as string) : undefined;
        const k = t.dataset.k;
        if (!r || !k) return;
        if (k === 'is_active') (r as any)[k] = t.checked;
        else if ((NUM as readonly string[]).includes(k)) {
          const digits = t.value.replace(/\D/g, '');
          (r as any)[k] = digits ? Number(digits) : null;
          const hint = t.parentElement?.querySelector('.hint');
          if (hint && k === 'price') hint.textContent = fmtINR(r.price) || 'Ask the clinic';
        } else (r as any)[k] = t.value;
        r.edited = true;
        li?.classList.add('border-gold-500', 'bg-gold-300/25');
        mark();
      };
    },
    dispose() {
      if (root) { root.onclick = null; root.oninput = null; }
    },
  };
})();
