import { db, emptyState, esc, fail, guard, setDirty, skeleton, toast, ui } from './core';
import type { View } from './core';
import { doctor as starter } from '../../data/doctor';

const TEXT: [string, string, string][] = [
  ['name', 'Name', 'For example: Dr. Gayathri S'],
  ['qualification', 'Qualification', 'For example: BAMS, MD'],
  ['title', 'Title', 'For example: Ayurvedic Physician'],
  ['specialisation', 'Specialisation', ''],
  ['experience', 'Experience', 'For example: 12 years'],
  ['college', 'College', ''],
  ['registration', 'Registration number', 'Shown on the About page only if filled in.'],
];
const LISTS: [string, string, string][] = [
  ['languages', 'Languages', 'One per line'],
  ['focus_areas', 'Focus areas', 'One per line'],
  ['bio', 'About the doctor', 'One paragraph per line. If empty, a default introduction is shown.'],
];

type Data = Record<string, string | string[]>;

function preview(d: Data): string {
  const name = String(d.name || 'Dr. Gayathri S');
  const bio = (d.bio as string[]).length ? (d.bio as string[]) : [`${name} leads the clinic, sees patients at the clinic and online, and every visit begins with an unhurried conversation.`];
  const facts = [['Qualification', d.qualification], ['Specialisation', d.specialisation], ['Experience', d.experience], ['College', d.college], ['Languages', (d.languages as string[]).join(', ')], ['Registration', d.registration]].filter(([, v]) => v);
  return `<p class="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">${esc(d.title || 'The doctor')}</p>
    <h4 class="mt-2 font-display text-2xl font-semibold text-olive-800">About <span class="italic text-gold-500">${esc(name)}</span></h4>
    <div class="mt-3 space-y-2 text-olive-700">${bio.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    ${(d.focus_areas as string[]).length ? `<ul class="mt-3 flex flex-wrap gap-2">${(d.focus_areas as string[]).map((f) => `<li class="rounded-full border border-gold-400/50 bg-white px-3 py-1 text-xs text-olive-800">${esc(f)}</li>`).join('')}</ul>` : ''}
    ${facts.length ? `<dl class="mt-4 grid gap-2 sm:grid-cols-2">${facts.map(([k, v]) => `<div class="rounded-xl bg-white p-3"><dt class="text-[11px] font-semibold uppercase tracking-wider text-olive-600">${k}</dt><dd class="text-sm font-medium text-olive-800">${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    ${d.quote ? `<blockquote class="mt-4 rounded-2xl border border-gold-400/40 bg-white p-4 text-center font-display text-lg italic text-olive-800">&ldquo;${esc(d.quote)}&rdquo;</blockquote>` : ''}`;
}

export const doctorView: View = (() => {
  let root: HTMLElement;

  const read = (): Data => {
    const d: Data = {};
    for (const [k] of TEXT) d[k] = (root.querySelector<HTMLInputElement>(`[name="${k}"]`)?.value ?? '').trim();
    for (const [k] of LISTS) d[k] = (root.querySelector<HTMLTextAreaElement>(`[name="${k}"]`)?.value ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
    d.quote = (root.querySelector<HTMLTextAreaElement>('[name="quote"]')?.value ?? '').trim();
    return d;
  };

  return {
    id: 'doctor',
    label: 'Doctor profile',
    icon: 'M12 3a4 4 0 100 8 4 4 0 000-8zM5 21v-1a7 7 0 0114 0v1',
    title: 'Doctor profile',
    async render(el) {
      root = el;
      el.innerHTML = skeleton(2);
      let row: Record<string, any> | null = null;
      try {
        const { data, error } = await db().from('doctor_profile').select('*').eq('id', 1).maybeSingle();
        if (error) throw error;
        row = data;
      } catch (e) {
        el.innerHTML = emptyState('The doctor profile could not be loaded. Has the admin-v2.sql file been run in Supabase?');
        return fail(e);
      }
      const v = (k: string, fb: string | undefined): string => String(row?.[k] ?? fb ?? '');
      const l = (k: string, fb: string[] | undefined): string => ((row?.[k] as string[] | undefined) ?? fb ?? []).join('\n');
      const field = (k: string, label: string, help: string, value: string, area = false, rows = 4): string => {
        const id = `d-${k}`;
        return `<div><label for="${id}" class="${ui.label}">${label}</label>${area
          ? `<textarea id="${id}" name="${k}" rows="${rows}" class="${ui.input}">${esc(value)}</textarea>`
          : `<input id="${id}" name="${k}" value="${esc(value)}" class="${ui.input}" />`}${help ? `<p class="${ui.help}">${help}</p>` : ''}</div>`;
      };
      el.innerHTML = `<div class="grid gap-6 lg:grid-cols-2">
        <form id="doc-form" class="${ui.card} space-y-4" novalidate>
          ${TEXT.map(([k, label, help]) => field(k, label, help, v(k, (starter as any)[k]))).join('')}
          ${LISTS.map(([k, label, help]) => field(k, label, help, l(k, k === 'focus_areas' ? starter.focusAreas : (starter as any)[k]), true, k === 'bio' ? 7 : 3)).join('')}
          ${field('quote', 'Quote', 'A short sentence in her own words. Shown only if filled in.', v('quote', starter.quote), true, 2)}
          <div class="flex justify-end"><button class="${ui.primary}" type="submit">Save profile</button></div>
        </form>
        <div class="lg:sticky lg:top-4 lg:self-start"><p class="mb-2 text-sm font-semibold text-olive-700">Preview of the About page</p>
          <div id="doc-preview" class="${ui.card}"></div></div></div>`;
      const draw = (): void => { (el.querySelector('#doc-preview') as HTMLElement).innerHTML = preview(read()); };
      draw();
      el.oninput = () => { setDirty(true); draw(); };
      el.onsubmit = (e) => {
        e.preventDefault();
        void guard(async () => {
          const d = read();
          if (!d.name) throw new Error('Please fill in the name.');
          const { error } = await db().from('doctor_profile').upsert({ id: 1, ...d });
          if (error) throw error;
          setDirty(false);
          toast('Doctor profile saved. Press "Publish" when you want the website to update.');
        });
      };
    },
    dispose() {
      if (root) { root.oninput = null; root.onsubmit = null; }
    },
  };
})();
