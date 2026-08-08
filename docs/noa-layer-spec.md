# Noa Live2D Raster Layer Production Specification

**Target:** seated, front-oriented, neutral Noa; hood down/open as shown in the primary front view
**Scope:** art-source and Cubism-import specification only. No PSD separation, ArtMesh, deformer, physics, or runtime model is implemented by this document.

- Specification document: `IMPLEMENTED`.
- Proposed raster layers and hidden-region reconstruction: `REQUIRES MANUAL LIVE2D WORK` / `HUMAN REDRAW REQUIRED`.
- Cubism ArtMeshes, deformers, parameters, physics, and runtime export: `FUTURE WORK`.

Follow [`reference-policy.md`](./reference-policy.md) for source precedence and preservation. Parameter IDs, numeric mesh budgets, high-level deformer names, and runtime/export contracts are authoritative in [`live2d-model-spec.md`](./live2d-model-spec.md); the part-level nodes below refine that shared hierarchy rather than replacing it.

## 1. Source of truth and non-destructive policy

- Primary visual reference: `image-8.png` (`1122 x 1402`, RGB, no alpha, SHA-256 `d60451ba9149582dd6a764e5968a77c9ce40e8160a9dc9da61de4918c751ffab`). It contains front, 3/4, back, hood-up expression, accessory, fabric, paw, and tail-detail views on one opaque sheet.
- The front seated view on `image-8.png` controls the MVP silhouette, proportions, hood-down/open arrangement, color, and visible details. Other views on that same sheet may clarify overlap and construction but must not override the front view.
- `image-9.png` may be used only as a subordinate scale/relationship reference. If it conflicts with `image-8.png`, preserve `image-8.png`.
- `image-2.png` is a scene/central-light reference, not Noa texture source art. Do not bake it, its background, sheet typography, borders, cast shadow, or sparkles into Noa's PSD.
- The supplied PNG is a flattened reference sheet, not separable production art. Every raster layer below must be manually drawn or cleanly reconstructed by a human artist. Automatic cutout/upscale alone does not satisfy this specification.
- Never paint into, crop, resave, color-convert, or overwrite any supplied reference file. Place a copy in the PSD only as a locked, hidden, non-export reference layer.
- Do not invent fur markings, concealed anatomy, cloak construction, or unseen accessories. Where the reference does not establish a region, create only the minimum continuous underpaint supported by adjacent visible color/material, flag it for human approval, and add no new motif.

`l` and `r` always mean **Noa's** left and right, not the viewer's. All canonical names are case-sensitive ASCII `snake_case`.

## 2. Master PSD contract

Recommended working master: `noa_live2d_art_v001.psd`, 4096 x 4096 px, sRGB, 8-bit RGB plus transparency. The high-resolution canvas is for genuine manual redraw; enlarging the source pixels is not a substitute. Center the model on the canvas vertical axis, retain clear ear/tail overscan, and keep the seated floor contact on one horizontal guide. A later texture-atlas decision may downsample this master non-destructively.

Photoshop group stack, listed top/front to bottom/back:

```text
noa/
├── 99_NOTES_DO_NOT_EXPORT/
├── 90_OPTIONAL_FX/
├── 80_ACCESSORIES/
├── 70_FACE/
├── 65_CLOAK_COLLAR_FRONT/
├── 60_HEAD/
├── 50_BODY_FRONT/
├── 45_CLOAK_FRONT/
├── 40_BODY_BACK/
├── 30_CLOAK_BACK/
├── 20_TAIL_BACK/
└── 00_REFERENCE_DO_NOT_EXPORT/
```

The matrices omit the constant `noa/` prefix to stay readable; for example, `20_TAIL_BACK` means `noa/20_TAIL_BACK`.

Rules:

1. `00_REFERENCE_DO_NOT_EXPORT` contains only a locked copy of `image-8.png`, optional subordinate references, alignment guides, and a text note recording the source hashes. Hide this group before export/import.
2. `99_NOTES_DO_NOT_EXPORT` contains redraw questions and approvals. It must not contain production pixels and must be hidden before import.
3. Each production row below is one uniquely named raster pixel layer. Do not use Smart Objects, vector masks, adjustment layers, layer styles, external links, or required blend-mode dependencies in the Cubism import copy.
4. Preserve editable paint and masks in the master. Make a versioned, flattened-per-part import copy; never flatten the whole character.
5. Paint RGB beneath semitransparent edge pixels to avoid pale fringes. No production layer may retain the white reference-sheet background.
6. Constellation print and gold trim remain painted into their owning cloak panel unless a row explicitly separates a moving accessory. This prevents texture swim and unnecessary ArtMesh count.

### Draw-order and import notation

- Lower `B` numbers render behind higher numbers. Decimal order is authoritative inside a band.
- `M1`: compact mesh for a mostly rigid small part; add vertices around the silhouette/facets.
- `M2`: moderate deformation mesh following fur, cloth, or facial contours.
- `M3`: deformation-critical mesh with deliberate edge loops along eyelid/mouth boundaries.
- `M4`: elongated flow mesh along a tail, panel, chain, or pendant axis.
- `A`: full-alpha raster; pixels outside the intended part are transparent.
- `A+`: full-alpha raster that may contain controlled translucency; it must still have no background rectangle.
- `HIDE`: imported but hidden at neutral/default state.
- `CLIP:<name>`: Cubism clipping target proposal. Confirm the mask in Cubism; the PSD must still contain clean alpha.

