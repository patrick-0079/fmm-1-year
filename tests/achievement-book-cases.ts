import type { World } from "../src/world";
import { SAVE_KEY, readProgress } from "../src/core";

/** Use only in the isolated exploration fixture; exercises the original controls and receipt boundaries. */
export async function verifyAchievementBook(world: World, log: (message: string) => void) {
  const button = (selector: string) => document.querySelector<HTMLButtonElement>(selector)!;
  const root = document.querySelector<HTMLElement>(".achievement-book")!;
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
  check(root.querySelector(".achievement-count strong")?.textContent === "0 / 44", "新档已有图章");
  const frame = world.canvas.getBoundingClientRect();
  button("[data-book-toggle]").click();
  for (const [chapter, count] of [["daily", 13], ["letters", 9], ["games", 7], ["explore", 9], ["advanced", 6]] as const) {
    button(`[data-book-chapter="${chapter}"]`).click();
    check(root.querySelectorAll(".achievement-grid [data-book-pick]").length === count, chapter + " 图章数量错误");
    check(document.activeElement === button(`[data-book-chapter="${chapter}"]`),
      "章节切换后键盘焦点丢失");
  }
  button('[data-book-chapter="explore"]').click();
  button('[data-book-pick="camp"]').click();
  const detail = root.querySelector<HTMLElement>(".achievement-detail")!;
  check(document.activeElement === detail, "选择图章后焦点没有进入线索");
  check(detail.textContent?.includes("这里的火") && !/派大星|30 秒/.test(detail.textContent), "未到访就揭开了营火彩蛋");
  check(!detail.querySelector("[data-book-go]"), "隐藏章提供了直达入口");
  button('[data-book-pick="camp"]').click();
  check(document.activeElement === button('[data-book-pick="camp"]'), "收起线索后，焦点没有回到同一枚章");
  button('[data-book-chapter="daily"]').click();
  button('[data-book-pick="gifts"]').click();
  button('[data-book-go="gifts"]').click();
  check(!earned().includes("gifts"), "查看图章已发放礼物");
  const choice = (text: string) => [...document.querySelectorAll<HTMLButtonElement>(".activity-actions button")]
    .find(b => b.textContent?.includes(text));
  for (const text of ["解开左边", "解开右边", "掀开盒盖", "收下这份心意"]) {
    await wait(() => !!choice(text), "礼物引导失败：" + text);
    choice(text)!.click();
  }
  check(earned().join(",") === "gifts", "实际收礼后没有恰好一枚新章");
  const rect = world.canvas.getBoundingClientRect();
  check(Math.abs(rect.width - frame.width) < 1 && Math.abs(rect.width / rect.height - 1.5) < .01, "翻册改变游戏画幅");
  check(root.scrollWidth <= root.clientWidth + 1, "成就册内出现横向溢出");
  check(document.documentElement.scrollWidth <= innerWidth + 1, "成就册把页面撑宽");
  log("新档 0/44，五章齐全，彩蛋保密；经图章导航实际开礼物后获得第一章。");
}
