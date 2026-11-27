import { EQUIP_SLOTS, ITEMS, INVENTORY_KEY } from "../src/items";
import { elderPlaces } from "../src/elders-data";
import type { World } from "../src/world";
import { outfits, type Facing } from "../src/costume-frames";
import { backpacks } from "./bag-fitting-cases";

/** Run once at desktop width and once at phone width in the isolated exploration fixture. */
export async function verifyWardrobe(world: World, log: (message: string) => void) {
  const fitting = document.querySelector<HTMLButtonElement>('[data-debug="wardrobe"]')!;
  if (fitting.getAttribute("aria-pressed") !== "true") fitting.click();
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
  const tab = trigger.getBoundingClientRect();
  const art = trigger.querySelector("svg.bag-trigger-art");
  check(art && art.getBoundingClientRect().width >= 18, "地图背包图标没有绘制");
  if (matchMedia("(pointer: coarse)").matches) check(tab.width >= 44 && tab.height >= 44, "触屏背包入口过小");
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
  const wheel = new WheelEvent("wheel", {deltaY: 120, bubbles: true, cancelable: true});
  avatar().dispatchEvent(wheel);
  check(wheel.defaultPrevented, "滚轮从衣橱穿透到网页");
  for (const name of ["Home", "End", "PageUp", "PageDown"]) {
    const key = new KeyboardEvent("keydown", {key:name, bubbles:true, cancelable:true});
    button(".bag-close").dispatchEvent(key);
    check(key.defaultPrevented, "衣橱按键滚动了外部网页：" + name);
  }
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
  const pageCount = Math.ceil(Object.keys(ITEMS).length / (compact ? 8 : 15));
  let pages = 1;
  while (panel.querySelector('[data-page="1"]:not(:disabled)')) {
    button('[data-page="1"]').click();
    ids.push(...catalogue());
    pages++;
    check(pages <= pageCount, "翻页没有到达末页");
  }
  check(pages === pageCount, "页数与屏幕容量不一致");
  check(panel.querySelector('[data-page="1"]:disabled'), "最后一页没有禁用下一页");
  if (compact) button('[data-tab="equipped"]').click();
  check(visibleSlots().length === EQUIP_SLOTS.length, "衣橱缺少装备槽");
  if (compact) button('[data-tab="wardrobe"]').click();
  check(ids.length === Object.keys(ITEMS).length && new Set(ids).size === ids.length && Object.keys(ITEMS).every(id=>ids.includes(id)), "配饰格子有遗漏或者重复");
  const chooseCategory = (category: string) => {
    if (compact) button("[data-choose-category]").click();
    button(`[data-category="${category}"]`).click();
  };
  for (const slot of EQUIP_SLOTS) {
    chooseCategory(slot);
    const expected = Object.keys(ITEMS).filter(id => ITEMS[id as keyof typeof ITEMS].slot === slot);
    check(catalogue().join() === expected.join(), "同部位的配饰显示有误：" + slot);
    check(!panel.querySelector("[data-page]"), "单页分类出现了多余的分页按钮");
  }
  chooseCategory("all");
  check(catalogue()[0] === ids[0], "切回全部没有回到第一页");
  if (!compact) button('.bag-slot[data-slot="backpack"]').click();
  else chooseCategory("backpack");
  check(catalogue().length === backpacks.length && !panel.querySelector('[data-select="wreath"]'), "背包类混入了其他穿戴部位");
  button('[data-select="moonBag"]').click();
  check(avatar().dataset.facing === "3", "从正面试背月兔包时未显示包身");
  button('[data-select="rabbitSatchel"]').click();
  check(avatar().dataset.facing === "1", "试背斜挎包未转到挂包的一侧");
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
  const expected = document.createElement("canvas");
  expected.width = avatar().width; expected.height = avatar().height;
  function apply(id: keyof typeof ITEMS) {
    button(`[data-select="${id}"]`).click();
    button(`[data-equip="${id}"]`).click();
  }
  let pairViews = 0;
  for (const clothes of outfits) {
    chooseCategory("clothes");
    if (world.equipment.clothes !== clothes) {
      const change = clothes ?? world.equipment.clothes;
      if (change) apply(change);
    }
    chooseCategory("backpack");
    for (const backpack of backpacks) {
      if (world.equipment.backpack !== backpack) apply(backpack);
      check(world.equipment.clothes === clothes && world.equipment.backpack === backpack, "换装没有应用到游戏角色");
      const seen = new Set<Facing>();
      for (let turn=0; turn<4; turn++) {
        await frame();
        const facing = Number(avatar().dataset.facing) as Facing;
        seen.add(facing);
        world.drawWardrobePreview(expected, {...world.equipment, clothes, backpack}, facing);
        check(avatar().toDataURL() === expected.toDataURL(), `${clothes ?? "原装"}/${backpack}/${facing} 衣橱画面与佩戴状态不符`);
        pairViews++;
        button('[data-turn="1"]').click();
      }
      check(seen.size === 4, "穿搭旋转遗漏了一个朝向");
    }
  }
  sameFrame();
  button(".bag-close").click();
  sameFrame();
  check(panel.hidden && document.activeElement===world.canvas && !world.suspended, "收起后未恢复地图操作");
  fitting.click();
  check(original===JSON.stringify(world.equipment) && saved===localStorage.getItem(INVENTORY_KEY), "结束全组合试穿后存档发生变化");
  log((compact ? "手机 4×2" : "桌面 5×3") + " 衣橱核对 " + pairViews + " 个穿搭朝向，" + pages + " 页、" + EQUIP_SLOTS.length + " 个装备槽和视口检查通过");
}

