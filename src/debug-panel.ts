import type { World, SceneId } from "./world";
import type { Inventory } from "./inventory";
import type { Nature } from "./nature";
import type { FlowerTrail } from "./flower-trail";
import { rainbowFlowers } from "./rainbow-flowers";
import { ARCADES } from "./town-data";
import { townInteriors } from "./town-interiors";
import { phaseNames, type Phase } from "./day";
import { reservedShortcut } from "./input";
import { getDeadline, setDebugDeadline } from "./launch/time";
import { allLetters } from "./letters";

import { attachDownloadMonitor, pinDebugDock } from "./network-debug";
import { debugIsOpen, rememberDebugOpen } from "./launch/debug-open";

const maps = {
  room: "晚安小屋",
  garden: "周年花园",
  challenge: "勇气花园",
  town: "周年小镇",
  meadow: "夜间花海",
  ruins: "回声遗迹",
} as const;
const button = (cmd: string, label: string) =>
  `<button type="button" data-debug="${cmd}">${label}</button>`;
type Travel = (
  scene: SceneId,
  id?: string,
  mode?: "open" | "near" | "trap",
) => Promise<boolean>;
/** The launch preview persists for this tab. Game preview switches are ephemeral. */
export function mountDebugPanel(
  world: World,
  bag: Inventory,
  nature: Nature,
  flowers: FlowerTrail,
  go: Travel,
  toast: (s: string) => void,
  eraseProgress: () => Promise<boolean>,
  mailbox: { received: () => Set<string>; receive: (id?: string) => void; restoreReadingFocus: () => boolean },
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
      <div class="debug-launch-time"></div>
      <section><h4>查看与试穿</h4><div>${button("wardrobe", "全饰品试穿")}${button("collision", "碰撞轮廓")}${button("layers", "图层显示")}</div></section>
      <details class="debug-mail"><summary>快捷收信</summary>
        <p>领取的信会保存到本机，拆封后才会标为已读。</p>
        <label for="debug-mail-choice">待领取的来信</label>
        <select id="debug-mail-choice"></select>
        <div>${button("mail-one", "领取所选来信")}${button("mail-all", "一键收齐来信")}</div>
        <p class="debug-mail-count" role="status"></p>
      </details>
      <section><h4>时段预览</h4><div>${button("time:auto", "自然时间")}${(Object.entries(phaseNames) as [Phase, string][]).map(([id, name]) => button("time:" + id, name)).join("")}</div></section>
      <details open><summary>地图定位</summary>
        <div>${Object.entries(maps).map(([id, name]) => button("map:" + id, name)).join("")}</div>
        <p id="debug-indoor-maps">小镇室内</p>
        <div role="group" aria-labelledby="debug-indoor-maps">${Object.entries(townInteriors)
          .map(([id, { scene }]) => button("map:" + id, scene.title))
          .join("")}</div>
      </details>
      <details class="debug-flowers"><summary>七色花与花海</summary><div>${button("flower-door", "临时开放花门")}</div><p>点花名到达花旁，是否采下由你决定。</p><div>${rainbowFlowers.map((f, i) => button("flower:" + i, f.name)).join("")}</div></details>
      <details><summary>小镇与遗迹小游戏</summary><div>${Object.entries(ARCADES)
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
        ["ruins:echo-altar", "回声祭坛"],
      ]
        .map(([id, name]) => button("event:" + id, name))
        .join("")}${button("trap", "体验陷阱与复活")}</div></details>
      <details class="debug-storage"><summary>本机存档</summary>
        ${button("erase", "清空本机游戏存档")}
        <div class="debug-erase-check" hidden><p>将清空位置、收集、装备、居民记录和成绩，回到开始页。声音设置、视频和贴图缓存会保留。</p>
          ${button("keep", "保留存档")} ${button("confirm-erase", "确认清空")}</div>
      </details>
    </aside>`;
  const root = document.querySelector("#app")!;
  root.append(holder);
  const panel = holder.querySelector<HTMLElement>(".debug-panel")!,
    trigger = holder.querySelector<HTMLButtonElement>(".debug-trigger")!;
  pinDebugDock(holder, panel, root);
  void import("./launch/debug").then(({ mountCountdownDebug }) => {
    mountCountdownDebug(panel.querySelector<HTMLElement>(".debug-launch-time")!, {
      mode: "game",
      getDeadline: () => getDeadline(true),
      changeDeadline: value => {
        setDebugDeadline(value);
        // The game's pagehide handler saves the current location before reload.
        if (getDeadline(true) > Date.now()) window.location.reload();
      },
    });
  }).catch(() => toast("开放时间调试控件未能加载，请刷新后重试。"));
  holder.querySelector(".debug-flowers")!.append(book);
  book.hidden = false;
  const eraseCheck = holder.querySelector<HTMLElement>(".debug-erase-check")!;
  const resetButton = holder.querySelector<HTMLButtonElement>(
    '[data-debug="erase"]',
  )!;
  const cancelErase = (focus = false) => {
    eraseCheck.hidden = true;
    resetButton.hidden = false;
    if (focus) resetButton.focus({ preventScroll: true });
  };
  let travelling = false;
  const mailChoice = panel.querySelector<HTMLSelectElement>("#debug-mail-choice")!;
  const receiveOne = panel.querySelector<HTMLButtonElement>('[data-debug="mail-one"]')!;
  const receiveAll = panel.querySelector<HTMLButtonElement>('[data-debug="mail-all"]')!;
  const mailCount = panel.querySelector<HTMLElement>(".debug-mail-count")!;
  const refreshMail = () => {
    const received = mailbox.received();
    const pending = allLetters.filter(letter => !received.has(letter.id));
    const selection = mailChoice.value;
    mailChoice.replaceChildren(...pending.map(letter => new Option(letter.title, letter.id)));
    if (pending.some(letter => letter.id === selection)) mailChoice.value = selection;
    if (!pending.length) mailChoice.add(new Option("已收齐所有来信", ""));
    mailChoice.disabled = receiveOne.disabled = receiveAll.disabled = pending.length === 0;
    mailCount.textContent = `已收到 ${received.size} / ${allLetters.length} 封来信`;
  };
  const refresh = () => {
    const flags: Record<string, boolean> = {
      wardrobe: bag.fitting,
      collision: world.collisionOverlay,
      layers: world.layerOverlay,
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
    rememberDebugOpen(false);
    cancelErase();
    trigger.setAttribute("aria-expanded", "false");
    if (focus && !mailbox.restoreReadingFocus()) trigger.focus({ preventScroll: true });
  };
  trigger.onclick = () => {
    if (!panel.hidden) {
      close(true);
      return;
    }
    panel.hidden = false;
    rememberDebugOpen(true);
    refreshMail();
    refresh();
    trigger.setAttribute("aria-expanded", "true");
    holder
      .querySelector<HTMLButtonElement>(".debug-close")!
      .focus({ preventScroll: true });
  };
  if (attachDownloadMonitor(panel) || debugIsOpen()) trigger.click();
  holder.querySelector<HTMLButtonElement>(".debug-close")!.onclick = () =>
    close(true);
  window.addEventListener(
    "keydown",
    (e) => {
      if (!panel.hidden && holder.contains(e.target as Node) && e.key === "Escape" && !reservedShortcut(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!eraseCheck.hidden) cancelErase(true);
        else close(true);
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
    try {
      if (!(await go(scene, id, mode))) toast("请等地图准备好，再试一次。");
    } catch {
      toast("这处场景还没载入，请稍后再试。");
    } finally {
      travelling = false;
    }
  };
  panel.addEventListener("click", async (e) => {
    const cmd = (e.target as Element).closest<HTMLButtonElement>("[data-debug]")
      ?.dataset.debug;
    if (!cmd) return;
    const [type, key, id] = cmd.split(":");
    if (type === "mail-one" || type === "mail-all") {
      if (mailChoice.disabled) return;
      mailbox.receive(type === "mail-one" ? mailChoice.value : undefined);
      refreshMail();
      if (mailChoice.disabled) panel.querySelector<HTMLElement>(".debug-mail summary")!.focus({preventScroll: true});
    } else if (type === "erase") {
      resetButton.hidden = true;
      eraseCheck.hidden = false;
      eraseCheck
        .querySelector<HTMLButtonElement>('[data-debug="keep"]')!
        .focus({ preventScroll: true });
    } else if (type === "keep") cancelErase(true);
    else if (type === "confirm-erase") {
      if (!eraseCheck.hidden && !travelling && await eraseProgress()) {
        cancelErase(true);
      }
    } else if (type === "wardrobe") bag.setFitting(!bag.fitting);
    else if (type === "collision")
      world.showCollisionOverlay(!world.collisionOverlay);
    else if (type === "layers")
      world.showLayerOverlay(!world.layerOverlay);
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
    else if (type === "game" && Object.hasOwn(ARCADES,key)) void travel(ARCADES[key as keyof typeof ARCADES].scene, "arcade-" + key, "open");
    else if (type === "event") void travel(key as SceneId, id, "open");
    else if (type === "trap") void travel("challenge", undefined, "trap");
    refresh();
  });
}
