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

> If a pasted change doesn't appear in the Custom App, force-quit and reopen
> the app first, and check the change was published rather than left a draft.
> Editing an existing screen has worked fine in practice; the original advice
> here was to always create a new screen, which is a real cost as the
> community grows, so try the simpler things first.

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


---

## What is pasted vs what is deployed

Deployed from this repo (change, push, done): `home/home.css`, `home/home.js`,
`home/fonts/*`, `home/assets/*`, `images/*`.

Pasted into Circle by hand: `home/head.html`, `home/body.html`, and the
splash page's `splash-head.html` / `splash-body.html`. Changing these needs
someone to paste them into Circle; nothing fetches them from Pages.

Since Sept 2026 the share card's content is in `TMM_CONFIG.SHARE` in
`home/home.js`, so its wording and link no longer need a paste.

## The /share page (Site Builder, not deployed)

The share card's button opens `/share`, a Circle Site Builder page holding the
Airtable referral form. It is pasted into Site Builder and is not part of this
repo's deploy.

Embedding that form needs Airtable's `/embed/` URL. The form's own page sends
`X-Frame-Options: SAMEORIGIN` and renders blank in a frame, which is why
pasting the plain link into Circle's embed element shows nothing.

A cross-origin frame cannot report its height and Airtable does not message it
out, so the frame must be taller than the form or Airtable scrolls it
internally. Measured 28 Sept 2026:

| Frame width | Form content height | Frame height to use |
|---|---|---|
| 390px (phone) | 1352px | 1500px |
| 1280px (desktop) | 1134px | 1250px |

Narrower means taller, so keep the block full width in Site Builder, and
re-measure if fields are added.

## The home screen map (docs/home-map.html)

A living diagram of what each tier's home screen shows and which Circle space
feeds every section. It loads `home.js`, reads `window.__TMM_CONFIG`, then asks
Circle through the proxy for space names and live content counts — so it is
never out of date and nobody has to maintain it.

Two ways to use it:

- **As a page:** <https://tmm-circle-assets.pages.dev/docs/home-map>
  (the `.html` form 308-redirects here).
- **Inside the community:** open `docs/home-map.html`, copy everything between
  the `CIRCLE EMBED · BEGIN` and `CIRCLE EMBED · END` markers, and paste it into
  a Custom HTML block on a Site Builder page. No iframe, so no fixed height and
  no inner scrollbars.

That region is self-contained — its own `<style>`, markup and `<script>` — and
every URL inside it is absolute, so it runs on any origin. Every selector is
scoped to `.tmm-map` and the element ids are `tmmMap*`, so Circle's CSS and this
page's CSS cannot reach each other.

Two things to know:

- It uses the **admin** proxy token, so it shows every tier regardless of who is
  looking. Put it on a page restricted to admins, not one members can open.
- The `<script src=...home.js?v=N>` version inside the embed only affects how
  fresh the config is; bump it with the rest when you deploy.

## How the page knows who is looking

Circle injects this into custom HTML **inside the Circle Plus mobile app only**
([Custom HTML API reference](https://api.circle.so/apis/circle-plus/custom-html-api-reference)):

```js
window.circleUser = { name, email, publicUid, isAdmin, isModerator }
window.isInsideCircleMobileWebview
```

Note what is missing: any numeric id. Every Circle API the access gate needs is
keyed by `community_member_id`, and there is no lookup by `public_uid`, so the
worker builds that mapping from the roster and caches it. `publicUid` is used
rather than `email` because it is already public — it is in every profile URL —
so no email address goes into a query string or an edge log.

`GET /member_context?public_uid=…` returns, as ids only:

```json
{ "member_id": 123, "access_groups": [104197], "spaces": [2551323, 2551366] }
```

`access_groups` picks the tier (the layout). `spaces` is every space that member
may open — the ones Circle lists them in, plus every space that is not private —
and each section is gated on it. So the tier decides the layout and the space
list decides the content, and a wrong tier match cannot leak anything.

`isAdmin` / `isModerator` bypass the gate: staff can open every space by role, so
Circle lists them as members of almost none and the gate would empty their own
home screen.

**On the web there is no documented equivalent**, so a Site Builder page has no
viewer to identify. With no `public_uid` the endpoint degrades to the public
spaces alone, which every signed-in member can already open — the Free page,
and nothing gated. That is the floor, not an error.
