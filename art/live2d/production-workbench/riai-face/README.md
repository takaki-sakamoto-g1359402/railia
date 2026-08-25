# Riai facial reconstruction workbench

Status: **PRE-PRODUCTION RECONSTRUCTION — NOT A CUBISM QA PASS**

This directory contains clean-room reconstructed facial components created from
the canonical Riai identity reference and the latest breakdown sheet. The
breakdown sheet is used only for design and separation guidance; its labels,
arrows, white paper, and displayed samples are never cropped into production
art.

## Source roles

- `../../reference/canonical/riai_canonical_reference_20260809_v001.png`:
  identity, face, palette, and silhouette authority.
- `../../reference/design-breakdowns/riai_parts_breakdown_20260822_v002.jpg`:
  separation and motion guidance only.
- `../../reference/design-breakdowns/riai_parts_breakdown_20260825_v003.jpg`:
  latest separation/motion cross-check only; not a source of cropped artwork.

## Current source images

- `source/riai_face_parts_checker_v001.png`: first generated RGB result. The
  checkerboard is baked into the image and is therefore not transparency.
- `source/riai_face_parts_green_v001.png`: targeted background-replacement
  result for controlled matte extraction. It is still an opaque RGB source.

Neither file is an import PSD or accepted Live2D layer set. A cutout can be
promoted only after the v002 alpha solver passes its regression suite and the
output passes both numerical and multi-background edge QA.

## Current verified workbench outputs

- `cutouts/riai_face_base_patch_rgba_v002.png`: transparent blank face base;
  v002 alpha reconstruction passed numerical and three-background review.
- `cutouts/riai_face_parts_rgba_v002.png`: facial component atlas. Eye, brow,
  nose, and mouth candidates are usable for a Cubism implementation smoke test;
  the two generated blush components are rejected for green halos.
- `psd/riai_material_separation.psd`: deterministic, same-canvas editable
  material-separation workbench with 26 raster leaves. The two contaminated
  atlas blush components are excluded and replaced by independent procedural
  blush layers. Its sidecar manifest records every component, six explicitly
  rejected corner-noise pixels, source/config/output hashes, and byte-for-byte
  layer round-trip validation.
- `config/riai-face-atlas-v002.json`: explicit ROI mapping and fail-closed
  production policy used by `scripts/build-riai-face-psds.mjs`. Run
  `pnpm art:build-riai-face-material` to reproduce the material PSD.
- `stage/riai_face_stage_import_WORKBENCH_v001.psd`: 23 uniquely named raster
  layers aligned on a 1254 x 1254 canvas. This is deliberately marked
  `WORKBENCH`, not production import art.
- `stage/expressions/`: deterministic neutral, soft-smile, blink-smile, and
  open-happy visual checks generated from the same layer stack.

The stage builder replaces rejected blush art with clean procedural layers,
re-opens the written PSD, verifies its header/layer contract, and fails closed
when invoked with `--production`. Production promotion remains blocked because
the current eye whites contain fused lid linework, the irises contain baked
pupils/highlights, and an sRGB ICC-tagged re-save is still required.

The material PSD builder independently enforces the same non-claim. Invoking
`scripts/build-riai-face-psds.mjs --mode=import` exits with
`PRODUCTION_IMPORT_BLOCKED` and does not create `riai_import.psd` while fused
parts, atlas green-fringe provenance, anatomical side mapping, final face
placement, Production Pack naming, sRGB re-save, or Cubism multi-layer import
verification remain unresolved.

## Intended flow

1. Preserve generated sources and hashes.
2. Convert the green-screen source with the tested v002 trimap solver.
3. Separate every non-touching facial component into a same-canvas transparent
   layer with a stable semantic name.
4. Create an editable material-separation PSD and a one-raster-per-part import
   PSD.
5. Align the parts over an approved blank face base. A verified workbench stage
   now exercises this step without claiming production completion.
6. Import the workbench stage to Cubism 5.3.03, create meshes, clipping,
   deformers, parameters, and keyforms, then capture visual QA.

The missing Production Pack remains authoritative for final names, hierarchy,
masks, physics, expressions, QA, and export rules.
