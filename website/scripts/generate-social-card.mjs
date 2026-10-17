import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { site } from '../src/data/site.ts';

const root = new URL('../', import.meta.url);
const asset = async (path, mime) => `data:${mime};base64,${(await readFile(new URL(path, root))).toString('base64')}`;
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const formattedName = escape(site.name).replace('2', '<span class="name-transition">2</span>');
const avatar = await asset('public/avatar.png', 'image/png');
const inter = await asset('node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'font/woff2');
const mono = await asset('node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', 'font/woff2');

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  // Everything is embedded: generation never contacts GitHub or a font CDN.
  await page.route('http://**/*', (route) => route.abort());
  await page.route('https://**/*', (route) => route.abort());
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    @font-face { font-family: Inter; src: url('${inter}'); font-weight: 100 900; }
    @font-face { font-family: Mono; src: url('${mono}'); font-weight: 100 800; }
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; padding: 66px 76px; background: #0b1220; color: #e6edf3; font-family: Inter, sans-serif; position: relative; overflow: hidden; }
    body::before { content: ''; position: absolute; width: 800px; height: 800px; right: -300px; top: -150px; background: radial-gradient(ellipse at 30% 45%, #ffb86b13, transparent 52%), radial-gradient(ellipse at 65% 60%, #a5d8ff17, transparent 55%); }
    .identity { display: flex; align-items: center; gap: 28px; position: relative; }
    img { width: 96px; height: 96px; border-radius: 22px; border: 1px solid #ffb86b50; }
    .transition { display: flex; align-items: center; gap: 16px; font: 17px Mono; color: #ffb86b; }
    .line { width: 48px; height: 1px; background: linear-gradient(90deg, #ffb86b, #a5d8ff); }
    .snow { color: #a5d8ff; }
    h1 { margin: 28px 0 18px; font-size: 80px; font-weight: 550; letter-spacing: -.045em; line-height: 1.15; position: relative; }
    .name-transition { color: #a5d8ff; font-size: .76em; line-height: 0; letter-spacing: -.015em; }
    .name-period { color: #ffb86b; font-size: .8em; }
    p { margin: 0; max-width: 600px; color: #a2afc2; font-size: 24px; line-height: 1.65; letter-spacing: -.35px; position: relative; }
    footer { position: absolute; left: 76px; right: 76px; bottom: 49px; padding-top: 22px; font: 14px Mono; color: #a2afc2; }
    footer::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, #ffb86b80, #a5d8ff40, #a5d8ff0a); }
  </style></head><body>
    <div class="identity"><img src="${avatar}" alt=""><div class="transition">sun<span class="line"></span><span class="snow">snow</span></div></div>
    <h1>${formattedName}<span class="name-period">.</span></h1>
    <p>${escape(site.introduction)}</p>
    <footer>sun2snow.dpdns.org</footer>
  </body></html>`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  await page.screenshot({ path: fileURLToPath(new URL('public/social-card.png', root)) });
  console.log('Generated public/social-card.png (1200 × 630).');
} finally {
  await browser.close();
}
