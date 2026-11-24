import type { Point } from "./core";
import { reservedShortcut } from "./input";
import { playTownRadio, sfx } from "./sound";
import type { TownInteriorKey } from "./town-interior-id";
import { radioTrackName, townKeepsakeInfo, type RadioTrack } from "./town-keepsakes";
import { drawWorkbench, prepareWorkbenchArt } from "./town-workbench-art";
import {
  copperStart, copperTolerance, pressDuration, workbenchSize, workbenchSteps,
  type WorkbenchStep, type WorkbenchTool,
} from "./town-workbench-steps";
import "./town-workbench.css";

interface PointerGesture {
  id: number;
  button: HTMLButtonElement;
  tool: WorkbenchTool;
  offset: Point;
  direction?: number;
}

interface WorkbenchHooks {
  preview: (step: string | undefined, rotation: number) => void;
  collect: (track?: RadioTrack, choice?: string) => void;
}

const clamp = (value: number, max = 1) => Math.max(0, Math.min(max, value));
const around = (angle: number) => ((angle + 180) % 360 + 360) % 360 - 180;
const arrows: Record<string, Point> = {
  ArrowLeft: { x: -12, y: 0 }, ArrowRight: { x: 12, y: 0 },
  ArrowUp: { x: 0, y: -12 }, ArrowDown: { x: 0, y: 12 },
};

export class TownWorkbench {
  private surface = document.createElement("div");
  private workspace = document.createElement("div");
  private keyHelp = document.createElement("small");
  private board = document.createElement("canvas");
  private context = this.board.getContext("2d")!;
  private controls = new Map<string, HTMLButtonElement>();
  private positions = new Map<string, Point>();
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private steps;
  private index = 0;
  private choice?: string;
  private rotation = 0;
  private restingRotation = 0;
  private shift = 0;
  private offCourse = false;
  private gesture?: PointerGesture;
  private holdStart?: number;
  private keyboardHold?: string;
  private waitStart?: number;
  private timer?: ReturnType<typeof setTimeout>;
  private animation = 0;
  private stopAudio?: () => void;
  private closed = false;
  private collected = false;

  constructor(private room: TownInteriorKey, root: HTMLElement, private status: HTMLElement, private hooks: WorkbenchHooks) {
    this.steps = workbenchSteps[room];
    this.surface.className = "town-workbench";
    this.surface.dataset.room = room;
    this.surface.tabIndex = -1;
    this.surface.setAttribute("role", "group");
    this.surface.setAttribute("aria-label", "纪念品工作台");
    this.workspace.className = "town-workbench-surface";
    this.board.width = workbenchSize.width * 2;
    this.board.height = workbenchSize.height * 2;
    this.board.setAttribute("aria-hidden", "true");
    this.context.scale(2, 2);
    this.workspace.append(this.board);
    this.keyHelp.className = "town-workbench-keys";
    this.keyHelp.setAttribute("aria-hidden", "true");
    this.surface.append(this.workspace, this.keyHelp);
    root.append(this.surface);
    this.show(true);
    void prepareWorkbenchArt().then(() => { if (!this.closed) this.paint(); });
  }

  private get step(): WorkbenchStep | undefined { return this.steps[this.index]; }
  private get track(): RadioTrack | undefined {
    return this.choice === "creek" || this.choice === "bells" ? this.choice : undefined;
  }
  private get holdProgress() {
    return this.holdStart === undefined ? 0 : clamp((performance.now() - this.holdStart) / pressDuration);
  }

  private show(focus: boolean) {
    for (const control of this.controls.values()) control.remove();
    this.controls.clear();
    this.positions.clear();
    this.shift = 0;
    this.offCourse = false;
    const step = this.step;
    this.restingRotation = this.rotation = step?.kind === "dial" ? copperStart : 0;
    this.surface.dataset.step = step?.id ?? "ready";
    this.status.textContent = step?.instruction ?? `${townKeepsakeInfo[this.room].name}做好了，可以收下。`;
    this.keyHelp.textContent = step?.kind === "hold" ? "键盘 · 按住空格再松开" :
      step && step.kind !== "wait" ? "键盘 · 方向键与 Enter" : "";
    if (!step) {
      const claim = document.createElement("button");
      claim.className = "map-action town-workbench-claim";
      claim.type = "button";
      claim.textContent = "收下";
      claim.addEventListener("click", () => {
        if (this.closed || this.collected) return;
        this.collected = true;
        this.hooks.collect(this.track, this.choice);
      });
      this.surface.append(claim);
      if (focus) claim.focus({ preventScroll: true });
    } else if (step.kind === "wait") {
      this.waitStart = performance.now();
      if (step.id === "listen" && this.track) {
        this.status.textContent = `第一轨 ${radioTrackName[this.track]}，第二轨 晚安片头。播出灯已亮。`;
        this.stopAudio = playTownRadio(this.track);
      }
      this.timer = setTimeout(() => this.advance(), step.seconds * 1000);
      if (focus) this.surface.focus({ preventScroll: true });
      this.animate();
    } else {
      for (const tool of step.tools) this.addTool(tool, step.kind);
      if (focus) this.controls.values().next().value?.focus({ preventScroll: true });
    }
    this.paint();
  }

