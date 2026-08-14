# Reference Artwork Policy

## Status and scope

- Policy document: **IMPLEMENTED**.
- Source inspection: **IMPLEMENTED** for the fourteen files listed below.
- Separated character artwork and production PSDs: **REQUIRES MANUAL LIVE2D WORK**.
- Cubism models, meshes, deformers, physics, and runtime exports: **FUTURE WORK**.

This policy governs all Phase 1 art preparation for Riai and Noa. It does not claim that a layered PSD, a rig, or a runtime model exists.

## Source register and authority

The three primary/scene files in `/Users/sakamototakaki/.codex/attachments/9ea0a0ec-88e1-411c-ab7b-a7b774e459cb/` are immutable inputs. Nine additional scene images were human-approved as Live2D secondary references, and two later images were supplied as scene/UI reference information only. All eleven were inspected through `com.apple.Photos.NSItemProvider` temporary paths. Those Photos paths are ephemeral and are not production archive locations. Filenames and hashes below identify the inspected bytes; a human must provide durable originals before any Photos reference enters the production archive.

| Role | Source filename | Verified properties | SHA-256 | Permitted use |
| --- | --- | --- | --- | --- |
| Riai primary | `image-9.png` | 750 x 1334 PNG; flattened RGB; no alpha | `0e1c2e7c061a88cade25b7ccda9b6d8ac84764692371003767c7185e466c3dd8` | Riai silhouette, visible costume, face, hair, ears, tail, palette, and accessory design |
| Riai secondary; support only | `61763E84-1B87-4BCC-A441-EC301A931519.png` | 1122 x 1402 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `7cb6a4463cbd3a2ee4dd60131256dfa7911848226198fc8df0e6891720ab27a5` | Visible upper-body, hands, and source-compatible robe, hair, and tail support only |
| Riai secondary; support only | `A495E424-5AC6-46B7-A175-5EEC2DCA95D0.png` | 1122 x 1402 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `8f3b4ea99c568d1726bd682b8310501fdf146f37b3672eae25ef4e24f346ca3c` | Visible full-body side/three-quarter view and source-compatible back-hair, tail, and robe silhouette support only |
| Riai secondary; support only | `64C6E4AE-5897-4312-8C5F-4945DDB467FF.png` | 1122 x 1402 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `d3ba036bae13a8fdd78860dc33638ac32ffe1eb4e797a1420df92f5e40144530` | Visible front/three-quarter full-body view and source-compatible hands, robe, and tail support only |
| Riai secondary; support only | `906B4389-AAAC-4E2E-BA10-9C74BDDE8C2F.png` | 1122 x 1402 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `56f9994a05a4a1a3851c20c3276b20b114f5b5036a0bfb3ae214ac104737dff8` | Visible hood-up upper-body, hands, front hair, robe, and tail support only |
| Riai secondary; support only | `5CDA02B7-035D-4D95-917E-64BD5B52254F.png` | 941 x 1672 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `b7672a15c0193a411ea6c97ab95bbcb43cdca0b9ee86656bdb04bd5a1fc78872` | Visible hood-up full-body silhouette, long robe, footwear, hands, hair, and tail support only |
| Riai secondary; support only | `84F4555E-7F66-43A9-A283-4F9031458D70.png` | 1122 x 1402 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `4f26e9ca3fd71a7d14d5e64451d74666d587fd2114232629191c9a13bf984d54` | Visible seated pose, exposed legs and footwear, extended hand, hood, robe, hair, and tail support only |
| Riai secondary; support only | `BFFCA8CB-CC4C-46EB-B5CA-36C185A9A2E5.png` | 1122 x 1402 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `52ffef86193f4dede5b1681381a4270a575ab7969c9a87cd8d9a5d951db64532` | Visible hood-up full-body frontal/three-quarter silhouette, clasped hands, robe, hair, and tail support only |
| Riai + Noa secondary; support only | `37B569B6-B960-4FEC-890D-0A77B13181A7.png` | 1122 x 1402 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `61bf58d18548d43e37ed332a6318de51e12bf24a943ec11ee041cebfc94d073a` | Visible Riai/Noa relative composition; source-compatible Riai front silhouette, hand, robe, hair, tail; source-compatible Noa front silhouette, cloak, face, paws, and tail only |
| Riai + Noa secondary; support only | `A69D0A24-1500-4515-99A6-EC8CD32430D9.png` | 1122 x 1402 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `35feab3c63383afe7f8fcb6657e18f8fbb4f46fdf5f14a66179736e0e9e9752e` | Visible hood-up Riai/Noa composition, robe/cloak, ears, tails, and scene reaction mood only |
| Noa primary | `image-8.png` | 1122 x 1402 PNG; flattened RGB; no alpha | `d60451ba9149582dd6a764e5968a77c9ce40e8160a9dc9da61de4918c751ffab` | Noa silhouette, visible anatomy, cloak, tail, palette, crystal, and accessory design |
| Scene/VFX only | `image-2.png` | 1448 x 1086 PNG; flattened RGB; no alpha | `566611099062f67f60a48d2f937608bd9fd54ae6ed4207616b814992ddf075c3` | Central magical light, scene composition, lighting mood, and optional external VFX reference only |
| Scene/UI reference only | `5CC268CF-6D28-4FF8-939C-C31656A9E006.png` | 1448 x 1086 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `e624ad726feb813559a77fedc214391ef1aa07aadce23a38128bc64f75595286` | Riai/Noa relationship, human/AI collaboration theme, spatial composition, and environmental/UI mood only; never a character texture or cut source |
| Scene/UI reference only | `EED3B93A-5277-4C02-A774-B0F5091348A1.png` | 1448 x 1086 PNG; flattened RGB scene art; no alpha; inspected from an ephemeral Photos path | `556f006e6e713680ba1a5ea7054860e921085fae4ac7b256eb31b52caf2d40bf` | Riai/Noa conversational staging, large holographic UI, central crystal/table composition, and blue/gold interface mood only; never a character texture or cut source |