/** The book's controls must keep scrolling inside the book, including at its edges. */
export async function verifyJournalInput(world: World, log: (message: string) => void) {
  const q = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const check = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
  await world.prepareScene("ruins");
  world.switchScene("ruins", elderPlaces.ruins.approach);
  world.onInteract(elderPlaces.ruins.id);
  for (let step = 0; step < 3; step++) {
    const choices = [...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")];
    const openBook = choices.find(button => button.textContent === "⌈翻开遗迹手记⌋");
    if (openBook) { openBook.click(); break; }
    const reply = choices.find(button => ["什么尝试？", "好，我去试一下"].includes(button.textContent ?? ""));
    check(reply, "守护者缺少领取手记的选项"); reply!.click();
  }
  const panel = q(".inventory-panel");
  check(!panel.hidden && world.suspended, "从守护者手中领取的手记未打开");
  q<HTMLButtonElement>('[data-journal-page="2"]').click();
  const paper = q(".ruin-journal-paper");
  for (const details of paper.querySelectorAll<HTMLDetailsElement>("details")) details.open = true;
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const bookmark = q('[data-journal-page="2"]');
  bookmark.focus({preventScroll:true});
  const key = (name: string, options: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent("keydown", {key:name, bubbles:true, cancelable:true, ...options});
    bookmark.dispatchEvent(event); return event;
  };
  check(key("End").defaultPrevented && paper.scrollTop + paper.clientHeight >= paper.scrollHeight - 2,
    "手记书签上的 End 没有滚到书页底部");
  check(key("PageDown").defaultPrevented, "书页底部按 PageDown 穿透到网页");
  const edge = new WheelEvent("wheel", {deltaY:120, bubbles:true, cancelable:true});
  paper.dispatchEvent(edge); check(edge.defaultPrevented, "书页底部的滚轮穿透到网页");
  check(key("Home").defaultPrevented && paper.scrollTop === 0, "手记书签上的 Home 没有回到书页开头");
  const middle = new WheelEvent("wheel", {deltaY:40, bubbles:true, cancelable:true});
  paper.dispatchEvent(middle); check(!middle.defaultPrevented, "手记正文不能继续向下滚动");
  check(!key("Home", {ctrlKey:true}).defaultPrevented, "手记截获浏览器组合键");
  key("ArrowLeft");
  check(q('[data-journal-page="1"]').getAttribute("aria-current") === "page" &&
    document.activeElement === q('[data-journal-page="1"]'), "方向键翻页后书签焦点丢失");
  q(".bag-close").click();
  check(panel.hidden && !world.suspended && document.activeElement === world.canvas, "收起手记后不能继续探索");
  log("守护者赠书后，书签 Home/End/PageDown 和滚轮都留在当前书页，方向键翻页、组合键和关闭恢复正常。");
}