## 3. Canonical raster layer matrix

Every row is `REQUIRES MANUAL LIVE2D WORK`. “Mandatory” means required for the seated/front neutral MVP, even when the neutral state initially hides the layer. Optional rows may be deferred without misrepresenting the MVP.

### 3.1 Tail — `20_TAIL_BACK`

| Canonical layer | Hierarchy | Band | Need | Expected movement | Deformer / physics role | Hidden redraw requirement | Alpha | Cubism import notes |
|---|---|---:|---|---|---|---|---|---|
| `tail_base` | `20_TAIL_BACK` | B100.10 | Mandatory | Low-amplitude side sweep, drag, and slight squash | `D_Noa_TailRoot > D_Noa_TailMid > D_Noa_TailTip`; input to `Physics_Noa_TailTip` | **HUMAN REDRAW REQUIRED:** reconstruct the entire root and enough continuous white fur beneath cloak/body for the approved wag envelope; exact unseen contour remains an approval item | A | M4 along fur flow; one ArtMesh; keep behind body in neutral |
| `tail_crystal_detail` | `20_TAIL_BACK` | B100.20 | Mandatory | Follows tail; very small secondary lag only if facets do not shear | Child of `D_Noa_TailTip`; normally follows `Physics_Noa_TailTip` rather than running separate physics | Extend blue facet artwork slightly beneath surrounding white fur; use only shapes visible in the primary tail-detail/front views | A | M2; `CLIP:tail_base`; do not redraw new facets on the hidden root |
| `tail_star_detail` | `20_TAIL_BACK` | B100.30 | Optional | Follows tail with no independent bend | Child of `D_Noa_TailTip`; no physics | No hidden design; preserve only the visible gold star detail if the art lead confirms it is a tail marking/attachment | A | M1; merge into `tail_base` if it is confirmed to be painted fur, otherwise retain separately |
| `tail_crystal_glow` | `90_OPTIONAL_FX` | B900.10 | Optional | Follows tail tip; bounded opacity pulse | Child of `D_Noa_TailTip`; no physical response | None; glow footprint must derive from `tail_crystal_detail`, not add new crystal geometry | A+ | M1; `CLIP:tail_crystal_detail` where possible; additive appearance belongs in Cubism/runtime setup, not a PSD layer style |

### 3.2 Rear cloak and concealed body — `30_CLOAK_BACK`, `40_BODY_BACK`

| Canonical layer | Hierarchy | Band | Need | Expected movement | Deformer / physics role | Hidden redraw requirement | Alpha | Cubism import notes |
|---|---|---:|---|---|---|---|---|---|
| `cloak_back_main` | `30_CLOAK_BACK` | B200.10 | Mandatory | Body sway with slow lower-hem lag | `D_Noa_Body > D_Noa_CloakBack`; optional low-gain input to `Physics_Noa_Cloak` | **HUMAN REDRAW REQUIRED:** continue the rear cloak behind side panels and torso only as supported by the back/3/4 views; do not invent an unseen closure | A | M2/M4 with denser hem vertices; keep fabric print baked into this panel |
| `hood_back` | `30_CLOAK_BACK` | B200.20 | Mandatory | Follows head/body with slight delayed compression | `D_Noa_Body > D_Noa_HoodBack`; optional output from `Physics_Noa_Cloak` | **HUMAN REDRAW REQUIRED:** complete the hood bowl and ear-clearance area hidden behind head/ears using the sheet's back and 3/4 views; hood-down is the MVP state | A | M2; keep behind head and ears; do not use the hood-up close-up as the neutral silhouette |
| `hood_back_lining` | `30_CLOAK_BACK` | B200.30 | Mandatory | Follows `hood_back` | Child of `D_Noa_HoodBack`; no independent physics | Extend lining beneath the hood rim so head turns cannot reveal holes; no unseen pattern may be added | A | M2; may be clipped by `hood_back` after import, but retain independent alpha |
| `body_base` | `40_BODY_BACK` | B300.10 | Mandatory | Breath, small body X/Y/Z sway, seated squash | `D_Noa_Body > D_Noa_Breath`; no direct physics | **HUMAN REDRAW REQUIRED:** reconstruct a continuous, neutral white-fur torso/hips beneath cloak and chest fur only to the movement envelope; anatomy beyond that envelope is unresolved, not designed | A | M2; use as the underpaint safety layer; no new markings or garment pieces |
| `hind_leg_l` | `40_BODY_BACK` | B310.10 | Optional | Small seated weight shift | Child of `D_Noa_Body`; no physics | **HUMAN REDRAW REQUIRED if enabled:** derive only visible/3/4-supported silhouette; do not infer hidden joints or markings | A | M2; omit from MVP import if permanently covered and not needed for silhouette |
| `hind_paw_l` | `40_BODY_BACK` | B310.20 | Optional | Follows left hind leg | Child of `D_Noa_Body`; no physics | Redraw only if it becomes visible; the labeled paw-detail inset may control visible pad design after motion/art approval, but do not extrapolate unshown placement or anatomy | A | M2; separate only for an approved seated shift |
| `hind_leg_r` | `40_BODY_BACK` | B311.10 | Optional | Small seated weight shift | Child of `D_Noa_Body`; no physics | **HUMAN REDRAW REQUIRED if enabled:** derive only visible/3/4-supported silhouette; do not infer hidden joints or markings | A | M2; omit from MVP import if permanently covered |
| `hind_paw_r` | `40_BODY_BACK` | B311.20 | Optional | Follows right hind leg | Child of `D_Noa_Body`; no physics | Redraw only if it becomes visible; the labeled paw-detail inset may control an approved visible pad, while all unshown placement/anatomy remains unresolved | A | M2; separate only for an approved seated shift |

