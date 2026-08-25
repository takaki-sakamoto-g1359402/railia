# Riai face and secondary-motion build plan — 2026-08-25

Status: **ACTIVE WORKBENCH PLAN — NOT A SUBSTITUTE FOR THE PRODUCTION PACK**

## Today’s verified target

Build a separately controllable Riai face with independent gaze, blink, smile
eyes, eyebrows, mouth form, and mouth opening, then prepare segmented hair and
cloth for delayed secondary motion. The target must be visibly tested in
Cubism Editor; a baked expression image or a whole-character warp is not a
facial rig.

## Current evidence

- All existing Riai PSDs contain one raster leaf.
- Existing Riai CMO3 checkpoints contain either one flat ArtMesh or one flat
  ArtMesh under a whole-character warp.
- No independent eye, lid, eyebrow, mouth, hair-section, or cloth-section
  ArtMesh exists yet.
- The twelve mandatory Production Pack files and
  `scripts/validate_delivery.py` are absent from the searched workspace,
  Documents, Downloads, Desktop, Codex attachments, and remote-attachment
  cache as of 2026-08-25.

The workbench may reconstruct clean parts and prove the technique, but final
IDs, layer names, deformer hierarchy, masks, physics values, expressions, QA,
and export acceptance remain subject to the missing Pack.

## Official Live2D basis

- Material separation is required before modeling, and Live2D recommends
  preserving both an editable material-separation PSD and a merged-per-part
  import PSD:
  <https://docs.live2d.com/en/cubism-editor-manual/divide-the-material/>
- Import PSDs must be PSD, RGB, 8-bit/channel, sRGB, with unique layer names;
  each imported part must be a single raster layer and layer masks must be
  applied:
  <https://docs.live2d.com/en/cubism-editor-manual/precautions-for-psd-data/>
- Standard facial parameter IDs and ranges:
  <https://docs.live2d.com/en/cubism-editor-manual/standard-parameter-list/>
- Official facial-expression workflow, including two eye keys, three eyebrow
  keys, clipping pupils to eye whites, and separate mouth components:
  <https://docs.live2d.com/en/cubism-editor-tutorials/expression/>
- Physics is driven by pre-authored sway parameters and can use separate groups
  for bangs, skirts, and other sections:
  <https://docs.live2d.com/en/cubism-editor-manual/physical-operation-setting/>
- The official physics default is 60 fps when the target application is not yet
  fixed:
  <https://docs.live2d.com/en/cubism-editor-manual/physics-operation/>

Use stable Cubism Editor 5.3.03 for this production branch. Do not migrate the
production files to the 5.4 alpha line.

## Required facial art stack

Every raster part must have transparent padding only where needed, extended
hidden artwork, unique naming, and the same canvas alignment.

```text
Riai_Face
├── Face_Base
├── Nose
├── Blush_L
├── Blush_R
├── Brow_L
├── Brow_R
├── Eye_L
│   ├── EyeWhite_L
│   ├── Iris_L
│   ├── Pupil_L
│   ├── Highlight_L_Main
│   ├── Highlight_L_Sub
│   ├── UpperLash_L
│   └── LowerLid_L
├── Eye_R
│   ├── EyeWhite_R
│   ├── Iris_R
│   ├── Pupil_R
│   ├── Highlight_R_Main
│   ├── Highlight_R_Sub
│   ├── UpperLash_R
│   └── LowerLid_R
└── Mouth
    ├── Mouth_Upper
    ├── Mouth_Lower
    ├── Mouth_Inner
    ├── Mouth_Tongue
    └── Mouth_Teeth_Upper
```

The eye whites are the clipping parents for irises, pupils, and highlights.
The mouth interior must extend beyond every allowed opening; the lip-side skin
must also extend far enough to prevent holes at closed and smiling forms.

## Facial controls

