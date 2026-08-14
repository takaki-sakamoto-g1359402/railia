Original prompt: Execute Phase 1 of the Riai + Noa Live2D project: create exact non-destructive Riai/Noa layer specifications, a minimal safe TypeScript + Vite foundation, and an honestly labeled MOCK vertical slice for validated high-level character actions; stop before real Cubism, SDK, voice, lip-sync, LLM, or Phase 2 work.

# Progress

## 2026-08-09 — Phase 1 start

- Reconfirmed the workspace was empty apart from `outputs/` and `work/`.
- Initialized a new Git repository on `main`.
- Pinned a browser-first TypeScript/Vite toolchain. No Electron, PixiJS, Cubism SDK, or character assets were added.
- Phase 0 source policy remains authoritative: `image-9` for Riai, `image-8` for Noa, and `image-2` for the central-light scene.
- Added the strict JSON action schema, bounded parser/validator, capability policy, replay guard, sliding-window rate limiter, and in-memory audit logger.
- Typecheck passes with the bundled Node 24 runtime. The normal PATH still has no `node`, so setup documentation must include the bundled-runtime fallback.
- Received three additional approved Riai scene references. They are flattened secondary evidence only; `image-9` remains primary and no source image was edited or imported into Cubism.

## 2026-08-09 08:15 JST — Saved checkpoint

- Added the Riai and Noa layer/redraw specifications, proposed Live2D model specification, setup README, and Phase 1 status document.
- Added six more human-approved secondary scene references, bringing the Photos secondary set to nine. All filenames, dimensions, opacity state, SHA-256 values, and bounded evidence roles are registered in `docs/reference-policy.md`; no source file was copied, edited, or imported into Cubism.
- Verified through approved Computer Use that Live2D Cubism Editor 5.3.03 is running as a trial with 42 days remaining. The Editor is an empty project; no model, PSD, texture, or runtime bundle was opened or created.
- Replaced runtime AJV compilation with a Vite-generated standalone validator module so the strict CSP can remain free of `unsafe-eval`. The browser now loads and exposes `render_game_to_text` without the original CSP/AJV exception.
- Added 50 Vitest cases across five files. At this checkpoint, bundled Node 24.14.0 reports: TypeScript typecheck PASS, 50/50 tests PASS, and Vite production build PASS. The build output is 39.49 kB JS / 10.14 kB gzip plus 4.72 kB CSS / 1.81 kB gzip.
- Playwright captured and visually inspected the labeled safe-idle Canvas MOCK. The preset button was not clicked because the skill client's `page.click` timed out waiting for element stability; visible interaction QA remains PENDING.
- Local Git checkpoint is the next required action. This section is the authoritative resume marker if the commit cannot be created.

## Resume here — ordered work queue

1. Make schema-valid sole `emergencyStop` idempotent and higher precedence than replay rejection; duplicate emergency requests must reassert neutral safe idle.
2. Add a transaction boundary for runtime adapter exceptions so state cannot remain partially committed; emit a bounded `RUNTIME_FAILED` result/audit and restore safe idle.
3. Add a cheap request-attempt limiter before parse/policy while preserving an always-available emergency path.
4. Reject obviously oversized strings by code-unit length before `TextEncoder` allocation, then calculate exact UTF-8 bytes only for bounded input.
5. Make visible MOCK motion phase elapsed-time-based rather than revision/advance-call-count-based; zero-time advance must not change state revision.
6. Document and test replay eviction/TTL semantics instead of silently reaccepting a 129th replay.
7. Add regression tests for all six items, rerun typecheck/test/build, then finish Playwright preset/rejection/emergency browser QA and inspect screenshots.
8. Update `docs/phase1-status.md` with final evidence. Stop before real Cubism rigging, SDK, voice, lip-sync, LLM, or Phase 2.

## Known checkpoint limitations

- Passing tests do not clear the independent safety audit findings listed above; Phase 1 is not complete.
- Browser safe-idle render is verified, but preset interaction is not.
- Nine secondary files still exist only at ephemeral Photos `NSItemProvider` paths; durable archive originals remain required.
- No layered PSD, `.cmo3`, `.moc3`, `.model3.json`, texture, motion, expression, or physics asset exists.

## 2026-08-09 08:31 JST — End-of-day checkpoint

- Resumed from commit `e80c0e3` and implemented the six independent safety-audit corrections:
  - sole `emergencyStop` is idempotent and reasserts safe idle even for a duplicate accepted request ID;
  - runtime `render`／`emergencyReset` exceptions fail closed, return `RUNTIME_FAILED`, audit the failure, and restore the controller to neutral safe idle without remembering a failed request;
  - a cheap request-attempt limiter runs before full validation, while an exact-shape bounded emergency candidate retains access to mandatory full validation during a flood;
  - oversized code-unit input is rejected before `TextEncoder` allocation, with the exact UTF-8 limit still checked on bounded input;
  - MOCK greet／tail／ear motion now uses deterministic action progress rather than frame/update-count revision, and zero-time advance is a no-op;
  - replay-window eviction is deterministic, explicitly documented, returned by `ReplayGuard`, and emitted as a `REPLAY_WINDOW_EVICTED` audit event.
- Added regression coverage for those paths. Final local verification at 08:30 JST: TypeScript typecheck PASS, Vitest 5 files / 66 tests PASS, Vite production build PASS. Current JS bundle is 42.26 kB / 10.93 kB gzip.
- Rechecked future Live2D assumptions against official Editor and Web SDK manuals and recorded the links in `docs/phase1-status.md`.
- Browser probe found `#preset-light-btn` visually stable and unobscured. The provided skill client sometimes succeeds but can spend 3.75–4.36 seconds in Playwright's stable check and narrowly exceed its fixed 5-second click timeout. This is tooling-timing flakiness, not observed DOM movement. Complete preset/rejection/emergency screenshots are still deferred.
- Stopped the Vite development server. No Cubism project, PSD, model, or export was created or modified.

