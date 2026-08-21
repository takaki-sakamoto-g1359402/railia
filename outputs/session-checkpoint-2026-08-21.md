# End-of-day checkpoint — 2026-08-21

## Stop state

Work stopped on the user's instruction. Live2D was not operated after the stop
request. The editor remains open at Cubism's `モデル設定` dialog for the Noa
interaction PSD. `< PSDファイルから新規モデルを作成 >` is selected, but OK
has **not** been activated.

Evidence: `art/live2d/prototype/evidence/noa_import_pending_model_selection_20260821.jpeg`
(31,644 bytes; SHA-256
`4f9202f4fe1188f8c20d994a87781df6fdf0db961ddeab1768dc5a244ccceb28`).

## Completed and verified

| Artifact | Result |
| --- | --- |
| `art/live2d/prototype/interaction/riai_look_noa_smile_poc_v001.png` | 1,244,957 bytes; 956 x 1645 RGBA; SHA-256 `a3507f824a3eb3f5510b686d078613c2ef2b7b7866aaf8cf16cb04b661eee1cc` |
| `art/live2d/prototype/interaction/noa_look_riai_smile_poc_v001.png` | 1,634,753 bytes; 1254 x 1254 RGBA; SHA-256 `92b8de9423a57a872e325a576e7adb3b360874c4008de87e7e543b47e3f091ba` |
| `art/live2d/prototype/import/riai_look_noa_smile_poc_v001.psd` | 3,536,486 bytes; one Normal leaf; RGBA readback PASS; SHA-256 `f33a7d59e921d48b9a53c0acb86b99460611026faf2de4b073bd945b402d763b` |
| `art/live2d/prototype/import/noa_look_riai_smile_poc_v001.psd` | 4,775,993 bytes; one Normal leaf; RGBA readback PASS; SHA-256 `bae75d6e7b6af134306f64c69d475f3f6ebd9f9439b6e7d98a3f2fb2a8ec5553` |
| `art/live2d/prototype/models/riai_look_noa_smile_poc_import_v001.cmo3` | Cubism save PASS at 2026-08-21 21:14:34 JST; 1,701,277 bytes; SHA-256 `5335b53702abdd0068054250c2843fbc6b20f4da1757cc63682bae306b54217d` |

The Riai CMO3 is one flattened ArtMesh with baked viewer-right/down gaze and a
baked closed-mouth smile. The Noa PSD has been parsed by Cubism far enough to
show the new-model selection dialog, but this checkpoint does not claim a Noa
import or save pass.

Final non-GUI validation at 2026-08-21 21:29 JST:

- `pnpm art:build-poc-psd`: PASS using the bundled Node runtime.
- `pnpm art:build-poc-psd:interaction`: PASS; both PSD hashes unchanged.
- `pnpm test`: PASS, 5 files / 72 tests.
- `pnpm build`: PASS; TypeScript and Vite production build.
- `git diff --check`: PASS immediately before staging the local checkpoint.

The normal shell PATH still lacks `node`. Prefix commands with:

```sh
PATH=/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
```

## Exact resume point

1. Confirm that Cubism still shows the Noa `モデル設定` dialog matching the
   evidence image. Select `< PSDファイルから新規モデルを作成 >` if needed,
   activate OK, and wait for the new Noa model tab.
2. Verify exactly one visible `noa_look_riai_smile_poc_full` ArtMesh, then save
   it as `art/live2d/prototype/models/noa_look_riai_smile_poc_import_v001.cmo3`.
3. Reopen and verify both independent CMO3 files before animation work. Do not
   re-import Riai unless its saved CMO3 fails this check.
4. In Animator, place the two independent models so Riai's baked gaze points
   viewer-right/down toward Noa and Noa's baked gaze points viewer-left/up
   toward Riai. Animate only small, independent whole-model position, rotation,
   and scale changes in opposite phase.
5. Save a versioned CAN3, inspect at least three loops, and export start/middle/
   end evidence plus an animated GIF labeled
   `POC · FLATTENED BAKED-POSE · NOT PRODUCTION LIVE2D`.

## Truth boundary

This is a flattened baked-pose PoC. It does **not** implement or prove dynamic
eye direction, smile transition, blink, mouth movement, face angles, hair,
ears, tail, hands, cloth, crystals, physics, `ParamBreath`, `.moc3`,
`.model3.json`, `.motion3.json`, or SDK runtime playback. The valid target
claim after the remaining Animator work is only:

> Cubism Animator displays two independent flat ArtMeshes with baked mutual
> gaze and smiles, moving through subtle whole-model transforms.

## Git / publication state

- Branch at stop: `codex/riai-noa-live2d-poc`.
- Pre-checkpoint HEAD: `a824a67`.
- No Git remote is configured, and the GitHub CLI is unavailable. A local Git
  commit can preserve this checkpoint, but no GitHub push or PR is possible
  until a remote/authentication route is configured.
- The byte-identical PSD staging copies under `models/` remain local and are
  ignored; the canonical PSDs under `import/` are the committed source of
  truth.
