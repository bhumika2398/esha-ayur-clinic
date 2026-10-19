import { $, confirmLeave, esc, fail, guard, isDirty, publish, sb, setDirty } from './core';
import type { View } from './core';
import { dashboardView } from './dashboard';
import { appointmentsView } from './appointments';
import { faqsView, reviewsView, treatmentsView } from './lists';
import { pricesView } from './prices';
import { photosView } from './photos';
import { doctorView } from './doctor';
import { settingsView } from './settings';

/* ---------- Startup errors: never leave a blank page ---------- */

let started = false;

function showFatal(err: unknown): void {
  console.error('Admin panel failed to start:', err);
  const text = err instanceof Error ? err.message : String(err);
  let box = document.getElementById('admin-fatal');
  if (!box) {
    box = document.createElement('div');
    box.id = 'admin-fatal';
    box.setAttribute('role', 'alert');
    box.className = 'mx-auto my-6 max-w-xl rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700';
    (document.querySelector('main') ?? document.body).prepend(box);
  }
  box.textContent = '';
  const title = document.createElement('p');
  title.className = 'font-display text-2xl font-semibold';
  title.textContent = 'The admin panel could not start';
  const detail = document.createElement('p');
  detail.className = 'mt-2 break-words text-sm';
  detail.textContent = text;
  box.append(title, detail);
}

window.addEventListener('error', (e) => {
  if (!started) showFatal(e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  if (!started) showFatal(e.reason);
});

/* ---------- Screens and routing ---------- */

const views: View[] = [dashboardView, appointmentsView, treatmentsView, pricesView, photosView, doctorView, faqsView, reviewsView, settingsView];
let current: View | null = null;
let revert = false;

const routeId = (): string => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard');

function buildNav(): void {
  $('nav').innerHTML = views
    .map((v) => `<a href="#/${v.id}" data-nav="${v.id}" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-olive-800 transition hover:bg-sage-100 aria-[current=page]:bg-olive-700 aria-[current=page]:text-cream-50">
      <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${v.icon}" /></svg>${esc(v.label)}</a>`)
    .join('');
}

async function show(id: string): Promise<void> {
  const view = views.find((v) => v.id === id) ?? views[0];
  current?.dispose?.();
  current = view;
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach((a) => {
    if (a.dataset.nav === view.id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('view-title').textContent = view.title;
  document.title = `${view.title} | Admin | Esha Ayur Care`;
  setMenu(false);
  const panel = $('panel');
  panel.onclick = panel.oninput = panel.onchange = panel.onsubmit = null;
  window.scrollTo({ top: 0 });
  try {
    await view.render(panel);
  } catch (e) {
    fail(e);
  }
}

window.addEventListener('hashchange', () => {
  if (revert) {
    revert = false;
    return;
  }
  if (!confirmLeave()) {
    revert = true;
    location.hash = `#/${current?.id ?? 'dashboard'}`;
    return;
  }
  void show(routeId());
});

/* ---------- Mobile menu ---------- */

function setMenu(open: boolean): void {
  $('side').classList.toggle('-translate-x-full', !open);
  $('overlay').classList.toggle('hidden', !open);
  $('menu-btn').setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('overflow-hidden', open && window.matchMedia('(max-width: 1023px)').matches);
}
$('menu-btn').addEventListener('click', () => setMenu($('menu-btn').getAttribute('aria-expanded') !== 'true'));
$('overlay').addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('menu-btn').getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    $('menu-btn').focus();
  }
});

/* ---------- Publish ---------- */

const publishBtn = $<HTMLButtonElement>('publish');
publishBtn.addEventListener('click', () => void guard(publish));
document.addEventListener('admin:published', () => {
  publishBtn.disabled = true;
  publishBtn.textContent = 'Publishing...';
  window.setTimeout(() => {
    publishBtn.disabled = false;
    publishBtn.textContent = 'Publish';
  }, 60000);
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
  buildNav();
  await show(routeId());
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('login-msg');
  msg.textContent = 'Signing in...';
  const { data, error } = await sb!.auth.signInWithPassword({
    email: $<HTMLInputElement>('login-email').value.trim(),
    password: $<HTMLInputElement>('login-password').value,
  });
  if (error || !data.session) {
    console.error('Sign-in failed:', error);
    msg.textContent = error?.message || 'Could not sign in.';
    return;
  }
  msg.textContent = '';
  $<HTMLInputElement>('login-password').value = '';
  await enter(data.session.user.email ?? '');
});

$('logout').addEventListener('click', async () => {
  if (!confirmLeave()) return;
  await sb?.auth.signOut();
  setDirty(false);
  showLogin();
});

async function boot(): Promise<void> {
  try {
    if (!sb) {
      $('setup-warning').classList.remove('hidden');
      started = true;
      return;
    }
    const { data } = await sb.auth.getSession();
    if (data.session) await enter(data.session.user.email ?? '');
    else showLogin();
    sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && !isDirty()) showLogin();
    });
    started = true;
  } catch (err) {
    showFatal(err);
  }
}

void boot();
