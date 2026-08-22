# Neutral-base reconstruction workbench

Status: **EXPERIMENTAL PRE-SEPARATION CANDIDATES — ALPHA REWORK REQUIRED**

This directory preserves two front-facing neutral-base candidates created while
the mandatory Production Pack is still absent. They reduce later redraw and
separation work, but they do not satisfy the goal by themselves.

## Asset flow

1. Canonical identity comes from `../../reference/canonical/`.
2. Separation and motion guidance comes from
   `../../reference/design-breakdowns/` only.
3. Image-generation produced flattened character candidates. The tool returned
   RGB files with a baked checkerboard even when transparency was requested.
4. Targeted background edits produced the preserved green-screen files under
   `source/`.
5. The rejected v001 implementation of
   `../../../../scripts/chroma-key-to-alpha.mjs` converted those files into the
   comparison cutouts. It was later found to delete valid colour/alpha regions
   and small detached components, so neither the method nor its output is a
   production master.
6. A v002 trimap/local-foreground implementation is now preserved as a WIP
   checkpoint. It estimates the border matte, preserves connected components,
   supports linear/sRGB compositing tests, rejects pre-alpha sources, and
   publishes atomically. Its first Riai diagnostic still fails recomposition
   and green-edge QA and must not replace v001 or enter PSD separation yet.
7. `../../../../scripts/render-alpha-review.mjs` rendered each cutout over
   white, mid-grey, and near-black backgrounds under `review/` for edge QA.

Reproduce one conversion with:

```sh
pnpm art:chroma-key \
  --input=art/live2d/production-workbench/neutral-bases/source/riai_neutral_base_green_v001.png \
  --output=/tmp/riai_neutral_base_review.png
```

Render its three-background review with:

```sh
pnpm art:alpha-review \
  --input=/tmp/riai_neutral_base_review.png \
  --output=/tmp/riai_neutral_base_review_contact.png
```

## Current files and measured results

| Character | RGBA candidate | Dimensions | Visible bounds | Output SHA-256 |
| --- | --- | ---: | --- | --- |
| Riai | `cutouts/riai_neutral_base_candidate_v001.png` | 934 × 1683 | `(39,57)–(892,1632)` | `0ee02e57e00619d5e610dc0d522ee1beaf82469627cc403c311b2886239e2fb8` |
| Noa | `cutouts/noa_neutral_base_candidate_v001.png` | 1154 × 1363 | `(131,108)–(1082,1128)` | `7e9b1d95f1f84142c2a3912e375b1f99922bed33fcbc1cc04a289da4a7563981` |

The additional file
`cutouts/riai_neutral_base_candidate_v002_diagnostic.png` is deliberately named
`diagnostic`. It was emitted only with `--allow-qa-failure=true`; its QA result
is p95 `0.1477`, p99 `0.2015`, and 4,419 partial-edge green violations. It is
kept solely to reproduce and fix the v002 failure.

Alpha QA:

- Riai: 787,959 fully transparent, 8,863 partial-alpha, and 775,100
  fully opaque pixels.
- Noa: 1,002,958 fully transparent, 4,714 partial-alpha, and 565,230
  fully opaque pixels.
- Both outputs are PNG color type 6 (RGBA), have non-empty visible bounds, and
  look clean at full-frame scale on all three review backgrounds.
- Independent synthetic review found that the v001 alpha estimator is
  foreground-colour dependent and over-hardens thin navy/blue/gold/fur edges.
  Therefore the alpha method and these v001 cutouts are **not production
  approved**. See `../../../../logs/NEUTRAL_BASE_QA.md`.

## Candidate review

Riai preserves the white hair, sapphire eyes, two ears, one white tail, navy
celestial robe, gold linework, blue crystals, full body, hands, and feet. The
neutral symmetrical pose is suitable for planning, but the face and garment
symmetry are slightly simplified relative to the canonical scene reference.

Noa preserves the seated front view, two ears, one crystal-tipped tail, open
neutral eyes, closed mouth, four visible paws, hood/cloak, chest brooch, chains,
and blue/gold celestial language. The composition provides clear bilateral
separation, but its dense ornament placement still needs reconciliation with
the supplied layer manifest.

## Known production limitations

- Each candidate is one flattened RGBA raster, not a separated art stack.
- The current RGBA conversion is an experimental v001 result with a failed
  production alpha-method gate. Preserve it for comparison and rebuild it.
- The v002 solver and six-test regression suite are unfinished. At the session
  checkpoint, one test passed and five failed; see
  `../../../../logs/SESSION_HANDOFF_2026-08-22.md`.
- No hidden artwork exists beneath hair, ears, hood, cloak, limbs, crystals, or
  tails.
- Eye whites/irises/lids, mouth shapes, brows, hair sections, cloth sections,
  chains, crystals, hands/paws, ears, and tails are not independently editable.
- No Production Pack layer names, canvas contract, draw order, masks, deformers,
  parameters, physics, expressions, motions, or export settings have been
  applied.
- Neither candidate has been imported or verified in Cubism.

## Next safe step

First fix v002 output-colour reconstruction and border-uniformity validation,
then rerun the six focused tests. Do not publish a new neutral-base candidate
unless all focused tests and the built-in QA pass without
`--allow-qa-failure=true`.

After the Production Pack is attached, read it in the requested order, map each
manifest row to an approved reconstruction task, redraw and extend hidden
overlaps, preserve a common canvas and alignment, then build
`*_material_separation.psd` and one-layer-per-part `*_import.psd` stages. Do not
rename these candidates to production deliverables or use their existence as a
QA pass.
