import type { Progress } from "./core.ts";
import type { GameId } from "./arcade-engines.ts";
import { REAL_MINUTES_PER_DAY } from "./day.ts";
import { ARCADES, TOWN_NPCS } from "./town-data.ts";
import { earnedSeals, rings, seals } from "./astrolabe.ts";
import { rainbowFlowers } from "./rainbow-flowers.ts";
import { producers } from "./star-catalog.ts";
import { deliveryIds } from "./letters.generated.ts";
import { achievementEvents, type AchievementEvent } from "./achievement-events.ts";
import { campEncounterIds, type CampEncounterId } from "./camp-encounters.ts";
import { townCollectionReward } from "./items.ts";
import { townInteriorKeys } from "./town-interior-id.ts";
import { townKeepsakeBadge, townKeepsakeChoice, townKeepsakeInfo } from "./town-keepsakes.ts";

export const achievementChapters = [
  { id: "daily", title: "日常与相遇" },
  { id: "letters", title: "周年来信" },
  { id: "games", title: "游园小游戏" },
  { id: "explore", title: "探索与彩蛋" },
  { id: "advanced", title: "进阶与陪伴" },
] as const;
export type ChapterId = typeof achievementChapters[number]["id"];
type Difficulty = "简单" | "普通" | "挑战" | "探索" | "进阶";
interface Definition {
  id: string;
  chapter: ChapterId;
  name: string;
  description: string;
  difficulty: Difficulty;
  hint?: string;
  letterId?: string;
}
export interface AchievementEntry extends Definition {
  keepsakeChoice?: string;
  current: number;
  goal: number;
  earned: boolean;
  progressLabel: string;
  details: string[];
}

const daily: Definition[] = [
  { id: "cake", chapter: "daily", name: "第一口草莓", difficulty: "简单", description: "在小屋吹灭蜡烛、切开蛋糕，任选一块给芙芙吃完。" },
  { id: "gifts", chapter: "daily", name: "缎带里的心意", difficulty: "简单", description: "解开礼物两侧的缎带，掀开盒盖，收下礼物。" },
  { id: "balloons", chapter: "daily", name: "把愿望交给风", difficulty: "简单", description: "给粉、蓝、紫三只气球充好气，一起放飞。" },
  { id: "fireworks", chapter: "daily", name: "夜空替我说", difficulty: "简单", description: "在周年花园的同一次互动中放出三朵烟花。开场的第一朵也算，收起后重新计数。" },
  { id: "courage", chapter: "daily", name: "带一朵勇气回家", difficulty: "普通", description: "穿过勇气花园，摘下终点的勇气之花。" },
  { id: "wreath", chapter: "daily", name: "芙芙今天戴花", difficulty: "简单", description: "捡到花环或采花编成花环后，在背包的「头饰」里为芙芙戴上它。" },
  { id: "bass", chapter: "daily", name: "把晚安弹给你", difficulty: "普通", description: "在白色贝斯上跟着提示亲手弹完 16 个音，静音也可以。" },
  { id: "memories", chapter: "daily", name: "这一年有画面", difficulty: "简单", description: "在小屋相册里点开任意一张照片，并在周年花园装入录像带、打开放映界面。两件事顺序不限，影片还在载入也算。" },
  { id: "fox", chapter: "daily", name: "嗷～嗷呜", difficulty: "简单", description: "摸摸小屋狐狸，让它舒服地眯起眼睛。" },
  { id: "fox-peace", chapter: "daily", name: "尾巴终于松开了", difficulty: "普通", description: "连续三次没摸小狐狸就离开小屋，它会生闷气。它躲开你的手时，留在屋里再摸一次，就能和好。", hint: "有时候，伸出去的手要再试一次。" },
  { id: "companions", chapter: "daily", name: "旅伴有两位", difficulty: "普通", description: "在周年花园找星星带上桃桃，找霉霉带上棉棉。两位旅伴都邀请过就能获得徽章，顺序不限。" },
  { id: "friends", chapter: "daily", name: "小路尽头都是朋友", difficulty: "挑战", description: "和下方名单里的每位朋友打过招呼。遇到小叶子时，陪它抱一会儿，等它松开才算相遇。" },
  { id: "bed-note", chapter: "daily", name: "床头留了一张便签", difficulty: "简单", description: "触发勇气花园的陷阱，回到小屋床上，看到小叶子的便签。", hint: "遇到小挫折回家时，看看枕边有没有人给你留话。" },
  { id: "welcome-pin", chapter: "daily", name: "银铃认出你啦", difficulty: "简单", description: "叫醒小镇迎宾员银铃，问问她在等谁，收到她送的一周年纪念胸针。" },
  { id: "qingya-bouquet", chapter: "daily", name: "青芽挑的那束花", difficulty: "简单", description: "和小镇的青芽聊聊喜欢的花，再收下她亲手挑的洋桔梗。" },
  { id: "baker-cake", chapter: "daily", name: "给你留的第一块", difficulty: "简单", description: "尝完小镇蛋糕师栗栗送的草莓蛋糕。当场吃或请栗栗留到下次都可以。" },
];

