# Riai + Noa Cubism prototype art

## Status

These files are **GENERATED PROTOTYPE ART / NOT CANONICAL MASTER ART**.
They exist only to prove that two recognizable characters can be imported,
deformed, animated, and connected to the safe Character Action API. They do
not satisfy the production PSD, hidden-region redraw, facial separation, or
commercial Live2D rig requirements in `docs/manual-redraw-checklist.md`.

The immutable attachments were never edited. The generated chroma-key files
remain available under `source/`; background removal writes separate alpha
files under `cutouts/`.

## Source authority

| Character | Immutable primary reference | SHA-256 | Use in this prototype |
| --- | --- | --- | --- |
| Riai | `image-9.png` | `0e1c2e7c061a88cade25b7ccda9b6d8ac84764692371003767c7185e466c3dd8` | Identity and the large front full-body pose only |
| Noa | `image-8.png` | `d60451ba9149582dd6a764e5968a77c9ce40e8160a9dc9da61de4918c751ffab` | Identity and the large seated front pose only |

The two scene images supplied on 2026-08-12 were not used to construct these
cutouts. They remain scene/relationship/UI mood references only:

| Scene reference | SHA-256 | Bounded role |
| --- | --- | --- |
| `5CC268CF-6D28-4FF8-939C-C31656A9E006.png` | `e624ad726feb813559a77fedc214391ef1aa07aadce23a38128bc64f75595286` | Relationship, human/AI collaboration, environment, and UI mood only |
| `EED3B93A-5277-4C02-A774-B0F5091348A1.png` | `556f006e6e713680ba1a5ea7054860e921085fae4ac7b256eb31b52caf2d40bf` | Conversational staging, holographic UI, central table/crystal, and interface mood only |

## Generated files

| File | SHA-256 | Notes |
| --- | --- | --- |
| `source/riai_poc_chroma_v001.png` | `c5276c1c58413370e5bde9b24b2cfb74f530f6be2bc88ae4d30c31fb49d11489` | Built-in ImageGen result on a flat green key |
| `source/noa_poc_chroma_v001.png` | `af34c610463b86552a2819468880259da163caefe1eab44538cf1ebd196e22f8` | Built-in ImageGen result on a flat green key |
| `cutouts/riai_poc_cutout_v001.png` | `28268672233055520fa59e1fbc7e16b90d00ed5528deeefecb94b589d331c688` | 957 x 1643 RGBA; 1,008,181 transparent and 11,006 partial-alpha pixels |
| `cutouts/noa_poc_cutout_v001.png` | `c204086a7ef8c22a649a49523253ef22b0ae33d6146a28cbe5494da8806f8d8f` | 1254 x 1254 RGBA; 953,365 transparent and 7,410 partial-alpha pixels |
| `import/riai_poc_v001.psd` | `c5a2ad63677d8390cae570b589bf8bd0139cc3ef8b44585b535acbc6374a4e75` | RGB 8-bit prototype PSD; one Normal 100% leaf named `riai_poc_full` |
| `import/noa_poc_v001.psd` | `31e115cf7df50bb726345865236cd5357b4cae1fee9d1d958b91119cd0f68d41` | RGB 8-bit prototype PSD; one Normal 100% leaf named `noa_poc_full` |

`scripts/build-live2d-poc-psd.mjs` reads both generated PSDs back and verifies
dimensions, color mode, bit depth, one-leaf structure, names, blend/opacity,
and byte-for-byte RGBA equality with their cutout PNGs. The PSD generator is
prototype-only because Live2D officially guarantees PSD authoring from
Photoshop and CLIP STUDIO PAINT, not from this code path.

## Cubism import smoke test

- Riai: **PASS** in Cubism Editor 5.3.03. The PSD created exactly one visible
  `riai_poc_full` ArtMesh on transparency with no warning/error log and no
  observed color, size, or contour mismatch.
- Noa: **PASS** for import into the saved combined PoC. Cubism shows a distinct
  `noa_poc_full` ArtMesh and the save log records `Verify after save : SUCCESS`.
