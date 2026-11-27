import { World } from "../src/world";
import { WORLD_CLOCK_KEY } from "../src/nature-save";

// Read each record through the real application, without touching user saves.
const records = new Map<string, string>([
  ["fufu-world-clock-v1", "{"],
  ["fufu-garden-bag-v1", JSON.stringify({
    apple: 17, flower: 9, star: 4, wreath: true, wearing: false,
    picked: {"1:garden:apple": 3},
  })],
]);
Object.defineProperty(window, "localStorage", {value: {
  getItem: (key: string) => records.get(key) ?? null,
  setItem: (key: string, value: string) => records.set(key, value),
  removeItem: (key: string) => records.delete(key),
}});
let world: World;
const load = World.prototype.load;
World.prototype.load = function (...args) {
  world = this;
  World.prototype.load = load;
  return load.apply(this, args);
};
await import("../src/main");
const report = document.querySelector<HTMLOutputElement>("#storage-report")!;
try {
  const deadline = performance.now() + 30000;
  while (!world! || document.querySelector<HTMLButtonElement>(".enter-button")!.disabled) {
    if (performance.now() > deadline) throw Error("应用初始化超时");
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  const count = document.querySelector(".bag-count")!.textContent;
  if (count !== "苹果 17 · 花朵 9 · 星屑 4") throw Error("损坏时钟丢失独立采集袋：" + count);
  const apple = world!.config.spots.find(s => s.id === "apple");
  if (apple) throw Error("测试须保持小屋初始位置");
  await world!.prepareScene("garden");
  world!.switchScene("garden");
  const basket = world!.config.spots.find(s => s.id === "apple")!;
  if (world!.available(basket)) throw Error("损坏时钟使当日拿空的果篮重新奖励苹果");
  const recovered = JSON.parse(records.get(WORLD_CLOCK_KEY)!);
  if (!Number.isFinite(recovered.origin) || recovered.shift !== 0) throw Error("时钟没有独立恢复");
  report.textContent = "通过：损坏时钟独立恢复；17 苹果 / 9 花朵 / 4 星屑及当日采空记录保留";
  report.dataset.result = "pass";
} catch (error) {
  report.textContent = "失败：" + String(error);
  report.dataset.result = "fail";
}
