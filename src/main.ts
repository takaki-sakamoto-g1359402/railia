import "./styles.css";

import { CharacterActionApi, type ExecutionResult } from "./actions/character-action-api";
import { CanvasMockRuntime } from "./mock/canvas-mock-runtime";
import type { AuditEntry } from "./logging/audit-logger";
import type { CharacterSnapshot } from "./state/types";

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Required UI element #${id} is missing.`);
  }
  return element as T;
}

const canvas = requiredElement<HTMLCanvasElement>("mock-stage");
const canvasWrap = requiredElement<HTMLDivElement>("canvas-wrap");
const editor = requiredElement<HTMLTextAreaElement>("action-json");
const resultElement = requiredElement<HTMLDivElement>("execution-result");
const riaiState = requiredElement<HTMLPreElement>("riai-state");
const noaState = requiredElement<HTMLPreElement>("noa-state");
const auditList = requiredElement<HTMLOListElement>("audit-log");
const runtime = new CanvasMockRuntime(canvas);
const api = new CharacterActionApi({ runtime });

let requestSequence = 0;
let lastExecution: ExecutionResult | null = null;
let animationFrame = 0;
let previousFrameTime: number | null = null;

function nextRequestId(prefix: string): string {
  requestSequence += 1;
  return `${prefix}-${String(requestSequence).padStart(4, "0")}`;
}

function envelope(actions: readonly object[], prefix: string): string {
  return JSON.stringify(
    {
      version: 1,
      requestId: nextRequestId(prefix),
      actions,
    },
    null,
    2,
  );
}

function summarizeCharacter(character: CharacterSnapshot): string {
  return JSON.stringify(
    {
      mode: character.mode,
      expression: character.expression,
      motion: character.motion,
      gaze: character.gazeTarget,
      active: character.activeAction,
      priority: character.priority,
      interruptible: character.interruptible,
      queued: character.queuedActions,
      idle: {
        blinkOpen: Number(character.idle.blinkOpen.toFixed(2)),
        breath: Number(character.idle.breath.toFixed(2)),
        sequence: character.idle.eventSequence,
      },
    },
    null,
    2,
  );
}

function renderStateEvidence(): void {
  const snapshot = api.snapshot();
  riaiState.textContent = summarizeCharacter(snapshot.characters.riai);
  noaState.textContent = summarizeCharacter(snapshot.characters.noa);
}

function renderAudit(entries: readonly AuditEntry[]): void {
  auditList.replaceChildren();
  const visibleEntries = entries.slice(-12).reverse();
  if (visibleEntries.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "No actions recorded yet.";
    auditList.append(empty);
    return;
  }
  for (const entry of visibleEntries) {
    const item = document.createElement("li");
    item.className = entry.outcome;
    item.textContent = `${entry.id} ${entry.outcome.toUpperCase()} ${entry.code} request=${entry.requestId ?? "n/a"} action=${entry.action ?? "n/a"} character=${entry.character ?? "n/a"}`;
    auditList.append(item);
  }
}

function showResult(result: ExecutionResult): void {
  lastExecution = result;
  resultElement.classList.remove("accepted", "rejected");
  resultElement.classList.add(result.accepted ? "accepted" : "rejected");
  resultElement.textContent = `${result.code}: ${result.message} Dispatched=${result.dispatchedActions}.`;
  renderStateEvidence();
}

function executeEditor(): void {
  showResult(api.executeJson(editor.value));
}

function executePreset(json: string): void {
  editor.value = json;
  executeEditor();
}

function fixedAdvance(milliseconds: number): void {
  if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 60_000) {
    throw new Error("advanceTime accepts 0–60000 milliseconds.");
  }
  const fixedStep = 1_000 / 60;
  const steps = Math.max(1, Math.round(milliseconds / fixedStep));
  const stepSize = milliseconds / steps;
  for (let index = 0; index < steps; index += 1) {
    api.advanceTime(stepSize);
  }
  renderStateEvidence();
}

requiredElement<HTMLButtonElement>("submit-action-btn").addEventListener(
  "click",
  executeEditor,
);

requiredElement<HTMLButtonElement>("preset-light-btn").addEventListener(
  "click",
  () => {
    executePreset(
      envelope(
        [
          { action: "playMotion", character: "riai", motion: "reactLight" },
          { action: "setExpression", character: "noa", expression: "curious" },
        ],
        "light",
      ),
    );
  },
);

requiredElement<HTMLButtonElement>("preset-conversation-btn").addEventListener(
  "click",
  () => {
    executePreset(
      envelope(
        [
          { action: "lookAtCharacter", character: "riai", target: "noa" },
          { action: "lookAtCharacter", character: "noa", target: "riai" },
        ],
        "conversation",
      ),
    );
  },
);

requiredElement<HTMLButtonElement>("preset-invalid-btn").addEventListener(
  "click",
  () => {
    executePreset(
      JSON.stringify(
        {
          version: 1,
          requestId: nextRequestId("blocked"),
          actions: [
            {
              action: "executeJavaScript",
              character: "riai",
              code: "arbitrary code is never accepted",
            },
          ],
        },
        null,
        2,
      ),
    );
  },
);

requiredElement<HTMLButtonElement>("emergency-stop-btn").addEventListener(
  "click",
  () => {
    executePreset(
      envelope([{ action: "emergencyStop" }], "emergency"),
    );
  },
);

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement === null) {
    await canvasWrap.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}

requiredElement<HTMLButtonElement>("fullscreen-btn").addEventListener(
  "click",
  () => void toggleFullscreen(),
);

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isFormControl =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLButtonElement ||
    target instanceof HTMLSelectElement;
  if (!isFormControl && event.key.toLowerCase() === "f") {
    event.preventDefault();
    void toggleFullscreen();
  }
});

document.addEventListener("fullscreenchange", () => runtime.resize());
window.addEventListener("resize", () => runtime.resize());

window.advanceTime = fixedAdvance;
window.render_game_to_text = (): string => {
  const snapshot = api.snapshot();
  return JSON.stringify({
    implementationStatus: "MOCK_NOT_LIVE2D",
    coordinateSystem: "normalized stage: x -1 left to +1 right; y -1 bottom to +1 top",
    world: snapshot,
    lastExecution:
      lastExecution === null
        ? null
        : {
            accepted: lastExecution.accepted,
            code: lastExecution.code,
            requestId: lastExecution.requestId,
            dispatchedActions: lastExecution.dispatchedActions,
          },
    recentAudit: api.logger.entries().slice(-5),
  });
};

function animate(timestamp: number): void {
  if (previousFrameTime === null) {
    previousFrameTime = timestamp;
  }
  const delta = Math.min(100, Math.max(0, timestamp - previousFrameTime));
  previousFrameTime = timestamp;
  api.advanceTime(delta);
  renderStateEvidence();
  animationFrame = window.requestAnimationFrame(animate);
}

editor.value = envelope(
  [{ action: "setExpression", character: "riai", expression: "happy" }],
  "example",
);
api.logger.subscribe(renderAudit);
runtime.render(api.snapshot());
renderStateEvidence();

const manualTime = new URLSearchParams(window.location.search).get("manualTime") === "1";
if (!manualTime) {
  animationFrame = window.requestAnimationFrame(animate);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.cancelAnimationFrame(animationFrame);
    api.dispose();
  });
}

