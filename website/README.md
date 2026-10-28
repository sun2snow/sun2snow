# sun2snow personal website

An English, static personal homepage for **https://sun2snow.dpdns.org**. Built with Astro, Markdown and locally bundled fonts. The page works without JavaScript; a small local script adds the optional QQ copy button. No analytics, third-party font requests, database or backend is required.

This directory is independent of the repository's GitHub profile. The root `README.md`, existing profile workflows and `output` branch remain unchanged. Only `website/dist/` is uploaded to GitHub Pages; profile statistics and contribution images are not included on the website.

## Local development

Use Node **22.22.0 or newer** (the tested version is pinned in `.nvmrc`) and npm.

```sh
cd website
# Optional, if nvm is installed:
nvm use
npm ci
npm run dev
```

Open **http://127.0.0.1:4321**. The development server binds to loopback, not your public network.

```sh
npm run check
npm run build
npm run preview
```

The production files are generated in `website/dist/`. Do not commit `dist/`, `node_modules/`, `.astro/` or private environment files.

## Editing content

| File | Purpose |
| --- | --- |
| `src/data/site.ts` | Identity, introduction, GitHub and blog URLs, metadata |
| `src/data/accounts.ts` | Platform names, profile links and QQ number |
| `src/scripts/copy-qq.ts` | QQ clipboard action, feedback and manual-copy fallback |
| `src/content/projects/*.md` | Project descriptions, tags, repository URLs and ordering |
| `src/pages/index.astro` | Homepage layout and Notes copy |
| `src/styles/global.css` | Colors, spacing, typography and responsive layout |
| `public/accounts/` | Official-site favicon snapshots; provenance and display treatments in `SOURCES.md` |
| `src/components/AccountIcon.astro` | Shared decorative account icon rendering |
| `public/avatar.png` | Local snapshot of the GitHub avatar |
| `public/favicon.svg` | Sun-to-snow browser icon |
| `public/social-card.png` | Committed 1200 × 630 sharing image |
| `astro.config.mjs` | Canonical deployment origin and sitemap |
| `public/CNAME` | Intended custom hostname |

### Account-first layout

The homepage highlights accounts in **Social & contact** and **Competitive programming** groups. Edit `src/data/accounts.ts` to update platform names, exact profile URLs, and the QQ number. Only QQ displays an account identifier. Cards size to their content and wrap naturally on smaller screens. Other cards show the platform icon and name followed by right-hand boxed arrow links; Luogu has a single card with two numbered links (`1`, `2`). QQ has a right-hand **Copy** button that writes the number only after a click or keyboard activation and briefly changes to **Copied** on success without adding a status sentence or shifting the layout. Failure feedback remains visible. HTTPS uses the Clipboard API; browsers without it (including HTTP) attempt the legacy copy command. If copying is blocked, the number is selected for manual copying. With JavaScript disabled or unavailable, the copy button stays hidden and a manual-copy hint remains visible.

Account cards use locally stored favicons rather than initials. Original image bytes are kept intact; CSS filters and blend modes adapt monochrome marks and solid backings to the badge colors. The merged Luogu card uses one icon. Icons remain visible on phones, and the QQ number stays on one line. See [`public/accounts/SOURCES.md`](public/accounts/SOURCES.md) for upstream URLs and attribution.

Projects appear below Notes as small, always-visible cards with a decorative 18px icon, one-line description, source link, and optional `installUrl` / `quickStartUrl` links. QOJ-Translate's **Install** link opens the supplied `.user.js` URL; installation is handled by the visitor's userscript manager, not by the homepage. Set frontmatter `icon` to `translate`, `gamepad`, or `code` (the default). Icons are inline SVGs, hidden from assistive technology, and do not add another row. Long Markdown bodies and technology tags remain in the source content but are not rendered on the homepage. The account-first view is tested to fit 1280 × 720, 1366 × 768, and 1440 × 900 viewports. Smaller screens scroll normally; content is never clipped to force a one-screen layout.

The footer contains only the copyright signature. Arrow links use a warm-orange hover/focus treatment and a 1px arrow shift without moving the click target. Keyboard focus remains outlined; reduced-motion preferences disable movement and transitions. These effects are CSS-only.

### Add a project

Create another Markdown file in `src/content/projects/`:

```md
---
title: Project name
icon: code
description: A short, factual description.
repository: https://github.com/sun2snow/your-project
tags:
  - JavaScript
order: 2
draft: false
---

Optional extra context goes here.
```

Smaller `order` values appear first. `draft: true` excludes a project from the built homepage. If no published projects remain, the project section is hidden. The schema validates required fields and requires HTTPS repository and optional `installUrl` / `quickStartUrl` links. Markdown is trusted author-controlled content: do not include secrets or unreviewed HTML from third parties. With a public Pages source repository, even draft files are publicly readable in Git history.

Notes currently links to **https://www.cnblogs.com/oier-wst**. Nothing is scraped or synchronized. Existing articles do not need to be translated or migrated.

### Avatar and sharing image

`public/avatar.png` is a local snapshot downloaded from `https://github.com/sun2snow.png?size=384`; GitHub returned a 256 × 256 PNG. It is not fetched by visitors or CI. To change it, replace the file with your new PNG and regenerate the sharing image:

```sh
npx playwright install chromium
npm run social-card
npm run build
```

