import { World, scenes, type SceneId } from "../src/world";
import { arriveOnShift, scheduledResident } from "./resident-visits";
import { interactionHitY } from "../src/interaction";
import type { Point } from "../src/core";

// Keep the production app and its real prompt binding, but isolate every save.
const prefix = "fufu-interaction-cues-fixture/";
Object.defineProperty(window, "localStorage", { value: {
  getItem: (key: string) => sessionStorage.getItem(prefix + key),
  setItem: (key: string, value: string) => sessionStorage.setItem(prefix + key, value),
  removeItem: (key: string) => sessionStorage.removeItem(prefix + key),
} });
let world!: World;
const load = World.prototype.load;
World.prototype.load = function (...args) {
  world = this;
  World.prototype.load = load;
  return load.apply(this, args);
};
await import("../src/main");
const q = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
const wait = async (condition: () => boolean, duration = 30000) => {
  const until = performance.now() + duration;
  while (!condition()) {
    if (performance.now() > until) throw new Error("等待互动提示状态超时");
    await new Promise(resolve => setTimeout(resolve, 20));
  }
};
await wait(() => !!world && !q<HTMLButtonElement>(".enter-button").disabled);
const blocked = new Set<string>(), calls: string[] = [];
let recordOnly = true, canvasDowns = 0;
const available = world.available, interact = world.onInteract;
world.available = spot => !blocked.has(spot.id) && available(spot);
world.onInteract = id => { calls.push(id); if (!recordOnly) interact(id); };
world.canvas.addEventListener("pointerdown", () => canvasDowns++);
const prompt = () => q<HTMLButtonElement>(".interaction-prompt");
const spot = (id: string) => {
  const result = world.config.spots.find(s => s.id === id);
  if (!result) throw Error("测试地图中没有物件 " + id);
  return result;
};
const rect = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
};
async function visit(scene: SceneId, id?: string, position?: Point) {
  blocked.clear(); world.clearInput();
  await world.prepareScene(scene);
  const config = scene === "town" ? world.townMap : scenes[scene];
  if (!position && id && scheduledResident(id)) {
    // The bench advances the actual clock even when this fixture records clicks.
    const previous = world.onInteract;
    try {
      world.onInteract = interact;
      await arriveOnShift(world, scene, id);
    } finally { world.onInteract = previous; }
  } else world.switchScene(scene, position ?? (id ? config.spots.find(s => s.id === id)?.approach : config.spawn));
  world.setCueInput("keyboard");
  await frame();
  return snapshot();
}
function snapshot() {
  return {
    scene: world.scene, player: { ...world.player }, activeId: world.activeCueId,
    mode: world.cueInputMode, suspended: world.suspended, paused: world.paused,
    prompt: { hidden: prompt().hidden, id: prompt().dataset.spotId, text: prompt().textContent,
      mode: prompt().dataset.mode, inRange: prompt().dataset.reachable, rect: rect(prompt()) },
    canvas: rect(world.canvas), calls: [...calls], canvasDowns,
  };
}
function pointerPoint(id: string, atFeet = false) {
  const target = spot(id), p = world.project({ x: target.x, y: atFeet ? target.y : interactionHitY(target) });
  const r = world.canvas.getBoundingClientRect();
  return { x: r.left + p.x * r.width / 600, y: r.top + p.y * r.height / 400 };
}
const api = {
  snapshot, visit, pointerPoint,
  resetCalls() { calls.length = 0; canvasDowns = 0; },
  setRecordOnly(value: boolean) { recordOnly = value; },
  async movePlayer(point: Point) { world.clearInput(); world.player = { ...point }; await frame(); },
  async hideSpot(id: string, hidden = true) { hidden ? blocked.add(id) : blocked.delete(id); await frame(); },
  async mode(mode: "keyboard" | "pointer" | "touch") { world.setCueInput(mode); await frame(); },
  async pause(value: boolean) { world.paused = value; await frame(); },
  async suspend(value: boolean) { world.suspend("cue-qa", value); await frame(); },
  async focus(value: boolean) { world.setFocus(value ? world.player : null); await frame(); },
  async clearInput() { world.clearInput(); await frame(); },
};
Object.assign(window, { cueQA: api });
q<HTMLButtonElement>("#verify-cues").disabled = false;
q("#cue-report").textContent = "已就绪";
document.body.dataset.cueReady = "true";

q("#verify-cues").onclick = async () => {
  const button = q<HTMLButtonElement>("#verify-cues"); button.disabled = true;
  q("#cue-results").replaceChildren();
  const check = (ok: unknown, text: string) => {
    if (!ok) throw new Error(text);
    const li = document.createElement("li"); li.textContent = "通过 · " + text; q("#cue-results").append(li);
  };
  try {
    if (!q(".intro-screen").classList.contains("dismissed")) q(".enter-button").click();
    await frame();
    await visit("room", undefined, { x: 121, y: 205 });
    const selected = world.activeCueId;
    calls.length = 0;
    world.canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "e", bubbles: true, cancelable: true }));
    check(calls[0] === selected && prompt().dataset.spotId === selected, "键盘 E 与附近显示的目标一致");
    calls.length = 0;
    prompt().dispatchEvent(new PointerEvent("pointerdown", { button: 0, pointerId: 7, pointerType: "mouse", bubbles: true }));
    await api.hideSpot(selected);
    check(!!world.activeCueId && world.activeCueId !== selected && prompt().dataset.spotId === world.activeCueId, "物件不可用后立即选择邻近可互动目标");
    prompt().dispatchEvent(new MouseEvent("click", { detail: 1, bubbles: true, cancelable: true }));
    check(calls.length === 0, "按下后目标变化不会在抬起时误触新物件");
    prompt().click();
    check(calls[0] === world.activeCueId, "取消过期指针操作后仍可用键盘生成的点击互动");
    const resumed = world.activeCueId;
    await api.pause(true); check(prompt().hidden, "暂停隐藏提示");
    await api.pause(false); check(!prompt().hidden && world.activeCueId === resumed, "解除暂停且人物未移动也会恢复提示");
    await api.suspend(true); check(prompt().hidden, "说明或调试接管时隐藏提示");
    await api.suspend(false); check(!prompt().hidden, "解除接管后恢复提示");
    await api.focus(true); check(prompt().hidden, "特写时隐藏探索提示");
    await api.focus(false); check(!prompt().hidden, "离开特写后恢复提示");
    await visit("garden");
    check(prompt().hidden || world.config.spots.some(s => s.id === world.activeCueId), "切图不会留下前一地图的提示");
    q("#cue-report").textContent = "全部通过";
  } catch (error) { q("#cue-report").textContent = "失败：" + String(error); }
  finally { blocked.clear(); world.paused = false; world.suspend("cue-qa", false); world.setFocus(null); button.disabled = false; }
};
