# Riai + Noa Manual Redraw and PSD Acceptance Checklist

**Purpose:** human production gate between flattened reference sheets and import-ready layered PSDs. This checklist does not claim that PSD separation, Cubism rigging, SDK integration, or animation exists.

- Checklist document: `IMPLEMENTED`.
- Raster redraw, layered PSD creation, and approval package: `REQUIRES MANUAL LIVE2D WORK` / `HUMAN REDRAW REQUIRED`.
- Cubism rigging and runtime validation: `FUTURE WORK`.

## 1. Authority and stop rules

- Riai primary reference: `image-9.png` (`750 x 1334`, RGB, no alpha, SHA-256 `0e1c2e7c061a88cade25b7ccda9b6d8ac84764692371003767c7185e466c3dd8`). MVP: front-facing neutral upper body, hood down where supported.
- Noa primary reference: `image-8.png` (`1122 x 1402`, RGB, no alpha, SHA-256 `d60451ba9149582dd6a764e5968a77c9ce40e8160a9dc9da61de4918c751ffab`). MVP: seated/front-oriented neutral, hood down/open.
- `image-2.png` is a central magical-light/scene reference only. It is not character texture art.
- Secondary images and additional views may clarify visible pose, overlap, clothing, ears, tails, expressions, or proportions. When any detail conflicts, the named primary reference wins.
- **Stop and mark `HUMAN REDRAW REQUIRED`** when a hidden contour, material, attachment, or marking is not established. Do not fill uncertainty with a plausible new design.
- The minimum allowed underpaint is a continuation of directly adjacent, observable material/color within the approved deformation envelope. Add no symbols, seams, fasteners, anatomy details, or markings without human art-direction approval.

## 2. Source preservation — mandatory before painting

- [ ] Work on new files named `riai_live2d_art_v001.psd` and `noa_live2d_art_v001.psd`; never open/save over an attachment or reference original.
- [ ] Record source path, pixel dimensions, color space, alpha status, and SHA-256 in `00_REFERENCE_DO_NOT_EXPORT/source_manifest` or a companion manifest.
- [ ] Verify both source hashes against the values above before production begins.
- [ ] Create a byte-identical, read-only project copy under the policy target `art/reference/immutable/` (or record the approved equivalent), then verify its hash again. This traceability copy is not the editable art file.
- [ ] Copy each source into its PSD as a locked layer inside `00_REFERENCE_DO_NOT_EXPORT`; preserve aspect ratio and keep it hidden for export/import.
- [ ] Keep an untouched source backup outside the working-art folder. Version PSDs monotonically (`v001`, `v002`, ...); do not replace an approved version in place.
- [ ] Perform cropping, cleanup, repaint, color correction, and layer separation only on new production layers.
- [ ] Use non-destructive masks in the editable master. Create a separate versioned Cubism import copy with rasterized per-part layers; do not flatten the full character.
- [ ] Use sRGB, 8-bit RGB plus alpha for the import copy unless a verified pipeline test documents a different requirement.
- [ ] Hide/remove reference, notes, guides, white sheet, typography, palette chips, borders, cast shadows, and scene effects before Cubism import.
- [ ] Confirm the originals' hashes again at the final handoff. A changed hash is a failed gate, not a cosmetic issue.

## 3. HUMAN REDRAW REQUIRED — Riai MVP

All items in this section are required manual art production, not optional polish. Use the canonical layer plan in `docs/riai-layer-spec.md` for final names/order.

### Head, hair, ears, and face

- [ ] Reconstruct a continuous face/head substrate beneath bangs, side hair, brows, eyes, nose, mouth, ears, and hood overlap. Do not invent facial markings.
- [ ] Separate back hair, main front/bang mass, side locks, and only the specifically selected movable strands; redraw every strand root beneath its overlap.
- [ ] Extend back hair behind the head, neck, shoulders, ears, hood, and robe for the approved head/body turn envelope; preserve the primary front silhouette.
- [ ] Complete both fox-ear bases beneath hair/head and the inner/back portions needed for bounded ear tilt. Use side/back views only to clarify; do not redesign the front ear silhouette.
- [ ] Redraw complete left/right brows beneath fringe occlusion so happy, concerned, and thinking shapes do not expose gaps.
- [ ] Paint full left/right eye underlayers: whites, irises, pupils, primary highlights, approved secondary highlights, upper lids, and lower lids.
- [ ] Extend whites/irises/pupils behind eyelids and eye corners so bounded gaze and blink never expose transparent holes.
- [ ] Author clean left/right **closed-lid** artwork from the established eye corners and lash/line style. Mirroring may be used only as a construction aid; review asymmetry against the primary face.
- [ ] Reconstruct the neutral closed mouth line and corners.
- [ ] Author the minimum open-mouth set: cavity/interior, tongue only where reference-supported, and any teeth/fangs only when directly confirmed. Do not invent dental detail.
- [ ] Extend muzzle/lip/skin underpainting beneath the nose and mouth components so `ParamMouthOpenY` and `ParamMouthForm` remain hole-free.

