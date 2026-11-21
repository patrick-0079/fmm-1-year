import type { World } from "../src/world";
import { renderGameMailDesk } from "../src/game-mail-desk";

/** At the bottom of a full bay, lifting the art must not shrink its scroll range and move the hit target. */
async function verifyFullLetterBay(reader: HTMLElement) {
  const sample = reader.cloneNode(false) as HTMLElement;
  const body = document.createElement("div");
  body.className = "reader-body";
  sample.hidden = false;
  sample.append(body);
  reader.after(sample);
  const cleanups: (() => void)[] = [];
  const items = Array.from({ length: 20 }, (_, i) => ({id: `letter-${i}`, title: `第 ${i + 1} 封来信`}));
  try {
    renderGameMailDesk(body, { items, onRead() { throw new Error("悬停信封不应打开正文"); } }, cb => cleanups.push(cb));
    const list = body.querySelector<HTMLElement>('[data-compartment="read"] .collection-list')!;
    const last = list.lastElementChild as HTMLElement;
    if (list.children.length !== 20 || list.scrollHeight <= list.clientHeight) throw new Error("满箱的已读格不支持翻找");
    list.scrollTop = list.scrollHeight;
    const rowTop = () => last.getBoundingClientRect().top - list.getBoundingClientRect().top;
    const start = rowTop();
    const scroll = list.scrollTop;
    for (const type of ["pointerenter", "pointerleave"]) {
      last.dispatchEvent(new PointerEvent(type, {pointerType: "mouse"}));
      await Promise.all(last.getAnimations({subtree: true}).map(animation => animation.finished));
      if (Math.abs(rowTop() - start) > 1 || Math.abs(list.scrollTop - scroll) > 1)
        throw new Error("悬停或离开最底端的信封改变了滚动位置或点击区域");
    }
  } finally {
    cleanups.forEach(cleanup => cleanup());
    sample.remove();
  }
}