function letter(key: string, letterId: string, name: string, difficulty: Difficulty, description: string, hint?: string): Definition {
  return { id: "letter-" + key, chapter: "letters", letterId, name, difficulty, description, hint };
}
const letters = [
  letter("xiaoye", deliveryIds.xiaoye, "小叶子 · 绒爪递来的信", "普通", "在周年花园问小叶子是不是穿了玩偶服。它抱住你时任选一句回应，再收下它递来的信封。"),
  letter("yeshenhua", deliveryIds["radio-host"], "夜神华 · 夹在节目单里", "普通", "和夜神华聊起她当电台主持的原因，任选一个回答，再收下她递来的信。"),
  letter("kerry", "kerry-anniversary-letter", "Kerry · 灵验的祝福", "简单", "在晚安信箱里拆开 Kerry 的周年来信，看到正文即可。"),
  letter("suyan", deliveryIds.suyan, "苏颜 · 很多很多颗心", "简单", "和苏颜聊聊帽子，在大巴掌之后收下她递来的信。"),
  letter("zhenghao", deliveryIds.zhenghao, "正号 · 池塘边的悄悄话", "简单", "在小镇南边的池塘旁摸摸正号，或告诉它你也想它，再收下信封。"),
  letter("rabe", deliveryIds.rabe, "Rabe · 深夜有了去处", "简单", "在勇气花园收下 Rabe 的信，当场或稍后拆开，看到正文即可。"),
  letter("xiaoyou", deliveryIds.xiaoyou, "一橙橘小佑 · 果篮底的心意", "普通", "尝过小佑给的橘子后，在游戏里的任意一个清晨再找小佑交谈，向他道谢并收下信封。"),
  letter("guli", deliveryIds.guli, "故里 · 从鱼尾拆开", "普通", "和故里聊起烘焙跑腿员的话题，任选一个回答，再收下带着蛋糕香味的信。"),
  letter("post", deliveryIds.post, "红笺 · 晚安寄到了", "普通", "在小镇和红笺交谈，问她说的「缘分」是什么。她把信投进晚安信箱时就能获得徽章。"),
  letter("patrick", deliveryIds.patrick, "派大星 · 火边留下的信", "探索", "派大星在花海营火旁放下信封后，走近拾起就能获得徽章。以后回来捡也可以。", "草地上有些心意，要等人走近才看得见。"),
  letter("dianziyang", deliveryIds.dianziyang, "电子羊 · 新一年的存档点", "普通", "在小镇和电子羊交谈，收下它递来的周年信。"),
  letter("pigeon", deliveryIds.pigeon, "鸽子 · 咕咕有信", "普通", "在周年花园和鸽子交谈，收下它捎来的周年信。"),
  letter("xiaoaimen", "xiaoaimen-anniversary-letter", "小艾门 · 一枚红爪印", "简单", "在晚安信箱里拆开小艾门的周年来信，看到正文即可。"),
];

const gameRows: ReadonlyArray<{ id: GameId; name: string; difficulty: Difficulty; goal: number; verb: string; unit: string }> = [
  { id: "snake", name: "玉蛇衔春", difficulty: "普通", goal: 6, verb: "点亮", unit: "枚叶芽" },
  { id: "blocks", name: "把烦恼叠整齐", difficulty: "普通", goal: 4, verb: "累计消除", unit: "行" },
  { id: "hop", name: "月兔借我一步", difficulty: "普通", goal: 8, verb: "落上", unit: "个新平台" },
  { id: "flight", name: "飞过八道星门", difficulty: "普通", goal: 8, verb: "穿过", unit: "道星门" },
  { id: "link", name: "心愿总会相连", difficulty: "简单", goal: 8, verb: "消除", unit: "对相同图案" },
  { id: "mines", name: "星纹石上的安全路", difficulty: "普通", goal: 26, verb: "翻开全部", unit: "块安全砖" },
  { id: "miner", name: "井底也有星光", difficulty: "简单", goal: 160, verb: "取得", unit: "矿光" },
];
const games = gameRows.map(({ id, name, difficulty, verb, unit, goal }): Definition => ({
  id: "game-" + id, chapter: "games", name, difficulty,
  description: `在「${ARCADES[id].title}」中单局${verb} ${goal} ${unit}。`,
}));
games.push({ id: "qianxiao-duel-win", chapter: "games", name: "浅笑 · 赢下这一局",
  difficulty: "普通", description: "和浅笑玩星牌，赢下任意一局。" });