### Body, hands, robe, tail, and accessories

- [ ] Reconstruct neck, upper torso, shoulders, and the minimum chest/skin/garment underpaint hidden by hair, collar, robe, brooch, and arm overlaps.
- [ ] Separate each visible arm/hand required by the approved upper-body neutral composition. Reconstruct sleeve-hidden wrist/forearm only through the approved motion envelope.
- [ ] Complete visible fingers and their overlaps from primary/secondary evidence. If a finger surface or palm construction is not visible, limit motion or request art direction; do not guess anatomy.
- [ ] Extend shoulder and upper-arm artwork under sleeves so small gesture/idle motion cannot reveal empty pixels.
- [ ] Separate robe back/underpanel, front panels, sleeves, hood-down rim/lining, and selected moving hems. Paint the garment substrate beneath brooches, chains, hair, arms, and overlapping panels.
- [ ] Continue constellation print and trim only across directly inferable occluded fabric. Do not invent a hidden constellation motif; an uncertain area remains plain approved underpaint or outside the motion envelope.
- [ ] Paint hood lining and the portion behind hair/neck needed by head turns. Hood-up is not part of the Riai MVP unless separately approved.
- [ ] Reconstruct the fluffy tail root and continuous base beneath robe/hair/body for the approved sway envelope. Preserve visible fur color/direction; do not invent markings or attachment anatomy.
- [ ] Separate crystals, brooch, chains, pendants, and hair ornaments selected for motion. Redraw occluded connectors/backs only when visible detail establishes them; otherwise require an attachment approval.
- [ ] Ensure every accessory has underlying hair/robe/skin paint so movement cannot reveal a cutout hole.

## 4. HUMAN REDRAW REQUIRED — Noa MVP

All items in this section are required manual art production. Canonical names, hierarchy, order, and per-layer import notes are defined in `docs/noa-layer-spec.md`.

### Head, ears, eyes, and mouth

- [ ] Reconstruct a complete white-fur `head_base` beneath ears, forehead tuft, crystal, brows, eyes, cheeks, muzzle, and hood/collar. Add no unseen forehead marking.
- [ ] Complete both ear roots and backs beneath head fur/hood for bounded independent ear tilt; use the front, 3/4, and back views on `image-8.png` without changing the primary front silhouette.
- [ ] Extend inner-ear color and blue ear details beneath surrounding fur. Treat the blue detail as observed surface design; do not reinterpret it as detachable crystal anatomy without approval.
- [ ] Separate forehead tuft and cheek tufts, with roots underpainted beneath head/hood so low-amplitude secondary motion cannot open seams.
- [ ] Paint full left/right eye underlayers: whites, irises, pupils, main highlights, upper lids, and lower lids; secondary highlights may be merged only if the art lead accepts the visual match.
- [ ] Extend whites/irises/pupils beneath lids and beyond eye corners for bounded gaze/blink.
- [ ] Author clean left/right **closed-lid** artwork from the primary eye corners and line/lash style. The source does not supply production-ready closed-lid layers.
- [ ] Reconstruct brows as independent layers where visible; do not exaggerate or add new brow markings.
- [ ] Reconstruct the neutral closed mouth line/corners from the main front view.
- [ ] Author the open mouth cavity and tongue using the hood-up expression inset on `image-8.png` only as visible construction evidence, then align them to the front-neutral head.
- [ ] Include small teeth/fangs only if the art lead explicitly confirms them from the primary expression inset. If uncertain, omit them.
- [ ] Complete muzzle and mouth-adjacent fur beneath nose/line/open components to prevent holes during open/form deformation.