`image-2.png` is not a character construction source. It must not override Riai or Noa anatomy, costume, colors, proportions, expressions, or accessory placement.

### Approved Riai secondary-use limits

- `image-9.png` remains the Riai primary and `image-8.png` remains the Noa primary; each always wins a conflict. Human approval of the nine secondary files does not promote them to co-primary status.
- The secondary files can clarify only the visible support regions listed in the register. They do not authorize a new character feature, hidden anatomy, unseen garment construction, a tail root, hair roots, back surfaces, mouth interior, or a front-neutral pose.
- These are flattened scene images, not layered art, cut sources, or clean production plates. Do not trace background-contaminated edges as final contours and do not import any secondary image into Cubism as a character texture.
- Ignore baked perspective, wind, pose, environmental color cast, rim light, bloom, particles, text, architecture, landscape, and background occlusion. Palette, motifs, identity, and final silhouette remain governed by `image-9.png`.
- When a secondary clarifies a visible region, the working-file provenance note must record the exact filename, hash, region, and limited decision it supported.
- Current Photos temporary paths may disappear without notice. Production use of these secondaries is **BLOCKED** until a human supplies durable original files whose hashes can be rechecked against this register. This policy update does not copy or modify them.

The two scene/UI-only references are lower authority than every character source. They cannot clarify anatomy, costume construction, proportions, palette, expression, accessory placement, layer boundaries, or hidden regions, and were not used to generate the prototype character cutouts.

## Reference precedence

Use this order whenever evidence conflicts:

1. The character's primary source: `image-9.png` for Riai or `image-8.png` for Noa.
2. Within a primary character sheet, the largest front/front-oriented presentation controls the MVP silhouette and costume; the close-up controls visible facial detail; labeled detail callouts control the depicted accessory or fabric detail; side/back panels may clarify depth and overlap only.
3. A registered secondary character image may clarify only its approved visible support regions and only when compatible with the primary source. Record the filename, hash, exact region, and limited decision in the working-file notes.
4. Existing character-bible or production material may clarify workflow or an already-visible feature only when it matches the primary source.
5. If evidence remains missing or contradictory, stop that region and label it **HUMAN REDRAW REQUIRED**. Do not average, mirror, hallucinate, or silently choose a new design.

For the MVP pose, Riai is a front-facing neutral upper body with the hood down, and Noa is seated and front-oriented. If the primary art does not directly show a required neutral-pose region, a human artist must design and approve that region before it becomes canonical.

## Non-destructive source policy

