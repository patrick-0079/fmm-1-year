import type { GameId } from "./arcade-engines";
import snake from "./assets/arcade-snake-v14.webp";
import blocks from "./assets/arcade-blocks-v14.webp";
import hop from "./assets/arcade-hop-v14.webp";
import flight from "./assets/arcade-flight-v14.webp";
import link from "./assets/arcade-link-v14.webp";
import mines from "./assets/arcade-mines-v14.webp";
import miner from "./assets/arcade-miner-v14.webp";
import propUrl from "./assets/arcade-props-v14.webp";
import type { Backdrop } from "./arcade-pixels";
export { default as postcard } from "./assets/arcade-postcard-v14.webp";

const backgrounds = { snake, blocks, hop, flight, link, mines, miner };
const gallery = new Map<GameId, HTMLImageElement>();
let props: HTMLImageElement | undefined;
export function arcadeBackdrop(id: GameId): Backdrop {
  if (!props) {
    props = new Image();
    props.src = propUrl;
  }
  let image = gallery.get(id);
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = backgrounds[id];
    gallery.set(id, image);
  }
  return { background: image, props };
}
export const booths = {
  snake:  { number: "01", line: "把第一颗星糖，留给今晚的芙芙。", stamp: "星糖野餐会", motif: "star" },
  blocks: { number: "02", line: "一块一块，把晚安叠成小礼物。", stamp: "缎带工坊", motif: "gift" },
  hop:    { number: "03", line: "和月兔一起，跳过草莓色的清晨。", stamp: "云上甜点铺", motif: "bunny" },
  flight: { number: "04", line: "越过亮着灯的屋顶，送去一声晚安。", stamp: "月光邮路", motif: "moon" },
  link:   { number: "05", line: "两枚小印章，拼成同一份心意。", stamp: "心愿信笺", motif: "letter" },
  mines:  { number: "06", line: "把晨露和花，留在一周年的清晨。", stamp: "晨露温室", motif: "sprout" },
  miner:  { number: "07", line: "从灯火深处，捧一颗星星回来。", stamp: "星屑矿灯", motif: "gem" },
} as const;
