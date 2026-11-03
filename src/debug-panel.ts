import type { World, SceneId } from "./world";
import type { Inventory } from "./inventory";
import type { Nature } from "./nature";
import type { FlowerTrail } from "./flower-trail";
import { rainbowFlowers } from "./rainbow-flowers";
import { ARCADES } from "./town-data";
import { phaseNames, type Phase } from "./day";
import { reservedShortcut } from "./input";

const maps = {
  room: "晚安小屋",
  garden: "周年花园",
  challenge: "勇气花园",
  town: "周年小镇",
  meadow: "夜间花海",
} as const;
const button = (cmd: string, label: string) =>
  `<button type="button" data-debug="${cmd}">${label}</button>`;
type Travel = (
  scene: SceneId,
  id?: string,
  mode?: "open" | "near" | "trap",
) => Promise<boolean>;
/** All preview switches are ephemeral. The HUD is omitted from release builds with debug disabled. */
export function mountDebugPanel(
  world: World,
  bag: Inventory,
  nature: Nature,
  flowers: FlowerTrail,
  go: Travel,
  toast: (s: string) => void,
) {
  const book = document.querySelector<HTMLElement>(".flower-book")!;
  if (import.meta.env.VITE_WARDROBE_DEBUG !== "true") {
    book.remove();
    return;
  }
  const holder = document.createElement("div");
  holder.className = "debug-dock";
  holder.innerHTML = `<button type="button" class="debug-trigger" aria-controls="game-debug-panel" aria-expanded="false">⚙ 调试</button>
    <aside id="game-debug-panel" class="debug-panel" aria-label="游戏调试面板" hidden>
      <header><div><small>FUFU / PLAYTEST</small><h3>游戏调试台</h3></div><button type="button" class="debug-close" aria-label="关闭调试面板">关闭 ×</button></header>
      <p class="debug-note">试穿、花门和时段只在本次页面生效；亲手收集与通关仍会正常保存。</p>
      <section><h4>查看与试穿</h4><div>${button("wardrobe", "全饰品试穿")}${button("collision", "碰撞轮廓")}</div></section>
      <section><h4>时段预览</h4><div>${button("time:auto", "自然时间")}${(Object.entries(phaseNames) as [Phase, string][]).map(([id, name]) => button("time:" + id, name)).join("")}</div></section>
      <details open><summary>地图定位</summary><div>${Object.entries(maps)
        .map(([id, name]) => button("map:" + id, name))
        .join("")}</div></details>
      <details class="debug-flowers"><summary>七色花与花海</summary><div>${button("flower-door", "临时开放花门")}</div><p>点花名到达花旁，是否采下由你决定。</p><div>${rainbowFlowers.map((f, i) => button("flower:" + i, f.name)).join("")}</div></details>
      <details><summary>小镇游乐摊</summary><div>${Object.entries(ARCADES)
        .map(([id, g]) => button("game:" + id, g.title))
        .join("")}</div></details>
      <details><summary>庆典互动与复活</summary><div>${[
        ["room:white-bass", "窗边贝斯"],
        ["room:cake", "周年蛋糕"],
        ["room:gifts", "拆礼物"],
        ["garden:balloons", "放气球"],
        ["garden:fireworks", "烟花"],
        ["garden:danmaku", "花园放映"],
        ["room:letters", "晚安信箱"],
        ["room:bed", "小屋的床"],
      ]
        .map(([id, name]) => button("event:" + id, name))
        .join("")}${button("trap", "体验陷阱与复活")}</div></details>
    </aside>`;
  document.querySelector("#app")!.append(holder);
  const panel = holder.querySelector<HTMLElement>(".debug-panel")!,
    trigger = holder.querySelector<HTMLButtonElement>(".debug-trigger")!;
  holder.querySelector(".debug-flowers")!.append(book);
  book.hidden = false;
  let travelling = false;
  const refresh = () => {
    const flags: Record<string, boolean> = {
      wardrobe: bag.fitting,
      collision: world.collisionOverlay,
      "flower-door": flowers.previewOpen,
    };
    holder.querySelectorAll<HTMLButtonElement>("[data-debug]").forEach((b) => {
      const cmd = b.dataset.debug!;
      if (cmd in flags || cmd.startsWith("time:"))
        b.setAttribute(
          "aria-pressed",
          String(
            flags[cmd] ?? cmd === "time:" + (nature.timePreview ?? "auto"),
          ),
        );
      if (cmd === "map:meadow") {
        b.disabled = !world.canEnter("meadow");
        b.title = b.disabled ? "先集齐七花或临时开放花门" : "";
      }
    });
  };
  const close = (focus = false) => {
    if (panel.hidden) return;
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    world.suspend("debug", false);
    if (focus) trigger.focus({ preventScroll: true });
  };
  trigger.onclick = () => {
    if (!panel.hidden) {
      close(true);
      return;
    }
    bag.close(false);
    world.suspend("debug", true);
    panel.hidden = false;
    refresh();
    trigger.setAttribute("aria-expanded", "true");
    holder
      .querySelector<HTMLButtonElement>(".debug-close")!
      .focus({ preventScroll: true });
  };
  holder.querySelector<HTMLButtonElement>(".debug-close")!.onclick = () =>
    close(true);
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!holder.contains(e.target as Node)) close();
    },
    { capture: true },
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (!panel.hidden && e.key === "Escape" && !reservedShortcut(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        close(true);
      }
    },
    { capture: true },
  );
  const travel = async (
    scene: SceneId,
    id?: string,
    mode?: "open" | "near" | "trap",
  ) => {
    if (travelling) return;
    travelling = true;
    close();
    try {
      if (!(await go(scene, id, mode))) toast("请等地图准备好，再试一次。");
    } catch {
      toast("这处场景还没载入，请稍后再试。");
    } finally {
      travelling = false;
    }
  };
  panel.addEventListener("click", (e) => {
    const cmd = (e.target as Element).closest<HTMLButtonElement>("[data-debug]")
      ?.dataset.debug;
    if (!cmd) return;
    const [type, key, id] = cmd.split(":");
    if (type === "wardrobe") bag.setFitting(!bag.fitting);
    else if (type === "collision")
      world.showCollisionOverlay(!world.collisionOverlay);
    else if (type === "time")
      nature.setPreviewPhase(key === "auto" ? null : (key as Phase));
    else if (type === "flower-door") {
      flowers.setPreviewOpen(!flowers.previewOpen);
      if (world.scene === "meadow" && !world.canEnter("meadow"))
        void travel("garden");
    } else if (type === "flower") {
      const f = rainbowFlowers[Number(key)];
      void travel(f.scene, f.id, "near");
    } else if (type === "map") void travel(key as SceneId);
    else if (type === "game") void travel("town", "arcade-" + key, "open");
    else if (type === "event") void travel(key as SceneId, id, "open");
    else if (type === "trap") void travel("challenge", undefined, "trap");
    refresh();
  });
}