`social-card` uses a headless browser with embedded local fonts and avatar data. It makes no remote asset requests. Commit the resulting `public/social-card.png`. Regenerate it after changing the identity or introductory copy. Generation is intentionally separate from the normal build to keep deployments deterministic and lightweight.

The copyright year is computed at **build time**. A rebuild after New Year updates it; there is no client-side year updater.

## Tests

```sh
npm ci
npx playwright install chromium
npm run check
npm run build
npm test
```

On a supported Linux system, `npx playwright install --with-deps chromium` can also install system libraries. It may require administrator access. On an older distribution where the bundled browser is unavailable, use an installed compatible Chrome:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npm test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npm run social-card
```

Tests exercise the production build on desktop and mobile: approved copy, external URLs, anchor navigation, local asset loading, no cookies/remote requests, real clipboard copying and permission/unavailable-API fallbacks, operation with JavaScript disabled, automated axe accessibility checks, keyboard skip navigation, reduced motion, overflow, sharing metadata, sitemap, robots, CNAME and the custom 404. Full-page previews are saved under `test-results/`. Automated accessibility checks supplement, rather than replace, manual inspection.

The Playwright preview server uses a separate port, **4322**, and always starts a fresh production preview. If that port is occupied, tests fail instead of silently testing another server. `--ignore-lock` keeps Astro in the foreground even inside coding-agent environments.

Existing profile tests remain available from the repository root:

```sh
python3 -m unittest discover -s tests -v
```

## First publication: GitHub Pages + Cloudflare

**Writing these files does not publish the site or change DNS.** The repository previously had no Pages site configured. Review the code and existing DNS records before publishing.

1. In GitHub account **Settings → Pages**, verify ownership of `sun2snow.dpdns.org` using the TXT record GitHub supplies. This helps prevent domain takeover. Retain the verification TXT record.
2. In **sun2snow/sun2snow → Settings → Pages**, choose **Source: GitHub Actions**. Keep the existing `output` branch for profile images; do not use it as the Pages source.
3. Set **Custom domain** to `sun2snow.dpdns.org` in the repository Pages settings. With a custom Actions workflow, `public/CNAME` alone does **not** configure this repository setting. A pending DNS check before step 4 is expected.
4. In Cloudflare, first record any existing records for this exact hostname. Set the hostname's CNAME target to **`sun2snow.github.io`**, not a repository URL or `/sun2snow` path. Use **DNS only** (gray cloud), not the orange-cloud proxy, for this setup.
   - If the Cloudflare zone is `sun2snow.dpdns.org`, the record name is `@` (Cloudflare flattens an apex CNAME).
   - If you manage it inside the `dpdns.org` zone, the name is `sun2snow`.
   - Confirm which zone you actually control. Do not change nameservers or unrelated mail/service records. Conflicting A/AAAA/CNAME records for the same hostname must be reviewed before replacement.
5. Commit and push the reviewed changes to `main`. **Build and deploy personal website** runs checks, builds, runs browser tests, and publishes only after they pass. A pull request runs checks but cannot deploy. You can also trigger the workflow manually on `main`.
6. Wait for GitHub's DNS check and certificate issuance, then enable **Enforce HTTPS**. DNS and certificate provisioning are not instantaneous. If the domain has restrictive CAA records, ensure they allow GitHub's certificate issuer before expecting issuance to succeed.
7. Confirm `https://sun2snow.dpdns.org/`, the avatar and fonts, project/blog links, and a nonexistent path's 404 page. Check mobile access from a separate network if possible.

The site is configured for the **custom domain root**: intentionally no Astro `base: '/sun2snow'`. Do not treat `sun2snow.github.io/sun2snow/` as a working substitute without changing the base and root-relative links. For previews before DNS is ready, use the local server.

The deployment uses GitHub's built-in token and Pages OIDC permissions. No PAT, Cloudflare API token, personal computer server or paid service is needed. A free public repository is assumed; service quotas and platform rules still apply.

### CI isolation

- `.github/workflows/website.yml` only reacts to website changes, its own changes, pull requests and manual runs.
- Existing profile image schedules and publication remain independent.
- The Pages workflow has a separate concurrency group and never writes the `output` branch.
- Only the deployment job gets `pages: write` and `id-token: write`; pull requests cannot reach it.
- Dependencies are lockfile-pinned; Actions use full commit SHAs. Dependabot checks them monthly.

### Rollback and removal

To roll back a website change, revert the relevant commit and let the website workflow redeploy. A build or test failure does not overwrite the existing deployment.

Before deleting/disabling Pages or removing its custom domain, remove the hostname's Pages DNS record (or point it to a replacement service) so no dangling record remains. Do not delete unrelated verification/mail records.

## Assets and privacy

- Avatar: sun2snow's public GitHub avatar, used at the owner's request.
- Inter and JetBrains Mono: bundled Latin variable-font subsets, distributed under their SIL Open Font Licenses. The license texts are included under `public/licenses/`.
- The brand mark and layout are site-specific SVG/CSS; no external icon CDN is used.
- Astro's development/build CLI has its own telemetry setting, separate from the static website. To disable it locally, set `ASTRO_TELEMETRY_DISABLED=1`; CI and the test preview disable it explicitly.
- Visitors make no third-party requests until they follow an external link. Hosting providers may still process normal access logs; absence of site analytics is not a promise of zero hosting logs.
- GitHub and CNBlogs are external services with their own privacy policies.
