# Riai + Noa mutual-gaze pose PSD checkpoint — 2026-08-21

## Completed locally

- Preserved two dedicated baked-pose RGBA PNGs under
  `art/live2d/prototype/interaction/`; the original front-pose cutouts were not
  overwritten.
- Generated one-leaf, 8-bit RGB PSDs at
  `art/live2d/prototype/import/riai_look_noa_smile_poc_v001.psd` and
  `art/live2d/prototype/import/noa_look_riai_smile_poc_v001.psd`.
- Read both PSDs back and verified canvas dimensions, one-leaf structure,
  layer names, Normal blend mode, alpha presence, and byte-for-byte RGBA
  equality against their source PNGs.
- Recorded source/output SHA-256 values and alpha statistics in
  `art/live2d/prototype/import/interaction-psd-manifest.json`.

Rebuild with `pnpm art:build-poc-psd:interaction`. The original front-pose
pipeline remains available as `pnpm art:build-poc-psd`.

## Exact import contract

| Character | PSD leaf | Source direction |
| --- | --- | --- |
| Riai | `riai_look_noa_smile_poc_full` | gaze viewer-right/down; gentle closed-mouth smile |
| Noa | `noa_look_riai_smile_poc_full` | gaze viewer-left/up; gentle smile |

## Resume boundary

Riai has since been imported and saved as its own one-ArtMesh CMO3. Noa reached
Cubism's “new model from PSD” selection dialog but was not confirmed before the
session stopped. The authoritative end-of-day state and exact first resume
action are recorded in `../session-checkpoint-2026-08-21.md`.

These remain flattened baked-pose assets: successful import or whole-raster
motion must not be described as a dynamic facial, eye, or mouth rig.
