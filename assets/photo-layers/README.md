# Photo-layer previews — shot list for Carlos

When these images exist, the Design Room switches from the illustrated suit
to **real photographs** that stack in layers as the client picks options.
Flip `photoLayers.enabled` to `true` in `js/catalog.js` to activate.
If any image is missing, the site falls back to the illustration automatically —
so you can add photos gradually, starting with one suit.

## What is in this folder today

- `base-sb2-navy.png` — the navy three-piece from the atelier collage,
  isolated from its background (IS-Net segmentation, edge-refined).
- `base-sb2-{charcoal,black,grey,brown,burgundy,olive,cream}.png` — the **same
  photograph with only the cloth re-tinted** (shirt, tie, pocket square and the
  form are untouched; every fold and highlight is preserved). They stand in
  until real garments in those cloths are photographed — a real photo with the
  same file name replaces one automatically.

The site shows the exact style/colour photo when it exists; otherwise the
nearest photographed garment in that colour, with a caption saying so and a
Photograph / Illustration toggle so the client can still see their exact cut.


## How to shoot (consistency is everything)

- Same **mannequin/bust**, same **camera position** (tripod, ~2.5 m back,
  lens at chest height), same **lighting** for every single shot.
  Mark the mannequin and tripod positions on the floor with tape.
- Neutral background (white or grey seamless) — it will be cut out.
- Portrait orientation. Every shot must frame the mannequin identically —
  do not zoom or move between shots.
- Steam the garment before shooting.

## Export specs

- PNG with **transparent background** (background removed).
- 1,200 × 1,560 px (10:13), garment centred, identical position in every file.
- Keep total per-file size reasonable (< 400 KB; export at 80–90% quality).

## MVP shot list — one navy suit, 8 photos

| File name                        | What to shoot                                    |
| -------------------------------- | ------------------------------------------------ |
| `base-sb2-navy.png`              | Single-breasted 2-button, closed, notch lapel    |
| `base-sb3-navy.png`              | Single-breasted 3-button, closed                 |
| `base-db-navy.png`               | Double-breasted 6×2, closed                      |
| `lapel-notch-sb2-navy.png`       | Close crop of notch lapel area (same framing!)   |
| `lapel-peak-sb2-navy.png`        | Peak lapel variant on the same jacket position   |
| `pockets-flap-navy.png`          | Flap pocket area                                 |
| `pockets-patch-navy.png`         | Patch pocket variant                             |
| `vest-navy.png`                  | Matching waistcoat visible in the V              |

Then repeat `base-*` for each additional cloth colour as they get shot
(`-charcoal`, `-grey`, `-burgundy`, …). The naming pattern the site expects is
defined in `js/catalog.js` (`photoLayers.stack`).

> Alternative to photography: commission a CLO3D / Marvelous Designer render
> set with the same file names — identical result, perfectly consistent.
