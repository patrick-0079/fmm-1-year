import { actionOption } from "./dialogue-options.ts";
import type { Phase } from "./day.ts";
import { handedLetters } from "./resident-story.ts";
import type { TownPage } from "./town-dialogue.ts";

type Script = Record<string, TownPage>;
export const guestDialogues = {
  "radio-host": {
    start: {text:"芙芙你来啦，你知道为什么我要当晚安电台的主持人嘛？", choices:[
      ["因为你梦想成为主持？", "offer-letter"], ["因为你喜欢？", "offer-letter"],
    ]},
    "offer-letter": {text:"都不是哦，因为只有我就可以第一时间转播芙芙的直播啦，可以最快听到芙芙的声音。这里还有你的一封信哦！", letter:handedLetters["radio-host"], collectLabel:"收下信封"},
    dawn: {text:"唔，这么早就出来逛了呀，要注意休息哦。", choices:[["好哦，宝宝也是", "@close"]]},
    day: {text:"芙芙今天的午播是不是要开始啦？", choices:[["是的哦", "prepare"], ["今天应该是要咕咕咕了", "rest"]]},
    prepare: {text:"那我要赶快回去做准备了！"}, rest: {text:"没关系，那就多休息一点"},
    night: {text:"辛苦啦芙，早点回去休息吧！", choices:[["宝宝你也是", "@close"]]},
    studio: {text:"是不是马上要开播啦！我已经在调试设备了，第一时间就可以转播！"},
    again: {text:"直播辛苦啦芙芙，下次开播我也会在这里，让大家都能听到你的声音"},
  },
  xiaoyou: {
    start: {text:"芙芙姐姐！小佑挑了篮子里最甜的一颗橘子，想送给你。", choices:[[actionOption("收下橘子"), "receive-orange"]]},
    "receive-orange": {text:"（小佑把橘子递到芙芙手里。）", choices:[[actionOption("尝一瓣"), "taste-orange"]]},
    "taste-orange": {text:"甜吗？我挑了好久呢！啊，给姐姐的信忘在家里啦……清晨再来田边找我好不好？我一定带来！"},
    "taste-at-dawn": {text:"甜吗？我挑了好久呢！啊，给姐姐的信忘在家里啦……我回去拿一下，姐姐一会儿再来田边找我好不好？", pose:"taste-orange"},
    dawn: {text:"芙芙姐姐，把橘子举到太阳底下看！这一瓣边上透亮亮的，我差点举着就咬了一口。但是我知道那一定最甜，所以我给你留下来啦！", pose:"orange-sun", choices:[["谢谢宝宝～", "morning-thanks"]]},
    "morning-thanks": {text:"不用谢，这是我应该做的！", pose:"receive-orange"},
    "offer-letter": {text:"不用谢，这是我应该做的！还有这封信，也是我留下的！", pose:"orange-letter", letter:handedLetters.xiaoyou, collectLabel:"收下信封"},
    day: {text:"芙芙姐姐，这个橘子给你，午播之前补充一点维生素吧！", choices:[[actionOption("收下橘子"), "day-orange"]]},
    "day-orange": {text:"希望这个能让你工作更有动力！", pose:"receive-orange"},
    night: {text:"芙芙姐姐，小佑今天的橘子都卖出去啦，没有橘子了。但是小佑可以给你一个橘子味的拥抱！", choices:[[actionOption("抱抱小佑"), "orange-hug"]]},
    "orange-hug": {text:"希望这样能让姐姐的烦恼烟消云散。"},
    "again-a": {text:"姐姐还想吃橘子吗？那我再给你挑几个。"}, "again-b": {text:"姐姐有闻到我身上的橘子香味吗～嘿嘿"},
  },
  guli: {
    start: {text:"知道为什么故里要成为烘焙跑腿员嘛？", choices:[["因为故里喜欢吃甜品？","offer-letter"],["不知道哦","offer-letter"]]},
    "offer-letter": {text:"因为故里想第一时间就把甜蜜送到芙芙手里！希望芙芙的生活能一天过的比一天甜！对了，这里有一封有着蛋糕香味的信～请芙芙收下！", letter:handedLetters.guli, collectLabel:"收下信封"},
    dawn: {text:"今早的蛋糕新鲜出炉了哦，我给你留了最甜的一块！", choices:[["好哦，让我尝尝","taste-cake"]]},
    "taste-cake": {text:"是不是很甜呀！和你一样甜呢！"},
    day: {text:"唔啊，到饭点了好忙碌呀，故里要开始疯狂飞奔啦！", pose:"box-run", choices:[["辛苦啦宝宝，注意休息","day-reply"]]},
    "day-reply": {text:"没事的！多工作就可以有资本给芙芙带来更好的爱！"},
    night: {text:"好累呀，忙活了一天了呢～", choices:[["来直播间休息休息吧宝宝","night-reply"]]},
    "night-reply": {text:"好呀，我已经想你一天了！"},
    "again-a": {text:"芙芙又来啦，要不要咬我一口试试，嘿嘿，我是最甜的苹果哦！"}, "again-b": {text:"怎么啦？想吃蛋糕啦，嘘，我给你留了一块哦。"},
  },
  qianxiao: {
    start: {text:"芙芙！快看这张我新做的卡！是不是超酷", hint:"芙芙看见新卡底下还压着一张卡片。", pose:"show-card", choices:[["很不错呢！咦，底下这张是什么呀？","photo"]]},
    photo: {text:"（慌乱）（连忙收起）这…这张是你的照片…不是卡，我想你的时候就会看看。"},
    dawn: {text:"一大早就来和我决斗吗！看来你做好准备了呢！", choices:[[actionOption("与浅笑开一局牌局"),"@duel"]]},
    day: {text:"开播前来和我玩一把怎么样！放松一下！", choices:[[actionOption("与浅笑开一局牌局"),"@duel"]]},
    night: {text:"终于下播啦！辛苦了！要和我玩一把么？", choices:[[actionOption("与浅笑开一局牌局"),"handicap"],["工作累了，想休息","rest"]]},
    handicap: {text:"工作的那么辛苦，那我就让让你吧！", choices:[[actionOption("拿起自己的手牌"),"@duel"]]},
    rest: {text:"那就好好休息吧，我一直会在这里等着你。"},
    "again-a": {text:"你来啦！有空记得来和我玩几局游戏王！"}, "again-b": {text:"我又准备了几套新的卡组，有空来和我试试呀！"},
  },
} satisfies Record<string, Script>;

export type GuestId = keyof typeof guestDialogues;
export function isGuestDialogue(id: string): id is GuestId {
  return Object.hasOwn(guestDialogues, id);
}
export function guestDailyPage(id: GuestId, phase: Phase, inside: boolean, pick: number) {
  if (pick >= 0) return id === "radio-host" ? "again" : pick === 0 ? "again-a" : "again-b";
  return id === "radio-host" && inside ? "studio" : phase;
}
