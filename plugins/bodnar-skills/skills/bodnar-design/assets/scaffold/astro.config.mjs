import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true }, // gives `locals.runtime.env` in dev
    imageService: 'compile',
  }),
  integrations: [
    vue({ appEntrypoint: '/src/lib/vue-app.ts' }),
  ],
  vite: {
    resolve: {
      // Avoid `react-dom/server` in Workers; Astro 6.3 handles this but be explicit
      conditions: ['workerd', 'worker', 'browser'],
    },
  },
});
