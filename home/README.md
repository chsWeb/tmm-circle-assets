# TMM Circle Home

Tier-aware home screen for **members.themillionairemother.com**, styled in the
2026 Millionaire Mother / Mother Hub design system. CSS + JS + fonts are hosted
on **Cloudflare Pages**; the HTML lives in Circle. Edit → `git push` → live.

```
tmm-circle-home/
├── home.css        ← styles + @font-face (hosted on Pages)
├── home.js         ← tier detection + content loader (hosted on Pages)
├── body.html       ← paste into Circle's Custom HTML block
├── head.html       ← paste into Circle's head (links to Pages)
├── _headers        ← Cloudflare Pages: font CORS + cache rules
├── fonts/          ← 8 self-hosted woff2 files
└── assets/         ← logos (mm/hub wordmark PNGs, brand-mark.svg)
```

## What it does
Circle Apps SDK → member first name + ID → Worker looks up access-group tags →
maps to a tier (`free`, `mother_hub`, `foundry`, `inner_circle`) → loads 5
content sections for that tier and swaps the logo (**free = Millionaire Mother,
paid = Mother Hub**). All content pulls through the existing Worker proxy at
`tmm-circle-proxy.product-10c.workers.dev`.

---

## One-time setup

### 1. Put this folder on GitHub
```bash
cd tmm-circle-home
git init
git add .
git commit -m "Initial TMM Circle home"
# create an empty repo on github.com first, then:
git remote add origin https://github.com/YOUR-USER/tmm-circle-home.git
git branch -M main
git push -u origin main
```

### 2. Connect Cloudflare Pages to the repo
1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick the `tmm-circle-home` repo
3. Build settings: **Framework preset = None**, **Build command = (blank)**,
   **Build output directory = `/`** (the files are already static)
4. **Save and Deploy**

You'll get a URL like `https://tmm-circle-home.pages.dev`. Confirm these load:
- `https://tmm-circle-home.pages.dev/home.css`
- `https://tmm-circle-home.pages.dev/home.js`
- `https://tmm-circle-home.pages.dev/fonts/WorkSans-Regular.woff2`

### 3. Point Circle at Pages
In `head.html`, replace `YOUR-PROJECT` with your Pages subdomain, then paste the
three lines into the head of **both** surfaces (Custom App Builder screen + Site
Builder page). Paste `body.html` into the Custom HTML block on each.

> Always add a **new** Custom App screen — never paste over an old one. Circle
> caches the compiled screen and the old cache can't be cleared.

---

## Every update after that
```bash
# edit home.css / home.js
git add . && git commit -m "…" && git push
```
Pages redeploys in ~30s. If Circle still serves the old file, bump the version
in `head.html` (`?v=1` → `?v=2`) and re-save the head snippet.

---

## Before publishing
- [ ] `home.js`: set `TEST_MODE: false`
- [ ] `body.html`: delete the `#tmmTestBanner` block
- [ ] `git push`, then bump `?v=` in the head snippet
- [ ] Confirm first name + correct logo for a real logged-in member
- [ ] Walk all four tiers with real test accounts
- [ ] DevTools console: no errors, no blocked fonts (Network tab → font = 200)
- [ ] Hamburger opens on tap in the mobile app preview

## Known follow-ups
- Logos are placeholder PNGs — swap `assets/*.png` for SVG when available.
- "Share the app" card is static; paywall/upsell links wired later.
- Category-pill color swaps by brand (red on free, sage on paid) — confirm intent.
- Custom App iframe *may* block external `<script src>` via CSP. If the app
  version stays on skeletons while the Site Builder page works, that's the CSP
  block: inline `home.js` inside `body.html` for the app build only (same code).
