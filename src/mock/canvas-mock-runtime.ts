import type { CharacterRuntimeAdapter } from "../runtime/runtime-adapter";
import type { CharacterSnapshot, WorldSnapshot } from "../state/types";

const LOGICAL_WIDTH = 960;
const LOGICAL_HEIGHT = 540;

interface StagePoint {
  readonly x: number;
  readonly y: number;
}

const STAR_FIELD: readonly StagePoint[] = Array.from({ length: 64 }, (_, index) => ({
  x: (index * 137.5 + 43) % LOGICAL_WIDTH,
  y: (index * 79.3 + 29) % (LOGICAL_HEIGHT * 0.78),
}));

export class CanvasMockRuntime implements CharacterRuntimeAdapter {
  public readonly kind = "mock" as const;
  readonly #context: CanvasRenderingContext2D;
  #latest: WorldSnapshot | null = null;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d", { alpha: false });
    if (context === null) {
      throw new Error("A 2D canvas context is required for the MOCK runtime.");
    }
    this.#context = context;
  }

  public initialize(snapshot: WorldSnapshot): void {
    this.#latest = snapshot;
    this.resize();
  }

  public render(snapshot: WorldSnapshot): void {
    this.#latest = snapshot;
    this.#draw(snapshot);
  }

  public emergencyReset(snapshot: WorldSnapshot): void {
    this.#latest = snapshot;
    this.#draw(snapshot, true);
  }

  public resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (this.#latest !== null) {
      this.#draw(this.#latest);
    }
  }

  public dispose(): void {
    this.#latest = null;
    this.#context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  #draw(snapshot: WorldSnapshot, emergencyFlash = false): void {
    const context = this.#context;
    const scaleX = this.canvas.width / LOGICAL_WIDTH;
    const scaleY = this.canvas.height / LOGICAL_HEIGHT;
    context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    context.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    const background = context.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
    background.addColorStop(0, "#08152d");
    background.addColorStop(0.56, "#101934");
    background.addColorStop(1, "#050814");
    context.fillStyle = background;
    context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    this.#drawStars(snapshot.elapsedMs);
    this.#drawArchitecture();

    const lightActive = Object.values(snapshot.characters).some(
      (character) => character.motion === "reactLight",
    );
    this.#drawCentralLight(snapshot.elapsedMs, lightActive);
    this.#drawCharacter(snapshot.characters.riai, { x: 278, y: 335 }, 1.08);
    this.#drawCharacter(snapshot.characters.noa, { x: 730, y: 378 }, 0.78);

    context.fillStyle = "rgba(255, 196, 102, 0.9)";
    context.font = "800 15px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("MOCK PLACEHOLDERS — NO LIVE2D MODEL LOADED", 480, 30);

    context.fillStyle = "rgba(220, 235, 255, 0.62)";
    context.font = "600 11px system-ui, sans-serif";
    context.fillText(
      `validated high-level state • t=${Math.round(snapshot.elapsedMs)}ms • emergency stops=${snapshot.emergencyStopCount}`,
      480,
      51,
    );

    if (emergencyFlash) {
      context.fillStyle = "rgba(255, 87, 120, 0.12)";
      context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      context.strokeStyle = "rgba(255, 112, 142, 0.85)";
      context.lineWidth = 4;
      context.strokeRect(7, 7, LOGICAL_WIDTH - 14, LOGICAL_HEIGHT - 14);
    }
  }

  #drawStars(elapsedMs: number): void {
    const context = this.#context;
    for (let index = 0; index < STAR_FIELD.length; index += 1) {
      const star = STAR_FIELD[index]!;
      const pulse = 0.35 + 0.45 * Math.sin(elapsedMs / 780 + index * 1.7);
      context.fillStyle = `rgba(175, 216, 255, ${Math.max(0.16, pulse)})`;
      const radius = index % 9 === 0 ? 1.8 : 0.9;
      context.beginPath();
      context.arc(star.x, star.y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  #drawArchitecture(): void {
    const context = this.#context;
    context.strokeStyle = "rgba(92, 137, 190, 0.15)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(480, 390, 390, Math.PI, 0);
    context.stroke();
    context.beginPath();
    context.moveTo(0, 470);
    context.lineTo(LOGICAL_WIDTH, 470);
    context.stroke();
    for (const x of [95, 865]) {
      context.fillStyle = "rgba(21, 40, 71, 0.7)";
      context.fillRect(x - 14, 80, 28, 390);
      context.strokeStyle = "rgba(109, 157, 208, 0.25)";
      context.strokeRect(x - 14, 80, 28, 390);
    }
  }

  #drawCentralLight(elapsedMs: number, active: boolean): void {
    const context = this.#context;
    const pulse = 1 + Math.sin(elapsedMs / 260) * (active ? 0.12 : 0.04);
    const outerRadius = (active ? 105 : 66) * pulse;
    const glow = context.createRadialGradient(480, 310, 2, 480, 310, outerRadius);
    glow.addColorStop(0, active ? "rgba(255,244,195,0.96)" : "rgba(158,210,255,0.8)");
    glow.addColorStop(0.2, active ? "rgba(116,199,255,0.82)" : "rgba(95,165,240,0.45)");
    glow.addColorStop(1, "rgba(41,96,205,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(480, 310, outerRadius, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.translate(480, 310);
    context.rotate(elapsedMs / 4_000);
    context.strokeStyle = active ? "rgba(255,224,145,0.88)" : "rgba(119,190,255,0.55)";
    context.lineWidth = active ? 3 : 2;
    context.beginPath();
    context.moveTo(0, -24);
    context.lineTo(8, -8);
    context.lineTo(25, 0);
    context.lineTo(8, 8);
    context.lineTo(0, 27);
    context.lineTo(-8, 8);
    context.lineTo(-25, 0);
    context.lineTo(-8, -8);
    context.closePath();
    context.stroke();
    context.restore();

    context.fillStyle = active ? "#ffe8a7" : "#8bc8ff";
    context.font = "700 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(active ? "CENTRAL LIGHT: REACTING" : "CENTRAL LIGHT: SAFE IDLE", 480, 390);
  }

  #drawCharacter(
    character: CharacterSnapshot,
    anchor: StagePoint,
    scale: number,
  ): void {
    const context = this.#context;
    const motionTime = character.revision * 0.3;
    const isRiai = character.id === "riai";
    const bob = character.motion === "greet" ? Math.sin(motionTime) * 8 : 0;
    const lean = character.motion === "reactLight" ? (isRiai ? 8 : -8) : 0;
    const bodyLift = (character.idle.breath - 0.5) * 5;
    const sway = character.idle.sway * 3;

    context.save();
    context.translate(anchor.x + lean + sway, anchor.y + bob - bodyLift);
    context.scale(scale, scale);

    this.#drawTail(character);
    this.#drawRobe(character);
    this.#drawHead(character);

    context.fillStyle = isRiai ? "#92d6ff" : "#c0b1ff";
    context.font = "800 17px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(isRiai ? "RIAI / MOCK" : "NOA / MOCK", 0, 104);

    context.fillStyle = "rgba(210, 225, 245, 0.72)";
    context.font = "600 10px ui-monospace, monospace";
    context.fillText(
      `${character.expression} • ${character.motion} • p${character.priority}`,
      0,
      120,
    );
    context.restore();
  }

  #drawTail(character: CharacterSnapshot): void {
    const context = this.#context;
    const isRiai = character.id === "riai";
    const tailMotion =
      character.motion === "tailSway" ? Math.sin(character.revision * 0.8) * 16 : character.idle.sway * 7;
    context.save();
    context.translate(isRiai ? -48 : 48, 40);
    context.rotate((tailMotion * Math.PI) / 180);
    context.strokeStyle = "rgba(225, 238, 255, 0.88)";
    context.lineWidth = isRiai ? 26 : 20;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(
      isRiai ? -58 : 58,
      10,
      isRiai ? -70 : 70,
      -34,
      isRiai ? -42 : 42,
      -58,
    );
    context.stroke();
    context.restore();
  }

  #drawRobe(character: CharacterSnapshot): void {
    const context = this.#context;
    const isRiai = character.id === "riai";
    const width = isRiai ? 122 : 105;
    const height = isRiai ? 162 : 122;
    const robe = context.createLinearGradient(0, -30, 0, height);
    robe.addColorStop(0, "#17254b");
    robe.addColorStop(1, "#080d20");
    context.fillStyle = robe;
    context.strokeStyle = isRiai ? "rgba(95,183,255,0.6)" : "rgba(154,132,255,0.6)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-width * 0.35, -18);
    context.quadraticCurveTo(-width * 0.62, height * 0.3, -width / 2, height);
    context.lineTo(width / 2, height);
    context.quadraticCurveTo(width * 0.62, height * 0.3, width * 0.35, -18);
    context.closePath();
    context.fill();
    context.stroke();

    context.strokeStyle = "rgba(224,181,92,0.55)";
    context.lineWidth = 1.5;
    for (let index = -2; index <= 2; index += 1) {
      context.beginPath();
      context.moveTo(index * 15, 16);
      context.lineTo(index * 21, height - 12);
      context.stroke();
    }

    context.fillStyle = "#74c5ff";
    context.save();
    context.translate(0, 17);
    context.rotate(Math.PI / 4);
    context.fillRect(-6, -6, 12, 12);
    context.restore();
  }

  #drawHead(character: CharacterSnapshot): void {
    const context = this.#context;
    const isRiai = character.id === "riai";
    const headY = isRiai ? -75 : -62;
    const radius = isRiai ? 54 : 48;
    const earTwitch =
      character.motion === "earTwitch" ? Math.sin(character.revision) * 0.22 : 0;

    context.fillStyle = "#dbe8f8";
    for (const side of [-1, 1] as const) {
      context.save();
      context.translate(side * 31, headY - 36);
      context.rotate(side * earTwitch);
      context.beginPath();
      context.moveTo(0, -38);
      context.lineTo(side * 27, 14);
      context.lineTo(side * -10, 12);
      context.closePath();
      context.fill();
      context.restore();
    }

    context.fillStyle = isRiai ? "#e7edf7" : "#eef4fb";
    context.strokeStyle = "rgba(112,168,218,0.7)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, headY, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    const gaze = this.#gazeOffset(character);
    const eyeY = headY - 4;
    const eyeOpen = Math.max(0.08, character.idle.blinkOpen);
    for (const side of [-1, 1] as const) {
      const eyeX = side * 19;
      context.fillStyle = "#f8fbff";
      context.beginPath();
      context.ellipse(eyeX, eyeY, 11, 8 * eyeOpen, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#3b91dc";
      context.beginPath();
      context.ellipse(
        eyeX + gaze.x,
        eyeY + gaze.y,
        4.5,
        6 * eyeOpen,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    this.#drawExpressionMouth(character, headY);
  }

  #drawExpressionMouth(character: CharacterSnapshot, headY: number): void {
    const context = this.#context;
    context.strokeStyle = "#4e3e55";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.beginPath();
    switch (character.expression) {
      case "happy":
        context.arc(0, headY + 20, 10, 0.1, Math.PI - 0.1);
        break;
      case "surprised":
        context.arc(0, headY + 22, 5, 0, Math.PI * 2);
        break;
      case "concerned":
        context.arc(0, headY + 28, 10, Math.PI + 0.2, Math.PI * 2 - 0.2);
        break;
      case "thinking":
      case "curious":
        context.moveTo(-7, headY + 22);
        context.quadraticCurveTo(1, headY + 17, 8, headY + 22);
        break;
      case "neutral":
        context.moveTo(-7, headY + 22);
        context.lineTo(7, headY + 22);
        break;
    }
    context.stroke();
  }

  #gazeOffset(character: CharacterSnapshot): StagePoint {
    switch (character.gazeTarget.kind) {
      case "forward":
        return { x: 0, y: 0 };
      case "point":
        return { x: character.gazeTarget.x * 6, y: -character.gazeTarget.y * 4 };
      case "character":
        return {
          x: character.gazeTarget.target === "noa" ? 5 : -5,
          y: character.id === "riai" ? 2 : -2,
        };
    }
  }
}
