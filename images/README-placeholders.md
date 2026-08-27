# Cover-image placeholders — four files still needed

`home/home.js` falls back to these when a post has no cover image. They are
**not in the repo yet.** Until they land, the shelf keeps showing the old grey
gradient block (the fallback in `wirePlaceholderFallbacks` handles it), so
nothing is broken — the graphics simply do not appear.

Drop these four into this folder, exactly these names:

| File | Artwork | Background the CSS paints |
|---|---|---|
| `announce-red.png`   | white/grey megaphone on red   | `--electric-red` |
| `announce-linen.png` | red megaphone on beige        | `--linen` |
| `announce-white.png` | red megaphone on white        | `--white` |
| `announce-sand.png`  | tan megaphone on white        | `--white` |

They serve from `https://tmm-circle-assets.pages.dev/images/<name>`.

## Two things that matter when exporting

**Background colour must match the CSS.** The art is roughly 3.2:1 and the card
slot is 1.5:1, so each image is letterboxed with `object-fit: contain` and the
variant class paints the bars. If an export's background drifts from the token
above, a visible band appears around the artwork. Either match the token or
update the matching `.tmm-ph--*` rule in `home/home.css`.

Note `announce-sand.png` is a tan megaphone on a **white** background — the
variant is named for its artwork, not its backdrop.

**Keep them light.** They are decorative and several load at once. Aim well
under ~150KB each; 1600px wide is more than enough for a 270px slot.

## Rotation

One roll per render picks a starting point, then the set is walked in order —
red, linen, white, sand, red… so two neighbouring cards can never share a
graphic. Adding or removing a file changes the cycle length but not that
guarantee. Keep the array in `home/home.js` and the `.tmm-ph--*` rules in
`home/home.css` in step.
