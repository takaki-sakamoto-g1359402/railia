# Riai / Noa Live2D production build log

## 2026-08-22 — production goal intake and source preservation

### Requested outcome

Build separate production-ready Riai and Noa Live2D models, verify them visually
in Cubism, pass the supplied Production Pack QA contract, and export complete
runtime bundles.

### Checkpoint preserved

- Git branch: `codex/riai-noa-live2d-poc`
- Pre-production-goal commit: `91ddb98a70fb31523ab61b2e78277763ccc65cb0`
- Existing Riai and Noa flat PoC assets remain unchanged under
  `art/live2d/prototype/`.
- Existing one-ArtMesh CMO3 files remain prototype checkpoints only. They are
  not production rigs and are not acceptable substitutes for the requested
  layered models.

### New approved design references

The four supplied breakdown sheets were copied non-destructively to
`art/live2d/reference/design-breakdowns/`. Their sizes, hashes, and permitted
uses are recorded in that directory's `README.md`.

Decision: treat every breakdown sheet as a design/separation/motion reference
only. Do not crop labels, arrows, white backgrounds, guide marks, or displayed
sample parts into production art. Reconstruct clean transparent layers and
extend hidden artwork for each approved deformation range.

### Required-input audit

Searched the workspace, Git history, current Codex attachment directories,
`Documents`, `Downloads`, `Desktop`, `.codex/attachments`, and nearby archives.
None of the mandatory Production Pack files were present:

- `00_START_HERE.md`
- `specs/PSD_RULES.md`
- `RIAI_LAYER_MANIFEST.csv`
- `NOA_LAYER_MANIFEST.csv`
- `specs/PARAMETER_SPEC.csv`
- `specs/DEFORMER_HIERARCHY.md`
- `specs/PHYSICS_SPEC.csv`
- `specs/EXPRESSION_MATRIX.csv`
- `specs/DRAW_ORDER_MASKS.md`
- `specs/QA_CHECKLIST.md`
- `specs/EXPORT_MANIFEST.md`
- `scripts/validate_delivery.py`

Impact: production PSD reconstruction and Cubism rigging must not begin under an
invented contract. The Production Pack needs to be attached or placed in the
workspace so the mandated read-first order and validator can be followed.

### Cubism state

Cubism 5.3.03 trial remains available. It was safely restarted while diagnosing
macOS/Swing dialog focus. The application is currently at the trial continuation
dialog. No unsaved production model exists, and no production file was modified.

### Verification status

- Production Pack read-first gate: **BLOCKED — files absent**
- Production PSDs: **NOT STARTED**
- Production CMO3 models: **NOT STARTED**
- Cubism visual QA: **NOT STARTED**
- Runtime exports: **NOT STARTED**
- `python scripts/validate_delivery.py .`: **NOT RUN — validator absent**

## 2026-08-22 — Pack-independent neutral-base reconstruction

### Scope decision

The missing Production Pack still prevents naming, canvas, layer-manifest, rig,
and formal QA work. A reversible task that does not invent those contracts was
selected instead: create front-facing flattened neutral-base candidates for
later manual reconstruction and separation.

These candidates are explicitly workbench inputs. They are not accepted as
production artwork, layered PSDs, or evidence of a working Cubism model.

### Identity and reference preservation

- Copied the canonical Riai and Noa identity references non-destructively into
  `art/live2d/reference/canonical/` and recorded source precedence and SHA-256
  values there.
- Used canonical images for identity and the committed breakdown sheets for
  separation/motion guidance only.
- Required two ears and one tail for each character; Riai remains an adult
  white-haired fox woman, and Noa remains the small white fox companion.

### Candidate generation and alpha correction

- Generated a strict front, neutral, full-body Riai reconstruction candidate.
- Generated a strict front, neutral, seated Noa reconstruction candidate.
- The image tool returned RGB files with a baked checkerboard despite explicit
  transparent-PNG requests. Two such results were rejected for production use.
- Targeted edits replaced the checkerboard with an opaque green-screen matte.
  Those files were preserved under
  `art/live2d/production-workbench/neutral-bases/source/`.
- Added `scripts/chroma-key-to-alpha.mjs` to convert the matte to true RGBA,
  remove green spill, clear low-alpha/magenta fringe pixels, remove tiny
  isolated components, preserve the source, and report hashes/statistics.
- Added `scripts/render-alpha-review.mjs` to review each cutout over white,
  mid-grey, and near-black backgrounds.

### Measured output