### 3.3 Front body and paws — `50_BODY_FRONT`

| Canonical layer | Hierarchy | Band | Need | Expected movement | Deformer / physics role | Hidden redraw requirement | Alpha | Cubism import notes |
|---|---|---:|---|---|---|---|---|---|
| `neck_chest_fur` | `50_BODY_FRONT` | B410.10 | Mandatory | Breath expansion and slight head-follow | `D_Noa_Body > D_Noa_Breath`; secondary child influence from `D_Noa_Head` | **HUMAN REDRAW REQUIRED:** extend neck/chest fur behind jaw, collar, brooch, and forelegs; preserve only visible fur direction | A | M2 with silhouette vertices following tufts; avoid overly dense one-vertex-per-hair mesh |
| `foreleg_l` | `50_BODY_FRONT` | B420.10 | Mandatory | Subtle seated weight shift; no free gesturing in MVP | `D_Noa_Body > D_Noa_ForelegL`; no physics | **HUMAN REDRAW REQUIRED:** continue upper leg beneath cloak/chest fur to prevent gaps; do not invent concealed bands or markings | A | M2; overlap `front_paw_l` under fur seam |
| `front_paw_l` | `50_BODY_FRONT` | B420.20 | Mandatory | Follows foreleg; slight contact squash | `D_Noa_ForelegL > D_Noa_FrontPawL`; no physics | Complete rear/top contour hidden by leg fur; the front-view visible toe grouping controls | A | M2; pivot at wrist/contact transition; no paw-pad layer in neutral front view |
| `foreleg_r` | `50_BODY_FRONT` | B421.10 | Mandatory | Subtle seated weight shift; no free gesturing in MVP | `D_Noa_Body > D_Noa_ForelegR`; no physics | **HUMAN REDRAW REQUIRED:** continue upper leg beneath cloak/chest fur to prevent gaps; do not invent concealed bands or markings | A | M2; overlap `front_paw_r` under fur seam |
| `front_paw_r` | `50_BODY_FRONT` | B421.20 | Mandatory | Follows foreleg; slight contact squash | `D_Noa_ForelegR > D_Noa_FrontPawR`; no physics | Complete rear/top contour hidden by leg fur; preserve visible toe grouping | A | M2; pivot at wrist/contact transition |

### 3.4 Front cloak panels — `45_CLOAK_FRONT`

| Canonical layer | Hierarchy | Band | Need | Expected movement | Deformer / physics role | Hidden redraw requirement | Alpha | Cubism import notes |
|---|---|---:|---|---|---|---|---|---|
| `cloak_underpanel_center` | `45_CLOAK_FRONT` | B440.10 | Mandatory | Breath and small vertical compression | `D_Noa_Body > D_Noa_CloakCenter`; no physics | **HUMAN REDRAW REQUIRED:** continue beneath brooch, chains, chest fur, and overlapping panels without adding a new motif | A | M2; preserve the primary front-view center geometry |
| `cloak_lining_l` | `45_CLOAK_FRONT` | B450.10 | Mandatory | Follows left panel with restrained lag | `D_Noa_CloakFrontL`; follows left output of `Physics_Noa_Cloak` | Extend lining beneath outer panel/hem for the full deformer envelope; use only visible pale lining construction | A | M2/M4; must not share pixels with `cloak_front_l` |
| `cloak_front_l` | `45_CLOAK_FRONT` | B450.20 | Mandatory | Body sway plus slow hem follow-through | `D_Noa_Body > D_Noa_CloakFrontL`; low-gain `Physics_Noa_Cloak` | **HUMAN REDRAW REQUIRED:** reconstruct the portion behind chain, brooch, foreleg, and overlapping collar; retain visible star/constellation print | A | M4 along cloth fall; print and gold trim stay baked into panel |
| `cloak_lining_r` | `45_CLOAK_FRONT` | B451.10 | Mandatory | Follows right panel with restrained lag | `D_Noa_CloakFrontR`; follows right output of `Physics_Noa_Cloak` | Extend lining beneath outer panel/hem for the full deformer envelope; use only visible pale lining construction | A | M2/M4; must not share pixels with `cloak_front_r` |
| `cloak_front_r` | `45_CLOAK_FRONT` | B451.20 | Mandatory | Body sway plus slow hem follow-through | `D_Noa_Body > D_Noa_CloakFrontR`; low-gain `Physics_Noa_Cloak` | **HUMAN REDRAW REQUIRED:** reconstruct the portion behind chain, brooch, foreleg, and overlapping collar; retain visible print | A | M4 along cloth fall; print and gold trim stay baked into panel |