1. Never edit, rename, move, resave, crop, color-correct, overwrite, or metadata-normalize any attachment or Photos-provided source file.
2. Before art work begins, verify the source hash against the register above. A hash mismatch is **BLOCKED** until the source is reconciled.
3. For the eleven Photos-provided files, a human must first provide durable originals; do not treat or promote an ephemeral `NSItemProvider` path as the archive. After that handoff, create a byte-identical, read-only project copy for traceability, then create a separate editable working document. Do not paint on the source or traceability copy.
4. Recommended future locations are:
   - immutable copies: `art/reference/immutable/`;
   - editable work: `art/work/`;
   - review exports: `art/review/`;
   - approved Cubism-import PSDs: `art/live2d/import/`.
   These locations are policy targets; their existence is not claimed by this document.
5. Use versioned working names such as `riai_mvp_upperbody_work_v001.psd`; never replace an approved version in place. Promote by copying to a new version and recording approval.
6. Keep reference composites outside every Cubism-import group. Guides, annotations, backgrounds, checkerboards, and color swatches must be hidden and excluded from export.
7. Every derived asset must retain a short provenance note containing source filename, source SHA-256, artist, date, working-file version, approved crop, and all secondary references used by region.
8. Keep line/color construction editable. Avoid irreversible flattening until a review export is made; the approved Cubism PSD itself remains layered.

## Hidden-region and redraw rule

The supplied character files are opaque, flattened design boards or scene images. They do not contain separable parts or the pixels hidden behind hair, eyelids, irises, ears, the hood, robe panels, sleeves, hands, body, cloak, tail, crystals, or other overlaps.

- A visible crop is evidence for appearance, not evidence that a movable part has a complete hidden shape.
- Every movable part must be reconstructed past its current occlusion boundary with sufficient bleed for its approved parameter range.
- Reconstructed pixels must match visible contour, color, material, and motif evidence. Where that evidence does not determine the design, label the region **HUMAN REDRAW REQUIRED** and obtain human approval.
- Mirroring is allowed only for temporary alignment checks. It is not approved final art when the primary source shows asymmetry.
- The front-facing neutral-pose adaptation itself is **HUMAN REDRAW REQUIRED** where the sheet supplies only angled, posed, or covered artwork.
- Do not claim hidden anatomy, robe construction, hood interior, hair roots, tail root, limb pose, or mouth interior as canonical until a human approves it.

## Character versus scene separation

- The central magical light, room, platform, star field, particles, bloom, and environmental illumination from `image-2.png` are separate optional VFX/scene assets.
- Do not bake central-light pixels, blue/gold spill light, scene shadows, or the background into either character PSD.
- Character crystals may have separately authored local glow layers only when the non-glowing crystal remains complete underneath. Glow layers are optional and must be independently disableable.
- Light-response behavior belongs to runtime/effects logic and deterministic animation control, not to destructive repainting of the base character.

## Working color, alpha, and import baseline

- Character work: 8-bit RGB, sRGB IEC61966-2.1, transparent canvas. Do not use CMYK or indexed color.
- Every Cubism-import leaf layer must have real alpha outside its painted pixels; white board backgrounds are forbidden.
- Preserve one shared canvas origin and dimensions across all leaf layers. Do not trim individual layers.
- Use ASCII `snake_case` leaf names matching the character layer specifications. Names must be unique within a PSD.
- Use normal blend mode and 100% opacity for base raster parts. Bake required appearance into pixels without merging independently moving parts. Recreate additive glow in Cubism/runtime rather than depending on PSD layer effects.
- Remove masks, smart-object dependencies, adjustment layers, vector-only content, hidden duplicate paint, and unsupported effects from the approved import copy after retaining them in the editable work file.

## Approval gates

Art may advance to Cubism import only when all of the following are true:

- The source hashes match this register.
- Durable human-provided originals for any production-used secondary reference are available outside Photos temporary storage and their hashes match this register.
- The exact Riai and Noa MVP crop and neutral pose are approved.
- Every mandatory raster layer in the character specifications exists, is uniquely named, and has transparent surroundings.
- Every **HUMAN REDRAW REQUIRED** item is either approved or explicitly removed from the MVP without exposing a hole during the target motion range.
- Isolated-layer and composite reviews show no seams, halos, background contamination, or missing overlap bleed.
- The central light and background remain outside both character PSDs.
- A human has signed off on asymmetry, hidden-region reconstruction, and any interpretation of conflicting reference panels.

Until those gates pass, the art asset status remains **REQUIRES MANUAL LIVE2D WORK**.
