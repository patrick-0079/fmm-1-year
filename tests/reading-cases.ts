import type { World } from "../src/world";
import { SAVE_KEY, readProgress } from "../src/core";
import { rainbowFlowers } from "../src/rainbow-flowers";
import { campTapeSpot } from "../src/meadow-map";
import { renderGameMailDesk } from "../src/game-mail-desk";
import { checkTapSurface } from "./hotspot-pointer-cases";

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
  const kerry = "kerry-anniversary-letter", rabe = "rabe-anniversary-letter";
  items[2].id = kerry;
  items[3].id = rabe;
  const unread = new Set(items.slice(1, 91).map(item => item.id));
  const receipts: string[] = [];
  let deliver: ((entries: typeof items, unreadIds: string[]) => void) | undefined;
  const front = () => body.querySelector<HTMLButtonElement>(".mail-stack button.mail-envelope")!;
  const liningIsVisible = () => {
    const lining = getComputedStyle(front().querySelector(".mail-envelope-object")!, "::before");
    return lining.display !== "none" && lining.visibility === "visible" && Number(lining.opacity) > 0 &&
      lining.content !== "none" && lining.backgroundImage !== "none";
  };
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
    if (front().dataset.stationeryTheme !== "default")
      throw new Error("未配置样式的新来信没有使用默认信笺");
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
    key("ArrowRight"); await select(kerry);
    key("ArrowRight"); await select(rabe);
    const outgoing = body.querySelector<HTMLElement>(".mail-deck-leaf")!;
    if (front().dataset.stationeryTheme !== rabe ||
        (!outgoing.hidden && outgoing.dataset.stationeryTheme !== kerry))
      throw new Error("翻到下一封时，新旧信封互相串用了图案");
    key("Home"); await select("letter-1");
    if (receipts.length || front().dataset.sealed !== "true") throw new Error("挑选信件时误拆了蜡封");
    const boundsOnDesk = (selector: string) => {
      const rect = front().querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      const desk = sample.getBoundingClientRect();
      return new DOMRect(rect.left - desk.left, rect.top - desk.top, rect.width, rect.height);
    };
    const sealed = boundsOnDesk(".mail-pocket");
    if (!sealed.width || !sealed.height) throw new Error("未拆信封的袋身不可见");
    if (liningIsVisible()) throw new Error("闭合封舌的上沿露出了内衬");
    const backs = body.querySelectorAll<HTMLElement>(".mail-deck-back");
    if (backs.length !== 2 || ![...backs].some(back => back.dataset.stationeryTheme === kerry) ||
        ![...backs].some(back => back.dataset.stationeryTheme === rabe))
      throw new Error("信摞下方没有使用接下来两封信的图案");
    for (const back of backs) {
      const style = getComputedStyle(back);
      if (style.backgroundColor !== "rgba(0, 0, 0, 0)" || style.boxShadow !== "none")
        throw new Error("底层信封的透明纸边绘制了矩形底色或阴影");
    }
    front().click();
    await waitForReading(() => body.dataset.openLetterId === "letter-1", "未读信无法打开");
    if (receipts.join() !== "letter-1") throw new Error("读一封信改变了其他信的状态");
    const viewport = body.querySelector<HTMLElement>(".mail-sheet .memory-detail")!;
    const pageNumber = body.querySelector(".mail-page-count")!;
    const previous = body.querySelector<HTMLButtonElement>(".mail-page-prev")!;
    const next = body.querySelector<HTMLButtonElement>(".mail-page-next")!;
    const text = viewport.querySelector(".letter-text")!.firstChild as Text;
    function containsCharacter(offset: number) {
      const range = document.createRange();
      range.setStart(text, offset);
      range.setEnd(text, offset + 1);
      const glyph = range.getBoundingClientRect(), page = viewport.getBoundingClientRect();
      return glyph.width > 0 && glyph.left >= page.left - 1 && glyph.right <= page.right + 1 &&
        glyph.top >= page.top - 1 && glyph.bottom <= page.bottom + 1;
    }
    if (!pageNumber.textContent?.startsWith("1 / ") || !containsCharacter(0) ||
      previous.textContent !== "上一页" || next.textContent !== "下一页")
      throw new Error("第一页出现时没有显示首字和底部翻页按钮");
    if (previous.getBoundingClientRect().top < viewport.getBoundingClientRect().bottom - 1 ||
      !["clip", "hidden"].includes(getComputedStyle(viewport).overflowY))
      throw new Error("翻页按钮遮住正文或正文仍可滚动");
    next.click();
    const beforeResize = pageNumber.textContent;
    const anchor = Array.from({length:text.length}, (_, offset) => offset).find(containsCharacter);
    if (!beforeResize?.startsWith("2 / ") || anchor === undefined || anchor === 0)
      throw new Error("点下一页后没有翻到新的文字");
    const originalHeight = viewport.clientHeight;
    viewport.style.flex = `0 0 ${Math.max(28, originalHeight * .55)}px`;
    await waitForReading(() => pageNumber.textContent !== beforeResize && containsCharacter(anchor),
      "正文区重新排版时丢失了原页开头的文字");
    viewport.style.removeProperty("flex");
    await waitForReading(() => pageNumber.textContent === beforeResize && containsCharacter(anchor),
      "恢复视口后没有回到原来的阅读位置");
    viewport.dispatchEvent(new KeyboardEvent("keydown", {key: "End", bubbles: true, cancelable: true}));
    await waitForReading(() => containsCharacter(text.length - 1), "翻到长信末页后最后一个字仍在纸面之外");
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
    const opened = boundsOnDesk(".mail-pocket");
    if (!liningIsVisible()) throw new Error("已拆信放回后没有露出内衬");
    for (const edge of ["width", "height", "left", "bottom"] as const) {
      if (Math.abs(opened[edge] - sealed[edge]) > .5)
        throw new Error(`同一封信放回后袋身的 ${edge} 变化了：${sealed[edge]} → ${opened[edge]}`);
    }
    const flap = boundsOnDesk(".mail-flap");
    if (flap.top >= opened.top || Math.abs(flap.bottom - opened.top) > .5)
      throw new Error("已拆信封的封舌没有从袋口向上翻开");
    if (!body.querySelector(".mail-stack-position")?.textContent?.includes("101"))
      throw new Error("信摞没有收录阅读期间送到的新信");
    key("ArrowRight"); await select(kerry);
    front().click();
    const flying = body.querySelector<HTMLElement>(".mail-flight")!;
    if (!flying.hidden && flying.dataset.stationeryTheme !== kerry)
      throw new Error("抽出的信封丢失了作者的信笺样式");
    await waitForReading(() => body.dataset.openLetterId === kerry, "定制信笺没有展开");
    if (pageNumber.textContent !== "1 / 1" || !body.querySelector<HTMLElement>(".mail-leaves")!.hidden)
      throw new Error("下一封短笺未回到第一页或仍出现翻页控件");
    if (body.querySelector<HTMLElement>(".mail-sheet")!.dataset.stationeryTheme !== kerry)
      throw new Error("信纸展开后使用了其他来信的样式");
    body.querySelector<HTMLButtonElement>(".mail-fold")!.click();
    await waitForReading(() => body.dataset.mailState === "box", "定制信笺没有放回");
    if (front().dataset.stationeryTheme !== kerry || front().dataset.sealed !== "false")
      throw new Error("放回已拆信时丢失了作者样式或重新出现了蜡封");
  } finally {
    cleanups.forEach(cleanup => cleanup());
    sample.remove();
  }
}

