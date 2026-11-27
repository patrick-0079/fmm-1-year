import body from "./body.webp?inline";
import head from "./head.webp?inline";
import eyes from "./eyes.webp?inline";

export class FufuPet extends HTMLElement {
  private cleanup?: () => void;
  connectedCallback() {
    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>:host{position:fixed;left:12px;bottom:12px;z-index:1000;width:clamp(64px,9vw,92px);line-height:1;color:#633d50;font:14px system-ui}button{display:block;position:relative;width:100%;aspect-ratio:4/5;border:0;background:transparent;cursor:grab;touch-action:none;padding:0}button:active{cursor:grabbing}img,span{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;user-select:none}span{transform-origin:50% 54%}label{position:absolute;box-sizing:border-box;width:150px;padding:10px 12px;border-radius:12px;background:#fff4f8;box-shadow:0 2px 10px #72475955}label[hidden]{display:none}input{width:100%;margin:6px 0 0;accent-color:#ba6484}</style><button aria-label="小小芙，点击调节透明度，拖动换位置" title="拖动小小芙 · 点击调节透明度" aria-expanded="false"><img alt="" src="${body}"><span><img alt="" src="${head}"><img alt="" src="${eyes}"></span></button><label hidden>小小芙 · 透明度<input type="range" min="25" max="100" value="100"></label>`;
    const button = root.querySelector("button")!,
      panel = root.querySelector("label")!,
      range = root.querySelector("input")!,
      face = root.querySelector("span")!,
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
    } catch {}
    const save = () => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ left, top, opacity: Number(range.value) }),
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
      const rect = this.getBoundingClientRect();
      panel.style.left = Math.min(0, innerWidth - rect.left - 150) + "px";
      panel.style.bottom = rect.top >= 65 ? "100%" : "auto";
      panel.style.top = rect.top >= 65 ? "auto" : "100%";
    };
    const opacity = () => {
      button.style.opacity = String(Number(range.value) / 100);
    };
    opacity();
    layout();
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
        layout();
        range.focus();
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
        if (motion.matches) {
          face.style.transform = pupils.style.transform = "";
          return;
        }
        const rect = this.getBoundingClientRect(),
          dx = event.clientX - rect.left - rect.width / 2,
          dy = event.clientY - rect.top - rect.height * 0.42,
          scale = Math.max(75, Math.hypot(dx, dy));
        face.style.transform = `translate(${(dx / scale) * 3}%,${(dy / scale) * 2}%) rotate(${(dx / scale) * 5}deg)`;
        pupils.style.transform = `translate(${(dx / scale) * 1.15}%,${(dy / scale) * 0.5}%)`;
      },
      options,
    );
    window.addEventListener("resize", layout, options);
    this.cleanup = () => events.abort();
  }
  disconnectedCallback() {
    this.cleanup?.();
  }
}
customElements.define("fufu-pet", FufuPet);
