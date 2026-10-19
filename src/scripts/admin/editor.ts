import { $, confirmLeave, db, debounce, emptyState, esc, fail, guard, removeImage, selectAll, setDirty, skeleton, slugify, toast, ui, uploadImage } from './core';
import type { Row, View } from './core';

/* A reusable list editor: add, edit, show/hide, reorder, delete, search, import starter content. */

export type FieldType = 'text' | 'textarea' | 'list' | 'checks' | 'image';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
}

export interface ListConfig {
  id: string;
  label: string;
  icon: string;
  title: string;
  table: string;
  singular: string;
  plural: string;
  intro: string;
  titleKey: string;
  imageKey?: string;
  fields: Field[];
  defaults: Record<string, unknown>;
  starter?: Record<string, unknown>[];
  searchKeys: string[];
  loadContext?: () => Promise<unknown>;
  extra?: (row: Row, ctx: unknown) => string;
}

function fieldHtml(f: Field, r: Row, uid: string): string {
  const id = `${uid}-${f.key}`;
  const label = `<label for="${id}" class="${ui.label}">${esc(f.label)}${f.required ? ' *' : ''}</label>`;
  const help = f.help ? `<p class="${ui.help}">${esc(f.help)}</p>` : '';
  switch (f.type) {
    case 'text':
      return `<div>${label}<input id="${id}" data-field="${f.key}" value="${esc(r[f.key])}" class="${ui.input}" />${help}</div>`;
    case 'textarea':
      return `<div>${label}<textarea id="${id}" data-field="${f.key}" rows="5" class="${ui.input}">${esc(r[f.key])}</textarea>${help}</div>`;
    case 'list':
      return `<div>${label}<textarea id="${id}" data-field="${f.key}" rows="5" class="${ui.input}">${esc((r[f.key] ?? []).join('\n'))}</textarea>${help}</div>`;
    case 'checks': {
      const boxes = (f.options ?? [])
        .map((o) => `<label class="flex items-center gap-2 rounded-full border border-olive-700/20 bg-white px-4 py-2 text-sm text-olive-800"><input type="checkbox" data-checks="${f.key}" value="${esc(o.value)}" ${(r[f.key] ?? []).includes(o.value) ? 'checked' : ''} />${esc(o.label)}</label>`)
        .join('');
      return `<fieldset><legend class="${ui.label}">${esc(f.label)}</legend><div class="flex flex-wrap gap-3">${boxes}</div>${help}</fieldset>`;
    }
    case 'image': {
      const preview = r[f.key]
        ? `<img src="${esc(r[f.key])}" alt="" class="h-24 w-32 rounded-xl object-cover" />`
        : '<div class="grid h-24 w-32 place-items-center rounded-xl bg-sage-100 text-xs text-olive-600">No photo</div>';
      return `<div><span class="${ui.label}">${esc(f.label)}</span><div class="flex flex-wrap items-center gap-4">${preview}<label class="${ui.btn} cursor-pointer"><input type="file" accept="image/*" class="sr-only" data-replace="${f.key}" />${r[f.key] ? 'Replace photo' : 'Upload photo'}</label></div>${help}</div>`;
    }
  }
}