### Body, paws, cloak, tail, and accessories

- [ ] Reconstruct the minimum continuous seated white-fur torso/hip underpaint beneath cloak, neck fur, forelegs, and brooch. Keep anatomy outside the approved movement envelope unresolved.
- [ ] Separate left/right forelegs and front paws; extend upper legs under cloak/chest fur and paw tops under leg fur.
- [ ] Preserve the visible front toe grouping. Paw pads are not part of the neutral front reveal; if a later approved motion exposes them, the labeled paw-detail inset on `image-8.png` controls visible pad design, while unshown placement/anatomy remains unresolved.
- [ ] Add rear legs/paws only if the approved seated shift or cloak motion exposes them. If enabled, derive visible contours from the primary sheet's 3/4/back evidence and request approval for any missing surface.
- [ ] Reconstruct neck/chest fur behind jaw, collar, brooch, chains, and forelegs.
- [ ] Separate cloak back, hood back, left/right front panels, center underpanel, left/right lining, and left/right hood/collar rims.
- [ ] Complete **garment underpainting** beneath head, fur, brooch, chains, forelegs, and overlapping panels for the approved cloth/head motion envelope.
- [ ] Continue gold trim and constellation print only where continuity is directly inferable. Do not create a new hidden closure, seam, or motif.
- [ ] Keep hood-down/open as the neutral MVP. The hood-up close-up is construction/expression evidence, not authorization to create an alternate hood state.
- [ ] Reconstruct a continuous white-fur **tail root** beneath cloak/body for the approved wag envelope; do not invent root markings or anatomy.
- [ ] Extend blue tail facets beneath adjacent white fur only enough to avoid seams. Preserve their observed shapes and keep them on a separate layer if crystal response is planned.
- [ ] Separate forehead crystal base/highlight and chest brooch base/crystal. Complete facets only from the primary detail views; do not invent rear mounts.
- [ ] Separate left/center/right chain and charm clusters selected for physics. Human approval is required for any connector or attachment point hidden by the brooch/hood.
- [ ] Paint underlying head, fur, and cloak beneath every movable crystal, chain, charm, and brooch.

## 5. HUMAN REDRAW REQUIRED — shared occlusion proof

Complete this for each character before Cubism import:

- [ ] Create an occlusion map listing every foreground layer, the layer(s) it hides, and the planned maximum reveal direction.
- [ ] For every hidden region, classify evidence as `PRIMARY_VISIBLE`, `SECONDARY_CLARIFIED`, or `UNRESOLVED`.
- [ ] Keep `UNRESOLVED` regions outside the approved deformer envelope or obtain written art-direction approval before painting them.
- [ ] Extend underpaint beyond the full planned reveal envelope, not merely one or two edge pixels.
- [ ] Temporarily translate/rotate each movable front part to all approved extremes and inspect the composite at 100% and 400% zoom.
- [ ] Verify no transparent wedges appear at hair roots, ear roots, eyelids, eye corners, mouth corners, shoulders, wrists, fingers, paw/leg joins, tail roots, hood rims, cloak panels, brooches, chains, or crystal attachments.
- [ ] Verify the revealed underpaint is continuous in hue, value, edge softness, line weight, fur direction, and fabric pattern where the reference supports those properties.
- [ ] Verify no underpaint introduces a new design detail. If an expanded region becomes visually important, return it to art direction instead of treating it as technical filler.

## 6. Acceptance and QC gates

