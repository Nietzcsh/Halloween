import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Netlify sets URL (your site's address) during builds. Link previews need the
// full address of the preview image, so we fill it into index.html here.
const siteUrl = (process.env.URL || '').replace(/\/$/, '');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
    },
  ],
});
