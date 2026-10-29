import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const origin = 'https://sun2snow.dpdns.org';

test('shows the approved content and working navigation', async ({ page }) => {
  // Avoid a synthetic click scrolling the header while a previous smooth anchor scroll is still running.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page).toHaveTitle('sun2snow — Find me online');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('sun2snow');
  await expect(page.getByText('Find me around the web. Say hello, or meet me in a contest.')).toBeVisible();
  await expect(page.locator('#projects')).toBeVisible();
  await expect(page.locator('#projects details, #projects summary')).toHaveCount(0);
  await expect(page.locator('.project-heading h3')).toHaveText(['QOJ-Translate', 'VR OI Simulator']);
  await expect(page.getByRole('heading', { name: 'QOJ-Translate' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View QOJ-Translate on GitHub' })).toHaveAttribute('href', 'https://github.com/sun2snow/QOJ-Translate');
  const simulator = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'VR OI Simulator' }) });
  await expect(simulator.locator('.project-description')).toHaveText('A first-person OI exam-room game.');
  await expect(simulator.getByRole('link', { name: 'Quick start VR OI Simulator' })).toHaveAttribute('href', 'https://vr-oi.sun2snow.dpdns.org/');
  await expect(simulator.getByRole('link', { name: 'View VR OI Simulator on GitHub' })).toHaveAttribute('href', 'https://github.com/sun2snow/vr-oi-simulator');
  await expect(page.getByRole('link', { name: 'Read the blog' })).toHaveAttribute('href', 'https://www.cnblogs.com/oier-wst');
  await expect(page.getByRole('link', { name: 'Visit GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/sun2snow');
  await expect(page.locator('a[target="_blank"]')).toHaveCount(0);

  await expect(page.getByRole('link', { name: 'Find me online' })).toHaveCount(0);
  await expect(page.locator('.hero .button, .hero-actions')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Connect', exact: true }).click();
  await expect(page).toHaveURL(/\/#connect$/);
  await expect(page.locator('#connect')).toBeInViewport();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Notes' }).click();
  await expect(page).toHaveURL(/\/#notes$/);
  await expect(page.locator('#notes')).toBeInViewport();

  for (const href of await page.locator('a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')!))) {
    await expect(page.locator(href)).toHaveCount(1);
  }
});

test('loads only local assets without remote requests, cookies, or browser errors', async ({ page }) => {
  const remoteRequests: string[] = [];
  const errors: string[] = [];
  const failedRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).hostname !== '127.0.0.1') remoteRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator('.avatar').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('script')).toHaveCount(1);
  await expect(page.locator('script')).toHaveAttribute('type', 'module');
  expect(remoteRequests).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
});

test('remains usable with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('sun2snow');
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Connect', exact: true }).click();
    await expect(page).toHaveURL(/\/#connect$/);
    await expect(page.locator('.qq-number')).toHaveText('77017505');
    await expect(page.getByRole('button', { name: 'Copy QQ number' })).not.toBeVisible();
    await expect(page.getByText('Select the QQ number to copy it manually.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quick start VR OI Simulator' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Install QOJ-Translate' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View QOJ-Translate on GitHub' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Read the blog' })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('passes automated accessibility checks', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']).analyze();
  expect(results.violations).toEqual([]);
});

test('supports keyboard skip navigation and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  expect(await page.locator('.text-link').first().evaluate((link) => getComputedStyle(link).transitionDuration)).toBe('0s');
  const arrow = page.getByRole('link', { name: 'Visit X', exact: true });
  await arrow.focus();
  await expect(arrow).toHaveCSS('transition-duration', '0s');
  await expect(arrow.locator('svg')).toHaveCSS('transition-duration', '0s');
  await expect(arrow.locator('svg')).toHaveCSS('transform', 'none');
  await expect(arrow).toHaveCSS('outline-style', 'solid');
  const projectLink = page.getByRole('link', { name: 'Quick start VR OI Simulator' });
  await projectLink.focus();
  await expect(projectLink.locator('svg')).toHaveCSS('transform', 'none');
});