## Resume next session — exact first actions

1. Start the Vite server with the bundled Node command in `README.md`.
2. Run the provided develop-web-game Playwright client for central-light, look-at-character, invalid-action rejection, and emergency-stop scenarios. Retry the selector click if its fixed 5-second stable wait flakes; do not weaken CSP or validation to work around the tool.
3. Inspect every generated screenshot with `view_image`, verify `state-*.json`, and require no `errors-*.json` console/page errors.
4. Perform one final read-only diff/security audit of the end-of-day safety patch, then rerun typecheck, all 66+ tests, and build.
5. Update `docs/phase1-status.md` browser rows and acceptance conclusion. If all Phase 1 gates pass, create a final Phase 1 commit and stop before real Cubism rigging／SDK／voice／lip-sync／LLM／Phase 2.

## 2026-08-12 — Phase 1 deterministic-safety hardening

- Isolated every `AuditLogger` subscriber call, including the immediate subscription snapshot. Subscriber exceptions and attempted snapshot mutation can no longer escape `record`, reject an otherwise valid API action, or prevent later healthy listeners from receiving the same immutable snapshot.
- Added one shared microsecond-precision cumulative time canonicalizer and applied it to the world controller, character state machines, and seeded idle behavior. Equivalent fractional partitions such as one `1ms` step versus ten `0.1ms` steps now produce identical world and idle snapshots.
- Added `MOTION_CONTRACT_V1` as the scheduling source of truth for public motion IDs, priority, duration, interruption, and direct future Cubism asset aliases. `action-priority.ts` now consumes it directly; `docs/live2d-model-spec.md` includes the explicit API-to-asset crosswalk and fail-closed gaps.
- Added schema/contract alignment, audit-subscriber, API-transaction, fractional-time, and scheduling-source regression tests. Bundled Node verification: TypeScript typecheck PASS, Vitest 5 files / 72 tests PASS, Vite production build PASS (42.85 kB JS / 11.10 kB gzip).
- Ran the required Playwright client against the central-light preset with deterministic time. `render_game_to_text` reported `MOCK_NOT_LIVE2D`, accepted `light-0002`, canonical `166.666667ms`, active Riai `reactLight`, and active Noa `curious`; no console/page error artifact was emitted. The captured Canvas was visually inspected and remained clearly labeled as a MOCK.

## 2026-08-14 — Real Cubism PoC resumption checkpoint

- Reopened the saved Cubism 5.3.03 checkpoint and visually confirmed the
  combined model lists separate `riai_poc_full` and `noa_poc_full` ArtMeshes.
- Verified its bytes before motion work: 3,480,114 bytes, SHA-256
  `099bada1c918b19d2ed13a3b386b1c237258486f598606842f6ffe380922b0d6`.
  Preserved an identical copy at
  `art/live2d/prototype/checkpoints/riai_noa_pre_motion_20260812.cmo3`.
- Re-imported the Riai PSD through Cubism's “new model from PSD” path and
  visually confirmed a clean single `riai_poc_full` model tab on transparency.
- Independent review rejected a shared two-character warp because it prevents
  per-character control. The target architecture is now two one-ArtMesh CMO3s,
  each with its own whole-body warp and standard `ParamBreath`.
- Added `outputs/live2d-poc/index.html`, a prominently labeled review-only
  4-second motion-design preview. Automated browser samples confirmed Riai and
  Noa both change transform over time and the screenshots were inspected.
- Real Cubism warp/keyforms, saved CMO3 edits, CAN3 playback, and runtime
  exports remain PENDING. The review preview is explicitly NOT LIVE2D and is
  not acceptance evidence for Cubism or the SDK.

Resume from `outputs/session-checkpoint-2026-08-14.md`.

## 2026-08-14 — Cubism whole-raster warp checkpoint

- Created one 5 x 5 / 2 x 2 whole-raster warp as the parent of the separate
  `riai_poc_full` ArtMesh in Cubism Editor 5.3.03. Its current name is `曲面`
  and its ID is `Warp`.
- Cubism's automatic archive passed `Verify after save : SUCCESS` at 08:32:07
  JST. Preserved its 1,763,622 bytes as both
  `checkpoints/riai_single_warp_autobackup_20260814_0832.cmo3` and
  `models/riai_poc_not_production_whole_warp_v001.cmo3`; SHA-256 is
  `17367496850dfd35ffd488be51d415e9eeff7febea58139b3043ceb05c64d9c0`.
- Reopened the preserved warp checkpoint successfully at 09:33 JST. The log
  records document load completion followed by ArtMesh/warp selection updates.
- Preserved a Cubism UI screenshot under `art/live2d/prototype/evidence/`.
  It proves the visible warp hierarchy/settings only; it is not evidence of a
  `ParamBreath` keyform or motion playback.
- Cubism's macOS Accessibility/JTree bridge raised an
  `IllegalComponentStateException` at 09:36 JST while automating object
  selection. This stopped the UI automation path, not the model load/save.
- Cubism exited normally at 09:42 JST. The preserved Riai warp CMO3 remained
  byte-identical to the verified 08:32 backup.
- `ParamBreath` three-key assignment, Riai visible loop playback, Noa's
  separate warp, CAN3, motion3, moc3/model3, and Viewer validation remain
  PENDING. The browser preview is still review-only and is not Live2D proof.

Resume from the Riai warp CMO3 named above; do not repeat PSD import or warp
creation unless its one-ArtMesh/one-warp inventory fails on reopen.
