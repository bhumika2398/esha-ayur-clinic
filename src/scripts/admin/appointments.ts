import { $, db, debounce, emptyState, esc, guard, selectAll, setDirty, skeleton, toast, ui, waDigits, fail } from './core';
import type { Row, View } from './core';

export const STATUSES: [string, string, string][] = [
  ['new', 'New', 'bg-gold-300 text-olive-900'],
  ['contacted', 'Contacted', 'bg-sage-300 text-olive-900'],
  ['confirmed', 'Confirmed', 'bg-olive-700 text-cream-50'],
  ['completed', 'Completed', 'bg-sage-100 text-olive-800'],
  ['cancelled', 'Cancelled', 'bg-sand-300 text-olive-800'],
  ['no_show', 'No show', 'bg-red-100 text-red-800'],
];
const label = (s: string): string => STATUSES.find((x) => x[0] === s)?.[1] ?? s;

export const statusChip = (s: string): string =>
  `<span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUSES.find((x) => x[0] === s)?.[2] ?? 'bg-sage-100 text-olive-800'}">${esc(label(s))}</span>`;

export const statusSelect = (r: Row): string =>
  `<label class="sr-only" for="st-${r.id}">Status for ${esc(r.name)}</label><select id="st-${r.id}" data-status="${r.id}" class="${ui.input} !w-auto !py-1.5 text-sm">${STATUSES.map(([v, l]) => `<option value="${v}" ${r.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;

export const prettyDate = (iso?: string | null): string =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'No date';

export function contactButtons(r: Row): string {
  const msg = `Hello ${r.name}, this is Esha Ayur Care about your appointment request${r.treatment ? ` for ${r.treatment}` : ''}${r.preferred_date ? ` on ${prettyDate(r.preferred_date)}` : ''}.`;
  return `<a href="tel:${esc(String(r.phone).replace(/[^\d+]/g, ''))}" class="${ui.btn}">Call</a><a href="https://wa.me/${waDigits(String(r.phone))}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer" class="${ui.btn}">WhatsApp</a>`;
}

export async function setStatus(id: string, status: string): Promise<void> {
  const { error } = await db().from('appointment_requests').update({ status }).eq('id', id);
  if (error) throw error;
  toast(`Marked as ${label(status).toLowerCase()}.`);
}

const csvCell = (v: unknown): string => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // stops spreadsheet formulas
  return `"${s.replace(/"/g, '""')}"`;
};

