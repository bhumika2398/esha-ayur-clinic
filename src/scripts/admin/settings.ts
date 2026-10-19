import { db, emptyState, esc, fail, guard, setDirty, skeleton, toast, ui } from './core';
import type { View } from './core';
import { site } from '../../data/site';

const GROUPS: { title: string; fields: [string, string, string?][] }[] = [
  { title: 'Contact', fields: [['phone_display', 'Phone number (as shown)', 'For example: 098805 35528'], ['phone_tel', 'Phone number for the Call button', 'With country code, for example: +919880535528'], ['whatsapp', 'WhatsApp number', 'Digits only with country code, for example: 919880535528'], ['email', 'Email']] },
  { title: 'Address', fields: [['street', 'Street'], ['area', 'Area'], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode'], ['maps_url', 'Google Maps link', 'Used by the "Get directions" buttons. Leave empty to use the address.']] },
  { title: 'Timings', fields: [['clinic_hours', 'Clinic timings'], ['online_hours', 'Online consultation timings']] },
];

const defaults = (): Record<string, any> => ({
  phone_display: site.phoneDisplay, phone_tel: site.phoneTel, whatsapp: site.whatsapp, email: site.email,
  street: site.address.street, area: site.address.area, city: site.address.city, state: site.address.state, pincode: site.address.pincode,
  clinic_hours: site.hours.clinic, online_hours: site.hours.online, maps_url: '', sheet_url: '', show_prices: true,
  pricing_note: site.pricingNote, announcement: '',
});

export const settingsView: View = (() => {
  let root: HTMLElement;

  return {
    id: 'settings',
    label: 'Clinic info and settings',
    icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14 3h-4l-.6 2.7a7 7 0 00-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 000 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2L10 21h4l.6-2.7a7 7 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
    title: 'Clinic info and settings',
    async render(el) {
      root = el;
      el.innerHTML = skeleton(2);
      let row: Record<string, any> | null;
      try {
        const { data, error } = await db().from('site_settings').select('*').eq('id', 1).maybeSingle();
        if (error) throw error;
        row = data;
      } catch (e) {
        el.innerHTML = emptyState('The settings could not be loaded. Has the admin-v2.sql file been run in Supabase?');
        return fail(e);
      }
      const d = { ...defaults(), ...(row ?? {}) };
      const input = (k: string, label: string, help?: string): string =>
        `<div><label for="s-${k}" class="${ui.label}">${label}</label><input id="s-${k}" name="${k}" value="${esc(d[k])}" class="${ui.input}" />${help ? `<p class="${ui.help}">${help}</p>` : ''}</div>`;

      el.innerHTML = `<div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form id="set-form" class="space-y-5" novalidate>
          ${GROUPS.map((g) => `<fieldset class="${ui.card} space-y-4"><legend class="px-1 font-display text-xl font-semibold text-olive-800">${g.title}</legend>${g.fields.map(([k, l, h]) => input(k, l, h)).join('')}</fieldset>`).join('')}
          <fieldset class="${ui.card} space-y-4"><legend class="px-1 font-display text-xl font-semibold text-olive-800">Website</legend>
            <label class="flex items-start gap-3 text-olive-800"><input type="checkbox" name="show_prices" class="mt-1 h-5 w-5" ${d.show_prices ? 'checked' : ''} /><span><span class="font-semibold">Show prices on the website</span><span class="block text-sm text-olive-600">Turn this off to show "Please call for prices" everywhere.</span></span></label>
            <div><label for="s-pricing_note" class="${ui.label}">Note under the price list</label><textarea id="s-pricing_note" name="pricing_note" rows="3" class="${ui.input}">${esc(d.pricing_note)}</textarea></div>
            <div><label for="s-announcement" class="${ui.label}">Announcement banner</label><input id="s-announcement" name="announcement" value="${esc(d.announcement)}" class="${ui.input}" /><p class="${ui.help}">Shown at the top of every page, for example a holiday closure. Leave empty for no banner.</p></div>
          </fieldset>
          <fieldset class="${ui.card} space-y-3"><legend class="px-1 font-display text-xl font-semibold text-olive-800">Requests sheet</legend>
            ${input('sheet_url', 'Google Sheet link', 'The sheet where appointment requests are also saved.')}
            <button type="button" id="open-sheet" class="${ui.btn}">Open requests sheet</button></fieldset>
          <div class="flex justify-end"><button type="submit" class="${ui.primary}">Save settings</button></div>
        </form>
        <div class="space-y-5">
          <form id="pw-form" class="${ui.card} space-y-4" novalidate><h3 class="font-display text-xl font-semibold text-olive-800">Change password</h3>
            <div><label for="pw1" class="${ui.label}">New password</label><input id="pw1" type="password" autocomplete="new-password" class="${ui.input}" /></div>
            <div><label for="pw2" class="${ui.label}">Repeat new password</label><input id="pw2" type="password" autocomplete="new-password" class="${ui.input}" /></div>
            <p class="${ui.help}">At least 8 characters.</p><button type="submit" class="${ui.primary}">Change password</button></form>
          <div class="${ui.card}"><h3 class="font-display text-xl font-semibold text-olive-800">Log out</h3><p class="mt-1 text-sm text-olive-700">Sign out of the admin panel on this device.</p><button type="button" id="logout-2" class="${ui.btn} mt-3">Log out</button></div>
        </div></div>`;

      const form = el.querySelector<HTMLFormElement>('#set-form') as HTMLFormElement;
      form.oninput = () => setDirty(true);
      form.onsubmit = (e) => {
        e.preventDefault();
        void guard(async () => {
          const payload: Record<string, unknown> = { id: 1 };
          for (const g of GROUPS) for (const [k] of g.fields) payload[k] = (form.elements.namedItem(k) as HTMLInputElement).value.trim();
          for (const k of ['pricing_note', 'announcement', 'sheet_url']) payload[k] = (form.elements.namedItem(k) as HTMLInputElement).value.trim();
          payload.show_prices = (form.elements.namedItem('show_prices') as HTMLInputElement).checked;
          const { error } = await db().from('site_settings').upsert(payload);
          if (error) throw error;
          setDirty(false);
          toast('Settings saved. Press "Publish" when you want the website to update.');
        });
      };
      el.querySelector('#open-sheet')?.addEventListener('click', () => {
        const url = (form.elements.namedItem('sheet_url') as HTMLInputElement).value.trim();
        if (/^https:\/\//.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
        else toast('Add the Google Sheet link first (it must start with https://).', true);
      });
      el.querySelector<HTMLFormElement>('#pw-form')!.onsubmit = (e) => {
        e.preventDefault();
        void guard(async () => {
          const a = (el.querySelector('#pw1') as HTMLInputElement).value;
          const b = (el.querySelector('#pw2') as HTMLInputElement).value;
          if (a.length < 8) throw new Error('The password must have at least 8 characters.');
          if (a !== b) throw new Error('The two passwords do not match.');
          const { error } = await db().auth.updateUser({ password: a });
          if (error) throw error;
          (el.querySelector('#pw1') as HTMLInputElement).value = '';
          (el.querySelector('#pw2') as HTMLInputElement).value = '';
          toast('Password changed.');
        });
      };
      el.querySelector('#logout-2')?.addEventListener('click', () => document.getElementById('logout')?.click());
    },
    dispose() {
      void root;
    },
  };
})();
