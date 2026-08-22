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