/** Exercise the real application's stacked panels and media-error input path. */
export async function verifyReadingControls(world: World, log: (text: string) => void) {
  const book = () => readProgress(localStorage.getItem(SAVE_KEY)).achievements;
  const q = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const expect = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
  const key = (name: string, target: HTMLElement = world.canvas) => {
    for (const type of ["keydown", "keyup"])
      target.dispatchEvent(new KeyboardEvent(type, {key: name, bubbles: true, cancelable: true}));
  };
  await world.prepareScene("room");
  const reader = q(".game-letter-reader");
  world.switchScene("room", {x:121,y:240});
  checkTapSurface(world, "letters", { x: 54, y: 164 });
  checkTapSurface(world, "album", { x: 36, y: 210 });
  {
    q('[data-memory="letters"]').click();
    await waitForReading(() => !reader.hidden, "首页来信卡没有带玩家走到小屋信箱");
    expect(!document.querySelector(".page-memory-reader,.reader-change-view"), "信箱仍提供独立的页面阅读");
    const front = () => q<HTMLButtonElement>(".game-letter-reader .mail-stack button.mail-envelope");
    const unopened = front();
    if (unopened?.dataset.sealed === "true" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = unopened.dataset.memoryId;
      unopened.click();
      q(".game-letter-reader .reader-close").click();
      world.onInteract("letters");
      expect(front()?.dataset.memoryId === id && front().dataset.sealed === "true", "拆信中途退出消耗了蜡封");
      front().click();
      await waitForReading(() => !!reader.querySelector('[data-mail-state="opening"] .mail-sheet:not([hidden])'),
        "没有看到信纸展开阶段");
      q(".game-letter-reader .reader-close").click();
      world.onInteract("letters");
      expect(front()?.dataset.memoryId === id && front().dataset.sealed === "true", "正文尚未展开就记录了已读");
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
    expect(world.suspended && q<HTMLDialogElement>("#game-help").matches(":modal"), "说明应作为弹窗暂停底层阅读");
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
    const previouslyOpened = book().facts.includes("photo-opened");
    q('[data-memory="album"]').click();
    await waitForReading(() => !reader.hidden && !!reader.querySelector(".photo-book"), "首页相册卡没有打开小屋里的相册");
    q(".photo-book-next").click();
    expect(book().facts.includes("photo-opened") === previouslyOpened, "单纯翻页错误地记作打开单张照片");
    const photo = q<HTMLButtonElement>(".photo-book-photo");
    const current = photo.dataset.memoryId;
    photo.click();
    expect(!reader.hidden && world.paused && !!reader.querySelector(".photo-original"), "翻开照片没有在原画幅查看");
    expect(book().facts.includes("photo-opened"), "打开单张照片后没有保存相册记录");
    key("Escape", q(".photo-original-back"));
    const restored = q<HTMLButtonElement>(".photo-book-photo");
    expect(restored.dataset.memoryId === current && document.activeElement === restored, "返回相册没有保留跨页与选片焦点");
    q(".help-button").click(); q(".help-close").click();
    expect(document.activeElement === restored, "关闭说明没有返回选中相片");
    key("Escape", restored);
    expect(reader.hidden && !world.paused && document.activeElement === world.canvas, "收起相册没有恢复探索");
    log("相册翻页与单张返回均保留焦点，Esc 可逐层退出。");
  }
  const tape = () => readProgress(localStorage.getItem(SAVE_KEY)).gardenTape;
  const screeningHint = () => q(".cinema-shortcut small").textContent ?? "";
  if (tape() === "missing") {
    expect(screeningHint().includes("小叶子"), "领取前首页没有提供录像带线索");
    for (const flower of rainbowFlowers) {
      await world.prepareScene(flower.scene);
      world.switchScene(flower.scene, flower.approach);
      world.onInteract(flower.id);
    }
    await world.prepareScene("meadow");
    world.switchScene("meadow", campTapeSpot.approach);
    key("e");
    expect(tape() === "carried", "在篝火左边按 E 没有拿到录像带");
    await waitForReading(() => screeningHint().includes("已拿到录像带"), "拾带后首页仍然指引玩家寻带");
  }
  await world.prepareScene("garden");
  world.switchScene("garden", {x:710,y:347});
  world.canvas.focus({preventScroll:true});
  key("e");
  if (tape() === "carried") {
    const insert = [...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")]
      .find(button => button.textContent === "⌈放入录像带⌋");
    expect(!!insert, "在大屏前没有插带选项");
    insert!.click();
  }
  const video = q<HTMLVideoElement>('video[data-garden-video]'), hud = q(".cinema-hud");
  expect(screeningHint().includes("已放入放映机"), "插带后首页放映提示没有更新");
  expect(!hud.hidden && book().facts.includes("cinema-opened"), "在大屏前按 E 没有进入放映并记下到访");
  expect(book().earned.includes("memories"), "真实打开单张照片与花园大屏后没有盖章");
  for (const shortcut of ["e", " "]) {
    video.pause();
    // Native media errors set video.error before they send the event.
    Object.defineProperty(video, "error", { configurable: true, value: { code: MediaError.MEDIA_ERR_NETWORK } });
    try {
      video.dispatchEvent(new Event("error"));
      expect(hud.dataset.stage === "error", "没有模拟出放映失败状态");
      world.canvas.focus({preventScroll:true});
      key(shortcut);
      expect(hud.dataset.stage !== "error" && q(".cinema-hud .cinema-play").textContent?.includes("取消等待"),
        "视频出错后互动键未重试并恢复播放意图：" + shortcut);
    } finally {
      Reflect.deleteProperty(video, "error");
    }
  }
  q(".cinema-leave").click();
  expect(hud.hidden && !world.paused && !world.suspended && document.activeElement === world.canvas,
    "视频重试后离开仍锁住地图");
  log("视频模拟失败后 E / 空格均可重试并等待播放，离开后立即恢复探索。");
}
