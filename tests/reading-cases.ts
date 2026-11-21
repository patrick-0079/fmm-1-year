import type { World } from "../src/world";
import { renderGameMailDesk } from "../src/game-mail-desk";

async function waitForReading(check: () => boolean, message: string) {
  const deadline = performance.now() + 3000;
  while (!check()) {
    if (performance.now() >= deadline) throw new Error(message);
    await new Promise(resolve => setTimeout(resolve, 16));
  }
}

/** Exercise an entire stack, including wraparound, deliveries during reading and putting a letter back. */
async function verifyLongLetterStack(reader: HTMLElement) {
  const sample = reader.cloneNode(false) as HTMLElement;
  const body = document.createElement("div");
  body.className = "reader-body";
  sample.hidden = false;
  sample.append(body);
  reader.after(sample);
  const cleanups: (() => void)[] = [];
  const items = Array.from({ length: 100 }, (_, i) => ({
    id: `letter-${i}`, title: `第 ${i + 1} 封来信`, author: `来信人 ${i + 1}`,
    text: i === 1 ? "今天的花也开了。\n".repeat(40) + "写到这里，晚安。" : "今晚也送你一个好梦。",
  }));
  const unread = new Set(items.slice(1, 91).map(item => item.id));
  const receipts: string[] = [];
  let deliver: ((entries: typeof items, unreadIds: string[]) => void) | undefined;
  const front = () => body.querySelector<HTMLButtonElement>(".mail-stack button.mail-envelope")!;
  const select = async (id: string) => {
    await waitForReading(() => front()?.dataset.memoryId === id, "选中的信封不正确：" + id);
  };
  function key(name: string) {
    front().dispatchEvent(new KeyboardEvent("keydown", {key: name, bubbles: true, cancelable: true}));
  }
  try {
    renderGameMailDesk(body, {
      items, unreadIds: [...unread],
      onRead(id) { unread.delete(id); receipts.push(id); },
      subscribe(listener) { deliver = listener; return () => { deliver = undefined; }; },
    }, cb => cleanups.push(cb));
    await select("letter-1");
    if (body.querySelectorAll(".mail-stack button.mail-envelope").length !== 1 ||
        front().querySelector(".mail-sender")?.textContent !== items[1].author)
      throw new Error("最前面的信封应该可以拆开，并能看到对应署名");
    body.querySelector<HTMLButtonElement>(".mail-stack-prev")!.click();
    await select("letter-99");
    if (front().dataset.sealed !== "false") throw new Error("已读信仍带有蜡封");
    body.querySelector<HTMLButtonElement>(".mail-stack-next")!.click();
    await select("letter-1");
    key("End"); await select("letter-99");
    key("Home"); await select("letter-1");
    key("ArrowRight"); await select("letter-2");
    key("ArrowLeft"); await select("letter-1");
    if (receipts.length || front().dataset.sealed !== "true") throw new Error("挑选信件时误拆了蜡封");
    front().click();
    await waitForReading(() => body.dataset.openLetterId === "letter-1", "未读信无法打开");
    if (receipts.join() !== "letter-1") throw new Error("读一封信改变了其他信的状态");
    const viewport = body.querySelector<HTMLElement>(".mail-sheet .memory-detail")!;
    viewport.dispatchEvent(new KeyboardEvent("keydown", {key: "End", bubbles: true, cancelable: true}));
    const text = viewport.querySelector(".letter-text")!.firstChild as Text;
    const finalCharacter = document.createRange();
    finalCharacter.setStart(text, text.length - 1);
    finalCharacter.setEnd(text, text.length);
    await waitForReading(() => {
      const glyph = finalCharacter.getBoundingClientRect(), page = viewport.getBoundingClientRect();
      return glyph.width > 0 && glyph.left >= page.left - 1 && glyph.right <= page.right + 1 &&
        glyph.top >= page.top - 1 && glyph.bottom <= page.bottom + 1;
    }, "翻到长信末页后最后一个字仍在纸面之外");
    const pageNumber = body.querySelector(".mail-page-count")!;
    const lastPage = pageNumber.textContent;
    const active = document.activeElement;
    const extra = {id: "new-arrival", title: "新来信", author: "新来宾", text: "晚安。"};
    unread.add(extra.id);
    deliver?.([extra, ...items], [...unread]);
    if (body.dataset.openLetterId !== "letter-1" || document.activeElement !== active || pageNumber.textContent !== lastPage)
      throw new Error("阅读期间收到新信打断了原信");
    body.querySelector<HTMLButtonElement>(".mail-fold")!.click();
    await waitForReading(() => body.dataset.mailState === "box", "无法把信放回信摞");
    await select("letter-1");
    if (document.activeElement !== front() || front().dataset.sealed !== "false")
      throw new Error("放回后没有回到原来选中的已拆信封");
    if (!body.querySelector(".mail-stack-position")?.textContent?.includes("101"))
      throw new Error("信摞没有收录阅读期间送到的新信");
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
  await world.prepareScene("room");
  const reader = q(".game-letter-reader");
  world.switchScene("room", {x:121,y:240});
  {
    world.onInteract("letters");
    const front = () => q<HTMLButtonElement>(".game-letter-reader .mail-stack button.mail-envelope");
    const unopened = front();
    if (unopened?.dataset.sealed === "true" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = unopened.dataset.memoryId;
      unopened.click();
      q(".game-letter-reader .reader-close").click();
      world.onInteract("letters");
      expect(front()?.dataset.memoryId === id && front().dataset.sealed === "true", "拆信中途退出消耗了蜡封");
    }
    const envelope = front();
    const id = envelope?.dataset.memoryId;
    expect(envelope && !reader.hidden && world.paused, "没有打开书桌上的来信");
    expect(!reader.querySelector(".mail-sheet:not([hidden])"), "进信箱时自动拆开了信");
    envelope.click();
    await waitForReading(() => !!reader.querySelector('[data-mail-state="reading"]'), "拆信后没有展开正文");
    const detail = q(".mail-sheet:not([hidden]) .memory-detail");
    detail.focus({preventScroll:true});
    key("PageDown", detail);
    const pageBeforeHelp = q(".mail-sheet .mail-page-count").textContent;
    q(".help-button").click();
    expect(world.suspended && !q(".inline-help").hidden, "说明没有暂停底层阅读");
    key("Escape", q(".help-close"));
    expect(!reader.hidden && world.paused && !world.suspended, "关闭说明错误地关闭或恢复了底层阅读");
    expect(document.activeElement === detail && q(".mail-sheet .mail-page-count").textContent === pageBeforeHelp,
      "关闭说明没有返回原阅读焦点与页码");
    key("End", detail);
    expect(q(".mail-sheet .mail-page-next").getAttribute("aria-disabled") === "true",
      "说明返回后键盘不能读到末页");
    q(".mail-fold").click();
    await waitForReading(() => !!reader.querySelector('[data-mail-state="box"]'), "信封没有放回信摞");
    expect(document.activeElement === front() && front().dataset.memoryId === id && front().dataset.sealed === "false",
      "退信后没有回到原来选中的已拆信封");
    q(".help-button").click(); q(".help-close").click();
    expect(document.activeElement === front(), "关闭说明没有保留选信焦点");
    key("Escape", front());
    expect(reader.hidden && !world.paused && document.activeElement === world.canvas, "收起阅读器未恢复探索");
    await verifyLongLetterStack(reader);
    world.canvas.focus({ preventScroll: true });
    log("百封来信支持循环挑选，拆信中途退出保留蜡封，放回后原信和键盘焦点都在摞顶。");
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
