# Cover-image placeholders

`home/home.js` uses these when a post has no cover image, in place of the old
grey gradient block.

| File | Artwork | Backdrop the CSS paints |
|---|---|---|
| `announce-red.webp`   | grey megaphone on red   | `#D11934` |
| `announce-linen.webp` | red megaphone on beige  | `#EAE4D6` |
| `announce-white.webp` | red megaphone on white  | `#fff` |
| `announce-sand.webp`  | tan megaphone on white  | `#fff` |

All four are **810 × 540** — a true 3:2, exactly 3× the 270 × 180 card slot, so
they fill the frame with no crop and no letterbox on displays up to 3×.

`.webp` is what ships (~9KB each). The matching `.png` files are the lossless
source at ~45KB each; nothing references them. They can be deleted without
affecting the build, or kept for re-export.

They serve from `https://tmm-circle-assets.pages.dev/images/<name>`.

## If you re-export

**Keep 3:2.** Anything else letterboxes. The `.tmm-ph--*` rules paint a backdrop
so the bars match the artwork rather than showing a band, but that is insurance,
not the intended look.

**Re-sample the backdrops.** The colours in `home/home.css` are sampled from the
artwork, *not* taken from the palette tokens — the graphics do not use them. The
beige one is sand (`#EAE4D6`), not linen (`#EFEBE0`), and the two light ones are
pure white, not `--white` (`#F9F9F9`). If the art changes, re-sample and update
those rules.

**Watch the horizontal margins.** The wordmark runs close to the left and right
edges, which is tight at 270px wide. A little more breathing room either side
would help if the art is ever redrawn.

## Rotation

One roll per render picks a starting point, then the set is walked in order —
red, linen, white, sand, red… so neighbouring cards can never share a graphic.
Adding or removing a file changes the cycle length but not that guarantee. Keep
the array in `home/home.js` and the `.tmm-ph--*` rules in `home/home.css` in step.

Note the current order puts the two white-backed graphics next to each other.
Reordering the array to red → white → linen → sand alternates light and dark
instead, if that reads better on the shelf.