| Gate | Required evidence | Pass condition | Failure disposition |
|---|---|---|---|
| G0 — source integrity | Before/after SHA-256 manifest; locked reference group | Attachment hashes match; originals were not modified | Stop; restore originals and restart from a clean copy |
| G1 — primary-reference fidelity | Neutral composite overlaid against the named primary view | Silhouette, proportions, palette, visible costume/fur details, and seated/upper-body pose match; no secondary-reference drift | Return to human redraw |
| G2 — layer contract | PSD layer inventory compared with the character layer spec | Every mandatory exact ASCII name appears once in the correct group/order; optional omissions are documented | Rename/reorder/redraw before import |
| G3 — transparency | Checkerboard and edge inspection at 100%/400% | No white sheet, rectangular residue, matte halo, dirty alpha, or hidden background pixels | Clean RGB/alpha edges and recheck |
| G4 — hidden artwork | Occlusion map plus extreme reveal contact sheet | All approved extremes are hole-free; unresolved design remains covered or approved | Reduce envelope or obtain human redraw/approval |
| G5 — eyes | Open, half, fully closed, gaze-left/right/up/down composites | Whites remain filled; irises/pupils stay bounded; lids meet cleanly; human-authored closed-lid lines do not double | Redraw eye underpaint/lids |
| G6 — mouth | Closed, small open, maximum MVP open, smile/concern form composites | No holes or detached corners; interior/tongue is reference-supported; no unconfirmed teeth | Redraw or remove unsupported detail |
| G7 — deformation seams | Head/body/ear/tail/hair/robe/paw/hand extreme contact sheet | No cracks, texture discontinuities, exposed cut edges, or implausible stretching within approved range | Add underpaint or restrict movement |
| G8 — accessory safety | Accessory offset/swing test with underlying art visible | Hair/fur/garment exists beneath each accessory; connector origins are approved; facets do not shear | Redraw substrate/connector or reduce motion |
| G9 — visual cleanup | Neutral composite on light, mid-gray, and dark backgrounds | No halos; line weight/color remains coherent; asymmetric details are intentional | Human cleanup pass |
| G10 — Cubism import smoke test | Import screenshot and layer/ArtMesh inventory | All required layers import once with expected alpha/order; no blank, merged, or missing production part | Repair import copy; do not claim rigging complete |
| G11 — approval record | Dated art-lead signoff plus unresolved-item list | Every hidden-design question is approved, explicitly deferred outside the envelope, or marked blocked | Handoff remains `REQUIRES MANUAL LIVE2D WORK` |

Passing G10 only proves the PSD import boundary. Mesh editing, deformers, parameters, expressions, physics, `.cmo3`, `.moc3`, `.model3.json`, textures, and runtime behavior remain unimplemented until separately created and verified.

## 7. Optional polish — not required for the Phase 1 art gate

The following must not delay or be reported as part of the minimal PSD unless explicitly promoted to scope:

- [ ] Additional micro-strand splits for Riai beyond the selected readable front/side locks.
- [ ] Additional Riai hand gestures, palm views, full-body leg motion, or shoe articulation.
- [ ] Riai hood-up alternate state or large cloak-opening motion.
- [ ] Noa hood-up alternate state, full locomotion anatomy, rear-paw articulation, or paw-pad reveal.
- [ ] Extra mouth phoneme/viseme drawings beyond bounded `ParamMouthOpenY` and `ParamMouthForm` support.
- [ ] Extra eye sparkle layers, animated facet caustics, or multiple crystal-glow passes.
- [ ] Independent motion for every chain link, tiny star charm, fur tuft, or constellation mark.
- [ ] Large-amplitude ear/tail motion that requires additional hidden anatomy.
- [ ] Scene cast shadows, background particles, or the central magical light inside character PSDs.

Optional polish follows the same no-invention, source-integrity, transparency, occlusion, and approval gates as mandatory art.

## 8. Exact human handoff package

- [ ] `riai_live2d_art_vNNN.psd` — editable master with locked references and exact canonical production layers.
- [ ] `riai_live2d_import_vNNN.psd` — hidden notes/references removed or hidden; production parts rasterized individually.
- [ ] `noa_live2d_art_vNNN.psd` — editable master matching `docs/noa-layer-spec.md`.
- [ ] `noa_live2d_import_vNNN.psd` — import copy with per-part alpha preserved.
- [ ] `source-manifest.txt` — source paths, dimensions, color space, alpha status, and SHA-256 values.
- [ ] `occlusion-map-riai.png` and `occlusion-map-noa.png` — annotated overlaps, reveal directions, and evidence classifications.
- [ ] `deformation-extremes-riai.png` and `deformation-extremes-noa.png` — contact sheets proving seam-free approved ranges.
- [ ] `redraw-approvals.md` — dated decisions for every hidden contour, connector, optional tooth/fang, motif continuation, or movement restriction.
- [ ] Cubism import smoke-test screenshots and imported layer inventory for each character.
- [ ] Final QC signoff recording G0–G11 as pass/fail with reviewer and date.

Until this package passes all mandatory gates, the truthful status is `REQUIRES MANUAL LIVE2D WORK`; it must not be labeled `IMPLEMENTED`.
