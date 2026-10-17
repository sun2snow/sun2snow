import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sun2snow.dpdns.org',
  // The custom domain serves this project at /, not /sun2snow/.
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
