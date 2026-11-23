import "./interaction-prompt.css";
import type { InteractionCueKind } from "./interaction-cues";
import { placeInteractionPrompt, promptHoverContains, type PromptBox, type PromptPoint } from "./interaction-prompt-layout";

export interface PromptState {
  id: string;
  action: string;
  verb: string;
  kind: InteractionCueKind;
  mode: "keyboard" | "pointer" | "touch";
  inRange: boolean;
  anchor: PromptPoint;
  playerBox: PromptBox;
  objectBox: PromptBox;
  nearbyTargets?: PromptBox[];
}

// Small stepped line drawings keep the icon language close to the game art.
// Text is ordinary DOM text at display resolution, never rasterized with it.
const paths: Record<InteractionCueKind, string> = {
  talk: "M3 3h10v8H8l-3 3v-3H3z M5 6h1m2 0h1m2 0h1",
  pet: "M5 8V5h2v4V3h2v6V5h2v5h2v3l-2 2H6l-3-4V9h2",
  collect: "M3 9h10l-1 5H4z M5 9V6h6v3 M8 1v3M6 3h4",
  read: "M8 4C6 2 3 2 1 3v10c3-1 5-1 7 1 2-2 4-2 7-1V3c-2-1-5-1-7 1v10",
  rest: "M2 6v8 M14 8v6 M2 10h12V7H8v3 M4 7h2v1H4z",
  celebrate: "M3 7h10v7H3z M2 5h12v3H2z M8 5v9 M8 5C2 5 3 0 6 2z M8 5c6 0 5-5 2-3z",
  game: "M4 5h8l2 3v5h-3l-2-2H7l-2 2H2V8z M4 8h3M5.5 6.5v3M10 8h1M12 10h1",
  exit: "M2 2h7v12H2z M7 8h8m-3-3 3 3-3 3",
  mechanism: "M8 1v2m0 10v2M1 8h2m10 0h2M3 3l2 2m6 6 2 2M3 13l2-2m6-6 2-2 M8 4l4 4-4 4-4-4z",
};

export class InteractionPrompt {
  readonly element = document.createElement("button");
  private readonly icon = document.createElement("span");
  private readonly action = document.createElement("span");
  private readonly hint = document.createElement("span");
  private readonly key = document.createElement("kbd");
  private readonly resize: ResizeObserver;
  private readonly canvas: HTMLCanvasElement | null;
  private state: PromptState | null = null;
  private signature = "";
  private position = "";
  private viewport = { w: 0, h: 0 };
  private size = { w: 160, h: 44 };
  private obstacles: PromptBox[] = [];
  private labelBox: PromptBox | null = null;
  private pointerPending = false;
  private pointerTarget: string | null = null;
  private pointerCancelled = false;

