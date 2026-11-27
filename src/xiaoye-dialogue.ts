import type { Phase } from "./day.ts";
import { actionOption } from "./dialogue-options.ts";

export const flowerClueChoice = "小叶子，你知道去花海的路怎么走吗？";
export const flowerClueText = "（小叶子用绒爪递来一张手绘地图）听说集齐七种颜色的花朵，就可以去到一个很温暖的地方。周年花园两朵，勇气花园两朵，周年小镇三朵，全部集齐之后再回来我这里。在我的旁边会有一个传送阵，能带你去往一个星光璀璨的世界。那里有爱着你的一切，有温暖的神明。在篝火的旁边有一份录像带，那是大家为你准备的惊喜，把它拿上，再回来周年花园这里，在大屏幕上就可以看到了。希望你的旅行一切顺利～";
const letterOffer = "（过了一会之后）（不知道哪里变出一封信）请你收下这个，这个是小叶子写了好久好久的，希望芙芙看了会喜欢。";
const hug = actionOption("抱抱");

export type XiaoyePage = "hello" | "costume" | "hot" | "warm" | "received" |
  Phase | "lantern" | "dawn-hug" | "day-hug" | "dusk-hug" | "night-hug" | "lantern-hug" |
  "miss" | "fluffy" | "again";
interface Page {
  text: string;
  choices?: readonly (readonly [string, XiaoyePage])[];
  hug?: boolean;
  letterOffer?: string;
}
export const xiaoyePages: Record<XiaoyePage, Page> = {
  hello: {text:"（挥挥手）（展示自己毛茸茸的身体）", choices:[["宝宝你这是玩偶服嘛？","costume"]]},
  costume: {text:"不是哦，我是玩偶精灵OvO，我是实心的（给你一个大大的软乎乎的拥抱）", hug:true,
    choices:[["好热的拥抱","hot"],["好温暖的拥抱","warm"]]},
  hot: {text:"热也得抱，嘿嘿，谁让我粘人呢", letterOffer},
  warm: {text:"温暖的话就多抱会吧～", letterOffer},
  received: {text:"（芙芙收好小叶子的信封。）"},
  dawn: {text:"早呀，今天起的那么早，昨晚休息的好吗？记得多睡一会。", choices:[[hug,"dawn-hug"]]},
  "dawn-hug": {text:"早上起来抱一下，会不会让一天的心都温暖起来呢？", hug:true},
  day: {text:"中午好呀，要准备工作了吗？芙芙加油！", choices:[[hug,"day-hug"]]},
  "day-hug": {text:"如果可以的话，我希望无论是工作音还是助眠我都可以一直在你身边。", hug:true},
  dusk: {text:"太阳要落山了，一天又快过去了呢", choices:[[hug,"dusk-hug"]]},
  "dusk-hug": {text:"你是我的太阳，永远不会落下的那种", hug:true},
  night: {text:"工作辛苦啦，早点休息哦", choices:[[hug,"night-hug"]]},
  "night-hug": {text:"希望这个怀抱能让你的夜晚好眠", hug:true},
  lantern: {text:"希望这盏小灯能驱散未知的黑暗，给予你爱的安稳", choices:[[hug,"lantern-hug"]]},
  "lantern-hug": {text:"你在哪里，小灯就在哪里，哪里就是家", hug:true},
  miss: {text:"芙芙想我了嘛？好开心ヾ ^_^♪（抱抱你）", hug:true},
  fluffy: {text:"我这身玩偶是不是很可爱呢！毛茸茸的软乎乎的，嘿嘿。"},
  again: {text:"又见到你了，我想你了。"},
};
const familiar = ["miss","fluffy","again"] as const;

/** Visit zero is the first chat in this shift, even when returning from an older save. */
export function xiaoyeDailyPage(phase: Phase, visit: number): XiaoyePage {
  if (visit === 0) return phase;
  if (phase === "night" && visit === 1) return "lantern";
  return familiar[(visit - (phase === "night" ? 2 : 1)) % familiar.length];
}
