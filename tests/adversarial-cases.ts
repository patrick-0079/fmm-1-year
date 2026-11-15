import type { World } from "../src/world";

/** Deliberately overlap real navigation and reading actions without changing saves. */
export async function verifyNavigationRaces(world: World, log: (text: string) => void) {
  const q = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const expect = (value: unknown, message: string) => { if (!value) throw Error(message); };
  const frames = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const wait = async (check: () => boolean) => {
    const end = performance.now() + 15000;
    while (!check()) {
      if (performance.now() > end) throw Error("导航没有结束");
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };
  const prepare = world.prepareScene.bind(world);
  await Promise.all([prepare("town"), prepare("garden"), prepare("ruins")]);
  for (const closeBeforeArrival of [false, true]) {
    world.switchScene("room");
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    world.prepareScene = async scene => { await prepare(scene); if (scene === "town") await pending; };
    try {
      q(".debug-trigger").click();
      q<HTMLDetailsElement>('[data-debug="game:blocks"]').closest("details")!.open = true;
      q('[data-debug="game:blocks"]').click();
      expect(world.paused, "调试定位未进入转场");
      q('[data-memory="letters"]').click();
      const root = q(".page-memory-reader"), detail = q(".page-memory-reader .memory-detail");
      detail.focus({preventScroll:true});
      detail.scrollTop = 65;
      await frames();
      if (closeBeforeArrival) q(".page-reader-close").click();
      const focus = document.activeElement;
      const scroll = window.scrollY, bodyScroll = detail.scrollTop;
      release();
      await wait(() => world.scene === "town" && !q(".scene-transition").classList.contains("active"));
      await frames();
      expect(root.hidden === closeBeforeArrival && world.suspended === !closeBeforeArrival, "慢切图完成后破坏了网页阅读状态");
      expect(q(".arcade-hud").hidden, "过期的调试请求在阅读时打开了小游戏");
      expect(document.activeElement === focus, "慢切图完成后抢走了阅读焦点");
      expect(window.scrollY === scroll && detail.scrollTop === bodyScroll, "慢切图完成后把网页滚回地图");
      if (!closeBeforeArrival) q(".page-reader-close").click();
      expect(!world.suspended && !world.paused, "阅读结束后未恢复探索");
      log(`延迟调试定位时改读来信${closeBeforeArrival ? "并提前收起" : ""}：保留新选择、焦点和滚动，不打开过期小游戏。`);
    } finally { release(); world.prepareScene = prepare; }
  }

  // Last explicit navigation wins, including a queued request after load failure.
  for (const fail of [false, true]) {
    world.prepareScene = async scene => {
      if (fail && scene === "garden") throw Error("Deliberately failed map loading");
      await prepare(scene);
    };
    try {
      for (const scene of ["garden", "town", "ruins", "town", "ruins"])
        q(`.scene-nav [data-scene="${scene}"]`).click();
      await wait(() => world.scene === "ruins" && !world.paused);
      expect(!world.suspended && !q(".scene-transition").classList.contains("active"), "连续导航留下了转场或暂停锁");
      log(`${fail ? "首张地图加载失败后" : "正常加载时"}连续切换五次：最后到达遗迹，未残留转场或暂停。`);
    } finally { world.prepareScene = prepare; }
  }
}