- Riai RGBA candidate:
  `cutouts/riai_neutral_base_candidate_v001.png`
  - 934 × 1683, visible bounds `(39,57)–(892,1632)`
  - SHA-256
    `0ee02e57e00619d5e610dc0d522ee1beaf82469627cc403c311b2886239e2fb8`
  - 787,959 transparent / 8,863 partial / 775,100 opaque pixels
- Noa RGBA candidate:
  `cutouts/noa_neutral_base_candidate_v001.png`
  - 1154 × 1363, visible bounds `(131,108)–(1082,1128)`
  - SHA-256
    `7e9b1d95f1f84142c2a3912e375b1f99922bed33fcbc1cc04a289da4a7563981`
  - 1,002,958 transparent / 4,714 partial / 565,230 opaque pixels

Visual review on white, grey, and near-black backgrounds found no remaining
obvious green matte or full-canvas alpha contamination. Character identity and
edge quality remain subject to manual review during actual separation.

Independent code and synthetic-alpha review then rejected the v001 extractor
for production use. Its normalized green-dominance estimate is foreground-colour
dependent, it deletes partial magenta pixels and low-alpha wisps, and its
unconditional small-component cleanup could remove detached ornaments. The
clean-looking v001 cutouts are preserved as experimental comparison artifacts,
not accepted transparent masters. Detailed findings are recorded in
`logs/NEUTRAL_BASE_QA.md`; replacement with a linear-RGB trimap/local-foreground
solver is required.

### Remaining gate

Production PSD reconstruction, hidden-overlap extension, Cubism rigging,
physics, expressions, motions, visual QA, runtime export, and the mandated
validator remain pending until the specified Production Pack is available.
The goal is active and has not been declared complete.

## 2026-08-22 — Session stop checkpoint: v002 alpha solver

The user requested that work stop for the day and that all progress be recorded
to GitHub. All active sub-agent work was interrupted before checkpointing. No
Cubism model, production PSD, or runtime export was created or modified in this
session.

### Preserved WIP

- Replaced the rejected v001 chroma-key implementation in
  `scripts/chroma-key-to-alpha.mjs` with an unfinished v002 trimap and
  local-foreground solver.
- Added `tests/chroma-key-to-alpha.test.ts` with six focused regression cases:
  colour/alpha ramps, detached ornaments, source-alpha rejection, unsafe-border
  rejection, overwrite safety, and the v002 output/reporting contract.
- Preserved
  `art/live2d/production-workbench/neutral-bases/cutouts/riai_neutral_base_candidate_v002_diagnostic.png`
  as explicit failed-QA evidence. It is not a production candidate.

### Verification at stop

- `node --check scripts/chroma-key-to-alpha.mjs`: **PASS** using the bundled
  Node.js 24.19.0 runtime.
- `pnpm exec vitest run tests/chroma-key-to-alpha.test.ts`: **FAIL** — 1 passed,
  5 failed.
- Primary failure: the v002 ramp fixture reports recomposition p95/p99
  `0.1479`, above the `0.03`/`0.08` gates.
- Other failures expose an over-strict requirement for a partial-alpha region,
  missing rejection of a nonuniform border, and downstream contract tests
  blocked by those QA failures.
- Real Riai diagnostic: p95 `0.1477`, p99 `0.2015`, 4,419 green-edge
  violations; output SHA-256
  `277e91cbb79e9d8e14ebd437c4eead010629d72dcc29868964d1af3f5d46ff74`.
- The diagnostic retained 34 components rather than silently deleting small
  detached regions. Several are low-confidence background specks, so production
  component policy still requires an explicit, reviewable decision.
- `python scripts/validate_delivery.py .`: **NOT RUN** because the mandatory
  Production Pack validator remains absent.

### Exact restart point

1. Open `scripts/chroma-key-to-alpha.mjs` at `renderOutput` and stop blending
   recovered foreground colour back toward the seed for normal partial-alpha
   pixels; preserve exact recomposition before applying any limited despill.
2. Rerun `tests/chroma-key-to-alpha.test.ts` and fix the border-uniformity and
   valid no-partial-alpha fixture policies without weakening production QA.
3. Regenerate Riai and Noa as new versioned candidates only when the six tests
   and built-in QA pass without `--allow-qa-failure=true`; render white/grey/
   black review panels and inspect them visually.
4. Continue searching for or attach the mandatory Production Pack. Once found,
   follow its requested read order before naming layers, building PSDs, or
   operating Cubism.

Completion remains **NOT CLAIMED**. The active goal is paused by the user, not
completed.