  constructor(container: HTMLElement, activate: (id: string) => void) {
    this.canvas = container.querySelector("canvas");
    const button = this.element;
    button.type = "button";
    button.className = "interaction-prompt";
    button.hidden = true;
    this.icon.className = "interaction-prompt-icon";
    this.icon.setAttribute("aria-hidden", "true");
    this.action.className = "interaction-prompt-action";
    this.hint.className = "interaction-prompt-hint";
    this.hint.setAttribute("aria-hidden", "true");
    this.key.textContent = "E";
    this.key.setAttribute("aria-hidden", "true");
    const words = document.createElement("span");
    words.className = "interaction-prompt-words";
    words.append(this.action, this.hint);
    button.append(this.icon, words, this.key);
    button.addEventListener("pointerdown", event => {
      event.stopPropagation();
      if (event.button === 2) {
        event.preventDefault();
        if (this.state && !button.hidden) activate(this.state.id);
      } else if (event.button === 0) {
        this.pointerPending = true;
        this.pointerTarget = this.state?.id ?? null;
        this.pointerCancelled = false;
      }
    });
    button.addEventListener("pointercancel", () => { this.pointerCancelled = true; });
    button.addEventListener("contextmenu", event => event.preventDefault());
    button.addEventListener("click", event => {
      event.stopPropagation();
      // The same DOM button follows different targets. A press begun on A
      // must never activate B if the player/NPC moves before release.
      // Keyboard-generated clicks have detail 0 and use the current target.
      const allowed = event.detail === 0 || !this.pointerPending ||
        (!this.pointerCancelled && this.pointerTarget === this.state?.id);
      this.pointerPending = false;
      this.pointerTarget = null;
      this.pointerCancelled = false;
      if (allowed && this.state && !button.hidden) activate(this.state.id);
    });
    container.append(button);
    const hud = Array.from(container.querySelectorAll<HTMLElement>(
      ".scene-top > *, .time-pill, .bag-toggle, .bed-note-pin",
    ));
    // The observer handles content changes, orientation and responsive layout.
    // Per-frame camera updates only write transforms, without synchronous reads.
    this.resize = new ResizeObserver(entries => {
      for (const entry of entries) {
        const box = entry.borderBoxSize?.[0];
        if (entry.target === container) {
          this.viewport = { w: entry.contentRect.width, h: entry.contentRect.height };
        } else if (entry.target === button && entry.contentRect.width && entry.contentRect.height) {
          this.size = box ? { w: box.inlineSize, h: box.blockSize }
            : { w: entry.contentRect.width + 18, h: entry.contentRect.height + 14 };
        }
      }
      // HUD rectangles only change with layout/content, not camera movement.
      // Observe them here so a narrow phone label avoids the clock, checkpoint
      // and backpack tab without making per-frame layout reads.
      const origin = container.getBoundingClientRect();
      this.obstacles = hud.map(element => element.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0)
        .map(rect => ({ x: rect.x - origin.x, y: rect.y - origin.y, w: rect.width, h: rect.height }));
      this.place();
    });
    this.resize.observe(container);
    this.resize.observe(button);
    hud.forEach(element => this.resize.observe(element));
  }

  update(state: PromptState | null) {
    if (this.pointerPending && state?.id !== this.pointerTarget) this.pointerCancelled = true;
    this.state = state;
    if (!state) {
      const hadFocus = document.activeElement === this.element;
      this.element.hidden = true;
      if (hadFocus) this.canvas?.focus({ preventScroll: true });
      return;
    }
    const signature = [state.id, state.action, state.verb, state.kind, state.mode, state.inRange].join("\u001f");
    if (signature !== this.signature) {
      this.signature = signature;
      this.element.dataset.spotId = state.id;
      this.element.dataset.mode = state.mode;
      this.element.dataset.kind = state.kind;
      this.element.dataset.reachable = String(state.inRange);
      this.action.textContent = state.action;
      const hint = state.mode === "touch"
        ? state.inRange ? "轻触" : "轻触走近"
        : state.mode === "pointer"
          ? state.inRange ? "点击" : "点击走近"
          : state.inRange ? "" : "走近后可互动";
      this.hint.textContent = hint;
      this.hint.hidden = !hint;
      this.key.hidden = state.mode !== "keyboard" || !state.inRange;
      this.element.setAttribute("aria-label", `${state.action}${state.inRange ? "" : "，走近后互动"}`);
      if (state.mode === "keyboard" && state.inRange) this.element.setAttribute("aria-keyshortcuts", "E");
      else this.element.removeAttribute("aria-keyshortcuts");
      this.icon.innerHTML = `<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true"><path d="${paths[state.kind]}"/></svg>`;
    }
    this.element.hidden = false;
    this.place();
  }

  private place() {
    const state = this.state;
    if (!state || !this.viewport.w || !this.viewport.h) return;
    const obstacles = state.nearbyTargets?.length
      ? [...this.obstacles, ...state.nearbyTargets]
      : this.obstacles;
    const next = placeInteractionPrompt(this.viewport, this.size, state.anchor, state.playerBox, state.objectBox,
      obstacles, state.mode === "touch");
    this.labelBox = { x: next.x, y: next.y, ...this.size };
    const key = [next.x, next.y, next.edge, next.tip].join(",");
    if (key === this.position) return;
    this.position = key;
    this.element.style.transform = `translate(${next.x}px, ${next.y}px)`;
    this.element.dataset.edge = next.edge;
    this.element.style.setProperty("--cue-tip", `${next.tip}px`);
  }

  retainsHover(point: PromptPoint) {
    return !!this.state && !this.element.hidden && !!this.labelBox &&
      promptHoverContains(point, this.state.objectBox, this.labelBox);
  }

  destroy() {
    this.resize.disconnect();
    this.element.remove();
  }
}
