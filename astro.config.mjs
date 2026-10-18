import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.example.com', // replace with your real domain later
  devToolbar: { enabled: false },
  integrations: [
    sitemap({ filter: (page) => !page.includes('/404') && !page.includes('/admin') }),
  ],
  vite: { plugins: [tailwindcss()] },
});