const explore: Definition[] = [
  { id: "rainbow", chapter: "explore", name: "种下一圈彩虹", difficulty: "普通", description: "采齐七种特殊花。周年花园和勇气花园各有两种，小镇有三种。" },
  { id: "day-secrets", chapter: "explore", name: "一天里的三个秘密", difficulty: "探索", description: "跟着游戏里的时钟，清晨采晨露花，黄昏拾金色纸船，星夜收下萤火心愿。周年花园和勇气花园都能找到这三样，可以分几天收齐。", hint: "花园里的小礼物跟着晨昏出现，今天错过的，改天也能再找。" },
  { id: "star-bottle", chapter: "explore", name: "瓶里住着一片星空", difficulty: "挑战", description: "拾齐花海草地上的全部署名星。", hint: "草叶之间藏着一片可以捧在手里的夜空。" },
  { id: "camp", chapter: "explore", name: "火边多了一个座位", difficulty: "探索", description: "在花海营火旁连续坐满 30 秒，等到派大星来陪你。", hint: "这里的火，好像够两个人烤。" },
  { id: "garden-tape", chapter: "explore", name: "藏在花海的这一年", difficulty: "探索", description: "在花海篝火左边找到并收下周年录像带。", hint: "小叶子记得，芙芙这一年的影像收在了哪里。" },
  { id: "flower-map", chapter: "explore", name: "绒爪画的小路", difficulty: "简单", description: "在周年花园向小叶子打听去花海的路，收到它的手绘地图。" },
  { id: "guardian-notebook", chapter: "explore", name: "守护者的扉页", difficulty: "普通", description: "在回声遗迹答应守护者试试谜题，收下《遗迹手记》。已经点亮星纹砖也可以回去找她领书。" },
  { id: "camp-encounters", chapter: "explore", name: "火光里的七次相遇", difficulty: "探索", description: "坐在花海营火旁，等七种奇遇自然出现，按 F 或点回应按钮分别回应一次。错过可以再等，分几次来也算。" },
  ...seals.map(({ id, name, hint }): Definition => ({
    id: "ruin-" + id, chapter: "explore", name,
    description: hint + "。", difficulty: id === "first" ? "简单" : id === "light" ? "挑战" : id === "radio" ? "探索" : "普通",
    ...(id === "radio" ? { hint: "三盏石灯都亮起时，听月泉的水声里好像还藏着什么。" } : {}),
  })),
  { id: "town-miko", chapter: "explore", name: "绯袴留影", difficulty: "挑战", description: "收齐七件小镇小物后，趁游戏里的白昼或黄昏去周年纪念馆找暖栗。收下绯袴巫女服就能获得徽章。" },
  ...townInteriorKeys.map((key): Definition => ({
    id: townKeepsakeBadge(key), chapter: "explore", name: townKeepsakeInfo[key].name, difficulty: "简单",
    description: `${townKeepsakeInfo[key].activity}，最后选择「收下」。`,
  })),
];
const days = [
  { days: 1, name: "和芙芙过了一天", difficulty: "简单" },
  { days: 3, name: "三次晨光", difficulty: "普通" },
  { days: 7, name: "小屋亮了七夜", difficulty: "进阶" },
] as const;
const advanced: Definition[] = [
  { id: "all-games", chapter: "advanced", name: "游园券上盖满啦", difficulty: "挑战", description: "将下方七款小游戏各通关一次，小镇四款，回声遗迹三款。每款的通关记录都会保留，可以分次完成。" },
  { id: "flight-16", chapter: "advanced", name: "星门后面还有星门", difficulty: "挑战", description: "在「芙芙晚安飞行」的任意一局中，穿过第 8 道星门时选择「继续游玩」，接着飞过第 16 道星门。" },
  { id: "miner-320", chapter: "advanced", name: "再往井底一点", difficulty: "进阶", description: "在「琥珀深井黄金矿工」的任意一局中，攒够 160 矿光时选择「继续游玩」，在同一局攒到至少 320 矿光。" },
  ...days.map(({ days, name, difficulty }): Definition => ({
    id: "days-" + days, chapter: "advanced", name, difficulty,
    description: `开始冒险后，保持联网且游戏页面可见，累计游玩 ${days * REAL_MINUTES_PER_DAY} 分钟。只计算实际经过的时间，可以分多次完成。`,
  })),
];
export const achievementDefinitions: readonly Definition[] = [...daily, ...letters, ...games, ...explore, ...advanced];

