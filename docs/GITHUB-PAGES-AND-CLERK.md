# Publishing legal pages (GitHub Pages) and Clerk

This folder (`docs/`) is a **Jekyll** site deployed to the same **`gh-pages`** branch as `stations.json`. It hosts the **Terms of Service** and **Privacy Policy** used by Clerk when **legal acceptance** is required at sign-up, plus a small **landing page** with app screenshots under `assets/screenshots/` (copies of `assets/screenshots/` in the main repo).

## How hosting works

Two workflows publish to **`gh-pages`** at the repo root, each with **`clean: false`** so they do not wipe each other’s files:

| Workflow | Deploy folder | What it adds |
|----------|---------------|----------------|
| [.github/workflows/build-stations.yml](../.github/workflows/build-stations.yml) | `station-builder/output` | `stations.json` |
| [.github/workflows/deploy-docs.yml](../.github/workflows/deploy-docs.yml) | `docs/` | Jekyll source, terms, privacy, screenshots, this README |

They share a **concurrency group** `gh-pages-deploy` so only one deploy runs at a time.

## URLs (after Pages is enabled)

- Stations JSON: `https://wyasyn.github.io/laba/stations.json`
- Terms: `https://wyasyn.github.io/laba/terms/`
- Privacy: `https://wyasyn.github.io/laba/privacy/`
- Index: `https://wyasyn.github.io/laba/`

The app’s sign-in screen opens the Terms and Privacy URLs without a trailing slash; GitHub usually redirects to the canonical URL.

## One-time: GitHub Pages settings

1. Commit and push changes on **`main`** (including `docs/` when ready).
2. On GitHub: **Settings → Pages**.
3. **Build and deployment**: Source = **Deploy from a branch**.
4. Branch = **`gh-pages`**, folder = **`/` (root)** — not `main` / `docs`. The Jekyll site is built from files on `gh-pages` after the **Deploy Docs** workflow runs.
5. Run **Actions → Deploy Docs to GitHub Pages → Run workflow** once so `gh-pages` contains the docs (if it only had `stations.json` before).
6. Wait a few minutes. Confirm `https://wyasyn.github.io/laba/stations.json` and `https://wyasyn.github.io/laba/terms/` both load.

`_config.yml` sets `baseurl: "/laba"` so paths work for a **project site** (`username.github.io/repo-name`).

## One-time: Clerk dashboard

1. Open your Clerk project for Laba.
2. Find **Legal** / **Restrictions** (wording varies by Clerk version): enable **Require legal acceptance** (or equivalent).
3. Set:
   - **Terms of Service URL:** `https://wyasyn.github.io/laba/terms`
   - **Privacy Policy URL:** `https://wyasyn.github.io/laba/privacy`
4. Save.

New sign-ups will then include `legal_accepted` in missing requirements; the in-app **Almost there** step collects acceptance before account creation completes.

## Editing the legal text

Edit `terms.md` and `privacy.md` in this folder, commit, and push to `main`. The **Deploy Docs** workflow runs on `docs/**` changes and updates `gh-pages`.

## Updating screenshots on the landing page

Screenshots are duplicated under `docs/assets/screenshots/` so they deploy with the docs. After you replace files in the app repo’s `assets/screenshots/`, copy them again:

`cp assets/screenshots/*.png docs/assets/screenshots/`

Then commit under `docs/` to trigger a docs deploy.
