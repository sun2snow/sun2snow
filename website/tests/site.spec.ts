import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const origin = 'https://sun2snow.dpdns.org';

test('shows the approved content and working navigation', async ({ page }) => {
  // Avoid a synthetic click scrolling the header while a previous smooth anchor scroll is still running.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page).toHaveTitle('sun2snow — Projects & Notes');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('sun2snow');
  await expect(page.getByText('A personal space for projects, notes, and experiments.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'QOJ-Translate' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View QOJ-Translate on GitHub' })).toHaveAttribute('href', 'https://github.com/sun2snow/QOJ-Translate');
  await expect(page.getByRole('link', { name: 'Read the blog' })).toHaveAttribute('href', 'https://www.cnblogs.com/oier-wst');
  await expect(page.getByRole('link', { name: 'Visit GitHub' })).toHaveAttribute('href', 'https://github.com/sun2snow');
  await expect(page.locator('a[target="_blank"]')).toHaveCount(0);

  await page.getByRole('link', { name: 'View projects' }).click();
  await expect(page).toHaveURL(/\/#projects$/);
  await expect(page.locator('#projects')).toBeInViewport();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Notes' }).click();
  await expect(page).toHaveURL(/\/#notes$/);
  await expect(page.locator('#notes')).toBeInViewport();

  for (const href of await page.locator('a[href^="#"]').evaluateAll((links) => links.map((link) => link.getAttribute('href')!))) {
    await expect(page.locator(href)).toHaveCount(1);
  }
});

test('loads local assets without scripts, remote requests, cookies, or browser errors', async ({ page }) => {
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
  await expect(page.locator('script')).toHaveCount(0);
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
    await page.getByRole('link', { name: 'View projects' }).click();
    await expect(page).toHaveURL(/\/#projects$/);
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

test('captures a full-page preview', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const screenshot = await page.screenshot({ path: testInfo.outputPath('homepage.png'), fullPage: true, scale: 'css' });
  await testInfo.attach('homepage', { body: screenshot, contentType: 'image/png' });
});
