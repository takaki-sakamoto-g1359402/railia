# Riai / Noa Live2D progress report — 2026-08-25

## Executive status

Today's work established an auditable Riai face-expression workbench and
material-separation workbenches for Riai hair and cloth. The generators,
manifests, hashes, preview renders, and automated tests are preserved in the
repository.

This is meaningful pre-rig progress, but it is not a finished Live2D model.
Cubism 5.3.03 is open at the empty modelling workspace; the new face PSD has not
yet been visually confirmed as imported ArtMeshes. No new production `.cmo3`,
`.moc3`, `.model3.json`, physics, expression, motion, or texture-atlas export was
created today.

All generated assets remain explicitly marked
`WORKBENCH_NOT_PRODUCTION_IMPORT` or
`MATERIAL_SEPARATION_WORKBENCH_NOT_CUBISM_IMPORT`. The missing Production Pack
and `scripts/validate_delivery.py` still prevent the requested formal delivery
contract and final QA from being claimed.

## Completed today

### 1. Source and identity preservation

- Added the two new, unique, user-approved Riai and Noa breakdown references to
  `art/live2d/reference/design-breakdowns/`.
- Verified that the other two supplied files were byte-identical to existing
  references rather than storing duplicates.
- Preserved the policy that breakdown sheets are separation and motion guides,
  not crop-ready production layers. Paper, labels, arrows, and guide marks are
  excluded from production art.

### 2. Alpha-recovery pipeline

- Completed the v002 trimap/local-foreground solver in
  `scripts/chroma-key-to-alpha.mjs`.
- Recovered the previously failing alpha regression checkpoint.
- All six focused chroma-key regression tests now pass within the full suite.

### 3. Riai face material-separation PSD

- Output: `art/live2d/production-workbench/riai-face/psd/riai_material_separation.psd`
- Canvas: 1536 x 1024, RGBA8
- Structure: 26 independent, uniquely named, full-canvas raster leaves
- SHA-256:
  `04e1dd712475c6d93fbcd4c1ecfac9f86d3f3ae60989b52333a6c08ac4609f5c`
- Verified: PSD re-open, unique layer names, and per-layer RGBA equality
- Decision: rejected the contaminated source blush and substituted independent
  procedural cheek layers with the substitution recorded in the manifest

### 4. Riai face staging PSD and expression previews

- Output: `art/live2d/production-workbench/riai-face/stage/riai_face_stage_import_WORKBENCH_v001.psd`
- Canvas: 1254 x 1254
- Structure: 23 uniquely named raster leaves
- SHA-256:
  `503621e6af394cb09dbf438813cc421bcd9b9c696d21eeade83f3c2531f9bf8f`
- Generated neutral, soft-smile, blink-smile, and open-happy preview composites
- Corrected the open-happy composite so the inner mouth and teeth render
  coherently without the earlier protruding-tongue artifact

### 5. Riai hair material-separation workbench

- Output: `art/live2d/production-workbench/riai-secondary-motion/psd/riai_hair_material_separation_WORKBENCH_v001.psd`
- Canvas: 1024 x 1536
- Structure: 16 unique raster leaves
- SHA-256:
  `d651b29c0cd83300ee17764ff1e7bcfdb52894b4763466dc1babdaefe9fe7d81`
- Pixel accounting: 422,979 visible pixels included; eight corner-noise pixels
  explicitly rejected and recorded

### 6. Riai cloth material-separation workbench

- Output: `art/live2d/production-workbench/riai-secondary-motion/psd/riai_cloth_material_separation_WORKBENCH_v003.psd`
- Canvas: 1628 x 966
- Structure: 29 unique raster leaves
- SHA-256:
  `3d949ff2c332fe8133be985883ede960dd022e83b67483f61bb0340d3c5ed7d9`
- Pixel accounting: 589,137 visible pixels included; 30,882 contaminated
  waist-chain pixels and seven corner-noise pixels explicitly rejected and
  recorded

### 7. Reproducible builders and tests

Added or completed:

- `scripts/build-riai-face-psds.mjs`
- `scripts/build-riai-face-stage.mjs`
- `scripts/build-riai-secondary-material-psds.mjs`
- `tests/build-riai-face-psds.test.ts`
- `tests/riai-face-stage.test.ts`
- `tests/build-riai-secondary-material-psds.test.ts`

Verification with the bundled Node.js 24.19.0 runtime:

- Test suite: 9 files, 89/89 tests passed
- TypeScript typecheck: passed
- Vite 8.2.1 production build: passed, 20 modules transformed
- Git whitespace/error check: passed
- Manifest reconciliation: four PSD manifests present; 17/17 referenced hashes
  matched

## Current Cubism state

- Live2D Cubism Editor 5.3.03 trial is running.
- The user cleared the trial-continuation dialog manually because the Java/Swing
  control rejected remote button input.
- The application is at an empty modelling workspace.
- The staged Riai face PSD is preserved and ready for the next import attempt,
  but its 23 layers have not yet been verified as Cubism ArtMeshes.
- No workbench `.cmo3` was created, so there is no risk of treating an unverified
  rig as a completed model.

## Required improvements, in production priority order

### P0 — unblock actual Cubism import and save the first checkpoint

