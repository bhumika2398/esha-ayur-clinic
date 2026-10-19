import { db, emptyState, esc, fail, guard, removeImage, selectAll, skeleton, toast, ui, uploadImage } from './core';
import type { Row, View } from './core';

type Sec = 'therapy' | 'clinic' | 'doctor';
const AREAS: { id: Sec; title: string; intro: string; multi: boolean; empty: string }[] = [
  { id: 'therapy', title: 'Therapy centre', intro: 'Shown in the Therapy Centre section and page. You can upload several photos at once.', multi: true, empty: 'No photos yet. The website shows the built-in therapy photos until you upload your own.' },
  { id: 'clinic', title: 'Clinic and pharmacy', intro: 'Shown in "Find us in Byatarayanapura" on the home and about pages.', multi: true, empty: 'No photos yet. The website shows the built-in clinic photos.' },
  { id: 'doctor', title: 'Doctor portrait', intro: 'One portrait, shown on the home and about pages. Choosing a new photo replaces the old one.', multi: false, empty: 'No portrait uploaded yet. The website shows the built-in portrait.' },
];

export const photosView: View = (() => {
  let rows: Row[] = [];
  let root: HTMLElement;
  let busy = false;

  const inSec = (s: Sec): Row[] => rows.filter((r) => r.section === s);

  function paint(): void {
    root.innerHTML = AREAS.map((a) => {
      const list = inSec(a.id);
      const upload = `<label class="${ui.primary} cursor-pointer"><input type="file" accept="image/*" ${a.multi ? 'multiple' : ''} class="sr-only" data-upload="${a.id}" />${a.multi ? '+ Upload photos' : list.length ? 'Replace portrait' : 'Upload portrait'}</label>`;
      const items = list.map((r, i) => `<li data-id="${r.id}" class="flex flex-wrap items-center gap-3 rounded-xl bg-white/70 p-3">
          <img src="${esc(r.image)}" alt="${esc(r.caption || 'Photo')}" class="h-20 w-28 rounded-lg object-cover" loading="lazy" />
          <div class="min-w-[12rem] flex-1">
            ${a.multi ? `<label for="cap-${r.id}" class="sr-only">Caption</label><input id="cap-${r.id}" data-caption value="${esc(r.caption)}" placeholder="Caption (optional)" class="${ui.input}" />` : '<p class="text-sm text-olive-700">Current portrait</p>'}
            ${r.is_active ? '' : '<span class="mt-1 inline-block rounded-full bg-sand-300 px-2 py-0.5 text-[11px] font-semibold text-olive-800">Hidden from website</span>'}
          </div>
          <div class="flex flex-wrap gap-2">
            ${a.multi ? `<button data-act="up" class="${ui.btn}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">&uarr;</button><button data-act="down" class="${ui.btn}" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Move down">&darr;</button>` : ''}
            <button data-act="toggle" class="${ui.btn}">${r.is_active ? 'Hide' : 'Show'}</button>
            <button data-act="delete" class="${ui.danger}">Delete</button>
          </div></li>`).join('');
      return `<section class="${ui.card} mb-5" aria-labelledby="ph-${a.id}">
        <div class="mb-3 flex flex-wrap items-start justify-between gap-3"><div><h3 id="ph-${a.id}" class="font-display text-xl font-semibold text-olive-800">${a.title}</h3><p class="max-w-xl text-sm text-olive-700">${a.intro}</p></div>${upload}</div>
        ${list.length ? `<ul class="space-y-2">${items}</ul>` : emptyState(a.empty)}</section>`;
    }).join('');
  }

  async function reload(): Promise<void> {
    rows = await selectAll('gallery');
    paint();
  }

  async function upload(sec: Sec, files: File[]): Promise<void> {
    const area = AREAS.find((a) => a.id === sec);
    if (!area) return;
    let next = rows.length ? Math.max(...rows.map((r) => Number(r.sort_order) || 0)) + 1 : 0;
    let count = 0;
    for (const file of files.slice(0, area.multi ? files.length : 1)) {
      count += 1;
      toast(`Uploading photo ${count} of ${area.multi ? files.length : 1}...`);
      const image = await uploadImage(file, `gallery-${sec}`);
      const existing = area.multi ? undefined : inSec(sec)[0];
      if (existing) {
        const { error } = await db().from('gallery').update({ image, is_active: true }).eq('id', existing.id);
        if (error) throw error;
        await removeImage(existing.image);
      } else {
        const { error } = await db().from('gallery').insert({ section: sec, image, caption: '', sort_order: next++ });
        if (error) throw error;
      }
    }
    await reload();
    toast(`${count} photo${count > 1 ? 's' : ''} saved. Press "Publish" to show ${count > 1 ? 'them' : 'it'} on the website.`);
  }

  async function act(a: string, id: string): Promise<void> {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (a === 'toggle') {
      const { error } = await db().from('gallery').update({ is_active: !row.is_active }).eq('id', id);
      if (error) throw error;
      await reload();
      toast(row.is_active ? 'Hidden. Publish to update the website.' : 'Visible. Publish to update the website.');
    } else if (a === 'delete') {
      if (!window.confirm('Delete this photo? This cannot be undone.')) return;
      const { error } = await db().from('gallery').delete().eq('id', id);
      if (error) throw error;
      await removeImage(row.image);
      await reload();
      toast('Photo deleted. Publish to update the website.');
    } else if (a === 'up' || a === 'down') {
      const list = inSec(row.section);
      const i = list.findIndex((r) => r.id === id);
      const other = list[i + (a === 'up' ? -1 : 1)];
      if (!other) return;
      const [x, y] = await Promise.all([
        db().from('gallery').update({ sort_order: other.sort_order }).eq('id', row.id),
        db().from('gallery').update({ sort_order: row.sort_order }).eq('id', other.id),
      ]);
      if (x.error || y.error) throw x.error ?? y.error;
      await reload();
    }
  }

  const run = (fn: () => Promise<void>): void => {
    if (busy) return;
    busy = true;
    void guard(fn).finally(() => { busy = false; });
  };

  return {
    id: 'photos',
    label: 'Photos',
    icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4 17l5-5 4 4 3-3 4 4',
    title: 'Photos',
    async render(el) {
      root = el;
      el.innerHTML = skeleton();
      try {
        await reload();
      } catch (e) {
        el.innerHTML = '';
        return fail(e);
      }
      el.onclick = (e) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
        const id = b?.closest<HTMLElement>('li[data-id]')?.dataset.id;
        if (b && id) run(() => act(b.dataset.act ?? '', id));
      };
      el.onchange = (e) => {
        const t = e.target as HTMLInputElement;
        if (t.dataset.upload && t.files?.length) {
          const files = Array.from(t.files);
          const sec = t.dataset.upload as Sec;
          run(() => upload(sec, files));
        } else if (t.dataset.caption !== undefined) {
          const id = t.closest<HTMLElement>('li[data-id]')?.dataset.id;
          if (id) run(async () => {
            const { error } = await db().from('gallery').update({ caption: t.value.trim() }).eq('id', id);
            if (error) throw error;
            const r = rows.find((x) => x.id === id);
            if (r) r.caption = t.value.trim();
            toast('Caption saved.');
          });
        }
      };
    },
    dispose() {
      if (root) { root.onclick = null; root.onchange = null; }
    },
  };
})();