export interface AchievementMemory {
  facts: AchievementEvent[];
  /** In unlock order. Returning a companion or expanding a future catalogue never takes a stamp away. */
  earned: string[];
  legacyPending: boolean;
}
export function readAchievementMemory(raw?: Partial<AchievementMemory> | null, legacy = false): AchievementMemory {
  const ids = new Set(achievementDefinitions.map(d => d.id));
  return {
    facts: achievementEvents.filter(id => Array.isArray(raw?.facts) && raw.facts.includes(id)),
    earned: Array.isArray(raw?.earned) ? [...new Set(raw.earned.filter(id => ids.has(id)))] : [],
    legacyPending: raw ? raw.legacyPending === true : legacy,
  };
}
export function recordAchievementFact(progress: Progress, id: AchievementEvent): boolean {
  if (progress.achievements.facts.includes(id)) return false;
  progress.achievements.facts.push(id);
  return true;
}

function recoverScreeningVisit(into: Progress, source: Progress): boolean {
  // The garden screening hotspot records this visit independently of the badge book.
  // Preloading the video, or touching the separate small-TV photo stand, does not.
  return source.visited.includes("danmaku") && recordAchievementFact(into, "cinema-opened");
}

/** Other tabs can play and earn stamps independently while this page is open. */
export function mergeAchievementProgress(into: Progress, from: Progress): boolean {
  let changed = recoverScreeningVisit(into, from);
  for (const fact of from.achievements.facts) {
    if (recordAchievementFact(into, fact)) changed = true;
  }
  for (const id of from.achievements.earned) {
    if (!into.achievements.earned.includes(id)) {
      into.achievements.earned.push(id);
      changed = true;
    }
  }
  for (const { id } of gameRows) {
    const best = from.arcadeBests[id] ?? 0;
    if (best > (into.arcadeBests[id] ?? 0)) {
      into.arcadeBests[id] = best;
      changed = true;
    }
  }
  return changed;
}

export interface AchievementContext {
  townTalked: Iterable<string>;
  owned: readonly string[];
  wearingWreath: boolean;
  hasBouquet: boolean;
  hasFlowerMap: boolean;
  playSeconds: number;
  /** Remaining historical daily receipts: supply the egg IDs, not the day keys. */
  pickedEggs?: readonly string[];
}
const eggs = ["dew", "sunset", "firefly"] as const;
const campNames: Record<CampEncounterId, string> = {
  bird: "小鸟", butterfly: "火蝴蝶", jelly: "水母", marshmallow: "烤棉花糖",
  starFawn: "星角幼鹿", moonBoat: "月牙纸舟", cloudWhale: "云鲸",
};

/** Repair independent screening evidence on every load; other historical facts are imported once. */
export function migrateAchievementFacts(progress: Progress, context: AchievementContext): boolean {
  const recoveredScreening = recoverScreeningVisit(progress, progress);
  if (!progress.achievements.legacyPending) return recoveredScreening;
  const record = (id: AchievementEvent) => recordAchievementFact(progress, id);
  if (context.wearingWreath && context.owned.includes("wreath")) record("wreath-worn");
  if (progress.roomFox.visit === "petted") record("fox-content");
  if (progress.decoratorMet) record("garden-guest-decorator");
  if (progress.residents.guardianInvited) record("elder-guardian");
  if (context.owned.includes("petCat")) {
    record("petCat");
    record("garden-guest-balloon-friend");
  }
  if (context.owned.includes("petBunny")) {
    record("petBunny");
    record("garden-guest-decorator");
  }
  for (const egg of eggs) if (context.pickedEggs?.includes(egg)) record(egg);
  progress.achievements.legacyPending = false;
  return true;
}