test('has no horizontal overflow at small widths and enlarged text', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow, `horizontal overflow at ${width}px`).toBe(false);
  }
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.addStyleTag({ content: 'body { zoom: 2; }' });
  // Browser zoom is normally paired with a larger physical viewport.
  await page.setViewportSize({ width: 1280, height: 1000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('has canonical metadata, sharing assets, sitemap, robots and domain configuration', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${origin}/social-card.png`);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  for (const path of ['/avatar.png', '/social-card.png', '/favicon.svg']) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(response.headers()['content-type']).toMatch(/^image\//);
  }
  const social = await request.get('/social-card.png');
  const png = await social.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  // CNAME is a deployment artifact, not a page; preview enforces trailing slashes on extensionless URLs.
  expect(await readFile(new URL('../dist/CNAME', import.meta.url), 'utf8')).toBe('sun2snow.dpdns.org\n');
  expect(await (await request.get('/robots.txt')).text()).toContain(`Sitemap: ${origin}/sitemap-index.xml`);
  expect(await (await request.get('/sitemap-index.xml')).text()).toContain(`${origin}/sitemap-0.xml`);
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).toContain(`<loc>${origin}/</loc>`);
  expect(sitemap).not.toContain('/404');
});

test('renders an accessible custom 404 with a working home link', async ({ page }) => {
  // GitHub Pages serves this artifact for unknown paths; Astro preview does not emulate Pages routing.
  await page.goto('/404.html');
  await expect(page.getByRole('heading', { name: 'A little off the path.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: 'Back home' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('sun2snow');
});

test('keeps the brand mark symmetric and consistent with the favicon', async ({ page, request }) => {
  await page.goto('/');
  const arms = await page.locator('.wordmark .snowflake path').evaluateAll((paths) => paths.map((path) => ({
    d: path.getAttribute('d'),
    transform: path.getAttribute('transform'),
  })));
  expect(arms).toHaveLength(3);
  expect(new Set(arms.map((arm) => arm.d)).size).toBe(1);
  expect(arms.map((arm) => arm.transform)).toEqual([null, 'rotate(60)', 'rotate(120)']);
  const favicon = await (await request.get('/favicon.svg')).text();
  const faviconArms = await page.evaluate((svg) => {
    const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return [...document.querySelectorAll('.snowflake path')].map((path) => ({
      d: path.getAttribute('d'),
      transform: path.getAttribute('transform'),
    }));
  }, favicon);
  expect(faviconArms).toEqual(arms);
  const bounds = await page.locator('.wordmark > svg').boundingBox();
  expect(bounds!.width / bounds!.height).toBeCloseTo(1.25, 2);
});

test('balances the name numeral against lowercase letters and readable supporting type', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const typography = await page.evaluate(() => {
    const title = getComputedStyle(document.querySelector('.hero h1')!);
    const numeral = getComputedStyle(document.querySelector('.name-transition')!);
    const caption = getComputedStyle(document.querySelector('.identity-caption')!);
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = `${title.fontWeight} ${title.fontSize} ${title.fontFamily}`;
    const letterHeight = context.measureText('sun').actualBoundingBoxAscent;
    context.font = `${numeral.fontWeight} ${numeral.fontSize} ${numeral.fontFamily}`;
    return {
      numeralToLetterHeight: context.measureText('2').actualBoundingBoxAscent / letterHeight,
      titleSize: parseFloat(title.fontSize),
      captionSize: parseFloat(caption.fontSize),
    };
  });
  expect(typography.numeralToLetterHeight).toBeGreaterThanOrEqual(.9);
  expect(typography.numeralToLetterHeight).toBeLessThanOrEqual(1.1);
  expect(typography.titleSize).toBeLessThanOrEqual(68);
  expect(typography.captionSize).toBeGreaterThanOrEqual(13);
});

test('fits the current homepage on laptop screens without hiding content', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const [width, height] of [[1280, 720], [1366, 768], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollHeight), `${width} × ${height}`).toBeLessThanOrEqual(height);
    expect(await page.locator('.hero-description').evaluate((element) =>
      element.getBoundingClientRect().height <= parseFloat(getComputedStyle(element).lineHeight) + 1
    ), `single-line introduction at ${width}px`).toBe(true);
    const cards = await page.locator('.account-card').all();
    const first = (await cards[0].boundingBox())!;
    const second = (await cards[1].boundingBox())!;
    expect(Math.abs(first.y - second.y)).toBeLessThan(1);
    expect(second.x).toBeGreaterThan(first.x + first.width);
    await expect(page.getByRole('link', { name: 'Read the blog' })).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.site-footer')).toBeInViewport({ ratio: 1 });
    for (const project of await page.locator('.project-card').all()) {
      await expect(project).toBeInViewport({ ratio: 1 });
      expect((await project.boundingBox())!.height).toBeLessThanOrEqual(110);
    }
    for (const card of cards) {
      expect(await card.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
    }
  }
});

test('lists every supplied account with exact links and an honest QQ contact', async ({ page }) => {
  await page.goto('/');
  const links = [
    ['Visit X', 'https://x.com/sunsnow502424'],
    ['Visit GitHub', 'https://github.com/sun2snow'],
    ['Visit Luogu 1', 'https://www.luogu.com.cn/user/726139'],
    ['Visit Luogu 2', 'https://www.luogu.com.cn/user/1041814'],
    ['Visit Codeforces', 'https://codeforces.com/profile/sun2snow'],
    ['Visit AtCoder', 'https://atcoder.jp/users/OIer_wst'],
  ];
  await expect(page.locator('.account-card')).toHaveCount(6);
  await expect(page.locator('.account-name')).toHaveText(['X', 'QQ', 'GitHub', 'Luogu', 'Codeforces', 'AtCoder']);
  await expect(page.locator('.account-handle')).toHaveCount(1);
  for (const [name, href] of links) {
    await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
  await expect(page.locator('.qq-number')).toHaveText('77017505');
  expect(await page.locator('.qq-number').evaluate((element) => getComputedStyle(element).userSelect)).toBe('all');
  await expect(page.locator('.account-contact a')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy QQ number' })).toBeVisible();
  const luogu = page.locator('.account-card').filter({ has: page.getByText('Luogu', { exact: true }) });
  await expect(luogu.locator('.account-arrow span')).toHaveText(['1', '2']);
  for (const link of await page.locator('.account-arrow').all()) {
    expect(await link.evaluate((element) => parseFloat(getComputedStyle(element).borderLeftWidth))).toBeGreaterThan(0);
    const card = link.locator('..').locator('..');
    const name = (await card.locator('.account-name').boundingBox())!;
    const icon = (await card.locator('.account-mark').boundingBox())!;
    expect(name.x).toBeGreaterThan(icon.x + icon.width);
    expect((await link.boundingBox())!.x).toBeGreaterThan(name.x + name.width);
  }
});

test('shows compact projects immediately and exposes a keyboard-accessible quick start', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'QOJ-Translate' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'VR OI Simulator' })).toBeVisible();
  const quickStart = page.getByRole('link', { name: 'Quick start VR OI Simulator' });
  await quickStart.focus();
  await expect(quickStart).toBeFocused();
  await expect(quickStart).toHaveAttribute('href', 'https://vr-oi.sun2snow.dpdns.org/');
  await expect(page.locator('#projects .quick-start')).toHaveCount(1);
  await expect(page.locator('#projects summary, #projects .tags')).toHaveCount(0);
  await expect(page.locator('.project-description')).toHaveText(['Translate QOJ statements into Chinese.', 'A first-person OI exam-room game.']);
});

test('provides the exact userscript installation link alongside the QOJ source link', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'QOJ-Translate', exact: true }) });
  const install = card.getByRole('link', { name: 'Install QOJ-Translate', exact: true });
  await expect(install).toHaveText('Install');
  await expect(install).toHaveAttribute('href', 'https://github.com/sun2snow/QOJ-Translate/raw/refs/heads/main/qoj-translate.user.js');
  await expect(install).not.toHaveAttribute('download');
  await expect(page.locator('#projects .install-link')).toHaveCount(1);
  await install.focus();
  await expect(install).toBeFocused();
  await expect(card.getByRole('link', { name: 'View QOJ-Translate on GitHub' })).toHaveAttribute('href', 'https://github.com/sun2snow/QOJ-Translate');
});

test('keeps account cards compact with readable text and comfortable click targets', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const cards = await page.locator('.account-card').all();
  const widths: number[] = [];
  for (const card of cards) {
    const bounds = (await card.boundingBox())!;
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeLessThanOrEqual(64);
    expect(bounds.width).toBeLessThanOrEqual(280);
    widths.push(Math.round(bounds.width));
  }
  expect(new Set(widths).size).toBeGreaterThanOrEqual(4);
  for (const width of [320, 412, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await cards[0].boundingBox())!.width).toBeLessThan((await cards[2].boundingBox())!.width);
    for (const card of cards) {
      expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
  }
  expect(await page.locator('.account-name').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(15);
  expect(await page.locator('.account-handle').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
});

test('renders local platform favicons on desktop and mobile without text substitutes', async ({ page, request }) => {
  await page.goto('/');
  const images = page.locator('.account-mark img');
  const expected = ['/accounts/x.png', '/accounts/qq.ico', '/accounts/github.svg', '/accounts/luogu.ico', '/accounts/codeforces.png', '/accounts/atcoder.png'];
  await expect(images).toHaveCount(6);
  for (let index = 0; index < expected.length; index++) {
    const image = images.nth(index);
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('src', expected[index]);
    await expect(image).toHaveAttribute('alt', '');
    expect(await image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    const response = await request.get(expected[index]);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toMatch(/^image\//);
  }
  for (const width of [320, 412]) {
    await page.setViewportSize({ width, height: 900 });
    const number = page.locator('.qq-number');
    expect(await number.evaluate((element) => element.getBoundingClientRect().height <= parseFloat(getComputedStyle(element).lineHeight) + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const image of await images.all()) await expect(image).toBeVisible();
  }
  for (const mark of await page.locator('.account-mark').all()) {
    await expect(mark).toHaveText('');
    await expect(mark).toHaveAttribute('aria-hidden', 'true');
  }
});

test('copies the QQ number on keyboard activation and reports success', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Copy QQ number' });
  await page.evaluate(() => document.fonts.ready);
  const before = (await page.locator('#connect').boundingBox())!;
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveText('Copied');
  await expect(page.getByRole('status')).toBeEmpty();
  await expect(page.getByText('QQ number copied.', { exact: true })).toHaveCount(0);
  expect((await page.locator('#connect').boundingBox())!.height).toBe(before.height);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('77017505');
});

test('shows an honest manual-copy fallback when clipboard permission is denied', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Denied'); } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Copy QQ number' }).click();
  await expect(page.getByRole('status')).toContainText('Could not copy automatically');
  await expect(page.getByRole('button', { name: 'Copy QQ number' })).toHaveText('Retry');
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('77017505');
});

for (const success of [true, false]) {
  test(`handles missing Clipboard API with legacy copy result ${success}`, async ({ page }) => {
    await page.addInitScript((result) => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      document.execCommand = (command) => command === 'copy' && result;
    }, success);
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Copy QQ number' });
    await button.click();
    await expect(button).toHaveText(success ? 'Copied' : 'Retry');
    await expect(page.locator('textarea')).toHaveCount(0);
    await expect(button).toBeFocused();
  });
}

test('adds decorative project icons and keeps only the signature in the footer', async ({ page }) => {
  await page.goto('/');
  const icons = page.locator('.project-heading h3 .project-icon');
  await expect(icons).toHaveCount(2);
  await expect(icons.nth(0)).toHaveClass(/project-icon--translate/);
  await expect(icons.nth(1)).toHaveClass(/project-icon--gamepad/);
  for (const icon of await icons.all()) {
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
    await expect(icon).toHaveAttribute('focusable', 'false');
    expect((await icon.boundingBox())!.height).toBe(18);
  }
  for (const path of ['/', '/404.html']) {
    await page.goto(path);
    await expect(page.locator('.site-footer')).toHaveText(/^© \d{4} sun2snow$/);
    await expect(page.locator('.site-footer a, .site-footer nav')).toHaveCount(0);
  }
});

test('gives arrow links subtle motion and a visible keyboard focus without resizing cards', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const arrow = page.getByRole('link', { name: 'Visit X', exact: true });
  const before = (await arrow.boundingBox())!;
  await page.keyboard.press('Tab');
  await arrow.focus();
  expect(await arrow.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
  await expect(arrow).toHaveCSS('outline-style', 'solid');
  await expect(arrow).toHaveCSS('outline-width', '2px');
  await expect(arrow).toHaveCSS('border-top-color', 'rgb(255, 184, 107)');
  await expect(arrow.locator('svg')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 1, -1)');
  if (!isMobile) {
    await arrow.evaluate((element: HTMLElement) => element.blur());
    await arrow.hover();
    await expect(arrow).toHaveCSS('border-top-color', 'rgb(255, 184, 107)');
    await expect(arrow.locator('svg')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 1, -1)');
  }
  const after = (await arrow.boundingBox())!;
  expect(after.width).toBe(before.width);
  expect(after.height).toBe(before.height);
});

test('captures a full-page preview', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const screenshot = await page.screenshot({ path: testInfo.outputPath('homepage.png'), fullPage: true, scale: 'css' });
  await testInfo.attach('homepage', { body: screenshot, contentType: 'image/png' });
});
