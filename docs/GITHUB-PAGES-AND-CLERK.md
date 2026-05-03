# Publishing legal pages (GitHub Pages) and Clerk

This folder (`docs/`) is a **Jekyll** site for GitHub Pages. It hosts the **Terms of Service** and **Privacy Policy** used by Clerk when **legal acceptance** is required at sign-up, plus a small **landing page** with app screenshots under `assets/screenshots/` (copies of `assets/screenshots/` in the main repo).

## URLs (after Pages is enabled)

- Terms: `https://wyasyn.github.io/laba/terms/`
- Privacy: `https://wyasyn.github.io/laba/privacy/`
- Index: `https://wyasyn.github.io/laba/`

The app’s sign-in screen opens the Terms and Privacy URLs without a trailing slash; GitHub usually redirects to the canonical URL.

## One-time: enable GitHub Pages

1. Commit and push the `docs/` folder to the `main` branch of `wyasyn/laba`.
2. On GitHub: **Settings → Pages**.
3. **Build and deployment**: Source = **Deploy from a branch**.
4. Branch = **main**, folder = **`/docs`**, then **Save**.
5. Wait up to a few minutes. Open `https://wyasyn.github.io/laba/terms/` and confirm the page loads.

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

Edit `terms.md` and `privacy.md` in this folder, commit, and push. GitHub Pages rebuilds automatically.

## Updating screenshots on the landing page

Screenshots are duplicated under `docs/assets/screenshots/` so GitHub Pages can serve them. After you replace files in the app repo’s `assets/screenshots/`, copy them again:

`cp assets/screenshots/*.png docs/assets/screenshots/`
