import { ITEMS, INVENTORY_KEY } from "../src/items";
import type { World } from "../src/world";

/** Run once at desktop width and once at phone width in the isolated exploration fixture. */
export async function verifyWardrobe(world: World, log: (message: string) => void) {
  const scene = world.canvas.parentElement!;
  const panel = scene.querySelector<HTMLElement>(".inventory-panel")!;
  const trigger = scene.querySelector<HTMLButtonElement>(".bag-toggle")!;
  const check = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
  const button = (selector: string) => {
    const result = panel.querySelector<HTMLButtonElement>(selector);
    if (!result || result.disabled) throw new Error("找不到可用按钮 " + selector);
    return result;
  };
  const avatar = () => panel.querySelector<HTMLCanvasElement>(".bag-avatar")!;
  const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  scene.scrollIntoView({block:"center",behavior:"instant"});
  await frame();
  const bounds = world.canvas.getBoundingClientRect();
  const scroll = scrollY;
  const sameFrame = () => {
    const current = world.canvas.getBoundingClientRect();
    for (const prop of ["top","left","width","height"] as const) check(Math.abs(current[prop] - bounds[prop]) < 1, "地图尺寸或位置改变了");
    check(Math.abs(current.width / current.height - 1.5) < .01 && Math.abs(scrollY - scroll) < 1, "3:2 画幅或滚动位置改变了");
  };
  const visibleSlots = () => [...panel.querySelectorAll<HTMLElement>(".bag-slot")].filter(el => el.getClientRects().length);
  const catalogue = () => [...panel.querySelectorAll<HTMLElement>("[data-select]")].map(el => el.dataset.select!);
  const original = JSON.stringify(world.equipment);
  const saved = localStorage.getItem(INVENTORY_KEY);
  trigger.click();
  await frame();
  const box = panel.getBoundingClientRect();
  const compact = panel.dataset.compact === "true";
  check(box.left >= bounds.left-1 && box.right <= bounds.right+1 && box.top >= bounds.top-1 && box.bottom <= bounds.bottom+1, "衣橱超出地图边缘");
  for (const element of panel.querySelectorAll<HTMLElement>("button, .bag-footer, .bag-avatar")) {
    if (!element.getClientRects().length) continue;
    const rect = element.getBoundingClientRect();
    check(rect.width>0 && rect.height>0 && rect.left>=bounds.left-1 && rect.right<=bounds.right+1 &&
      rect.top>=bounds.top-1 && rect.bottom<=bounds.bottom+1, "衣橱控件超出地图或尺寸为空：" + element.className);
  }
  const grid = getComputedStyle(panel.querySelector(".bag-grid")!);
  check(grid.gridTemplateColumns.split(" ").length === (compact ? 4 : 5) && grid.gridTemplateRows.split(" ").length === (compact ? 2 : 3), "显示的行列数不正确");
  const ids = catalogue();
  if (compact) {
    button('[data-page="1"]').click();
    ids.push(...catalogue());
    check(panel.querySelector('[data-page="1"]:disabled'), "最后一页没有禁用下一页");
    button('[data-tab="equipped"]').click();
    check(visibleSlots().length === 6, "身上页需要六个装备槽");
    button('[data-tab="wardrobe"]').click();
    button('[data-page="-1"]').click();
  } else check(visibleSlots().length === 6, "桌面衣橱缺少装备槽");
  check(ids.length===15 && new Set(ids).size===15 && Object.keys(ITEMS).every(id=>ids.includes(id)), "配饰格子有遗漏或者重复");
  button('[data-select="moonBag"]').click();
  check(["1","2"].includes(avatar().dataset.facing!), "试背时角色没有侧身");
  const facings = new Set<string>();
  const drawings = new Set<string>();
  for (let i=0; i<4; i++) {
    await frame();
    facings.add(avatar().dataset.facing!);
    drawings.add(avatar().toDataURL());
    button('[data-turn="1"]').click();
  }
  check(facings.size===4 && drawings.size===4, "四个角度没有绘出不同的人物");
  button('[data-turn="-1"]').click();
  check(original===JSON.stringify(world.equipment) && saved===localStorage.getItem(INVENTORY_KEY), "试穿写入了地图或本机存档");
  sameFrame();
  button(".bag-close").click();
  sameFrame();
  check(panel.hidden && document.activeElement===world.canvas && !world.suspended, "收起后未恢复地图操作");
  log((compact ? "手机 4×2 两页、身上六槽" : "桌面 5×3 和六个装备槽") + "、左右转身、未确认退出、3:2 画幅和视口均通过");
}
