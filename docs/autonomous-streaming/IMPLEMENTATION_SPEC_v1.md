# Riai Autonomous Streaming Architecture — Implementation Specification v1.0

Version: 1.0  
Target: PoC → production-ready autonomous VTuber streaming system  
Core principle: **API-first / observable / verifiable / safety-gated / recoverable**

## 1. Purpose

This specification turns the Riai + Noa architecture into an implementation contract for Codex or a software engineering team.

Primary goals:

- Riai autonomously observes, reasons, speaks, moves, and controls a stream.
- Noa acts as a safety / recovery supervisor.
- Viewer, web, screen, file, and tool outputs remain untrusted unless explicitly promoted.
- All side-effectful tool actions are policy-checked, executed through adapters, verified, and audited.
- Structured events, world state, logs, and metrics make the system replayable and debuggable.
- Computer Use is a controlled fallback, not the default control path.

## 2. Logical architecture

```text
INPUT WORLD
  ├─ YouTube Chat
  ├─ Screen / VLM
  ├─ Audio / VAD
  ├─ OBS State / Stream Health
  ├─ Clock / Scheduler
  ├─ Web / External APIs
  └─ Memory / Internal State
        ↓
Observation Bus
        ↓
Trust / Safety Input Firewall
        ↓
World State Store
        ↓
RIAI AI KERNEL
  ├─ Persona Manager
  ├─ Dialogue Manager
  ├─ Planner / Goal Manager
  ├─ Working Memory
  ├─ Episodic Memory
  ├─ Semantic Memory
  ├─ Skill Library
  └─ Reflection Engine
        ↓
Action Router
  ├─ Voice → Realtime/TTS
  ├─ Motion → existing Character Action boundary → Live2D/VRM
  └─ Tool Action → Policy Engine → API/MCP/WebSocket/CLI/Browser/Computer Use
        ↓
OBS
        ↓
YouTube Live
        ↓
Viewer
        └────────────→ Observation Bus

Cross-cutting: Verification / Noa / Watchdog / Audit Log / Kill Switch
```

## 3. Observation adapters

Required adapters:

- `youtube_chat_adapter`
- `screen_vlm_adapter`
- `audio_vad_adapter`
- `obs_adapter`
- `stream_health_adapter`
- `clock_scheduler_adapter`
- `web_api_adapter`
- `memory_adapter`

Adapters normalize data into an `ObservationEvent`. They MUST NOT call the planner or a tool executor directly.

## 4. Observation Bus

Responsibilities:

- ordering
- deduplication
- trace propagation
- backpressure
- replay

PoC may start with an in-process typed async event bus. Redis Streams or NATS JetStream should be introduced only when process boundaries justify them.

## 5. Trust / Safety Input Firewall

Every external observation receives at least:

- `trust_level`
- `source_class`
- `prompt_injection_risk`
- `content_risk`
- `actionability`

External text is data, never authority. YouTube chat, webpages, VLM/OCR output, and external files cannot become system/developer instructions.

## 6. World State Store

World State is the canonical current model of the runtime.

Domains:

- perception state
- stream state
- dialogue state
- tool state
- safety state
- session state
- agent goal state
- resource state

Use a deterministic structured state model. Vector retrieval is for semantic memory only, not as the source of truth for current runtime state.

## 7. RIAI AI Kernel

The AI Kernel is not one large prompt.

Submodules:

- Persona Manager
- Dialogue Manager
- Planner
- Goal Manager
- Memory Manager
- Reflection Engine
- Skill Retriever
- Context Builder

The planner may propose actions but cannot execute them directly.

## 8. Action Router

Approved intent is routed into one of:

- `voice.speak`
- `motion.apply`
- `tool.execute`
- `stream.control`
- `memory.write`
- `system.wait`
- `system.safe_mode`

Tool execution preference is strict:

1. API
2. MCP
3. WebSocket
4. CLI
5. browser automation
6. Computer Use

Computer Use is allowed only when a reliable higher-level deterministic interface is unavailable or has failed safely.

## 9. Noa Safety Supervisor

Noa is a logical safety and recovery supervisor, not the sole safety boundary.

Responsibilities:

