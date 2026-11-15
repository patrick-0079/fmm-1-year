import type { World } from "../src/world";

/** Exercise the real application's stacked panels and media-error input path. */
export async function verifyReadingControls(world: World, log: (text: string) => void) {
  const q = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const expect = (ok: unknown, message: string) => { if (!ok) throw new Error(message); };
  const key = (name: string, target: HTMLElement = world.canvas) => {
    for (const type of ["keydown", "keyup"])
      target.dispatchEvent(new KeyboardEvent(type, {key: name, bubbles: true, cancelable: true}));
  };
  await world.prepareScene("room");
  for (const id of ["letters", "album"]) {
    world.switchScene("room", {x:121,y:240});
    world.onInteract(id);
    const reader = q(".game-letter-reader"), detail = q(".game-letter-reader .memory-detail");
    expect(!reader.hidden && world.paused, id + "没有打开游戏内阅读器");
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
    const selected = q<HTMLButtonElement>(".game-letter-reader .collection-item");
    selected.focus({preventScroll:true});
    q(".help-button").click(); q(".help-close").click();
    expect(document.activeElement === selected, "关闭说明没有保留左列选图/选信焦点");
    key("Escape", selected);
    expect(reader.hidden && !world.paused && document.activeElement === world.canvas, "收起阅读器未恢复探索");
    log(id + "：正文、左侧选择分别打开说明，返回后保留焦点、滚动和暂停，Esc 恢复探索。");
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
