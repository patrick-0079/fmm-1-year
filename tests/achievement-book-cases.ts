import type { World } from "../src/world";
import { SAVE_KEY, readProgress } from "../src/core";
import { achievementDefinitions } from "../src/achievements";

/** Use only in the isolated exploration fixture; exercises the original controls and receipt boundaries. */
export async function verifyAchievementBook(world: World, log: (message: string) => void) {
  const button = (selector: string) => document.querySelector<HTMLButtonElement>(selector)!;
  const root = document.querySelector<HTMLDialogElement>(".achievement-book")!;
  const earned = () => readProgress(localStorage.getItem(SAVE_KEY)).achievements.earned;
  const check = (ok: unknown, message: string) => { if (!ok) throw Error(message); };
  const wait = async (value: () => boolean, message: string) => {
    const deadline = performance.now() + 10000;
    while (!value()) {
      if (performance.now() > deadline) throw Error(message);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  };
  button(".reset-button").click();
  button(".reset-confirm").click();
  check(!root.open, "徽章册默认展开");
  const frame = world.canvas.getBoundingClientRect();
  button("[data-book-toggle]").click();
  check(root.matches(":modal") && world.suspended, "徽章册没有以独立弹窗暂停游戏");
  check(root.querySelector(".achievement-count strong")?.textContent === "0 / 54", "新档已有徽章");
  const position = { ...world.player };
  for (const [chapter, count] of [["daily", 13], ["letters", 12], ["games", 7], ["explore", 16], ["advanced", 6]] as const) {
    button(`[data-book-chapter="${chapter}"]`).click();
    check(root.querySelectorAll(".achievement-grid [data-book-pick]").length === count, chapter + " 徽章数量错误");
    check(document.activeElement === button(`[data-book-chapter="${chapter}"]`),
      "章节切换后键盘焦点丢失");
    for (const stamp of root.querySelectorAll<HTMLButtonElement>(".achievement-grid [data-book-pick]")) {
      button(`[data-book-pick="${stamp.dataset.bookPick}"]`).click();
      const detail = root.querySelector(".achievement-detail");
      check(detail && !detail.querySelector("button, a"), "徽章详情应只展示条件、线索和进度");
    }
    check(world.scene === "room" && position.x === world.player.x && position.y === world.player.y,
      "翻阅徽章移动了玩家");
  }
  button('[data-book-chapter="explore"]').click();
  button('[data-book-pick="camp"]').click();
  const detail = root.querySelector<HTMLElement>(".achievement-detail")!;
  check(document.activeElement === detail, "选择徽章后焦点没有进入线索");
  check(detail.textContent?.includes("这里的火") && !/派大星|30 秒/.test(detail.textContent), "未到访就揭开了营火彩蛋");
  check(!detail.querySelector("[data-book-go]"), "隐藏章提供了直达入口");
  button('[data-book-pick="camp"]').click();
  check(document.activeElement === button('[data-book-pick="camp"]'), "收起线索后，焦点没有回到同一枚章");
  button('[data-book-chapter="daily"]').click();
  button('[data-book-pick="gifts"]').click();
  check(root.scrollWidth <= root.clientWidth + 1, "徽章册内出现横向溢出");
  button(".book-close").click();
  check(!root.open && !world.suspended && document.activeElement === button("[data-book-toggle]"), "合上徽章册没有恢复游戏或焦点");
  button(".enter-button").click();
  world.visit("gifts");
  check(!earned().includes("gifts"), "查看徽章已发放礼物");
  const choice = (text: string) => [...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")]
    .find(b => b.textContent?.includes(text));
  for (const text of ["解开左边", "解开右边", "掀开盒盖", "收下这份心意"]) {
    await wait(() => !!choice(text), "未能打开礼物：" + text);
    choice(text)!.click();
  }
  check(earned().join(",") === "gifts", "实际收礼后没有恰好一枚新章");
  const notice = document.querySelector<HTMLElement>(".achievement-flash")!;
  check(!notice.hidden && notice.textContent?.includes("成就已解锁"), "新成就缺少页面提示");
  const corner = notice.getBoundingClientRect();
  check(corner.top >= 0 && corner.top <= 20 && innerWidth - corner.right <= 25, "成就提示没有定位在网页右上角");
  const rect = world.canvas.getBoundingClientRect();
  check(Math.abs(rect.width - frame.width) < 1 && Math.abs(rect.width / rect.height - 1.5) < .01, "翻册改变游戏画幅");
  check(document.documentElement.scrollWidth <= innerWidth + 1, "徽章册把页面撑宽");
  log("新档 0/54，五章齐全，彩蛋保密。翻阅 54 条详情后仍在原地，亲手拆礼物后获得第一枚徽章。");

  await wait(() => notice.hidden, "第一枚徽章的提示未收起");
  const originalStart = AudioBufferSourceNode.prototype.start;
  let sounds = 0;
  AudioBufferSourceNode.prototype.start = function (...args) {
    // Identify the bundled stereo WAV after the device has resampled it.
    if (this.buffer?.numberOfChannels === 2 && Math.abs(this.buffer.duration - 72085 / 44100) < .01) sounds++;
    return originalStart.apply(this, args);
  };
  const audioButtons = [button(".effects-toggle"), button(".sound-toggle"), button(".music-toggle")];
  const originalSettings = audioButtons.map(control => control.getAttribute("aria-pressed") === "true");
  function set(control: HTMLButtonElement, on: boolean) {
    if ((control.getAttribute("aria-pressed") === "true") !== on) control.click();
  }
  const [effects, master, music] = audioButtons;
  function showing(id: string) {
    return !notice.hidden && notice.querySelector("strong")?.textContent === achievementDefinitions.find(entry => entry.id === id)?.name;
  }
  try {
    set(master, true); set(music, false); set(effects, false);
    world.onAchievementEvent("fox-content");
    world.onAchievementEvent("fox-reconciled");
    await wait(() => showing("fox"), "第一枚狐狸徽章被第二枚抢占");
    await wait(() => showing("fox-peace"), "连续解锁漏掉了第二枚");
    check(sounds === 0, "关闭互动音效仍播放成就音");
    set(effects, true);
    world.onAchievementEvent("wreath-worn");
    await wait(() => showing("wreath") && sounds === 1, "关闭背景音乐后，成就音未独立播放");
    set(master, false);
    for (const egg of ["dew", "sunset", "firefly"] as const) world.onAchievementEvent(egg);
    await wait(() => showing("day-secrets"), "总静音时没有显示成就");
    await wait(() => notice.hidden, "末条提示未收起");
    check(sounds === 1, "总静音时仍播放成就音");
    world.onAchievementEvent("fox-content");
    check(notice.hidden && sounds === 1, "重复完成已解锁成就时再次弹出或发声");
    log("连续成就逐枚提示，实际解码的 Steam 音频随互动音效、总静音开关工作，背景音乐可独立关闭。");
  } finally {
    AudioBufferSourceNode.prototype.start = originalStart;
    audioButtons.forEach((control, index) => set(control, originalSettings[index]));
  }
}