### 3.5 Head, ears, cheeks, and muzzle — `60_HEAD`

| Canonical layer | Hierarchy | Band | Need | Expected movement | Deformer / physics role | Hidden redraw requirement | Alpha | Cubism import notes |
|---|---|---:|---|---|---|---|---|---|
| `ear_l_back` | `60_HEAD/ears_l` | B580.10 | Mandatory | Head rotation plus bounded ear tilt/twitch | `D_Noa_Head > D_Noa_EarLRoot > D_Noa_EarLTip`; `Physics_Noa_EarL` | **HUMAN REDRAW REQUIRED:** complete ear root beneath head fur/hood and backside beneath inner ear; front/back sheet views constrain silhouette | A | M2 with stable root vertices; keep behind `ear_l_inner` |
| `ear_l_inner` | `60_HEAD/ears_l` | B580.20 | Mandatory | Follows ear with slight inner compression | Child of `D_Noa_EarLRoot`; follows `Physics_Noa_EarL` | Extend inner pink area beneath ear rim; do not infer unseen markings | A | M2; `CLIP:ear_l_back` is optional after import |
| `ear_l_blue_detail` | `60_HEAD/ears_l` | B580.30 | Mandatory | Follows ear tip | Child of `D_Noa_EarLTip`; no separate physics | Extend only enough beneath white/inner fur to avoid seams; preserve visible blue geometry | A | M2; clip to `ear_l_back`; do not treat as detachable crystal unless approved |
| `ear_l_forefur` | `60_HEAD/ears_l` | B580.40 | Mandatory | Small secondary overlap during ear motion | Child of `D_Noa_EarLRoot`; follows `Physics_Noa_EarL` | Reconstruct root tufts behind head/hood using visible fur direction | A | M2; front overlap layer |
| `ear_r_back` | `60_HEAD/ears_r` | B581.10 | Mandatory | Head rotation plus bounded ear tilt/twitch | `D_Noa_Head > D_Noa_EarRRoot > D_Noa_EarRTip`; `Physics_Noa_EarR` | **HUMAN REDRAW REQUIRED:** complete ear root beneath head fur/hood and backside beneath inner ear | A | M2 with stable root vertices |
| `ear_r_inner` | `60_HEAD/ears_r` | B581.20 | Mandatory | Follows ear with slight inner compression | Child of `D_Noa_EarRRoot`; follows `Physics_Noa_EarR` | Extend inner pink area beneath ear rim; do not infer unseen markings | A | M2; optional clip to `ear_r_back` |
| `ear_r_blue_detail` | `60_HEAD/ears_r` | B581.30 | Mandatory | Follows ear tip | Child of `D_Noa_EarRTip`; no separate physics | Extend only enough beneath adjacent fur to avoid seams; preserve visible blue geometry | A | M2; clip to `ear_r_back` |
| `ear_r_forefur` | `60_HEAD/ears_r` | B581.40 | Mandatory | Small secondary overlap during ear motion | Child of `D_Noa_EarRRoot`; follows `Physics_Noa_EarR` | Reconstruct root tufts behind head/hood using visible fur direction | A | M2; front overlap layer |
| `head_base` | `60_HEAD` | B600.10 | Mandatory | `ParamAngleX/Y/Z`, small translation, squash | `D_Noa_Body > D_Noa_Head`; no physics | **HUMAN REDRAW REQUIRED:** complete head/face substrate behind ears, forehead tuft, eyes, muzzle, cheeks, crystal, and hood; no new forehead marking | A | M2, evenly distributed across head mass; exclude all face features listed separately |
| `forehead_tuft` | `60_HEAD` | B600.20 | Mandatory | Follows head; subtle delayed tip movement | `D_Noa_Head > D_Noa_ForeheadTuft`; optional low-gain `Physics_Noa_HeadFur` | Extend roots behind head/crystal; preserve the front-view tuft silhouette | A | M2/M4 along tuft direction; keep clear of crystal ArtMesh |
| `cheek_fur_l` | `60_HEAD` | B610.10 | Mandatory | Head turn, mouth/form squash, slight lag | `D_Noa_Head > D_Noa_CheekL`; optional low-gain `Physics_Noa_Cheek` | Extend behind muzzle, cloak rim, and head base; preserve visible tuft direction | A | M2; overlap `head_base` generously |
| `cheek_fur_r` | `60_HEAD` | B610.20 | Mandatory | Head turn, mouth/form squash, slight lag | `D_Noa_Head > D_Noa_CheekR`; optional low-gain `Physics_Noa_Cheek` | Extend behind muzzle, cloak rim, and head base; preserve visible tuft direction | A | M2; overlap `head_base` generously |
| `muzzle_l` | `60_HEAD` | B620.10 | Mandatory | Mouth form/open, small cheek compression | `D_Noa_Head > D_Noa_Muzzle`; no physics | Complete the portion beneath nose and mouth line using the visible symmetric muzzle volume; do not add spots/whiskers | A | M2/M3 near mouth boundary; may share one deformer with right muzzle |
| `muzzle_r` | `60_HEAD` | B620.20 | Mandatory | Mouth form/open, small cheek compression | `D_Noa_Head > D_Noa_Muzzle`; no physics | Complete the portion beneath nose and mouth line using visible muzzle volume; do not add spots/whiskers | A | M2/M3 near mouth boundary |

