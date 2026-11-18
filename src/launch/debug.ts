import { formatBeijingInput, parseBeijingInput } from "./beijing-input";
import "./debug.css";

interface CountdownDebugOptions {
  mode: "game" | "countdown";
  getDeadline: () => number;
  changeDeadline: (value: number | null) => void;
}

export function mountCountdownDebug(host: HTMLElement, options: CountdownDebugOptions): () => void {
  if (import.meta.env.VITE_WARDROBE_DEBUG !== "true") return () => {};

  const dock = document.createElement("div");
  dock.className = options.mode === "game" ? "launch-debug-inline" : "launch-debug-dock";
  const form = document.createElement("form");
  form.className = "launch-debug-form";
  form.noValidate = true;
  form.innerHTML = `<fieldset><legend>开放时间</legend>
    <label>北京时间<input type="datetime-local" step="1" min="1970-01-01T08:00:00" max="9999-12-31T23:59:59" required></label>
    <div class="launch-debug-actions"><button type="submit">应用时间</button><button type="button" data-launch-action="soon">10 秒后开放</button><button type="button" data-launch-action="reset">恢复正式时间</button></div>
    <p class="launch-debug-status" role="status">预览设置仅在当前标签页生效。</p>
    </fieldset>`;
  const input = form.querySelector("input")!;
  const status = form.querySelector<HTMLElement>(".launch-debug-status")!;
  const refresh = () => { input.value = formatBeijingInput(options.getDeadline()); };
  const apply = (value: number | null) => {
    try {
      options.changeDeadline(value);
      refresh();
      input.removeAttribute("aria-invalid");
      status.textContent = (value === null ? "已恢复正式时间，" : "本标签页已设为 ") +
        formatBeijingInput(options.getDeadline()).replace("T", " ") + "（北京时间）";
    } catch {
      status.textContent = "浏览器未能保存预览时间，请检查此标签页的存储权限。";
    }
  };
  form.onsubmit = event => {
    event.preventDefault();
    const value = parseBeijingInput(input.value);
    if (value === null || !input.validity.valid) {
      input.setAttribute("aria-invalid", "true");
      status.textContent = "请填写 1970 年 1 月 1 日 08:00 至 9999 年底之间的有效北京时间。";
      input.focus({ preventScroll: true });
      return;
    }
    apply(value);
  };
  input.oninput = () => { input.removeAttribute("aria-invalid"); };
  form.querySelector<HTMLButtonElement>('[data-launch-action="soon"]')!.onclick =
    () => apply(Date.now() + 10_000);
  form.querySelector<HTMLButtonElement>('[data-launch-action="reset"]')!.onclick =
    () => apply(null);
  refresh();
  for (const event of ["keydown", "keyup"]) {
    form.addEventListener(event, e => e.stopPropagation());
  }
  host.append(dock);
  if (options.mode === "game") {
    dock.append(form);
    return () => dock.remove();
  }

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "launch-debug-trigger";
  trigger.textContent = "⚙ 调试";
  trigger.setAttribute("aria-controls", "launch-debug-panel");
  trigger.setAttribute("aria-expanded", "false");
  const panel = document.createElement("aside");
  panel.id = "launch-debug-panel";
  panel.className = "launch-debug-panel";
  panel.setAttribute("aria-label", "倒计时调试面板");
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "launch-debug-close";
  closeButton.textContent = "关闭 ×";
  closeButton.setAttribute("aria-label", "关闭倒计时调试面板");
  panel.append(closeButton, form);
  panel.hidden = true;
  dock.append(trigger, panel);
  const close = (returnFocus: boolean) => {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (returnFocus) trigger.focus({ preventScroll: true });
  };
  trigger.onclick = () => {
    if (!panel.hidden) {
      close(true);
      return;
    }
    refresh();
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    closeButton.focus({ preventScroll: true });
  };
  closeButton.onclick = () => close(true);
  const escape = (event: KeyboardEvent) => {
    if (!panel.hidden && event.key === "Escape" && !event.defaultPrevented && !event.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  };
  const outside = (event: PointerEvent) => {
    if (!panel.hidden && event.target instanceof Node && !dock.contains(event.target)) close(false);
  };
  document.addEventListener("keydown", escape, true);
  document.addEventListener("pointerdown", outside, true);
  return () => {
    document.removeEventListener("keydown", escape, true);
    document.removeEventListener("pointerdown", outside, true);
    dock.remove();
  };
}
