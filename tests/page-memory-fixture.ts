import "../src/style.css";
import "../src/readability.css";
import { PageMemoryReader } from "../src/page-memory-reader";
import { openCollection } from "../src/media";
import type { World } from "../src/world";

const q = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const reasons = new Set<string>();
const worldState = {
  paused: true, scene: "room", visited: [] as string[], canvas: q<HTMLCanvasElement>("canvas"),
  suspend(reason: string, active: boolean) {
    if (active) reasons.add(reason); else reasons.delete(reason);
    q("#game").inert = reasons.size > 0;
  },
};
const reader = new PageMemoryReader(worldState as unknown as World);
const letters = [
  { id: "qa-long", title: "一封需要慢慢读完的长信", author: "小叶子", text: "你好，芙芙。\n\n" + "这一封信留给耐心读到最后的你。把温暖的事情记下来，明天依然可以翻开。\n\n".repeat(70) + "已经读到了信的最后。" },
  { id: "qa-short", title: "另一封信", author: "夜神华", text: "<script>这里只是文字，不会执行。</script>\n晚安，祝你好梦。" },
];
const openLetters = () => {
  reader.setTrigger(q("#letters"));
  openCollection(reader, "letters", { items: letters, onRead: () => {} });
};
const openAlbum = () => { reader.setTrigger(q("#album")); openCollection(reader, "album"); };
q("#letters").addEventListener("click", openLetters);
q("#album").addEventListener("click", openAlbum);
let returned = 0;
reader.onReturnToGame = () => { returned++; worldState.canvas.focus({ preventScroll: true }); };
const settle = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function log(message: string) { const li = document.createElement("li"); li.textContent = message; q("#results").append(li); }

async function verify() {
  q<HTMLButtonElement>("#verify").disabled = true;
  q("#report").textContent = "检查中…"; q("#report").dataset.result = "running"; q("#results").replaceChildren();
  try {
    reader.close(false); reasons.clear(); worldState.paused = true;
    const gameWidth = q("#game").getBoundingClientRect().width;
    q("#letters").focus(); q("#letters").click(); await settle();
    assert(reader.opened && reasons.has("page-memory"), "打开阅读区没有暂停游戏输入");
    assert(worldState.paused && worldState.scene === "room" && worldState.visited.length === 0, "网页信箱意外开局、换图或增加访问记录");
    assert(Math.abs(gameWidth - q("#game").getBoundingClientRect().width) < 1, "网页阅读改变游戏宽度");
    const detail = q(".page-memory-reader .memory-detail"), list = q(".page-memory-reader .collection-list");
    assert(detail.clientHeight > 0 && detail.scrollHeight > detail.clientHeight, "长信没有独立滚动容器");
    assert(parseFloat(getComputedStyle(q(".letter-text")).fontSize) >= 14, "手机正文小于 14px");
    assert(list.getBoundingClientRect().right <= detail.getBoundingClientRect().left, "信件索引未保留在正文左侧");
    const pageY = window.scrollY;
    detail.focus({ preventScroll: true });
    detail.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    await settle();
    assert(detail.scrollTop + detail.clientHeight >= detail.scrollHeight - 2, "End 未能读到信件末尾");
    assert(Math.abs(window.scrollY - pageY) < 1, "读信按键滚动了整页");
    list.querySelectorAll<HTMLButtonElement>("button")[1].click(); await settle();
    assert(detail.scrollTop === 0 && detail.textContent?.includes("<script>"), "切信没有回到正文开头或转义错误");
    assert(!detail.querySelector("script") && Math.abs(window.scrollY - pageY) < 1, "切信执行了内容或引发整页跳动");
    log("未开局即可读信；游戏状态与尺寸不变，长信可读至末尾，切信不跳页。");

    let cleanups = 0; reader.onCleanup(() => cleanups++);
    worldState.suspend("qa-other-panel", true);
    q(".page-reader-close").click();
    assert(!reader.opened && !reasons.has("page-memory") && reasons.has("qa-other-panel"), "收起释放了其他面板的暂停");
    assert(document.activeElement === q("#letters") && cleanups === 1, "收起没有回到来源卡片或没有清理资源");
    reader.close(); assert(cleanups === 1, "重复收起重复清理资源");
    worldState.suspend("qa-other-panel", false);
    log("收起只释放自己的暂停、清理一次资源，并将焦点还给来源卡片。");

    q("#album").click(); await settle();
    const albumList = q(".page-memory-reader .collection-list"), albumDetail = q(".page-memory-reader .memory-detail");
    assert(albumList.querySelectorAll("img").length === 4, "相册没有显示四张缩略图");
    await Promise.all(Array.from(q(".page-memory-reader").querySelectorAll("img")).map(image => image.decode()));
    assert(Array.from(albumList.querySelectorAll("img")).every(image => image.naturalWidth > 0), "相册缩略图没有全部载入");
    assert(albumList.getBoundingClientRect().right <= albumDetail.getBoundingClientRect().left, "相册缩略图在窄屏变成了顶部横栏");
    assert(albumDetail.querySelector(".memory-image"), "相册正文没有图片");
    if (innerWidth <= 650) assert(albumList.clientWidth >= 64 && albumList.clientWidth <= 72, "手机相册左列宽度不在 64–72px");
    const returnBefore = returned;
    q(".page-reader-return").click();
    assert(returned === returnBefore + 1 && !reader.opened && document.activeElement === worldState.canvas, "回到游戏没有关闭阅读区并调用返回入口");
    assert(worldState.paused, "回到游戏擅自开始了尚未开始的游戏");
    log("相册保留左侧缩略图与右侧原图；回到游戏由接线方决定，不擅自开局。");

    q("#letters").click();
    q("#album").focus({ preventScroll: true }); reader.close(false);
    assert(document.activeElement === q("#album"), "close(false) 仍抢走焦点");
    q("#letters").click();
    const debugPanel = document.createElement("section");
    debugPanel.className = "debug-panel"; document.body.append(debugPanel);
    const debugEscape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(debugEscape);
    assert(reader.opened && !debugEscape.defaultPrevented, "底层阅读器抢走了调试面板的 Esc");
    debugPanel.remove();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", ctrlKey: true, bubbles: true, cancelable: true }));
    assert(reader.opened, "浏览器组合键被阅读区截获");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    assert(!reader.opened && document.activeElement === q("#letters"), "Esc 未收起并恢复来源焦点");
    log("close(false)、Esc 与浏览器组合键各自保持预期行为。");
    q("#report").textContent = "全部通过"; q("#report").dataset.result = "pass";
  } catch (error) {
    q("#report").textContent = "失败 · " + String(error); q("#report").dataset.result = "fail";
  } finally { q<HTMLButtonElement>("#verify").disabled = false; }
}
q("#verify").addEventListener("click", () => void verify());
if (new URLSearchParams(location.search).has("verify")) void verify();
