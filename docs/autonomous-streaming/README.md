# Riai Autonomous Streaming Architecture

Status: **PoC architecture / implementation contract**

This directory extends the existing Riai + Noa safe Character Action PoC into an autonomous streaming runtime while preserving the existing safety boundary.

## Core principle

`API-first / observable / verifiable / safety-gated / recoverable`

```text
INPUT WORLD
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
  ├─ Motion → existing Character Action / Live2D runtime
  └─ Tool Action → Policy Engine → API/MCP/WebSocket/CLI/Computer Use
  ↓
OBS → YouTube Live → Viewer
  └──────────────────────→ Observation Bus

Cross-cutting: Verification / Noa / Watchdog / Audit Log / Kill Switch
```

## Integration with the existing PoC

The existing Character Action stack remains the deterministic motion execution boundary:

```text
RIAI AI Kernel
  ↓
Action Router
  ↓
CharacterActionValidator
  ↓
CharacterSafetyPolicy
  ↓
CharacterActionApi
  ↓
CharacterController
  ↓
Riai / Noa CharacterStateMachine
  ↓
CharacterRuntimeAdapter
```

The LLM proposes intent. It does **not** directly manipulate raw Cubism parameters, arbitrary JavaScript, shell commands, credentials, files, or unrestricted network resources.

## Files

- `IMPLEMENTATION_SPEC_v1.md` — architecture and implementation contract
- `schemas/` — machine-readable contracts for events, actions, world state, and memory
- `policies/safety_policy.yaml` — deterministic baseline policy
- `diagrams/state_machine.mmd` — runtime state machine
- `diagrams/tool_action_sequence.mmd` — propose → policy → execute → verify sequence

## Next implementation slice

1. Observation Bus
2. World State Store
3. Trust / Safety Input Firewall
4. Action Router
5. OBS adapter + post-action verification
6. YouTube chat adapter
7. Voice / TTS integration
8. Memory service
9. Noa supervisor + watchdog
10. Computer Use fallback only after API-native paths are stable

## Safety invariant

No external mutating action may bypass:

`Action Router → Policy Engine → Executor → Verification → Audit`

No untrusted viewer/web/screen content may bypass the Trust / Safety Input Firewall.