### 3.6 Collar/hood front — `65_CLOAK_COLLAR_FRONT`

| Canonical layer | Hierarchy | Band | Need | Expected movement | Deformer / physics role | Hidden redraw requirement | Alpha | Cubism import notes |
|---|---|---:|---|---|---|---|---|---|
| `hood_inner_l` | `65_CLOAK_COLLAR_FRONT` | B640.10 | Mandatory | Body/head follow with restrained fold change | `D_Noa_Body > D_Noa_HoodFrontL`; optional hood output from `Physics_Noa_Cloak` | **HUMAN REDRAW REQUIRED:** extend pale lining behind jaw, fur, and outer rim through the head-turn envelope | A | M2; render behind `hood_front_l` |
| `hood_front_l` | `65_CLOAK_COLLAR_FRONT` | B640.20 | Mandatory | Slight head-follow, body sway, soft rim lag | `D_Noa_HoodFrontL`; low-gain hood output from `Physics_Noa_Cloak` | Reconstruct outer rim beneath brooch/chain and behind cheek; front view controls hood-down/open contour | A | M4 following rim; keep cloth print baked in |
| `hood_inner_r` | `65_CLOAK_COLLAR_FRONT` | B641.10 | Mandatory | Body/head follow with restrained fold change | `D_Noa_Body > D_Noa_HoodFrontR`; optional hood output from `Physics_Noa_Cloak` | **HUMAN REDRAW REQUIRED:** extend pale lining behind jaw, fur, and outer rim through the head-turn envelope | A | M2; render behind `hood_front_r` |
| `hood_front_r` | `65_CLOAK_COLLAR_FRONT` | B641.20 | Mandatory | Slight head-follow, body sway, soft rim lag | `D_Noa_HoodFrontR`; low-gain hood output from `Physics_Noa_Cloak` | Reconstruct outer rim beneath brooch/chain and behind cheek; front view controls contour | A | M4 following rim; keep cloth print baked in |

### 3.7 Face — `70_FACE`

