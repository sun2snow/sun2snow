# Maintaining this profile

The public profile is `README.md`. This file documents deployment and maintenance, not additional profile content.

## First publication

1. Review the files, then commit them on `main` in `sun2snow/sun2snow` and push.
2. Both workflows run automatically on that first push. Under **Actions**, wait for **Update profile stats** and **Update contribution snake** to finish. They are serialized to avoid conflicting writes.
3. Each workflow creates or updates the `output` branch without changing `main` or deleting the other workflow's images.
4. Confirm these files exist on `output`:

   ```text
   stats-dark.svg        stats-light.svg
   languages-dark.svg    languages-light.svg
   snake-dark.svg        snake-light.svg
   ```

5. Open <https://github.com/sun2snow> and check both GitHub themes.

**The generated image URLs will not exist until the first successful runs.** GitHub's image cache can delay visible updates. The committed header and project description do not depend on Actions.

No personal access token, third-party account, Vercel deployment, or custom secret is required. GitHub supplies `GITHUB_TOKEN` automatically. Actions must be enabled; repository rules must allow that token to create and update `output`.

## Updates

- Stats: every six hours, at **04:47, 10:47, 16:47, and 22:47 UTC**.
- Snake: every six hours, at **04:53, 10:53, 16:53, and 22:53 UTC**.
- These four daily refresh opportunities allow a later run to recover from a missed scheduled event or transient failure. Unchanged images do not create commits; successful runs may therefore leave the `output` commit date unchanged.
- Either workflow can also be run with **Actions → workflow → Run workflow**.
- GitHub may delay or drop scheduled runs; this is best-effort automatic refresh, not a guaranteed daily delivery time. Scheduled workflows in inactive public repositories can be disabled after 60 days; re-enable them in Actions when needed.
- To verify automatic refresh, check each workflow's run history for a successful **`schedule`** event. A successful `push` or `workflow_dispatch` run only verifies generation/publication, not the scheduler. The workflow files must remain on the repository's default branch (`main`).
- Edits to a workflow, `scripts/`, or `tests/` also trigger its workflow on `main`. Ordinary README edits do not need a data refresh.

## Data and privacy

- Stats use the maintained `stats-organization/github-readme-stats-action` and its lockfile-pinned bundled core, not a live public card endpoint. The empty `core_version` input intentionally avoids installing a floating core release.
- Both workflows use only the built-in repository token. Do not replace it with a broad PAT or enable private repository access.
- The activity card uses the renderer's default reporting period, labeled on the card as "last year". It does not claim to measure all-time commits.
- The language card excludes this profile repository, so decorative SVGs and maintenance scripts do not distort language usage. Upstream language statistics also exclude forks by default; they do not measure proficiency.
- Snake uses `Platane/snk/svg-only` with matching light/dark palettes and a warm-orange snake.
- Top-level third-party Actions are pinned to full commit SHAs. Dependabot checks GitHub Actions monthly; review updates before merging.

## Failure behavior

Stats generation uses `fail_on_error: true`. All four cards must succeed before any stats are published. Both snakes must succeed before either is published. SVG validation happens before Git is changed. Generation or validation failure therefore leaves the last successfully published files in place; a failed first run has no prior files to fall back to.

The shared `profile-output` concurrency group serializes these workflows. Publishing preserves the other generator's files, skips unchanged content, and never force-pushes. If an external writer wins a race, the push fails safely; rerun the workflow.

## Editing the design

- Header: `assets/header-dark.svg` and `assets/header-light.svg` (plain SVG, no remote fonts or scripts).
- Layout and English copy: `README.md`.
- Card colors/options: `.github/workflows/stats.yml`.
- Snake colors/schedule: `.github/workflows/snake.yml`.

Theme selection uses GitHub-supported `<picture>` elements. Layout intentionally avoids tables and fixed image heights. Images can shrink to the viewport; the cards wrap onto separate lines when space is limited.

## Local checks

```sh
python3 -m unittest discover -s tests -v
git diff --check
```

The tests use only Python's standard library and Git. All test pushes go to disposable **local bare repositories**, never GitHub. They cover initial publication, preserving the other generator's files, idempotence, invalid inputs, source-branch isolation, and remote failures.

Do not manually run `scripts/publish_assets.py` against the real repository unless you intend to publish: that script pushes to `origin/output`.

## Credits

- [GitHub Readme Stats Action](https://github.com/stats-organization/github-readme-stats-action)
- [GitHub Stats Extended](https://github.com/stats-organization/github-stats-extended)
- [Contribution Snake](https://github.com/Platane/snk)