1. Import `riai_face_stage_import_WORKBENCH_v001.psd` in Cubism.
2. Confirm all 23 layers arrive as separate ArtMeshes with correct visibility,
   placement, order, and no unexpected flattening.
3. Save a versioned workbench `.cmo3` immediately before mesh generation.
4. Capture proof screenshots of the canvas, parts tree, and parameter palette.

This is the first unresolved execution gate; local PSD existence alone is not
Cubism verification.

### P0 — reconstruct the fused facial components

The current face candidates are suitable for a motion study, not final facial
rigging:

- eye white and upper lid remain fused in the source candidate;
- iris, pupil, and highlights remain baked together;
- anatomical left/right assignment needs final visual confirmation;
- hidden overlap under eyelids and at the mouth needs clean extension;
- the procedural blush needs final art-direction approval and colour matching.

Rebuild these as clean, transparent, separately controlled layers before the
final import PSD is emitted.

### P0 — create and visually test Riai's facial parameters

Use standard Live2D IDs where applicable:

- `ParamEyeLOpen`, `ParamEyeROpen`
- `ParamEyeBallX`, `ParamEyeBallY`
- left/right brow form and vertical movement
- `ParamMouthForm`, `ParamMouthOpenY`
- `ParamCheek`

Test neutral recovery, independent blink, gaze extremes, smile/open-mouth
combinations, and simultaneous brow/eye/mouth motion. Parameter existence is not
enough; deformation must be visually checked in Cubism at every keyform.

### P1 — remove hair and cloth contamination before import

- Hair contains 2,820 opaque green-baked pixels inside strands.
- The cloth accessory area contains 878 opaque green-baked pixels.
- Low-alpha canvas specks were detected and accounted for in both atlases.

Regenerate against true transparency or repaint the affected regions while
preserving edge colour and alpha. Re-run the three-background review and manifest
checks before creating import PSDs.

### P1 — build deformation-friendly hierarchy and secondary motion

After clean import:

- split front, side, back-upper, back-lower, and loose hair into nested warp
  deformers rather than one rigid sheet;
- separate hood, cloak front/back, sleeves, chains, and crystals so cloth motion
  can lag at different rates;
- use small-amplitude, multi-stage physics for natural motion;
- keep chains/crystals from intersecting the body and avoid exposing holes at
  all head/body extremes;
- add ear and tail motion only after the face/head hierarchy is stable.

### P1 — expression and physics QA

Verify neutral, head X/Y/Z extremes, body motion, blink, gaze, mouth, every
required expression, hand/pose switches, hair/cloth physics, ears/tail, masks,
draw order, intersections, seams, neutral recovery, and performance. Fix visible
defects rather than documenting them as accepted.

### P0 delivery dependency — recover the Production Pack

The following requested files remain absent and cannot be substituted by the
breakdown images:

- `00_START_HERE.md`
- `specs/PSD_RULES.md`
- Riai and Noa layer manifests
- parameter, deformer, physics, expression, mask/draw-order, QA, and export specs
- `scripts/validate_delivery.py`

When supplied, read them in the user's mandated order, reconcile this workbench
with the actual naming/canvas/export contract, and run the validator before any
completion claim.

## Exact next-session restart point

1. Keep Cubism 5.3.03 open.
2. Import the staged Riai face PSD.
3. Verify and screenshot all 23 imported ArtMeshes.
4. Save the first versioned Riai face workbench `.cmo3`.
5. Implement eye-open/blink first, then gaze, brows, mouth, smile, and cheek.
6. Only after facial neutral recovery passes, clean and import hair/cloth for
   deformers and physics.

## Official Live2D references used

- Material separation:
  https://docs.live2d.com/en/cubism-editor-manual/divide-the-material/
- PSD preparation precautions:
  https://docs.live2d.com/en/cubism-editor-manual/precautions-for-psd-data/
- PSD import:
  https://docs.live2d.com/en/cubism-editor-manual/psd-import/
- Standard parameter list:
  https://docs.live2d.com/en/cubism-editor-manual/standard-parameter-list/
- Facial-expression tutorial:
  https://docs.live2d.com/en/cubism-editor-tutorials/expression/
- Eye-blink settings:
  https://docs.live2d.com/en/cubism-editor-manual/eye-blink-settings/
- X/Y keyforms:
  https://docs.live2d.com/en/cubism-editor-manual/keyform-xydirection/
- Blend Shape:
  https://docs.live2d.com/en/cubism-editor-manual/blend-shape/
- Expression setup and export:
  https://docs.live2d.com/en/cubism-editor-manual/setting-and-exporting-facial-expressions/
- Physics operation:
  https://docs.live2d.com/en/cubism-editor-manual/physics-operation/
- Physics settings:
  https://docs.live2d.com/en/cubism-editor-manual/physical-operation-setting/
- Deformer and hair/body workflow:
  https://docs.live2d.com/cubism-editor-tutorials/deformer/
- Automatic sway motion:
  https://docs.live2d.com/en/cubism-editor-manual/auto-generation-of-sway-motion/

## Completion statement

Today's checkpoint is reproducible and reviewable, but the production goal is
not complete. Riai and Noa still require actual Cubism import, meshing, rigging,
parameters, masks/draw order, physics, expressions, motions, visual QA, runtime
exports, and the requested validator pass.