| Canonical layer | Hierarchy | Band | Need | Expected movement | Deformer / physics role | Hidden redraw requirement | Alpha | Cubism import notes |
|---|---|---:|---|---|---|---|---|---|
| `brow_l` | `70_FACE/brows` | B700.10 | Optional/conditional | Expression raise, lower, and concern tilt | Child of `D_Noa_Head`; no physics | Separate only if the human redraw establishes an independent visible brow stroke beneath forehead fur; do not manufacture one from shading | A | M2; omit and express with eyes/ears if independent brow art is not primary-supported |
| `brow_r` | `70_FACE/brows` | B700.20 | Optional/conditional | Expression raise, lower, and concern tilt | Child of `D_Noa_Head`; no physics | Separate only if the human redraw establishes an independent visible brow stroke beneath forehead fur; do not manufacture one from shading | A | M2; omit and express with eyes/ears if independent brow art is not primary-supported |
| `eye_l_white` | `70_FACE/eye_l` | B710.10 | Mandatory | Eye open/close and head-turn squash | `D_Noa_Head > D_Noa_EyeL`; no physics | **HUMAN REDRAW REQUIRED:** paint full sclera/eye fill behind iris and both lids so gaze and blink expose no holes | A | M3; clipping parent for iris/pupil/highlights |
| `eye_l_iris` | `70_FACE/eye_l` | B710.20 | Mandatory | Bounded gaze X/Y; head-turn compression | Child of `D_Noa_EyeL`; no physics | Complete circular/elliptical iris behind lids from visible color/gradient only | A | M2; `CLIP:eye_l_white` |
| `eye_l_pupil` | `70_FACE/eye_l` | B710.30 | Mandatory | Follows iris gaze; subtle form change only if approved | Child of `D_Noa_EyeL`; no physics | Complete pupil behind highlights/lids without adding symbols | A | M2; `CLIP:eye_l_iris` |
| `eye_l_highlight_main` | `70_FACE/eye_l` | B710.40 | Mandatory | Follows iris with restrained parallax | Child of `D_Noa_EyeL`; no physics | No concealed design; reconstruct the visible main catchlight cleanly | A | M1; clip to iris |
| `eye_l_highlight_sub` | `70_FACE/eye_l` | B710.50 | Optional | Follows iris; tiny bounded parallax | Child of `D_Noa_EyeL`; no physics | Use only secondary catchlights visibly present in the primary front eye | A | M1; clip to iris; may merge into main highlight for MVP |
| `eye_l_upper_lid` | `70_FACE/eye_l` | B710.60 | Mandatory | Drives upper blink and expression arc | Child of `D_Noa_EyeL`; no physics | Extend line/fur edge past both eye corners for closed deformation | A | M3 with vertices concentrated along lid line |
| `eye_l_lower_lid` | `70_FACE/eye_l` | B710.70 | Mandatory | Small lower-lid rise/squint | Child of `D_Noa_EyeL`; no physics | Extend beyond corners and beneath upper-lid overlap | A | M3 with vertices along lid line |
| `eye_l_closed_lid` | `70_FACE/eye_l` | B710.80 | Mandatory | Appears at full close; expression-dependent arc | Child of `D_Noa_EyeL`; no physics | **HUMAN REDRAW REQUIRED:** author a clean closed-eye line from the established eye corners and lash style; do not infer new lashes | A | M3; HIDE at neutral; use only if the final blink solution crossfades/replaces warped lids |
| `eye_r_white` | `70_FACE/eye_r` | B711.10 | Mandatory | Eye open/close and head-turn squash | `D_Noa_Head > D_Noa_EyeR`; no physics | **HUMAN REDRAW REQUIRED:** paint full sclera/eye fill behind iris and both lids | A | M3; clipping parent for iris/pupil/highlights |
| `eye_r_iris` | `70_FACE/eye_r` | B711.20 | Mandatory | Bounded gaze X/Y; head-turn compression | Child of `D_Noa_EyeR`; no physics | Complete iris behind lids from visible gradient only | A | M2; `CLIP:eye_r_white` |
| `eye_r_pupil` | `70_FACE/eye_r` | B711.30 | Mandatory | Follows iris gaze | Child of `D_Noa_EyeR`; no physics | Complete pupil behind highlights/lids without adding symbols | A | M2; `CLIP:eye_r_iris` |
| `eye_r_highlight_main` | `70_FACE/eye_r` | B711.40 | Mandatory | Follows iris with restrained parallax | Child of `D_Noa_EyeR`; no physics | No concealed design; reconstruct visible main catchlight | A | M1; clip to iris |
| `eye_r_highlight_sub` | `70_FACE/eye_r` | B711.50 | Optional | Follows iris; tiny bounded parallax | Child of `D_Noa_EyeR`; no physics | Use only secondary catchlights visibly present in primary front eye | A | M1; may merge into main highlight for MVP |
| `eye_r_upper_lid` | `70_FACE/eye_r` | B711.60 | Mandatory | Drives upper blink and expression arc | Child of `D_Noa_EyeR`; no physics | Extend line/fur edge past both corners for closed deformation | A | M3 with vertices concentrated along lid line |
| `eye_r_lower_lid` | `70_FACE/eye_r` | B711.70 | Mandatory | Small lower-lid rise/squint | Child of `D_Noa_EyeR`; no physics | Extend beyond corners and beneath upper-lid overlap | A | M3 with vertices along lid line |
| `eye_r_closed_lid` | `70_FACE/eye_r` | B711.80 | Mandatory | Appears at full close; expression-dependent arc | Child of `D_Noa_EyeR`; no physics | **HUMAN REDRAW REQUIRED:** author a clean closed-eye line from established corners and lash style; do not infer new lashes | A | M3; HIDE at neutral |
| `blush_l` | `70_FACE/cheeks` | B720.10 | Mandatory | Expression opacity; follows cheek squash | Child of `D_Noa_Head`; no physics | Reconstruct only the visible soft pink cheek area; no new freckles/markings | A+ | M1/M2; default bounded opacity; no layer-style blur dependency |
| `blush_r` | `70_FACE/cheeks` | B720.20 | Mandatory | Expression opacity; follows cheek squash | Child of `D_Noa_Head`; no physics | Reconstruct only the visible soft pink cheek area | A+ | M1/M2; default bounded opacity |
| `nose` | `70_FACE/mouth` | B730.10 | Mandatory | Head/muzzle follow; tiny mouth-form squash | `D_Noa_Muzzle`; no physics | Complete the nose shape hidden by highlight/line antialiasing; no new nostril detail | A | M1/M2; separate ArtMesh |
| `mouth_inner` | `70_FACE/mouth` | B730.20 | Mandatory | Revealed by mouth open; vertical squash | `D_Noa_Head > D_Noa_Mouth`; no physics | **HUMAN REDRAW REQUIRED:** author the open-mouth cavity using the primary sheet's hood-up expression only as construction evidence; align it to the neutral front head | A | M3; HIDE when closed; place behind tongue/teeth and mouth line |
| `mouth_tongue` | `70_FACE/mouth` | B730.30 | Mandatory | Follows mouth open/form with small squash | Child of `D_Noa_Mouth`; no physics | Complete the visible tongue shape from the primary expression inset; do not add unseen tongue detail | A | M2; HIDE when closed; clip to mouth interior if needed |
| `mouth_tooth_l` | `70_FACE/mouth` | B730.40 | Optional | Follows upper mouth; reveals on approved open expression | Child of `D_Noa_Mouth`; no physics | Use only if the art lead confirms the small tooth/fang visible in the primary expression inset | A | M1; HIDE when closed; omit rather than invent |
| `mouth_tooth_r` | `70_FACE/mouth` | B730.50 | Optional | Follows upper mouth; reveals on approved open expression | Child of `D_Noa_Mouth`; no physics | Use only if the art lead confirms the small tooth/fang visible in the primary expression inset | A | M1; HIDE when closed; omit rather than invent |
| `mouth_closed_line` | `70_FACE/mouth` | B730.60 | Mandatory | Mouth form, smile/concern, closed-to-open transition | Child of `D_Noa_Mouth`; no physics | **HUMAN REDRAW REQUIRED:** cleanly reconstruct the neutral closed line and corners from the primary front view, including pixels occluded by nose/muzzle | A | M3; visible at neutral; may fade as `mouth_inner` opens |