- Combined model checkpoint: `models/riai_poc_v001.cmo3`, 3,480,114 bytes,
  SHA-256 `099bada1c918b19d2ed13a3b386b1c237258486f598606842f6ffe380922b0d6`.
  The same bytes are preserved under
  `checkpoints/riai_noa_pre_motion_20260812.cmo3` before further rig work.
- Separate one-ArtMesh Riai import: **PASS** from `import/riai_poc_v001.psd`
  in Cubism Editor 5.3.03.
- Riai whole-raster warp creation: **PASS**. Cubism created one 5 x 5 / 2 x 2
  warp named `曲面` (ID `Warp`) as the parent of `riai_poc_full` at
  2026-08-14 08:31:49 JST. Cubism's verified automatic backup is preserved as
  `models/riai_poc_not_production_whole_warp_v001.cmo3`, 1,763,622 bytes,
  SHA-256 `17367496850dfd35ffd488be51d415e9eeff7febea58139b3043ceb05c64d9c0`.
  The preserved file reopened successfully in Cubism at 09:33 JST. This proves
  that the one-ArtMesh model plus whole-raster warp was archived and can be
  loaded again; it does not prove that a breathing keyform was authored.
- UI evidence:
  `evidence/riai_single_warp_parameter_palette_20260814.jpeg`, 111,674 bytes,
  SHA-256 `ed581954faf9903455b5896552d20eab364b02460a728b878a9f130ec016b491`.
  It is evidence only for the visible warp hierarchy and settings, not for a
  breathing keyform or playback.
- `ParamBreath` keyforms, visible Cubism loop playback, Noa's separate warp,
  `.can3`, `.motion3.json`, `.moc3`, and `.model3.json`: **PENDING**. The
  standard `呼吸` row was visible during interactive inspection, but no binding,
  successful three-key assignment, deformation, or loop playback was verified.
  The local browser preview remains a bounded motion-design proof, not Cubism
  or SDK evidence.

`models/riai_poc_not_production_v001.cmo3` and
`models/noa_poc_not_production_v001.cmo3` are byte-identical copies of the
combined checkpoint. Their filenames do **not** prove character separation and
they must not be used as independent Riai and Noa model tracks. Those two files
and the redundant `models/riai_noa_combined_poc_not_production_v001.cmo3` copy
remain recoverable locally but are intentionally excluded from Git history.

The current bounded PSD/CMO3/PNG snapshot is stored as regular Git binary data;
no individual file reaches GitHub's 50 MiB warning threshold. Before repeated
production revisions are committed, adopt Git LFS for PSD, CMO3, CAN3, and MOC3
assets to avoid permanent binary-history growth.

## Generation contract

Both assets were generated with the built-in ImageGen route. Each prompt
required extraction of only the largest primary front view, exact preservation
of visible identity/silhouette/costume, removal of all sheet text and other
panels, neutral lighting, full-character framing, and a uniform `#00ff00`
background with no floor, shadow, reflection, text, watermark, or extra
character. The prompt explicitly prohibited invented hidden anatomy, design
changes, extra ears/tails, alternate hood states, and motifs absent from the
primary reference.

Background removal used the bundled ImageGen helper with border auto-key,
soft matte, thresholds 12/220, and despill. No source attachment or generated
chroma-key file was overwritten.

## Allowed motion scope

Until a human-approved separated PSD exists, these whole-character rasters may
only receive bounded prototype motion:

- independent Riai and Noa translation, scale, and small rotation;
- low-amplitude breathing/sway through a whole-character warp deformer;
- optional central-light reaction using those same bounded transforms;
- no blink, mouth, hair, ear, tail, hand, cloth, or crystal motion claims.

Any export made from these files must retain `POC`, `PROTOTYPE`, or
`NOT_PRODUCTION` in the model name and documentation.

## Motion-design preview

`outputs/live2d-poc/index.html` is a review-only 4-second loop showing the
approved whole-raster motion envelope: low-amplitude vertical translation,
sub-degree rotation, and below-one-percent scale, with Riai and Noa out of
phase. Automated browser sampling confirmed both character transforms change
across the loop. It is prominently labeled `POC · NOT PRODUCTION LIVE2D` and
must never be cited as a Cubism, MOC3, SDK, facial-rig, or production-model
completion result.