interface Meter {
  keepsakeChoice?: string;
  current: number;
  goal: number;
  progressLabel: string;
  details: string[];
}
function meter(current: number, goal: number, unit: string, details: string[] = []): Meter {
  return { current, goal, progressLabel: `${current} / ${goal} ${unit}`, details };
}
const yesNo = (done: boolean): Meter => ({
  current: Number(done), goal: 1, progressLabel: done ? "已盖章" : "待收集", details: [],
});
const gardenResidents = [
  ["garden-guest-decorator", "霉霉"], ["garden-guest-balloon-friend", "星星"],
  ["garden-guest-picnic-friend", "晴糖"], ["garden-guest-suyan", "苏颜"], ["xiaoye-plush", "小叶子"],
] as const;

/** Evaluate the actual receipts. Opening a page, previewing an outfit and replaying a
 * greeting do not create progress for unrelated achievements. */
export function reconcileAchievements(progress: Progress, context: AchievementContext): {
  entries: AchievementEntry[]; fresh: string[];
} {
  const facts = new Set(progress.achievements.facts);
  const meters = new Map<string, Meter>();
  for (const id of ["cake", "gifts", "balloons", "fireworks", "courage"]) {
    meters.set(id, yesNo(progress.completed.includes(id)));
  }
  const wreath = yesNo(facts.has("wreath-worn"));
  if (context.owned.includes("wreath")) {
    wreath.details.push("花环 · 已收入背包");
  }
  meters.set("wreath", wreath);
  meters.set("bass", yesNo(progress.bassSongPlayed));
  const photo = facts.has("photo-opened"), cinema = facts.has("cinema-opened");
  const memories = meter(Number(photo) + Number(cinema), 2, "处回忆", [
    photo ? "相册 · 已翻开单张照片" : "相册 · 尚未翻开单张照片",
    cinema ? "放映 · 已打开花园大屏" : "放映 · 尚未打开花园大屏",
  ]);
  meters.set("memories", memories);
  meters.set("fox", yesNo(facts.has("fox-content")));
  meters.set("fox-peace", yesNo(facts.has("fox-reconciled")));
  const cat = facts.has("petCat"), bunny = facts.has("petBunny");
  const companions = meter(Number(cat) + Number(bunny), 2, "位旅伴", [
    `桃桃 · ${cat ? "已邀请" : "待邀请"}`, `棉棉 · ${bunny ? "已邀请" : "待邀请"}`,
  ]);
  meters.set("companions", companions);
  meters.set("bed-note", yesNo(progress.bedNoteUnlocked));

  const talked = new Set(context.townTalked);
  const groups = [
    { name: "小镇", people: TOWN_NPCS.map(n => ({ name: n.name, met: talked.has(n.id) })) },
    { name: "周年花园", people: gardenResidents.map(([id, name]) => ({ name, met: facts.has(id) })) },
    { name: "勇气花园", people: [{ name: "园丁爷爷", met: facts.has("elder-gardener") }] },
    { name: "回声遗迹", people: [{ name: "遗迹守护者", met: facts.has("elder-guardian") }] },
  ];
  const people = groups.flatMap(group => group.people);
  const friends = meter(people.filter(p => p.met).length, people.length, "位朋友", groups.map(group => {
    const remaining = group.people.filter(p => !p.met);
    const suffix = remaining.length ? " · 待相遇：" + remaining.map(p => p.name).join("、") : " · 已见齐";
    return `${group.name} ${group.people.length - remaining.length}/${group.people.length}${suffix}`;
  }));
  meters.set("friends", friends);

  const story = progress.residents;
  meters.set("welcome-pin", yesNo(story.welcomeReceived || context.owned.includes("anniversaryPin")));
  meters.set("qingya-bouquet", yesNo(context.hasBouquet));
  meters.set("baker-cake", yesNo(story.cake === "eaten"));
  meters.set("flower-map", yesNo(context.hasFlowerMap));
  meters.set("guardian-notebook", yesNo(story.guardianInvited));
  for (const letter of letters) {
    const id = letter.letterId!;
    const got = id === deliveryIds.post ? story.postDelivered
      : id === deliveryIds.patrick ? story.patrickDelivered
      : id === deliveryIds.rabe ? story.npcLetters[id] === "read"
      : story.publicLettersRead.includes(id) || !!story.npcLetters[id as keyof typeof story.npcLetters];
    meters.set(letter.id, yesNo(got));
  }
  let clearedGames = 0;
  meters.set("qianxiao-duel-win", yesNo(facts.has("qianxiao-duel-win")));
  for (const g of gameRows) {
    const best = progress.arcadeBests[g.id] ?? 0;
    const score = meter(best, g.goal, g.unit);
    score.progressLabel = "单局最好 " + score.progressLabel;
    meters.set("game-" + g.id, score);
    if (best >= g.goal) clearedGames++;
  }
  const allGames = meter(clearedGames, gameRows.length, "款游戏",
    gameRows.map(g => `${ARCADES[g.id].title} · ${(progress.arcadeBests[g.id] ?? 0) >= g.goal ? "已通关" : "待通关"}`));
  meters.set("all-games", allGames);
  meters.set("flight-16", meter(progress.arcadeBests.flight ?? 0, 16, "道星门（单局最好）"));
  meters.set("miner-320", meter(progress.arcadeBests.miner ?? 0, 320, "矿光（单局最好）"));

  const flowers = new Set(progress.rainbowFlowers);
  const remainingFlowers = rainbowFlowers.filter(f => !flowers.has(f.id));
  const rainbow = meter(rainbowFlowers.length - remainingFlowers.length, rainbowFlowers.length, "种花",
    ([["garden", "周年花园"], ["challenge", "勇气花园"], ["town", "小镇"]] as const).map(([scene, name]) => {
      const local = rainbowFlowers.filter(f => f.scene === scene);
      return `${name} ${local.filter(f => flowers.has(f.id)).length}/${local.length}`;
    }));
  // The existing flower trail gives clues; the journal never auto-picks a hidden flower.
  meters.set("rainbow", rainbow);
  meters.set("day-secrets", meter(eggs.filter(id => facts.has(id)).length, eggs.length, "个秘密"));
  meters.set("star-bottle", meter(producers.filter(p => progress.creditStars.includes(p.id)).length, producers.length, "颗落星"));
  meters.set("camp", yesNo(story.patrickArrived));
  const answered = campEncounterIds.filter(id => facts.has(`camp-response-${id}`));
  meters.set("camp-encounters", meter(answered.length, campEncounterIds.length, "种奇遇",
    campEncounterIds.map(id => `${campNames[id]} · ${answered.includes(id) ? "已回应" : "待回应"}`)));
  meters.set("garden-tape", yesNo(progress.gardenTape !== "missing"));
  const earnedInRuins = earnedSeals(progress.astrolabe, progress.echoes.listened);
  for (const seal of seals) meters.set("ruin-" + seal.id, yesNo(earnedInRuins.includes(seal.id)));
  for (const key of townInteriorKeys) {
    const owned = progress.townKeepsakes.items.includes(key);
    meters.set(townKeepsakeBadge(key), { ...yesNo(owned), keepsakeChoice: owned ? townKeepsakeChoice(progress.townKeepsakes, key) : undefined });
  }
  const keepsakes = townInteriorKeys.filter(key=>progress.townKeepsakes.items.includes(key)).length;
  const claimed = context.owned.includes(townCollectionReward);
  const collection = meter(keepsakes + Number(claimed), townInteriorKeys.length + 1, "步");
  collection.progressLabel = claimed && keepsakes === townInteriorKeys.length ? "已收下绯袴巫女服"
    : `小镇小物 ${keepsakes} / ${townInteriorKeys.length}` + (keepsakes === townInteriorKeys.length ? " · 待向暖栗领取" : "");
  meters.set("town-miko", collection);
  meters.set("ruin-set", meter(progress.astrolabe.found.length, rings.length, "枚星盘环"));
  const minutes = Math.floor(Math.max(0, Number.isFinite(context.playSeconds) ? context.playSeconds : 0) / 60);
  for (const { days: n } of days) {
    const id = "days-" + n;
    const play = meter(minutes, n * REAL_MINUTES_PER_DAY, "分钟前台游玩");
    if (minutes < play.goal && progress.achievements.earned.includes(id)) play.progressLabel = `已盖章 · 累计前台游玩 ${minutes} 分钟`;
    meters.set(id, play);
  }
  const fresh: string[] = [];
  const collected = new Set(progress.achievements.earned);
  const entries = achievementDefinitions.map(d => {
    const m = meters.get(d.id)!;
    const earned = collected.has(d.id) || (m.goal > 0 && m.current >= m.goal);
    if (earned && !collected.has(d.id)) fresh.push(d.id);
    return { ...d, ...m, earned };
  });
  progress.achievements.earned.push(...fresh);
  return { entries, fresh };
}