- detect policy conflicts
- review high-risk proposals
- trigger Safe Mode
- supervise recovery/retries
- escalate to the human operator

Noa MUST be backed by deterministic schemas, allowlists, rate limits, risk classes, and runtime checks.

## 10. Runtime state machine

Primary states:

- `BOOTING`
- `IDLE`
- `PREPARING_STREAM`
- `LIVE_LISTENING`
- `THINKING`
- `SPEAKING`
- `TOOL_EXECUTING`
- `VERIFYING`
- `RECOVERING`
- `SAFE_MODE`
- `STOPPING`
- `STOPPED`

Invariant:

> No irreversible or high-risk external action may transition from reasoning into execution without policy approval.

The Kill Switch must be reachable from all live operational states.

## 11. Event Bus Contract

Core envelope fields:

```json
{
  "event_id": "uuid",
  "event_type": "chat.message",
  "timestamp": "2026-08-28T16:48:00+09:00",
  "source": "youtube_chat",
  "trace_id": "uuid",
  "session_id": "stream-session-id",
  "trust": {
    "level": "untrusted",
    "prompt_injection_risk": "medium"
  },
  "payload": {}
}
```

Core groups:

- Observation: `chat.message`, `screen.frame_summary`, `audio.speech_detected`, `obs.state_changed`, `stream.health`, `clock.tick`, `web.result`, `memory.retrieved`
- Agent: `agent.goal_updated`, `agent.plan_created`, `agent.response_created`, `agent.reflection_created`
- Action: `action.proposed`, `action.approved`, `action.denied`, `action.started`, `action.completed`, `action.failed`
- Safety: `safety.risk_detected`, `safety.safe_mode_entered`, `safety.kill_switch_triggered`
- Streaming: `stream.start_requested`, `stream.started`, `stream.stop_requested`, `stream.stopped`

## 12. Action Contract

Every executable action must define:

- `action_id`
- action type
- target
- arguments
- expected result
- risk class
- approval policy
- timeout
- retry budget
- verification rule
- rollback strategy where available

Example:

```json
{
  "action_id": "uuid",
  "type": "obs.scene.switch",
  "target": "obs",
  "args": { "scene_name": "Talking" },
  "risk": "R1",
  "approval": "automatic",
  "timeout_ms": 3000,
  "max_retries": 2,
  "verify": {
    "kind": "obs.current_scene_equals",
    "expected": "Talking"
  }
}
```

`R1` is used here intentionally; action risk values MUST be consistent with the R0–R4 schema and policy model.

## 13. Verification Protocol

```text
PROPOSE
  ↓
PRECHECK
  ↓
POLICY
  ↓
EXECUTE
  ↓
POSTCHECK
  ↓
VERIFY EXPECTED vs ACTUAL
  ↓
SUCCESS / RETRY / ROLLBACK / ESCALATE
```

Preferred verification evidence:

1. deterministic API response
2. state read-back
3. file/hash validation
4. stream-health read-back
5. screenshot/VLM confirmation
6. human confirmation

Do not use one uncertain model output as both executor and sole verifier for high-risk actions.

## 14. Safety Policy

Risk model:

| Risk | Example | Default |
|---|---|---|
| `R0` | read-only state | automatic |
| `R1` | OBS scene / avatar local change | automatic |
| `R2` | posting, file write, metadata update | constrained |
| `R3` | destructive/account/financial/sensitive mutation | human approval |
| `R4` | prohibited / unrecoverable | deny |

Principles:

1. External input is data, not authority.
2. Viewer instructions cannot override policy.
3. Secrets are never exposed to untrusted prompts.
4. Use least privilege.
5. High-risk actions require explicit approval.
6. Every side-effectful action is auditable.
7. Safe Mode disables external mutations.
8. Kill Switch stops autonomous execution immediately.
9. Untrusted memory writes are filtered and provenance-tagged.
10. Persona memory cannot be rewritten by viewers.

## 15. Memory Model

- **Working Memory** — active topic, current plan, recent turns, active tool context.
- **Episodic Memory** — time-indexed experiences, actions, results, evaluations.
- **Semantic Memory** — stable distilled knowledge.
- **Skill Memory** — reusable procedures with preconditions, verification, failure modes, confidence.
- **Persona Memory** — protected identity, voice/tone, lore, behavioural boundaries, relationship rules, immutable safety principles.