  private addTool(tool: WorkbenchTool, kind: WorkbenchStep["kind"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "town-workbench-tool";
    button.dataset.tool = tool.id;
    button.dataset.gesture = kind;
    button.setAttribute("aria-label", tool.label);
    button.setAttribute("aria-describedby", this.status.id);
    button.setAttribute("aria-keyshortcuts", kind === "hold" ? "Space Enter" : "ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space");
    if (kind === "dial" || kind === "crank") button.classList.add("town-workbench-wheel");
    if (kind === "hold") button.classList.add("town-workbench-press");
    button.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0 || this.gesture || this.keyboardHold) return;
      event.preventDefault();
      button.focus({ preventScroll: true });
      const point = this.point(event), at = this.positions.get(tool.id) ?? tool.at;
      this.gesture = {
        id: event.pointerId, button, tool,
        offset: { x: at.x - point.x, y: at.y - point.y },
        direction: this.direction(tool, point),
      };
      button.setPointerCapture(event.pointerId);
      if (kind === "hold") this.beginHold();
    });
    button.addEventListener("pointermove", event => this.movePointer(event));
    button.addEventListener("pointerup", event => {
      if (this.gesture?.id !== event.pointerId) return;
      this.movePointer(event);
      this.releasePointer();
      this.confirm(tool, true);
    });
    for (const type of ["pointercancel", "lostpointercapture"]) {
      button.addEventListener(type, event => {
        if ((event as PointerEvent).pointerId === this.gesture?.id) this.cancelInput();
      });
    }
    button.addEventListener("keydown", event => this.keyDown(event, tool));
    button.addEventListener("keyup", event => {
      if (event.key !== this.keyboardHold) return;
      event.preventDefault();
      this.keyboardHold = undefined;
      this.confirm(tool);
    });
    button.addEventListener("blur", () => { if (this.keyboardHold) this.cancelInput(); });
    button.addEventListener("click", event => {
      // Keyboard and assistive activation can confirm an adjusted position.
      // Pointer gestures are already committed by pointerup.
      if (event.detail === 0 && this.step?.kind !== "hold") this.confirm(tool);
    });
    this.controls.set(tool.id, button);
    this.workspace.append(button);
  }

  private point(event: PointerEvent): Point {
    const bounds = this.workspace.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * workbenchSize.width / bounds.width,
      y: (event.clientY - bounds.top) * workbenchSize.height / bounds.height,
    };
  }

  private direction(tool: WorkbenchTool, point: Point) {
    const x = point.x - tool.at.x, y = point.y - tool.at.y;
    return Math.hypot(x, y) < 9 ? undefined : Math.atan2(y, x) * 180 / Math.PI;
  }

  private movePointer(event: PointerEvent) {
    const drag = this.gesture, step = this.step;
    if (!drag || drag.id !== event.pointerId || !step) return;
    const point = this.point(event);
    if (step.kind === "dial" || step.kind === "crank") {
      const direction = this.direction(drag.tool, point);
      if (direction !== undefined && drag.direction !== undefined) this.turn(around(direction - drag.direction), step.kind);
      drag.direction = direction;
    } else if (step.kind === "place" || step.kind === "slide") {
      this.moveTool(drag.tool, { x: point.x + drag.offset.x, y: point.y + drag.offset.y }, step);
    } else if (step.kind === "hold") {
      const inside = Math.abs(point.x - drag.tool.at.x) <= 54 && Math.abs(point.y - drag.tool.at.y) <= 28;
      if (!inside) this.endHold();
      else if (this.holdStart === undefined) this.beginHold();
    }
    this.paint();
  }

  private moveTool(tool: WorkbenchTool, point: Point, step: Extract<WorkbenchStep, {kind: "place" | "slide"}>) {
    if (step.kind === "place") {
      this.positions.set(tool.id, {
        x: 16 + clamp(point.x - 16, workbenchSize.width - 32),
        y: 12 + clamp(point.y - 12, workbenchSize.height - 24),
      });
      return;
    }
    const dx = step.target.x - tool.at.x, dy = step.target.y - tool.at.y;
    const x = point.x - tool.at.x, y = point.y - tool.at.y, length = Math.hypot(dx, dy);
    this.shift = clamp((dx * x + dy * y) / (length * length));
    this.offCourse = Math.abs(dx * y - dy * x) / length > 26;
    this.positions.set(tool.id, { x: tool.at.x + dx * this.shift, y: tool.at.y + dy * this.shift });
  }

  private turn(amount: number, kind: "dial" | "crank") {
    this.rotation = kind === "dial" ? around(this.rotation + amount) : clamp(this.rotation + amount, 360);
  }

  private keyDown(event: KeyboardEvent, tool: WorkbenchTool) {
    const step = this.step;
    const direction = Object.hasOwn(arrows, event.key) ? arrows[event.key] : undefined;
    const confirm = event.key === " " || event.key === "Enter";
    if (!step || (!direction && !confirm) || reservedShortcut(event) || this.gesture) return;
    event.preventDefault();
    event.stopPropagation();
    if (direction) {
      if (step.kind === "place" || step.kind === "slide") {
        const point = this.positions.get(tool.id) ?? tool.at;
        this.moveTool(tool, { x: point.x + direction.x, y: point.y + direction.y }, step);
      } else if (step.kind === "dial" || step.kind === "crank") {
        const sign = Math.sign(direction.x || direction.y);
        this.turn(sign * (step.kind === "dial" ? 10 : 30), step.kind);
        this.restingRotation = this.rotation;
      }
      this.paint();
    } else if (!event.repeat) {
      if (step.kind === "hold") {
        if (this.keyboardHold === undefined) {
          this.keyboardHold = event.key;
          this.beginHold();
        }
      } else this.confirm(tool);
    }
  }

  private placed(step: Extract<WorkbenchStep, {kind: "place"}>, tool: WorkbenchTool) {
    const at = this.positions.get(tool.id) ?? tool.at;
    return Math.abs(at.x - step.target.x) <= (step.radius ?? 29) && Math.abs(at.y - step.target.y) <= 21;
  }

  private confirm(tool: WorkbenchTool, pointer = false) {
    const step = this.step;
    if (!step || step.kind === "wait" || this.closed || !step.tools.includes(tool)) return;
    const {kind} = step;
    const done = kind === "place" ? this.placed(step, tool)
      : kind === "slide" ? this.shift >= .88 && !this.offCourse
      : kind === "hold" ? this.holdProgress === 1
      : kind === "dial" ? Math.abs(this.rotation) <= copperTolerance : this.rotation >= 359;
    this.endHold();
    if (done) {
      if (kind === "place" && step.tools.length > 1) this.choice = tool.id;
      this.advance();
      return;
    }
    this.restingRotation = this.rotation;
    if (pointer || kind === "hold") {
      this.positions.delete(tool.id);
      this.shift = 0;
    }
    this.paint();
  }

  private advance() {
    if (this.closed) return;
    const focus = this.surface.contains(document.activeElement);
    this.endWait();
    sfx(this.step?.id === "baking" ? "echo-bell" : "flip");
    this.index++;
    this.show(focus);
  }

  private beginHold() {
    this.holdStart = performance.now();
    this.animate();
  }

  private endHold() { this.holdStart = undefined; }

  private endWait() {
    clearTimeout(this.timer);
    this.waitStart = undefined;
    this.stopAudio?.();
    this.stopAudio = undefined;
  }

  private animate() {
    if (this.animation) return;
    const frame = () => {
      this.animation = 0;
      if (this.closed) return;
      this.paint();
      if ((this.waitStart !== undefined && !this.reduced.matches) ||
        (this.holdStart !== undefined && this.holdProgress < 1)) this.animate();
    };
    this.animation = requestAnimationFrame(frame);
  }

  private paint() {
    const step = this.step;
    for (const tool of step && step.kind !== "wait" ? step.tools : []) {
      const at = this.positions.get(tool.id) ?? tool.at, button = this.controls.get(tool.id)!;
      button.style.left = `${at.x / workbenchSize.width * 100}%`;
      button.style.top = `${at.y / workbenchSize.height * 100}%`;
    }
    const motion = step?.kind === "hold" ? this.holdProgress : step?.kind === "crank" ? this.rotation / 360 : this.shift;
    const elapsed = this.waitStart === undefined ? 0 : (performance.now() - this.waitStart) / 1000;
    const aligned = step?.kind === "dial" ? Math.abs(this.rotation) <= copperTolerance
      : step?.kind === "place" && step.tools.some(tool => this.placed(step, tool));
    this.surface.dataset.progress = String(Math.round(motion * 100));
    this.surface.dataset.aligned = String(aligned);
    drawWorkbench(this.context, {
      room: this.room, step, choice: this.choice, positions: this.positions, motion, rotation: this.rotation, elapsed,
      aligned, reduced: this.reduced.matches,
    });
    this.hooks.preview(step?.id, this.rotation);
  }

  private releasePointer() {
    const pointer = this.gesture;
    this.gesture = undefined;
    if (pointer?.button.hasPointerCapture(pointer.id)) pointer.button.releasePointerCapture(pointer.id);
  }

  cancelInput() {
    this.releasePointer();
    this.keyboardHold = undefined;
    this.holdStart = undefined;
    this.positions.clear();
    this.shift = 0;
    this.rotation = this.restingRotation;
    if (!this.closed) this.paint();
  }

  dispose() {
    this.closed = true;
    this.releasePointer();
    this.endHold();
    this.endWait();
    cancelAnimationFrame(this.animation);
  }
}
