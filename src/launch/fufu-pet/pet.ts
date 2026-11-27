import body from "./body.webp?inline";
import head from "./head.webp?inline";
import eyes from "./eyes.webp?inline";
import rig from "./rig.json";
import "./visibility.css";

const bounds = rig.visibleBounds;
const canvasWidth = 600, canvasHeight = 750;

function clampDrag(offset: number, extent: number, viewport: number, allowance: number) {
  const end = viewport - extent, slack = Math.min(extent, viewport) * allowance;
  return Math.max(Math.min(0, end) - slack, Math.min(offset, Math.max(0, end) + slack));
}

export class FufuPet extends HTMLElement {
  private cleanup?: () => void;
  connectedCallback() {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      :host{position:fixed;inset:0;z-index:1000;overflow:clip;pointer-events:none;line-height:1;color:#633d50;font:14px system-ui}
      :host([hidden]){display:none}
      .pet-handle{display:block;position:absolute;left:12px;bottom:12px;width:calc(clamp(128px,18vw,184px) * var(--pet-scale,1) * ${bounds.width / canvasWidth});aspect-ratio:${bounds.width}/${bounds.height};border:0;background:transparent;cursor:grab;touch-action:none;padding:0;pointer-events:auto}.pet-handle:active{cursor:grabbing}
      img,span{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;user-select:none}
      .artwork{left:${-100*bounds.left/bounds.width}%;top:${-100*bounds.top/bounds.height}%;width:${100*canvasWidth/bounds.width}%;height:${100*canvasHeight/bounds.height}%}
      .stance,.breath{transform-origin:50% 96%}.stance{transition:transform 260ms ease-out}
      .breath{animation:fufu-breathe 3.8s ease-in-out infinite alternate}
      @keyframes fufu-breathe{from{transform:rotate(-1.1deg) scale(1.01,.98)}to{transform:rotate(0) scale(1,1)}}
      .face{transform-origin:50% ${rig.neckY * 100}%;transition:transform 125ms ease-out}.pupils{transition:transform 65ms ease-out}
      @media(prefers-reduced-motion:reduce){.stance,.breath,.face,.pupils{animation:none;transition:none;transform:none!important}}
      section{position:fixed;pointer-events:auto;box-sizing:border-box;width:min(180px,100vw);max-height:100dvh;overflow:auto;padding:10px 12px;border-radius:12px;background:#fff4f8;box-shadow:0 2px 10px #72475955}
      label{display:block}label+label{margin-top:6px}output{float:right}input{width:100%;margin:4px 0 0;accent-color:#ba6484}
      .pet-hide{width:100%;margin-top:8px;padding:6px;border:1px solid #d8b6c5;border-radius:8px;background:#fffafc;color:inherit;cursor:pointer}small{display:block;text-align:center;margin-top:4px}
    </style><button class="pet-handle" aria-label="小小芙，点击设置或隐藏，拖动换位置" title="拖动小小芙 · 点击设置或隐藏" aria-expanded="false"><span class="artwork"><span class="stance"><span class="breath"><img class="torso" alt="" src="${body}"><span class="face"><img class="pupils" alt="" src="${eyes}"><img alt="" src="${head}"></span></span></span></span></button>
    <section hidden aria-label="小小芙设置"><label for="size">大小 <output for="size"></output></label><input id="size" type="range" min="50" max="500" step="5" value="100">
    <label for="opacity">透明度</label><input id="opacity" type="range" min="25" max="100" value="100">
    <button class="pet-hide" type="button">隐藏小小芙</button><small>可在页底重新打开</small></section>`;
    const button = root.querySelector<HTMLButtonElement>(".pet-handle")!,
      panel = root.querySelector("section")!,
      size = root.querySelector<HTMLInputElement>("#size")!,
      sizeText = root.querySelector("output")!,
      range = root.querySelector<HTMLInputElement>("#opacity")!,
      stance = root.querySelector<HTMLElement>(".stance")!,
      artwork = root.querySelector<HTMLElement>(".artwork")!,
      face = root.querySelector<HTMLElement>(".face")!,
      pupils = root.querySelector<HTMLElement>(".pupils")!;
    const events = new AbortController(),
      options = { signal: events.signal };
    let left: number | undefined,
      top: number | undefined,
      drag:
        | { id: number; x: number; y: number; left: number; top: number }
        | undefined,
      moved = false;
    const key = "fufu-pet-v1";
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      const placement = saved.placement;
      if (Number.isFinite(placement?.left) && Number.isFinite(placement?.top)) {
        left = placement.left;
        top = placement.top;
      }
      if (Number.isFinite(saved.opacity)) range.value = String(saved.opacity);
      if (Number.isFinite(placement?.size)) size.value = String(placement.size);
      this.hidden = saved.hidden === true;
    } catch {}
    const save = () => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ placement: { left, top, size: size.valueAsNumber }, opacity: Number(range.value), hidden: this.hidden }),
        );
      } catch {}
    };
    const layout = () => {
      if (!this.hidden && left !== undefined && top !== undefined) {
        const rect = button.getBoundingClientRect();
        left = clampDrag(left, rect.width, innerWidth, .3);
        top = clampDrag(top, rect.height, innerHeight, .06);
        Object.assign(button.style, {
          left: left + "px",
          top: top + "px",
          bottom: "auto",
        });
      }
    };
    const placePanel = () => {
      if (panel.hidden) return;
      const rect = button.getBoundingClientRect(), height = panel.offsetHeight;
      const desiredTop = rect.top >= height ? rect.top - height : rect.bottom;
      panel.style.top = Math.max(0, Math.min(desiredTop, innerHeight - height)) + "px";
      panel.style.left = Math.max(0, Math.min(rect.left, innerWidth - panel.offsetWidth)) + "px";
    };
    const resizePet = () => {
      this.style.setProperty("--pet-scale", String(size.valueAsNumber / 100));
      sizeText.value = size.value + "%";
      size.setAttribute("aria-valuetext", sizeText.value);
      layout();
    };
    const opacity = () => {
      button.style.opacity = String(Number(range.value) / 100);
    };
    opacity();
    resizePet();
    size.addEventListener("input", () => { resizePet(); save(); }, options);
    range.addEventListener(
      "input",
      () => {
        opacity();
        save();
      },
      options,
    );
    const show = (open: boolean) => {
      panel.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      if (open) {
        placePanel();
        size.focus();
      }
    };
    root.querySelector<HTMLButtonElement>(".pet-hide")!.addEventListener("click", event => {
      show(false);
      this.hidden = true;
      save();
      if (!event.detail) document.querySelector<HTMLButtonElement>("[data-pet-restore]")?.focus();
    }, options);
    document.addEventListener("click", event => {
      if (!this.hidden || !(event.target instanceof Element) || !event.target.closest("[data-pet-restore]")) return;
      this.hidden = false;
      layout();
      save();
      button.focus({ preventScroll: true });
    }, options);
    button.addEventListener(
      "click",
      (event) => {
        if (!moved || !event.detail) show(panel.hidden);
        moved = false;
      },
      options,
    );
    window.addEventListener(
      "pointerdown",
      (event) => {
        if (!event.composedPath().includes(this)) show(false);
      },
      options,
    );
    root.addEventListener(
      "keydown",
      (event) => {
        if ((event as KeyboardEvent).key === "Escape") {
          show(false);
          button.focus();
        }
        event.stopPropagation();
      },
      options,
    );
    button.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button || !event.isPrimary) return;
        const rect = button.getBoundingClientRect();
        moved = false;
        drag = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          left: rect.left,
          top: rect.top,
        };
        button.setPointerCapture(event.pointerId);
      },
      options,
    );
    button.addEventListener(
      "lostpointercapture",
      () => {
        if (drag && moved) save();
        drag = undefined;
      },
      options,
    );
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    window.addEventListener(
      "pointermove",
      (event) => {
        if (this.hidden) return;
        if (drag && event.pointerId === drag.id) {
          const dx = event.clientX - drag.x,
            dy = event.clientY - drag.y;
          if (moved || Math.hypot(dx, dy) > 4) {
            moved = true;
            show(false);
            left = drag.left + dx;
            top = drag.top + dy;
            layout();
          }
        }
        if (motion.matches) return;
        const rect = artwork.getBoundingClientRect(),
          dx = event.clientX - rect.left - rect.width / 2,
          dy = event.clientY - rect.top - rect.height * rig.eyeY,
          scale = Math.max(75, Math.hypot(dx, dy));
        stance.style.transform = `rotate(${(dx / scale) * 4}deg) scaleY(${1 - (dy / scale) * .013})`;
        face.style.transform = `translate(${(dx / scale) * .45}%,${(dy / scale) * .35}%) rotate(${(dx / scale) * 2.5}deg)`;
        pupils.style.transform = `translate(${(dx / scale) * rig.eyeTravelX * 100}%,${(dy / scale) * rig.eyeTravelY * 100}%)`;
      },
      options,
    );
    window.addEventListener("resize", () => { layout(); placePanel(); }, options);
    this.cleanup = () => events.abort();
  }
  disconnectedCallback() {
    this.cleanup?.();
  }
}
customElements.define("fufu-pet", FufuPet);
