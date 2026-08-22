# Live2D session handoff — 2026-08-22

Status: **PAUSED BY USER — WIP CHECKPOINT, NOT A DELIVERY**

## GitHub location

- Repository: `takaki-sakamoto-g1359402/railia`
- Branch: `codex/riai-noa-live2d-poc`
- Browser URL:
  `https://github.com/takaki-sakamoto-g1359402/railia/tree/codex/riai-noa-live2d-poc`

The branch contains all accepted references, workbench inputs, rejected v001
comparison cutouts, alpha review panels, audit logs, and this v002 WIP
checkpoint. The branch must not be represented as a completed Live2D delivery.

## Current production truth

- Riai layered PSD: not started.
- Noa layered PSD: not started.
- Riai `.cmo3` and runtime export: not started.
- Noa `.cmo3` and runtime export: not started.
- Cubism visual QA: not started.
- Production Pack validator: absent and not run.
- Neutral-base v001 cutouts: experimental and rejected as production masters.
- Neutral-base v002: solver under test; Riai diagnostic fails QA.

## Files added or changed in this checkpoint

- `scripts/chroma-key-to-alpha.mjs`
- `tests/chroma-key-to-alpha.test.ts`
- `art/live2d/production-workbench/neutral-bases/cutouts/riai_neutral_base_candidate_v002_diagnostic.png`
- `art/live2d/production-workbench/neutral-bases/README.md`
- `logs/BUILD_LOG.md`
- `logs/SESSION_HANDOFF_2026-08-22.md`

## Test snapshot

Command (bundled runtime):

```sh
PATH=/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/sakamototakaki/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH \
  pnpm exec vitest run tests/chroma-key-to-alpha.test.ts
```

Result: **1 passed, 5 failed**.

The source-alpha rejection case passes. The failures are intentionally retained
as the executable restart specification; do not delete or weaken them merely to
make the suite green.

## First task next session

Fix v002 foreground-colour reconstruction so synthetic partial-alpha ramps and
the real Riai matte recomposite within the existing thresholds. Then make the
matte-border rejection and no-partial-alpha fixture policy explicit, rerun all
six tests, and only after they pass regenerate reviewable Riai and Noa v002
candidates. Do not resume PSD separation or Cubism rigging until the mandatory
Production Pack is present and read in the required order.