### 3.8 Forehead crystal, brooch, chains, and charms — `80_ACCESSORIES`

| Canonical layer | Hierarchy | Band | Need | Expected movement | Deformer / physics role | Hidden redraw requirement | Alpha | Cubism import notes |
|---|---|---:|---|---|---|---|---|---|
| `forehead_crystal_base` | `80_ACCESSORIES/forehead_crystal` | B800.10 | Mandatory | Rigid head follow with slight perspective compression | `D_Noa_Head > D_Noa_ForeheadCrystal`; no physics | **HUMAN REDRAW REQUIRED:** complete all visible facets and the small portion hidden by highlight/forehead fur; do not add rear mounting geometry | A | M1/M2 with vertices on facet boundaries; separate from head |
| `forehead_crystal_highlight` | `80_ACCESSORIES/forehead_crystal` | B800.20 | Mandatory | Small bounded intensity/parallax response | Child of `D_Noa_ForeheadCrystal`; no physics | Reconstruct only the primary visible highlight/star flare geometry | A+ | M1; clip to base unless intentional flare extends beyond it |
| `forehead_crystal_glow` | `90_OPTIONAL_FX` | B900.20 | Optional | Bounded opacity pulse; follows head | Child of `D_Noa_ForeheadCrystal`; no physics | None; footprint follows the confirmed base silhouette and must not imply a different crystal | A+ | M1; prefer runtime/emissive treatment; no PSD layer style |
| `brooch_mount` | `80_ACCESSORIES/chest_brooch` | B810.10 | Mandatory | Body/cloth follow with minimal swing | `D_Noa_Body > D_Noa_Brooch`; no physics | Complete mount beneath crystal and chains using only the primary brooch detail | A | M1/M2; mostly rigid mesh; front of cloak |
| `brooch_crystal` | `80_ACCESSORIES/chest_brooch` | B810.20 | Mandatory | Follows mount; bounded highlight pulse | Child of `D_Noa_Brooch`; no physics | Complete facets hidden by highlight/chain overlap from the brooch detail inset | A | M1/M2 with facet vertices |
| `brooch_highlight` | `80_ACCESSORIES/chest_brooch` | B810.30 | Optional | Bounded opacity/parallax | Child of `D_Noa_Brooch`; no physics | No new geometry; derive from visible brooch highlight | A+ | M1; clip to `brooch_crystal` where possible |
| `chain_l` | `80_ACCESSORIES/chains` | B820.10 | Mandatory | Small delayed pendulum response | `D_Noa_Body > D_Noa_ChainL`; input to `Physics_Noa_ChainL` | **HUMAN REDRAW REQUIRED:** reconstruct chain where it passes behind brooch/hood edge; attachment point must be approved, not guessed | A | M4 following chain path; separate from cloth |
| `chain_r` | `80_ACCESSORIES/chains` | B820.20 | Mandatory | Small delayed pendulum response | `D_Noa_Body > D_Noa_ChainR`; input to `Physics_Noa_ChainR` | **HUMAN REDRAW REQUIRED:** reconstruct occluded chain and confirm attachment point from visible sheet details | A | M4 following chain path |
| `chain_center` | `80_ACCESSORIES/chains` | B820.30 | Mandatory | Low-amplitude vertical/pendulum lag | `D_Noa_Body > D_Noa_ChainCenter`; input to `Physics_Noa_ChainCenter` | Continue only the visible chain path beneath crossing charms/brooch; do not add links beyond necessary overlap | A | M4; keep separate from center pendant |
| `charm_l` | `80_ACCESSORIES/charms` | B830.10 | Mandatory | Pendulum swing with bounded lag | `D_Noa_ChainL > D_Noa_CharmL`; follows `Physics_Noa_ChainL` | Complete occluded top loop using visible chain/charm construction; preserve primary shapes | A | M4 for connector plus M1-like facet mesh; split again only if independent motion is approved |
| `charm_center` | `80_ACCESSORIES/charms` | B830.20 | Mandatory | Pendulum swing with bounded lag | `D_Noa_ChainCenter > D_Noa_CharmCenter`; follows `Physics_Noa_ChainCenter` | Complete the connector hidden beneath brooch/chain overlap; no new pendant | A | M4/M1; one ArtMesh for MVP if connector does not shear |
| `charm_r` | `80_ACCESSORIES/charms` | B830.30 | Mandatory | Pendulum swing with bounded lag | `D_Noa_ChainR > D_Noa_CharmR`; follows `Physics_Noa_ChainR` | Complete occluded top loop using visible construction; preserve primary shapes | A | M4/M1; split again only if independent motion is approved |

## 4. Proposed Cubism deformer and physics hierarchy

This is a naming/ownership proposal, not evidence of an implemented model. The high-level nodes match `docs/live2d-model-spec.md`. The layer matrix uses readable part-local deformer shorthand such as `D_Noa_Head` and `D_Noa_ForelegL`; during rigging those resolve respectively under `D_Noa_HeadXY` and `D_Noa_LegFrontL`. Do not create a second competing root hierarchy.