export const appointmentsView: View = (() => {
  let rows: Row[] = [];
  let root: HTMLElement;
  let q = '';
  let status = '';
  let date = '';
  const unsaved = new Set<string>();

  const filtered = (): Row[] => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!status || r.status === status) &&
        (!date || r.preferred_date === date) &&
        (!s || [r.name, r.phone, r.treatment, r.department, r.message].some((v) => String(v ?? '').toLowerCase().includes(s)))
    );
  };

  function card(r: Row): string {
    const when = new Date(r.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    return `<li data-id="${r.id}" class="rounded-2xl border bg-cream-50 p-4 shadow-sm ${r.status === 'new' ? 'border-gold-500 ring-1 ring-gold-400/50' : 'border-olive-700/10'}">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-olive-800">${esc(r.name)} ${statusChip(r.status)}</p>
          <p class="text-sm text-olive-700">${esc(r.phone)} &middot; received ${esc(when)}${r.source ? ` &middot; ${esc(r.source)}` : ''}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">${contactButtons(r)}${statusSelect(r)}</div>
      </div>
      <dl class="mt-3 grid gap-x-6 gap-y-1 text-sm text-olive-800 sm:grid-cols-2">
        <div><dt class="inline font-semibold">Treatment: </dt><dd class="inline">${esc(r.treatment || r.department || 'Not given')}</dd></div>
        <div><dt class="inline font-semibold">Visit: </dt><dd class="inline">${esc(r.visit_type || 'Not given')}</dd></div>
        <div><dt class="inline font-semibold">Preferred: </dt><dd class="inline">${esc(prettyDate(r.preferred_date))} ${esc(r.preferred_time)}</dd></div>
        ${r.message ? `<div class="sm:col-span-2"><dt class="inline font-semibold">Message: </dt><dd class="inline">${esc(r.message)}</dd></div>` : ''}
      </dl>
      <div class="mt-3 flex flex-wrap items-end gap-3">
        <div class="min-w-[14rem] flex-1"><label for="n-${r.id}" class="${ui.label}">Private notes</label>
          <textarea id="n-${r.id}" data-note="${r.id}" rows="2" class="${ui.input}">${esc(r.notes)}</textarea></div>
        <button data-act="note" class="${ui.btn}">Save note</button>
        <button data-act="delete" class="${ui.danger}">Delete</button>
      </div>
    </li>`;
  }

  function paint(): void {
    const list = filtered();
    $('appt-count').textContent = `${list.length} of ${rows.length} requests`;
    $('appt-list').innerHTML = list.length ? `<ul class="space-y-3">${list.map(card).join('')}</ul>` : emptyState(rows.length ? 'No requests match these filters.' : 'No appointment requests yet. New ones appear here as soon as patients send them.');
  }

  function exportCsv(): void {
    const head = ['Received', 'Status', 'Name', 'Phone', 'Department', 'Treatment', 'Visit', 'Preferred date', 'Preferred time', 'Message', 'Notes', 'Source'];
    const lines = filtered().map((r) => [r.created_at, label(r.status), r.name, r.phone, r.department, r.treatment, r.visit_type, r.preferred_date, r.preferred_time, r.message, r.notes, r.source].map(csvCell).join(','));
    const blob = new Blob([`﻿${[head.map(csvCell).join(','), ...lines].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `appointment-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function purgeOld(): Promise<void> {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const iso = cutoff.toISOString();
    const { count, error } = await db().from('appointment_requests').select('id', { count: 'exact', head: true }).lt('created_at', iso);
    if (error) throw error;
    if (!count) return toast('There are no requests older than 12 months.');
    if (!window.confirm(`Delete ${count} request(s) older than 12 months? This cannot be undone. Export the CSV first if you want a copy.`)) return;
    const { error: e2 } = await db().from('appointment_requests').delete().lt('created_at', iso);
    if (e2) throw e2;
    rows = await selectAll('appointment_requests', [['created_at', false]]);
    paint();
    toast(`Deleted ${count} old request(s).`);
  }

  return {
    id: 'appointments',
    label: 'Appointments',
    icon: 'M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
    title: 'Appointment requests',
    async render(el) {
      root = el;
      q = status = date = '';
      unsaved.clear();
      el.innerHTML = skeleton();
      try {
        rows = await selectAll('appointment_requests', [['created_at', false]]);
      } catch (e) {
        el.innerHTML = emptyState('Appointment requests could not be loaded. Has the admin-v2.sql file been run in Supabase?');
        return fail(e);
      }
      el.innerHTML = `
        <div class="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div><label for="appt-q" class="sr-only">Search requests</label><input id="appt-q" type="search" placeholder="Search name, phone or treatment" class="${ui.input}" /></div>
          <div><label for="appt-status" class="sr-only">Filter by status</label><select id="appt-status" class="${ui.input}"><option value="">All statuses</option>${STATUSES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
          <div><label for="appt-date" class="sr-only">Filter by preferred date</label><input id="appt-date" type="date" class="${ui.input}" /></div>
          <button data-act="clear" class="${ui.btn}">Clear filters</button>
        </div>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p id="appt-count" class="text-sm text-olive-700" aria-live="polite"></p>
          <div class="flex flex-wrap gap-2"><button data-act="csv" class="${ui.btn}">Export CSV</button><button data-act="purge" class="${ui.danger}">Delete requests older than 12 months</button></div>
        </div>
        <div id="appt-list"></div>`;
      paint();
      const repaint = debounce(paint, 150);
      el.oninput = (e) => {
        const t = e.target as HTMLInputElement;
        if (t.id === 'appt-q') { q = t.value; repaint(); }
        else if (t.dataset.note) { unsaved.add(t.dataset.note); setDirty(true); }
      };
      el.onchange = (e) => {
        const t = e.target as HTMLSelectElement;
        if (t.id === 'appt-status') { status = t.value; paint(); }
        else if (t.id === 'appt-date') { date = t.value; paint(); }
        else if (t.dataset.status) {
          const id = t.dataset.status;
          void guard(async () => {
            await setStatus(id, t.value);
            const r = rows.find((x) => x.id === id);
            if (r) r.status = t.value;
            paint();
          });
        }
      };
      el.onclick = (e) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
        if (!b) return;
        const id = b.closest<HTMLElement>('li[data-id]')?.dataset.id;
        switch (b.dataset.act) {
          case 'clear':
            q = status = date = '';
            (el.querySelector('#appt-q') as HTMLInputElement).value = '';
            (el.querySelector('#appt-status') as HTMLSelectElement).value = '';
            (el.querySelector('#appt-date') as HTMLInputElement).value = '';
            paint();
            break;
          case 'csv': exportCsv(); break;
          case 'purge': void guard(purgeOld); break;
          case 'note':
            if (id) void guard(async () => {
              const notes = (el.querySelector<HTMLTextAreaElement>(`#n-${id}`)?.value ?? '').trim();
              const { error } = await db().from('appointment_requests').update({ notes }).eq('id', id);
              if (error) throw error;
              const r = rows.find((x) => x.id === id);
              if (r) r.notes = notes;
              unsaved.delete(id);
              setDirty(unsaved.size > 0);
              toast('Note saved.');
            });
            break;
          case 'delete':
            if (id && window.confirm('Delete this request? This cannot be undone.')) void guard(async () => {
              const { error } = await db().from('appointment_requests').delete().eq('id', id);
              if (error) throw error;
              rows = rows.filter((x) => x.id !== id);
              unsaved.delete(id);
              setDirty(unsaved.size > 0);
              paint();
              toast('Request deleted.');
            });
            break;
        }
      };
    },
    dispose() {
      if (root) { root.onclick = root.oninput = root.onchange = null; }
    },
  };
})();
