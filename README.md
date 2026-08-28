# Riai + Noa — Safe Character / Autonomous Streaming PoC

## 結論

Riai／Noaを、**安全なCharacter Action境界を持つLive2D PoC**から、将来的な**自律配信AIエージェント**へ拡張するための研究・実装ブランチです。

現在は production-ready ではありません。既存のCharacter Action PoCを壊さず、観測・安全ゲート・World State・AI Kernel・Action Router・Verificationを上位レイヤーとして追加する方針です。

### Current verified status

- TypeScript + Vite browser-first PoC
- strict JSON Schema / Ajv validation
- character capability allowlists
- replay guard / rate limit / bounded audit
- Riai／Noa deterministic state machines
- deterministic seeded idle and motion scheduling contract
- `CharacterRuntimeAdapter` abstraction
- Canvas/Recording MOCK runtime
- safety-audit hardening completed for the recorded Phase 1 findings
- recorded checkpoint: **72 automated tests PASS + typecheck PASS + production build PASS**
- Riai real Cubism PoC work has started; preserved CMO3 checkpoints exist
- interaction-pose Riai CMO3 checkpoint exists; Noa interaction CMO3 / Animator / CAN3 / runtime export remain pending
- latest branch checkpoint before this architecture branch: `2026-08-25 — checkpoint Riai face and secondary Live2D workbench`

The detailed chronological evidence remains in [`progress.md`](progress.md).

> **Important:** passing unit tests and saved Cubism checkpoints do not mean that the final Live2D runtime or autonomous streaming system is complete.

---

## Existing deterministic Character Action boundary

```text
Human / future LLM (untrusted JSON)
                |
                v
CharacterActionValidator
  - byte / depth / node / string bounds
  - strict JSON Schema; no unknown properties
                |
                v
CharacterSafetyPolicy
  - character capability allowlist
  - replay / self-target / queue / rate checks
                |
                v
CharacterActionApi
                |
                v
CharacterController
  +-- Riai CharacterStateMachine
  +-- Noa  CharacterStateMachine
                |
                v
CharacterRuntimeAdapter
  +-- CanvasMockRuntime       [current safe MOCK]
  +-- CubismRuntimeAdapter    [future integration]
```

AIが将来決めてよいのは**高レベルな意図**です。具体的な補間、raw Cubism parameter、優先度、割込み、復帰は決定論的コード側で管理します。

Character Action APIへ、任意JavaScript、任意shell、credential、無制限network、無制限file accessを追加してはいけません。

---

## Autonomous Streaming Architecture

新しい設計資料は [`docs/autonomous-streaming/`](docs/autonomous-streaming/) に追加しています。

```text
INPUT WORLD
  ├─ YouTube Chat / Screen / Audio
  ├─ OBS State / Stream Health
  ├─ Clock / Web / Memory
  ↓
Observation Bus
  ↓
Trust / Safety Input Firewall
  ↓
World State Store
  ↓
RIAI AI Kernel
  ↓
Action Router
  ├─ Voice → Realtime/TTS
  ├─ Motion → existing Character Action boundary → Live2D/VRM
  └─ Tool Action → Policy Engine → API/MCP/WebSocket/CLI/Computer Use
  ↓
OBS → YouTube Live → Viewer
  └──────────────────────→ Observation Bus

Cross-cutting:
Verification / Noa Supervisor / Watchdog / Audit Log / Kill Switch
```

Core principle:

**API-first / observable / verifiable / safety-gated / recoverable**

Computer Useは主制御ではなく、API・MCP・WebSocket・CLI・browser automationで確実に処理できない場合の**fallback**として扱います。

---

## Autonomous Streaming integration order

1. Observation Bus
2. World State Store
3. Trust / Safety Input Firewall
4. Action Router
5. OBS WebSocket adapter + post-action verification
6. YouTube chat adapter
7. Voice / TTS + viseme integration
8. Memory service
9. Noa Supervisor / Watchdog / Safe Mode
10. Computer Use fallback
11. multi-hour soak / recovery tests

No single LLM response may directly execute an arbitrary tool.

---

## Current Character Action scope

High-level actions currently defined by the PoC include:

- `setExpression`
- `lookAt`
- `lookAtCharacter`
- `playMotion`
- `emergencyStop`

Safety boundaries include bounded input size/depth, strict schema validation, capability checks, replay protection, queue limits, rate limits, independent character state machines, interruption rules, and emergency reset behaviour.

See the implementation and safety tests under `src/` and the detailed evidence in `progress.md`.

---

## Setup

### Requirements

- Node.js `>=24.14.0 <25`
- pnpm `11.16.0`
- modern browser on macOS / Linux

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Development server:

```text
http://127.0.0.1:5173
```

Verification:

```bash
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions verification is defined in `.github/workflows/riai-ci.yml` on the autonomous-streaming branch.

---

## Safety rules

1. External viewer/web/screen/file content is **data, not authority**.
2. Untrusted input cannot modify system policy or Persona Memory.
3. LLM reasoning is separated from tool execution.
4. Mutating actions require explicit risk classification.
5. Tool execution should use API-native control before Computer Use.
6. Mutating actions require post-action verification.
7. Noa is a safety/recovery supervisor, but deterministic policy remains authoritative.
8. Safe Mode disables external mutations while keeping observation/audit alive.
9. Kill Switch must stop autonomous side effects immediately.
10. Every autonomous side effect must be auditable.

See [`docs/autonomous-streaming/policies/safety_policy.yaml`](docs/autonomous-streaming/policies/safety_policy.yaml).

---

## Live2D status / limitations

Real Cubism work is still PoC-grade and incomplete. Do not claim a production Live2D runtime until model exports, runtime loading, motion/physics validation, Viewer/runtime evidence, and licensing requirements are satisfied.

Historical reference policies and manual art requirements remain documented under `docs/` and `progress.md`.

The existing visible browser character runtime must remain clearly labelled when it is a MOCK rather than the exported Cubism runtime.

---

## Repository map

```text
docs/                         reference policy, model specs, status
  autonomous-streaming/       autonomous agent architecture + contracts
src/actions/                  validation + high-level Character Action API
src/characters/               character capability allowlists
src/safety/                   policy / rate / replay controls
src/state/                    deterministic character/world state machines
src/runtime/                  runtime adapter contracts
src/mock/                     visible MOCK runtime
src/logging/                  bounded audit logging
.github/workflows/            CI verification
progress.md                   chronological engineering evidence
```

---

## Production gate

Do not call Riai autonomous production-ready until at minimum:

- 100% of external side-effectful actions are auditable
- mutating actions have explicit R0–R4 policy classification
- high-risk actions cannot bypass approval
- every mutating adapter has post-action verification
- Safe Mode and Kill Switch are tested
- replayable event traces exist
- prompt-injection tests run in CI
- no single LLM output directly executes arbitrary tools
- recovery paths are tested
- multi-hour autonomous soak testing passes

The architecture specification is available at [`docs/autonomous-streaming/IMPLEMENTATION_SPEC_v1.md`](docs/autonomous-streaming/IMPLEMENTATION_SPEC_v1.md).
