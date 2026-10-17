# sun2snow personal website

An English, static personal homepage for **https://sun2snow.dpdns.org**. Built with Astro, Markdown and locally bundled fonts. No client-side JavaScript, analytics, third-party font requests, database or backend is required.

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
| `src/content/projects/*.md` | Project descriptions, tags, repository URLs and ordering |
| `src/pages/index.astro` | Homepage layout and Notes copy |
| `src/styles/global.css` | Colors, spacing, typography and responsive layout |
| `public/avatar.png` | Local snapshot of the GitHub avatar |
| `public/favicon.svg` | Sun-to-snow browser icon |
| `public/social-card.png` | Committed 1200 × 630 sharing image |
| `astro.config.mjs` | Canonical deployment origin and sitemap |
| `public/CNAME` | Intended custom hostname |

### Add a project

Create another Markdown file in `src/content/projects/`:

```md
---
title: Project name
description: A short, factual description.
repository: https://github.com/sun2snow/your-project
tags:
  - JavaScript
order: 2
draft: false
---

Optional extra context goes here.
```

Smaller `order` values appear first. `draft: true` excludes a project from the built homepage. If no published projects remain, the project section and its navigation links are hidden. The schema validates required fields and requires HTTPS repository links. Markdown is trusted author-controlled content: do not include secrets or unreviewed HTML from third parties. With a public Pages source repository, even draft files are publicly readable in Git history.

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

Tests exercise the production build on desktop and mobile: approved copy, external URLs, anchor navigation, local asset loading, no client scripts/cookies/remote requests, operation with JavaScript disabled, automated axe accessibility checks, keyboard skip navigation, reduced motion, overflow, sharing metadata, sitemap, robots, CNAME and the custom 404. Full-page previews are saved under `test-results/`. Automated accessibility checks supplement, rather than replace, manual inspection.

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