export function listView(cfg: ListConfig): View {
  let rows: Row[] = [];
  let ctx: unknown = null;
  let openId: string | null = null;
  let query = '';
  let busy = false;
  let root: HTMLElement;

  async function load(): Promise<void> {
    rows = await selectAll(cfg.table);
  }

  const visible = (): Row[] => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => cfg.searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q))) : rows;
  };

  function rowHtml(r: Row): string {
    const open = r.id === openId;
    const i = rows.indexOf(r);
    const title = String(r[cfg.titleKey] ?? '').trim() || `Untitled ${cfg.singular}`;
    const thumb = cfg.imageKey && r[cfg.imageKey] ? `<img src="${esc(r[cfg.imageKey])}" alt="" class="h-14 w-20 shrink-0 rounded-lg object-cover" />` : '';
    const noSort = query.trim() !== '';
    return `<li data-id="${r.id}" class="rounded-2xl border border-olive-700/10 bg-cream-50 p-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-3">
        ${thumb}
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-olive-800">${esc(title)}</p>
          ${r.is_active ? '' : '<span class="mt-0.5 inline-block rounded-full bg-sand-300 px-2 py-0.5 text-[11px] font-semibold text-olive-800">Hidden from website</span>'}
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="${ui.btn}" data-act="up" ${noSort || i === 0 ? 'disabled' : ''} aria-label="Move up">&uarr;</button>
          <button class="${ui.btn}" data-act="down" ${noSort || i === rows.length - 1 ? 'disabled' : ''} aria-label="Move down">&darr;</button>
          <button class="${ui.btn}" data-act="edit" aria-expanded="${open}">${open ? 'Close' : 'Edit'}</button>
          <button class="${ui.btn}" data-act="toggle">${r.is_active ? 'Hide' : 'Show'}</button>
          <button class="${ui.danger}" data-act="delete">Delete</button>
        </div>
      </div>
      ${open ? `<div class="mt-4 space-y-4 border-t border-olive-700/10 pt-4">${cfg.fields.map((f) => fieldHtml(f, r, `f-${r.id}`)).join('')}${cfg.extra ? cfg.extra(r, ctx) : ''}
        <div class="flex justify-end"><button data-act="save" class="${ui.primary}">Save changes</button></div></div>` : ''}
    </li>`;
  }

  function paint(): void {
    const list = $('list-area');
    const shown = visible();
    list.innerHTML = shown.length
      ? `<ul class="space-y-3">${shown.map(rowHtml).join('')}</ul>`
      : emptyState(query ? `No ${cfg.plural} match "${query}".` : `No ${cfg.plural} yet.`);
  }

  function shell(): void {
    const add = `<button data-act="add" class="${ui.primary}">+ Add ${esc(cfg.singular)}</button>`;
    const imp = cfg.starter && rows.length === 0 ? `<button data-act="import" class="${ui.btn}">Import current website content</button>` : '';
    root.innerHTML = `
      <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
        <p class="max-w-xl text-olive-700">${esc(cfg.intro)}</p>
        <div class="flex flex-wrap gap-3">${add}${imp}</div>
      </div>
      <div class="mb-4"><label for="list-search" class="sr-only">Search ${esc(cfg.plural)}</label>
        <input id="list-search" type="search" placeholder="Search ${esc(cfg.plural)}" value="${esc(query)}" class="${ui.input} max-w-sm" /></div>
      <div id="list-area"></div>`;
    paint();
  }

  async function reload(): Promise<void> {
    await load();
    shell();
  }

  async function save(id: string, li: HTMLElement): Promise<void> {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const payload: Record<string, unknown> = {};
    for (const f of cfg.fields) {
      if (f.type === 'image') continue;
      let v: unknown;
      if (f.type === 'checks') {
        v = Array.from(li.querySelectorAll<HTMLInputElement>(`input[data-checks="${f.key}"]:checked`)).map((c) => c.value);
      } else {
        const text = (li.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${f.key}"]`)?.value ?? '').trim();
        v = f.type === 'list' ? text.split('\n').map((s) => s.trim()).filter(Boolean) : text;
      }
      if (f.required && (Array.isArray(v) ? v.length === 0 : !v)) throw new Error(`Please fill in: ${f.label}`);
      payload[f.key] = v;
    }
    if (cfg.table === 'treatments' && String(row.slug).startsWith('treatment-')) {
      payload.slug = `${slugify(String(payload.name)) || 'treatment'}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const { error } = await db().from(cfg.table).update(payload).eq('id', id);
    if (error) throw error;
    setDirty(false);
    openId = null;
    await reload();
    toast('Saved. Press "Publish" when you want the website to update.');
  }

  async function move(id: string, dir: -1 | 1): Promise<void> {
    const i = rows.findIndex((r) => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    const results = await Promise.all(next.flatMap((r, idx) => (r.sort_order === idx ? [] : [db().from(cfg.table).update({ sort_order: idx }).eq('id', r.id)])));
    const bad = results.find((r) => r.error);
    if (bad?.error) throw bad.error;
    await reload();
  }

  async function insertRow(values: Record<string, unknown>): Promise<Row> {
    const next = rows.length ? Math.max(...rows.map((r) => Number(r.sort_order) || 0)) + 1 : 0;
    const { data, error } = await db().from(cfg.table).insert({ ...cfg.defaults, ...values, sort_order: next }).select().single();
    if (error) throw error;
    return data as Row;
  }

  async function act(action: string, id: string | undefined, li: HTMLElement | null): Promise<void> {
    const row = rows.find((r) => r.id === id);
    switch (action) {
      case 'edit':
        if (!confirmLeave()) break;
        openId = openId === id ? null : id ?? null;
        paint();
        break;
      case 'save':
        if (id && li) await save(id, li);
        break;
      case 'toggle': {
        if (!row) break;
        const { error } = await db().from(cfg.table).update({ is_active: !row.is_active }).eq('id', row.id);
        if (error) throw error;
        await reload();
        toast(row.is_active ? 'Hidden. Publish to update the website.' : 'Visible. Publish to update the website.');
        break;
      }
      case 'up':
      case 'down':
        if (id) await move(id, action === 'up' ? -1 : 1);
        break;
      case 'delete': {
        if (!row || !window.confirm(`Delete this ${cfg.singular}? This cannot be undone.`)) break;
        const { error } = await db().from(cfg.table).delete().eq('id', row.id);
        if (error) throw error;
        if (cfg.imageKey) await removeImage(row[cfg.imageKey]);
        openId = null;
        setDirty(false);
        await reload();
        toast('Deleted. Publish to update the website.');
        break;
      }
      case 'add': {
        if (!confirmLeave()) break;
        const values: Record<string, unknown> = {};
        if (cfg.table === 'treatments') values.slug = `treatment-${crypto.randomUUID().slice(0, 8)}`;
        openId = (await insertRow(values)).id;
        await reload();
        toast(`New ${cfg.singular} added. Fill it in and press Save.`);
        break;
      }
      case 'import': {
        if (!cfg.starter || !window.confirm('Copy the current website content here so you can edit it?')) break;
        const { error } = await db().from(cfg.table).insert(cfg.starter.map((r, i) => ({ ...r, sort_order: i })));
        if (error) throw error;
        await reload();
        toast('Imported. You can now edit everything.');
        break;
      }
    }
  }

  async function replaceImage(id: string, key: string, file: File): Promise<void> {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    toast('Uploading photo...');
    const newUrl = await uploadImage(file, cfg.table);
    const { error } = await db().from(cfg.table).update({ [key]: newUrl }).eq('id', id);
    if (error) throw error;
    await removeImage(row[key]);
    await reload();
    toast('Photo updated. Press "Publish" to show it on the website.');
  }

  const repaint = debounce(() => paint(), 150);

  const run = (fn: () => Promise<void>): void => {
    if (busy) return;
    busy = true;
    void guard(fn).finally(() => {
      busy = false;
    });
  };

  return {
    id: cfg.id,
    label: cfg.label,
    icon: cfg.icon,
    title: cfg.title,
    async render(el) {
      root = el;
      const param = new URLSearchParams(location.hash.split('?')[1] ?? '').get('open');
      const addNew = param === 'new';
      if (param) history.replaceState(null, '', location.hash.split('?')[0]);
      openId = addNew ? null : param;
      query = '';
      el.innerHTML = skeleton();
      try {
        [ctx] = await Promise.all([cfg.loadContext ? cfg.loadContext() : Promise.resolve(null), load()]);
      } catch (e) {
        el.innerHTML = '';
        fail(e);
        return;
      }
      shell();
      el.onclick = (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
        if (!btn) return;
        const li = btn.closest<HTMLElement>('li[data-id]');
        run(() => act(btn.dataset.act ?? '', li?.dataset.id, li));
      };
      el.oninput = (e) => {
        const t = e.target as HTMLElement;
        if (t.id === 'list-search') {
          query = (t as HTMLInputElement).value;
          repaint();
        } else if (t.closest('li[data-id]')) {
          setDirty(true);
        }
      };
      el.onchange = (e) => {
        const input = e.target as HTMLInputElement;
        if (input.dataset.checks) setDirty(true);
        if (input.dataset.replace && input.files?.length) {
          const id = input.closest<HTMLElement>('li[data-id]')?.dataset.id;
          const key = input.dataset.replace;
          const file = input.files[0];
          if (id) run(() => replaceImage(id, key, file));
        }
      };
      if (addNew) run(() => act('add', undefined, null));
    },
    dispose() {
      if (root) {
        root.onclick = null;
        root.oninput = null;
        root.onchange = null;
      }
    },
  };
}
