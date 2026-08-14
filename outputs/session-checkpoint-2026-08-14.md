# Riai + Noa Live2D PoC checkpoint — 2026-08-14

## Conclusion

The original references, generated transparent cutouts, import PSDs, and the
saved two-ArtMesh Cubism checkpoint are preserved. Cubism successfully created
and verified an archive containing the separate Riai model plus one whole-body
warp. Breathing keyforms, Noa's separate warp, visible Cubism playback, a saved
Animator scene, and runtime exports are not complete and must not be claimed.

## Verified today

- Cubism Editor 5.3.03 opened the combined checkpoint successfully.
- The combined model visibly contains independently listed `riai_poc_full`
  and `noa_poc_full` ArtMeshes.
- Pre-motion bytes were copied without modification to
  `art/live2d/prototype/checkpoints/riai_noa_pre_motion_20260812.cmo3`.
- A clean Riai PSD import initially created a separate one-ArtMesh model tab.
  Cubism then preserved that model after whole-raster warp creation through its
  verified automatic backup.
- Cubism created a 5 x 5 / 2 x 2 whole-raster warp named `曲面` (ID `Warp`) as
  the parent of `riai_poc_full`. The 08:32 automatic backup completed with
  `Verify after save : SUCCESS`, and its bytes were preserved under both the
  checkpoint and models directories.
- The preserved Riai warp checkpoint reopened successfully at 09:33 JST. The
  Cubism log records document load start/end and subsequent ArtMesh/warp
  selection updates.
- `outputs/live2d-poc/index.html` renders a 4-second out-of-phase whole-raster
  motion preview. Automated samples at three times showed changing transform
  matrices for both characters, and the screenshots were visually inspected.
- The preview states `POC · NOT PRODUCTION LIVE2D` on screen.

## Exact saved Cubism checkpoint

- Path: `art/live2d/prototype/models/riai_poc_v001.cmo3`
- Size: 3,480,114 bytes
- SHA-256: `099bada1c918b19d2ed13a3b386b1c237258486f598606842f6ffe380922b0d6`
- Cubism log: 2026-08-12 08:49:03 JST `Verify after save : SUCCESS`

## Exact saved Riai warp checkpoint

- Model copy: `art/live2d/prototype/models/riai_poc_not_production_whole_warp_v001.cmo3`
- Immutable work checkpoint: `art/live2d/prototype/checkpoints/riai_single_warp_autobackup_20260814_0832.cmo3`
- Size: 1,763,622 bytes
- SHA-256: `17367496850dfd35ffd488be51d415e9eeff7febea58139b3043ceb05c64d9c0`
- Cubism log: 2026-08-14 08:32:07 JST `Verify after save : SUCCESS`
- Cubism reload: 2026-08-14 09:33:28–09:33:32 JST, load completed
- Scope: one Riai ArtMesh plus one whole-raster warp named `曲面` (ID `Warp`),
  with 5 x 5 transform divisions and 2 x 2 Bezier divisions. `ParamBreath`
  binding/keyforms, visible deformation, and motion playback are not present as
  verified evidence.
- UI evidence:
  `art/live2d/prototype/evidence/riai_single_warp_parameter_palette_20260814.jpeg`
  (111,674 bytes; SHA-256
  `ed581954faf9903455b5896552d20eab364b02460a728b878a9f130ec016b491`)
- The Library backup, immutable work checkpoint, and model copy are
  byte-identical with SHA-256
  `17367496850dfd35ffd488be51d415e9eeff7febea58139b3043ceb05c64d9c0`.

## Resume here

1. Open
   `art/live2d/prototype/models/riai_poc_not_production_whole_warp_v001.cmo3`.
   Its one-ArtMesh/one-warp reload was already verified; reconfirm only if the
   file hash differs from the value above.
2. Optionally rename `曲面` to `D_Riai_POC_Whole`, then select that warp and
   standard `呼吸` / `ParamBreath`; add three keys at
   0 / 0.5 / 1 and keep deformation within the review-preview envelope.
3. Save to a new versioned `POC_NOT_PRODUCTION` CMO3 and verify the save log.
4. Import `noa_poc_v001.psd` as a new one-ArtMesh model, create a separate
   whole-body warp, bind its own standard `ParamBreath`, and save separately.
5. Create a 30 fps, 4-second Animator scene using both separate models; Riai
   keys 0/1/0 at 0/2/4 seconds, Noa keys 0.5/1/0/0.5 at 0/1/3/4 seconds.
6. Replay at least three seamless loops, then save CAN3 and export runtime
   bundles only if Cubism produces them without warnings.

## Stop conditions and honest boundary

- Do not use one shared warp for both characters.
- Do not overwrite the pre-motion checkpoint or immutable references.
- Do not claim blink, mouth, ear, tail, hair, hand, cloth, crystal, or facial
  motion from these one-raster sources.
- Do not call the browser preview Live2D. Cubism completion requires saved
  CMO3 keyforms plus visible playback; runtime completion additionally requires
  valid model3/moc3/texture/motion3 files and Viewer verification.
- A macOS Accessibility/JTree `IllegalComponentStateException` occurred at
  09:36:40 JST while automating selection. It is an Editor UI-automation
  blocker, not evidence of a model load/save failure. Cubism later exited
  normally at 09:42:13 JST; the preserved model hash remained unchanged.

## End-of-day Git state

- The local repository is on `main` at pre-closeout commit `69a1f15` before the
  final checkpoint commit.
- No Git remote is configured and `gh` is not installed in the active PATH.
  Local validation and commit can be completed, but GitHub push/PR must wait for
  an explicit repository remote plus an authenticated GitHub CLI session.
- Three local CMO3 copies with misleading single-character/redundant names are
  excluded through exact `.gitignore` paths. Their bytes remain locally
  recoverable; the canonical combined checkpoint and pre-motion checkpoint are
  included in the intended commit.
- Current binary assets are committed as regular Git binary data because the
  largest file is 3,866,615 bytes. Reassess Git LFS before iterative production
  PSD/CMO3/CAN3/MOC3 revisions.

## Final local verification

- Prototype PSD build/read-back and byte equality: PASS
- TypeScript typecheck: PASS
- Vitest: 5 files / 72 tests PASS
- Vite production build: PASS; JavaScript 42.85 kB / 11.10 kB gzip
- `git diff --check`: PASS