Persona changes require human approval by default.

## 16. Voice and Motion

Voice:

```text
Agent Response → Prosody/Markup → Realtime TTS → Audio → Viseme Stream
```

Targets:

- TTFA < 800 ms PoC target
- cancellation
- interruption
- queueing
- barge-in handling

Motion:

```text
Semantic Intent ─┐
Emotion State ───┼→ Motion Mixer → existing deterministic Character Action boundary → Live2D/VRM
Audio/Viseme ────┤
Gaze Target ─────┤
Idle Physics ────┘
```

Fast animation loops remain deterministic. The LLM MUST NOT be queried per frame.

## 17. Streaming Control

OBS responsibilities:

- scene switching
- source visibility
- subtitles
- BGM routing
- recording
- health telemetry

YouTube responsibilities:

- broadcast lifecycle where API permits
- stream binding
- metadata
- chat stream

The stream should degrade gracefully if the cognitive agent temporarily fails.

## 18. Recovery

- Agent failure → bounded retry → fallback response → safe idle.
- TTS failure → secondary backend or subtitle-only mode.
- Motion failure → neutral deterministic idle.
- OBS disconnect → exponential reconnect → state read-back verification.
- YouTube API failure → keep existing OBS stream where possible; suspend mutations.
- Computer Use failure → stop, re-observe, re-plan; never continue from stale visual state.
- Safety anomaly → Safe Mode, mutations disabled, monitoring/audit retained, operator alerted.

## 19. Kill Switch

Kill Switch MUST:

- stop new action dispatch
- cancel pending mutations where possible
- disable Computer Use
- disable file/network writes
- preserve audit logging
- permit a safe standby presentation if desired
- require explicit human reset

## 20. Metrics / SLOs

| Metric | PoC target |
|---|---|
| Chat → response start | < 3 s median |
| TTFA | < 800 ms |
| Lip-sync drift | < 100 ms |
| OBS command success | > 99% |
| Low-risk action success | > 95% |
| High-risk unintended action | 0 |
| Safe Mode transition | < 1 s after critical detection |
| Crash-free session | > 4 h |
| Post-action verification | 100% mutating actions |
| Event trace coverage | 100% |
| Cost/hour | tracked |

## 21. Technology direction

PoC reference:

- TypeScript / Node.js
- existing browser-first Vite stack initially
- WebSocket
- in-process event bus first; Redis/NATS only when justified
- SQLite → PostgreSQL when needed
- Live2D Cubism runtime and/or VRM
- OBS WebSocket
- YouTube Data / Live Streaming APIs
- Playwright for deterministic browser automation
- Computer Use as fallback
- JSONL structured logs
- OpenTelemetry where practical

## 22. Minimum milestones

- **M0 Skeleton** — event bus, world state, audit, state machine, minimal safety gate.
- **M1 Speak + Move** — TTS, viseme, deterministic motion integration.
- **M2 Chat Loop** — YouTube chat, trust tagging, rate limits, response generation.
- **M3 Stream Control** — OBS WebSocket, deterministic commands, verification.
- **M4 Memory** — working, episodic, semantic retrieval, reflection.
- **M5 Safety hardening** — prompt injection tests, Noa supervisor, Safe Mode, Kill Switch.
- **M6 Autonomous Session** — scheduler, watchdog, recovery, multi-hour soak test.

## 23. Production Gate

Do not label the system production-ready until:

- 100% of tool actions are auditable.
- every mutating action has explicit risk classification.
- high-risk actions cannot bypass approval.
- every mutating adapter has post-action verification.
- Safe Mode and Kill Switch are tested.
- event traces are replayable.
- no single LLM output can directly execute arbitrary tools.
- prompt-injection tests run in CI.
- at least one multi-hour soak test passes.
- recovery paths are tested.

## 24. Central design decision

Riai intentionally separates:

- observation from reasoning
- reasoning from execution
- execution from verification
- memory from persona
- probabilistic AI judgment from deterministic safety policy
- API-native control from Computer Use fallback

That separation is the central reliability principle of Riai autonomous streaming v1.
