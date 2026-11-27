import body from "./body.webp?inline";
import head from "./head.webp?inline";
import eyes from "./eyes.webp?inline";
import rig from "./rig.json";

export class FufuPet extends HTMLElement {
  private cleanup?: () => void;
  connectedCallback() {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      :host{position:fixed;left:12px;bottom:12px;z-index:1000;width:min(calc(clamp(64px,9vw,92px) * var(--pet-scale,1)),calc(100vw - 12px),calc(80dvh - 10px));line-height:1;color:#633d50;font:14px system-ui}
      button{display:block;position:relative;width:100%;aspect-ratio:4/5;overflow:clip;border:0;background:transparent;cursor:grab;touch-action:none;padding:0}button:active{cursor:grabbing}
      img,span{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;user-select:none}
      .torso{transform-origin:50% 96%;transform:scale(${rig.bodyScale})}
      .head-frame{left:${(1 - rig.headScale) * 50}%;top:${rig.headTop * 100}%;width:${rig.headScale * 100}%;height:${rig.headScale * 100}%}
      .stance,.breath{transform-origin:50% 96%}.stance{transition:transform 260ms ease-out}
      .breath{animation:fufu-breathe 3.8s ease-in-out infinite alternate}
      @keyframes fufu-breathe{from{transform:rotate(-1.1deg) scale(1.01,.98)}to{transform:rotate(0) scale(1,1)}}
      .face{transform-origin:50% 56%;transition:transform 125ms ease-out}.pupils{transition:transform 65ms ease-out}
      @media(prefers-reduced-motion:reduce){.stance,.breath,.face,.pupils{animation:none;transition:none;transform:none!important}}
      section{position:fixed;box-sizing:border-box;width:min(180px,100vw);max-height:100dvh;overflow:auto;padding:10px 12px;border-radius:12px;background:#fff4f8;box-shadow:0 2px 10px #72475955}
      label{display:block}label+label{margin-top:6px}output{float:right}input{width:100%;margin:4px 0 0;accent-color:#ba6484}
    </style><button aria-label="小小芙，点击调节大小和透明度，拖动换位置" title="拖动小小芙 · 点击调节大小和透明度" aria-expanded="false"><span class="stance"><span class="breath"><img class="torso" alt="" src="${body}"><span class="head-frame"><span class="face"><img alt="" src="${head}"><img class="pupils" alt="" src="${eyes}"></span></span></span></span></button>
    <section hidden aria-label="小小芙设置"><label for="size">大小 <output for="size"></output></label><input id="size" type="range" min="50" max="200" step="5" value="100">
    <label for="opacity">透明度</label><input id="opacity" type="range" min="25" max="100" value="100"></section>`;
    const button = root.querySelector("button")!,
      panel = root.querySelector("section")!,
      size = root.querySelector<HTMLInputElement>("#size")!,
      sizeText = root.querySelector("output")!,
      range = root.querySelector<HTMLInputElement>("#opacity")!,
      stance = root.querySelector<HTMLElement>(".stance")!,
      face = root.querySelector<HTMLElement>(".face")!,
      pupils = face.lastElementChild as HTMLElement;
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
      if (Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        left = saved.left;
        top = saved.top;
      }
      if (Number.isFinite(saved.opacity)) range.value = String(saved.opacity);
      if (Number.isFinite(saved.size)) size.value = String(saved.size);
    } catch {}
    const save = () => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ left, top, opacity: Number(range.value), size: size.valueAsNumber }),
        );
      } catch {}
    };
    const layout = () => {
      if (left !== undefined && top !== undefined) {
        left = Math.max(0, Math.min(left, innerWidth - this.offsetWidth));
        top = Math.max(0, Math.min(top, innerHeight - this.offsetHeight));
        Object.assign(this.style, {
          left: left + "px",
          top: top + "px",
          bottom: "auto",
        });
      }
    };
    const placePanel = () => {
      if (panel.hidden) return;
      const rect = this.getBoundingClientRect(), height = panel.offsetHeight;
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
        const rect = this.getBoundingClientRect();
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
        const rect = this.getBoundingClientRect(),
          dx = event.clientX - rect.left - rect.width / 2,
          dy = event.clientY - rect.top - rect.height * (rig.headTop + rig.headScale * 0.455),
          scale = Math.max(75, Math.hypot(dx, dy));
        stance.style.transform = `rotate(${(dx / scale) * 4}deg) scaleY(${1 - (dy / scale) * .013})`;
        face.style.transform = `translate(${(dx / scale) * .8}%,${(dy / scale) * .75}%) rotate(${(dx / scale) * 2.5}deg)`;
        pupils.style.transform = `translate(${(dx / scale) * 1.15}%,${(dy / scale) * 0.5}%)`;
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