| Control | ID | Keys |
| --- | --- | --- |
| Head X | `ParamAngleX` | -30 / 0 / 30 |
| Head Y | `ParamAngleY` | -30 / 0 / 30 |
| Head Z | `ParamAngleZ` | -30 / 0 / 30 |
| Left eye open | `ParamEyeLOpen` | 0 / 1 |
| Right eye open | `ParamEyeROpen` | 0 / 1 |
| Left smile eye | `ParamEyeLSmile` | 0 / 1 |
| Right smile eye | `ParamEyeRSmile` | 0 / 1 |
| Gaze X | `ParamEyeBallX` | -1 / 0 / 1 |
| Gaze Y | `ParamEyeBallY` | -1 / 0 / 1 |
| Left/right brow Y | `ParamBrowLY`, `ParamBrowRY` | -1 / 0 / 1 |
| Left/right brow X | `ParamBrowLX`, `ParamBrowRX` | -1 / 0 / 1 |
| Left/right brow angle | `ParamBrowLAngle`, `ParamBrowRAngle` | -1 / 0 / 1 |
| Left/right brow form | `ParamBrowLForm`, `ParamBrowRForm` | -1 / 0 / 1 |
| Mouth form | `ParamMouthForm` | -1 / 0 / 1 |
| Mouth open | `ParamMouthOpenY` | 0 / 1 |
| Cheek | `ParamCheek` | 0 / 1 |

Gaze X/Y must be linked and checked at all nine combinations. Mouth form/open
must be checked at all six intersections. Eye smile is a secondary difference,
not a replacement for eye-open control.

## Hair and clothing segmentation

Hair must not be one rigid sheet:

```text
Hair
├── Bangs_Center
├── Bangs_L
├── Bangs_R
├── SideHair_L_Upper
├── SideHair_L_Lower
├── SideHair_R_Upper
├── SideHair_R_Lower
├── BackHair_Upper
├── BackHair_Lower_L
├── BackHair_Lower_R
└── LooseStrands (multiple ArtMeshes)
```

Cloth must be split at structural hinges:

```text
Cloth
├── Hood_Outer
├── Hood_Inner
├── Cloak_Front_L_Upper
├── Cloak_Front_L_Lower
├── Cloak_Front_R_Upper
├── Cloak_Front_R_Lower
├── Cloak_Back_Upper
├── Cloak_Back_Lower_L
├── Cloak_Back_Lower_R
├── Sleeve_L_Upper
├── Sleeve_L_Lower
├── Sleeve_R_Upper
├── Sleeve_R_Lower
└── Chains_And_Crystals (separate pendulum groups)
```

Suggested workbench sway outputs use standard or clearly temporary IDs until
the Pack arrives: `ParamHairFront`, `ParamHairSide`, `ParamHairBack`, plus
temporary `ParamHoodSway`, `ParamSleeveLSway`, `ParamSleeveRSway`, and
`ParamCloakSway`. Temporary IDs must be mapped or replaced after the Pack is
read.

## Deformer and physics intent

- Face parent: 2×3 warp; face Z: rotation deformer.
- Each eye: 3×3 warp; each brow: 2×2 warp; mouth: 3×2 warp.
- Bangs, side hair, back hair, hood, sleeves, and each cloak section receive
  independent warp deformers whose root stays visually anchored.
- Create sway keyforms before opening Physics Settings.
- Physics inputs: primarily `ParamAngleX`, `ParamAngleZ`,
  `ParamBodyAngleX`, and `ParamBodyAngleZ`; use body Y only where upward motion
  should cause lift.
- Separate physics groups for bangs, side hair, back hair, hood, sleeves,
  cloak, chains, and crystals. Use a two-stage or three-stage hair pendulum for
  layered sections, then tune duration, ease, reaction, convergence, and output
  scale by visual evidence.
- Start at 60 fps and keep the motion restrained; no section may detach at the
  root, cross the face unintentionally, or expose a transparent hole.

## QA gate for today

- Neutral face exactly recovers after every test.
- Both eyes close completely and independently; no iris/highlight leakage.
- Gaze is continuous across all nine X/Y points.
- Brows combine without inversion or sudden jumps.
- Mouth closes fully at every form value and never reveals an empty interior.
- Neutral, soft smile, full smile, concerned, surprised, sad, and determined
  combinations are visually distinct without changing Riai’s identity.
- Hair and cloth roots remain fixed while tips lag and settle naturally.
- Face plus hair/cloth random-pose combinations do not create visible holes,
  clipping failures, or severe intersections.
- Save Cubism screenshots for neutral, facial extremes, compound smile, hair
  swing, cloth swing, and neutral recovery under `proof/`.

No item may be called complete until it is visibly verified in Cubism; file
existence alone is not evidence.
