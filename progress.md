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