```text
D_Noa_Root
└── D_Noa_BodyZ
    └── D_Noa_BodyXY
        ├── D_Noa_Body
        │   ├── D_Noa_Breath
        │   ├── D_Noa_LegFrontL
        │   │   └── D_Noa_FrontPawL
        │   ├── D_Noa_LegFrontR
        │   │   └── D_Noa_FrontPawR
        │   ├── D_Noa_LegBackL
        │   ├── D_Noa_LegBackR
        │   ├── D_Noa_CloakGlobal
        │   │   ├── D_Noa_CloakBack
        │   │   ├── D_Noa_CloakCenter
        │   │   ├── D_Noa_CloakFrontL
        │   │   ├── D_Noa_CloakFrontR
        │   │   ├── D_Noa_HoodBack
        │   │   ├── D_Noa_HoodFrontL
        │   │   └── D_Noa_HoodFrontR
        │   ├── D_Noa_Brooch
        │   ├── D_Noa_ChainL > D_Noa_CharmL
        │   ├── D_Noa_ChainCenter > D_Noa_CharmCenter
        │   ├── D_Noa_ChainR > D_Noa_CharmR
        │   └── D_Noa_TailBase
        │       └── D_Noa_TailMid
        │           └── D_Noa_TailTip
        └── D_Noa_Neck
            └── D_Noa_HeadZ
                └── D_Noa_HeadXY
                    ├── D_Noa_Face
                    │   ├── D_Noa_CheekL
                    │   ├── D_Noa_CheekR
                    │   ├── D_Noa_EyeL
                    │   ├── D_Noa_EyeR
                    │   ├── D_Noa_Muzzle
                    │   └── D_Noa_Mouth
                    ├── D_Noa_EarBaseL > D_Noa_EarFlexL
                    ├── D_Noa_EarBaseR > D_Noa_EarFlexR
                    ├── D_Noa_ForeheadTuft
                    └── D_Noa_ForeheadCrystal
                        └── D_Noa_ForeheadCrystalGlow
```

Proposed physics groups:

- `Physics_Noa_TailTip`: body X/Z and acceleration input; bounded output across tail mid/tip. It must not physically drive the tail base far enough to expose unpainted anatomy.
- `Physics_Noa_Cloak`: shared declared group with independently tuned left/right outputs so the cloak is not mechanically mirrored.
- `Physics_Noa_EarL`, `Physics_Noa_EarR`: proposed independent, low-amplitude tip lag after explicit ear motion. Avoid synchronized perpetual twitching.
- `Physics_Noa_HoodL`, `Physics_Noa_HoodR`: optional, lower-amplitude outputs that may remain part of `Physics_Noa_Cloak` rather than separate groups.
- `Physics_Noa_ChainL`, `Physics_Noa_ChainCenter`, `Physics_Noa_ChainR`: proposed short, damped pendant response; explicit actions must settle safely.
- `Physics_Noa_HeadFur`, `Physics_Noa_Cheek`: optional polish only.

All parameter bounds, custom parameter IDs, and expression ranges belong to `docs/live2d-model-spec.md`. Physics must be clamped to the approved redraw envelope. AI/runtime actions may select high-level behavior only; they must never write these deformers or raw parameters directly.

## 5. Explicit exclusions from the MVP PSD

- The reference-sheet paper, typography, borders, palette boxes, labels, sparkles, floor/cast shadow, and composition guides.
- The central magical light from `image-2.png`; implement it as independent scene VFX later.
- Hood-up alternate costume state. The primary sheet can guide a future alternate, but it needs a separately approved overlap plan and is optional polish.
- Full locomotion-ready rear-leg anatomy, paw undersides, or novel paw-pad views. Add only after an approved action requires them.
- Unseen cloak fasteners, interior motifs, fur markings, crystal backs, or chain attachment hardware.
- Lip-sync viseme art beyond the mandatory bounded open/form mouth set. Voice/lip-sync remains future work.

## 6. Noa art handoff acceptance gate

The Noa PSD is ready for Cubism import only when all statements are true:

- The source PNG hash above still matches; the working PSD is a new file and contains a locked, hidden reference copy.
- Every mandatory canonical raster layer exists once, uses its exact ASCII name, has transparent surroundings, and contains no reference-sheet pixels.
- The neutral composite matches the front seated Noa in `image-8.png` at review scale; subordinate views have not changed the primary silhouette.
- Left/right eyes include complete underpaint, open components, and human-authored closed-lid artwork; open/closed composites have no holes or double lines.
- The neutral mouth and bounded open mouth contain approved line, cavity, and tongue art; optional teeth are absent unless confirmed.
- Head, ear roots, torso, forelegs, tail root, hood, cloak panels/lining, brooch, and chains remain filled throughout the approved deformer envelope with no seams.
- Tail and cloak movement never reveal invented anatomy or unapproved motifs.
- A transparent-background edge inspection shows no white matte, rectangular residue, or color fringe at 100% and 400% zoom.
- A Cubism PSD import smoke test preserves all mandatory layers, unique names, alpha, and intended front/back order. Passing import does not imply rigging is complete.
- Art lead records every unresolved hidden-design question as approved, deferred outside the movement envelope, or blocked. No unresolved item is silently guessed.