/** Exercise the real application's stacked panels and media-error input path. */
export async function verifyReadingControls(world: World, log: (text: string) => void) {
  const q = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const expect = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
  const key = (name: string, target: HTMLElement = world.canvas) => {
    for (const type of ["keydown", "keyup"])
      target.dispatchEvent(new KeyboardEvent(type, {key: name, bubbles: true, cancelable: true}));
  };
  async function waitForReading(check: () => boolean, message: string) {
    const deadline = performance.now() + 3000;
    while (!check()) {
      if (performance.now() >= deadline) throw new Error(message);
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  }
  await world.prepareScene("room");
  const reader = q(".game-letter-reader");
  world.switchScene("room", {x:121,y:240});
  {
    world.onInteract("letters");
    const unreadSelector = '.game-letter-reader [data-compartment="unread"] .mail-envelope';
    const unopened = document.querySelector<HTMLButtonElement>(unreadSelector);
    if (unopened && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = unopened.dataset.memoryId;
      unopened.click();
      q(".game-letter-reader .reader-close").click();
      world.onInteract("letters");
      expect([...reader.querySelectorAll<HTMLElement>(unreadSelector)].some(b => b.dataset.memoryId === id),
        "拆信中途退出消耗了蜡封");
    }
    const envelope = q<HTMLButtonElement>(".game-letter-reader .mail-envelope");
    expect(envelope && !reader.hidden && world.paused, "没有打开书桌上的双格信匣");
    expect(!reader.querySelector(".mail-sheet:not([hidden])"), "进信箱时自动拆开了信");
    envelope.click();
    await waitForReading(() => !!reader.querySelector('[data-mail-state="reading"]'), "抽信后没有展开正文");
    const detail = q(".mail-sheet:not([hidden]) .memory-detail");
    detail.scrollTop = 25;
    detail.focus({preventScroll:true});
    const previousScroll = detail.scrollTop;
    q(".help-button").click();
    expect(world.suspended && !q(".inline-help").hidden, "说明没有暂停底层阅读");
    key("Escape", q(".help-close"));
    expect(!reader.hidden && world.paused && !world.suspended, "关闭说明错误地关闭或恢复了底层阅读");
    expect(document.activeElement === detail && detail.scrollTop === previousScroll, "关闭说明没有返回原阅读焦点与位置");
    key("End", detail);
    expect(detail.scrollTop + detail.clientHeight >= detail.scrollHeight - 2, "说明返回后键盘不能读到末尾");
    q(".mail-fold").click();
    await waitForReading(() => !!reader.querySelector('[data-mail-state="box"]'), "信封没有放回信匣");
    expect(document.activeElement === envelope && envelope.closest('[data-compartment="read"]'),
      "放回信匣后焦点没有跟随原信进入已读格");
    q(".help-button").click(); q(".help-close").click();
    expect(document.activeElement === envelope, "关闭说明没有保留选信焦点");
    key("Escape", envelope);
    expect(reader.hidden && !world.paused && document.activeElement === world.canvas, "收起阅读器未恢复探索");
    await verifyFullLetterBay(reader);
    world.canvas.focus({ preventScroll: true });
    log("中途收起保留蜡封，读信后原信回到右格，说明与阅读切换保留焦点。");
  }
  {
    world.onInteract("album");
    q(".photo-book-next").click();
    const photo = q<HTMLButtonElement>(".photo-book-photo");
    const current = photo.dataset.memoryId;
    photo.click();
    expect(!reader.hidden && world.paused && !!reader.querySelector(".photo-original"), "翻开照片没有在原画幅查看");
    key("Escape", q(".photo-original-back"));
    const restored = q<HTMLButtonElement>(".photo-book-photo");
    expect(restored.dataset.memoryId === current && document.activeElement === restored, "返回相册没有保留跨页与选片焦点");
    q(".help-button").click(); q(".help-close").click();
    expect(document.activeElement === restored, "关闭说明没有返回选中相片");
    key("Escape", restored);
    expect(reader.hidden && !world.paused && document.activeElement === world.canvas, "收起相册没有恢复探索");
    log("相册翻页与单张返回均保留焦点，Esc 可逐层退出。");
  }
  for (const id of ["letters", "album"]) {
    q<HTMLButtonElement>(`[data-memory="${id}"]`).click();
    const reader = q(".page-memory-reader"), detail = q(".page-memory-reader .memory-detail");
    const close = q(".page-reader-close");
    expect(!reader.hidden && world.suspended, "网页阅读没有独立暂停探索");
    close.focus({preventScroll:true});
    for (const name of ["End", "PageDown", "Home"]) {
      const event = new KeyboardEvent("keydown", {key:name, bubbles:true, cancelable:true});
      close.dispatchEvent(event);
      expect(event.defaultPrevented, "网页阅读标题按钮上的按键跳到了外部网页：" + name);
    }
    expect(detail.scrollTop === 0, "标题按钮上的 Home 未回到当前正文开头");
    const list = q(".page-memory-reader .collection-list");
    const tab = q(".page-memory-reader .collection-item");
    key("End", tab);
    expect(list.scrollTop + list.clientHeight >= list.scrollHeight - 2 && detail.scrollTop === 0,
      "左侧目录上的 End 错误地滚动了正文");
    const shortcut = new KeyboardEvent("keydown", {key:"Home", ctrlKey:true, bubbles:true, cancelable:true});
    close.dispatchEvent(shortcut);
    expect(!shortcut.defaultPrevented, "阅读器截获了组合键");
    close.click();
    expect(reader.hidden && !world.suspended, "网页阅读关闭后没有恢复探索");
    log(id + "：网页阅读标题按钮的翻页键只控制正文，目录 End 只滚目录，组合键保持原生。");
  }
  await world.prepareScene("garden");
  world.switchScene("garden", {x:710,y:347});
  world.onInteract("danmaku");
  const video = q<HTMLVideoElement>('video[data-garden-video]'), hud = q(".cinema-hud");
  for (const shortcut of ["e", " "]) {
    video.pause();
    video.dispatchEvent(new Event("error"));
    expect(hud.dataset.stage === "error", "没有模拟出放映失败状态");
    world.canvas.focus({preventScroll:true});
    key(shortcut);
    expect(hud.dataset.stage !== "error" && q(".cinema-hud .cinema-play").textContent?.includes("取消等待"),
      "视频出错后互动键未重试并恢复播放意图：" + shortcut);
  }
  q(".cinema-leave").click();
  expect(hud.hidden && !world.paused && !world.suspended && document.activeElement === world.canvas,
    "视频重试后离开仍锁住地图");
  log("视频模拟失败后 E / 空格均可重试并等待播放，离开后立即恢复探索。");
}
