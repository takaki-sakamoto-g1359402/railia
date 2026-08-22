# Neutral-base workbench QA — 2026-08-22

## Gate result

| Asset | Neutral paint-over reference | Production PSD/import art | Alpha method |
| --- | --- | --- | --- |
| Riai v001 | **CONDITIONAL** | **FAIL** | **FAIL — rework required** |
| Noa v001 | **CONDITIONAL** | **FAIL** | **FAIL — rework required** |

The images are retained as versioned workbench evidence. They must not be
renamed or promoted to `*_material_separation.psd`, `*_import.psd`, a Cubism
project, or a runtime deliverable.

## Riai visual review

Confirmed: white hair, sapphire eyes, two ears, one white tail, navy/gold
celestial robe, blue crystals, hands, feet, full-body front neutral pose, no
extra anatomy, and no guide-sheet labels/background.

Identity drift to fix during repaint:

- face is more generic, doll-symmetric, younger, and softer than canonical;
- inner-ear pink and canonical ear nuance are reduced;
- hair accents, temple ornament, and chest brooch are simplified;
- hood/collar reads too rigid and shoulder-armour-like;
- tail is a large oval side mass rather than the canonical swept/curl language;
- garment flare, footwear, and charm placement are overly symmetrical.

The 934 × 1683 canvas is too tight and too low-resolution for production hair,
chains, cloth physics, and head/tail excursions. Recanvas and repaint larger.

## Noa visual review

Confirmed: seated front view, two ears, one crystal-tipped tail, blue eyes,
closed neutral mouth, four paws, hood/cloak, brooch, chains, no extra anatomy,
and no guide-sheet labels/background.

Identity drift to fix during repaint:

- ears and forehead crystal are oversized;
- head/eyes are more chibi and glossy than canonical;
- chest brooch and ornament layout are too large, dense, and symmetrical;
- cloak is too bilateral and angular;
- tail is straighter/larger and its crystal patch occupies too much of the tip.

The 1154 × 1363 canvas has only about 71 px of right-tail margin, which is
insufficient for the full specified tail sway without recanvasing.

## Flattening and separation failure

Both images remain single flattened rasters. They have no independent eyes,
lids, irises, highlights, brows, mouth shapes, ears, hair/fur sections, limbs,
hood inner/outer, cloak panels, chains, crystals, sleeves, hands/paws, tail
sections, or hidden overlap extensions. Direct cropping would violate the
source policy and expose holes under deformation.

## Alpha audit

Visual-only checks over white, mid-grey, and near-black found no obvious green
spill, full-frame contamination, large holes, or gross halos. Both files are
valid 8-bit RGBA PNGs.

That visual pass is not sufficient. Independent synthetic review of
`scripts/chroma-key-to-alpha.mjs` found production-blocking math:

- normalized green dominance makes alpha depend on foreground colour;
- dark navy edges are under-estimated while blue/gold edges harden;
- partial magenta pixels are deleted instead of colour-corrected;
- two thresholds erase low-alpha fur, hair, and translucent cloth;
- all connected components below 64 px are deleted, risking charms and wisps;
- RGB is unmixed in gamma-compressed sRGB and can clip at low alpha;
- direct forced writes lack symlink/hardlink and atomic-replacement protection.

Observed v001 partial-alpha coverage is only 1.13% of visible Riai pixels and
0.83% of visible Noa pixels, consistent with overly hard edges. Therefore both
v001 alpha cutouts are **experimental evidence only**, despite looking clean at
full-frame scale.

## Required correction

Replace the extractor with a background flood-fill/trimap, local foreground
sampling, linear-RGB alpha solve, colour extension instead of hue deletion,
component reporting without unconditional deletion, atomic output, and
synthetic regression fixtures for black, navy, blue, gold, and white edges.
Re-render and re-review on contrasting backgrounds before accepting any
transparent candidate.
