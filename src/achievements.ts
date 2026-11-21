import type { Progress } from "./core.ts";
import type { SceneId } from "./maps.ts";
import type { GameId } from "./arcade-engines.ts";
import { ARCADES, TOWN_NPCS } from "./town-data.ts";
import { earnedSeals, rings, seals } from "./astrolabe.ts";
import { rainbowFlowers } from "./rainbow-flowers.ts";
import { producers } from "./star-catalog.ts";
import { deliveryIds } from "./letters.generated.ts";
import { achievementEvents, type AchievementEvent } from "./achievement-events.ts";

export const achievementChapters = [
  { id: "daily", title: "日常与相遇" },
  { id: "letters", title: "周年来信" },
  { id: "games", title: "游园小游戏" },
  { id: "explore", title: "探索与彩蛋" },
  { id: "advanced", title: "进阶与陪伴" },
] as const;
export type ChapterId = typeof achievementChapters[number]["id"];
type Difficulty = "简单" | "普通" | "挑战" | "探索" | "进阶";
export interface AchievementTarget { scene: SceneId; spot: string }
interface Definition {
  id: string;
  chapter: ChapterId;
  name: string;
  description: string;
  difficulty: Difficulty;
  target?: AchievementTarget;
  hint?: string;
  letterId?: string;
}
export interface AchievementEntry extends Definition {
  current: number;
  goal: number;
  earned: boolean;
  progressLabel: string;
  details: string[];
}
const target = (scene: SceneId, spot: string): AchievementTarget => ({ scene, spot });

const daily: Definition[] = [
  { id: "cake", chapter: "daily", name: "第一口草莓", difficulty: "简单", description: "在小屋吹灭蜡烛、切开蛋糕，让芙芙吃完第一块。", target: target("room", "cake") },
  { id: "gifts", chapter: "daily", name: "缎带里的心意", difficulty: "简单", description: "解开礼物两侧的缎带，掀开盒盖，收下礼物。", target: target("room", "gifts") },
  { id: "balloons", chapter: "daily", name: "把愿望交给风", difficulty: "简单", description: "给粉、蓝、紫三只气球充好气，一起放飞。", target: target("garden", "balloons") },
  { id: "fireworks", chapter: "daily", name: "夜空替我说", difficulty: "简单", description: "在周年花园的一次烟花互动中放出三朵烟花。", target: target("garden", "fireworks") },
  { id: "courage", chapter: "daily", name: "带一朵勇气回家", difficulty: "普通", description: "穿过勇气花园，摘下终点的勇气之花。", target: target("challenge", "courage") },
  { id: "wreath", chapter: "daily", name: "芙芙今天戴花", difficulty: "简单", description: "捡到花环，给芙芙正式佩戴一次。", target: target("garden", "wreath") },
  { id: "bass", chapter: "daily", name: "把晚安弹给你", difficulty: "普通", description: "在白色贝斯上跟着提示亲手弹完 16 个音，静音也可以。", target: target("room", "white-bass") },
  { id: "memories", chapter: "daily", name: "这一年有画面", difficulty: "简单", description: "在任一相册点开一张单张照片，再到花园打开放映，顺序不限。", target: target("room", "album") },
  { id: "fox", chapter: "daily", name: "嗷～嗷呜", difficulty: "简单", description: "摸摸小屋狐狸，让它舒服地眯起眼睛。", target: target("room", "room-fox") },
  { id: "fox-peace", chapter: "daily", name: "尾巴终于松开了", difficulty: "普通", description: "小狐狸生闷气后，在同一次回家里摸它两次，和它和好。", hint: "有时候，伸出去的手要再试一次。" },
  { id: "companions", chapter: "daily", name: "旅伴有两位", difficulty: "普通", description: "分别从星星和霉霉那里正式邀请桃桃与棉棉同行。", target: target("garden", "garden-guest-balloon-friend") },
  { id: "friends", chapter: "daily", name: "小路尽头都是朋友", difficulty: "挑战", description: "与四张地图上的每位常驻角色互动，小叶子的拥抱要等它轻轻松开。" },
  { id: "bed-note", chapter: "daily", name: "床头留了一张便签", difficulty: "简单", description: "触发勇气花园的陷阱，回到小屋床上，看到小叶子的便签。", hint: "走累的时候，枕边也许有人给你留了话。" },
];

function letter(key: string, letterId: string, name: string, difficulty: Difficulty, description: string, destination?: AchievementTarget, hint?: string): Definition {
  return { id: "letter-" + key, chapter: "letters", letterId, name, difficulty, description, target: destination, hint };
}
const letters = [
  letter("xiaoye", deliveryIds.xiaoye, "小叶子 · 绒爪递来的信", "普通", "在周年花园抱完小叶子，选择「收下信」。", target("garden", "xiaoye-plush")),
  letter("yeshenhua", deliveryIds["radio-host"], "夜神华 · 夹在节目单里", "普通", "和夜神华聊完一个话题，查看节目单并收下信。", target("town", "npc-radio-host")),
  letter("kerry", "kerry-anniversary-letter", "Kerry · 灵验的祝福", "简单", "拆开 Kerry 的周年来信，让正文在眼前展开。", target("room", "letters")),
  letter("suyan", deliveryIds.suyan, "苏颜 · 很多很多颗心", "简单", "和苏颜聊到小花封口，收下她手里的信。", target("garden", "garden-guest-suyan")),
  letter("rabe", "rabe-anniversary-letter", "Rabe · 深夜有了去处", "简单", "拆开 Rabe 的周年来信，让正文在眼前展开。", target("room", "letters")),
  letter("xiaoyou", deliveryIds.xiaoyou, "一橙橘小佑 · 果篮底的心意", "普通", "尝过橘子，查看果篮，收下小佑包好的信。", target("town", "npc-xiaoyou")),
  letter("guli", deliveryIds.guli, "故里 · 从鱼尾拆开", "普通", "看过鱼别针，问起故里手里的东西并收下信。", target("town", "npc-guli")),
  letter("post", deliveryIds.post, "红笺 · 晚安寄到了", "普通", "在小镇邮局和红笺聊到她把信投出去。", target("town", "npc-post")),
  letter("patrick", deliveryIds.patrick, "派大星 · 火边留下的信", "探索", "在花海的营火旁亲手拾起派大星留下的信。", undefined, "草地上有些心意，要等人走近才看得见。"),
];

const gameRows: ReadonlyArray<{ id: GameId; name: string; difficulty: Difficulty; goal: number; verb: string; unit: string }> = [
  { id: "snake", name: "玉蛇衔春", difficulty: "普通", goal: 6, verb: "点亮", unit: "枚叶芽" },
  { id: "blocks", name: "把烦恼叠整齐", difficulty: "普通", goal: 4, verb: "消除", unit: "行" },
  { id: "hop", name: "月兔借我一步", difficulty: "普通", goal: 8, verb: "落上", unit: "个新平台" },
  { id: "flight", name: "飞过八道星门", difficulty: "普通", goal: 8, verb: "穿过", unit: "道星门" },
  { id: "link", name: "心愿总会相连", difficulty: "简单", goal: 8, verb: "连成", unit: "对图案" },
  { id: "mines", name: "星纹石上的安全路", difficulty: "普通", goal: 26, verb: "翻开", unit: "块安全砖" },
  { id: "miner", name: "井底也有星光", difficulty: "简单", goal: 160, verb: "取得", unit: "矿光" },
];
const gameTarget = (id: GameId) => target(ARCADES[id].scene, "arcade-" + id);
const games = gameRows.map(({ id, name, difficulty, verb, unit, goal }): Definition => ({
  id: "game-" + id, chapter: "games", name, difficulty, target: gameTarget(id),
  description: `在「${ARCADES[id].title}」中单局${verb} ${goal} ${unit}。`,
}));
const explore: Definition[] = [
  { id: "rainbow", chapter: "explore", name: "把彩虹种成一扇门", difficulty: "普通", description: "在周年花园、勇气花园和小镇亲手采齐七种特殊花。" },
  { id: "day-secrets", chapter: "explore", name: "一天里的三个秘密", difficulty: "探索", description: "清晨采晨露花，黄昏拾金色纸船，星夜触发萤火心愿。可以跨天完成。", hint: "同一条溪流，一天会捎来几种小礼物？" },
  { id: "star-bottle", chapter: "explore", name: "瓶里住着一片星空", difficulty: "挑战", description: "拾齐花海草地上的全部署名星。", hint: "草叶之间藏着一片可以捧在手里的夜空。" },
  { id: "camp", chapter: "explore", name: "火边多了一个座位", difficulty: "探索", description: "在花海营火旁连续坐满 30 秒，等到派大星来陪你。", hint: "这里的火，好像够两个人烤。" },
  ...seals.map(({ id, name, hint }): Definition => ({
    id: "ruin-" + id, chapter: "explore", name,
    description: hint + "。", difficulty: id === "first" ? "简单" : id === "light" ? "挑战" : id === "radio" ? "探索" : "普通",
    ...(id === "radio" ? { hint: "听月泉边，连最轻的声音也能传很远。" } : {}),
  })),
];
const days = [
  { days: 1, name: "和芙芙过了一天", difficulty: "简单" },
  { days: 3, name: "三次晨光", difficulty: "普通" },
  { days: 7, name: "小屋亮了七夜", difficulty: "进阶" },
] as const;
const advanced: Definition[] = [
  { id: "all-games", chapter: "advanced", name: "游园券上盖满啦", difficulty: "挑战", description: "在小镇与遗迹的七款小游戏各通关一次，可以分几次游玩。" },
  { id: "flight-16", chapter: "advanced", name: "星门后面还有星门", difficulty: "挑战", description: "芙芙晚安飞行单局穿过 16 道星门，首次达标后选择「继续游玩」。", target: gameTarget("flight") },
  { id: "miner-320", chapter: "advanced", name: "再往井底一点", difficulty: "进阶", description: "琥珀深井黄金矿工单局收集 320 矿光，首次达标后选择「继续游玩」。", target: gameTarget("miner") },
  ...days.map(({ days, name, difficulty }): Definition => ({
    id: "days-" + days, chapter: "advanced", name, difficulty,
    description: `开始探索后前台累计游玩 ${days * 10} 分钟，相当于 ${days} 个游戏日。可以分次累积。`,
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

/** Other tabs can play and earn stamps independently while this page is open. */
export function mergeAchievementProgress(into: Progress, from: Progress) {
  for (const fact of from.achievements.facts) recordAchievementFact(into, fact);
  for (const id of from.achievements.earned) {
    if (!into.achievements.earned.includes(id)) into.achievements.earned.push(id);
  }
  for (const { id } of gameRows) {
    const best = from.arcadeBests[id] ?? 0;
    if (best > (into.arcadeBests[id] ?? 0)) into.arcadeBests[id] = best;
  }
}

export interface AchievementContext {
  townTalked: Iterable<string>;
  owned: readonly string[];
  wearingWreath: boolean;
  playSeconds: number;
  /** Remaining historical daily receipts: supply the egg IDs, not the day keys. */
  pickedEggs?: readonly string[];
}
const eggs = ["dew", "sunset", "firefly"] as const;

/** Once per pre-book save, only import actions evidenced by actual saved gameplay. */
export function migrateAchievementFacts(progress: Progress, context: AchievementContext): boolean {
  if (!progress.achievements.legacyPending) return false;
  const record = (id: AchievementEvent) => recordAchievementFact(progress, id);
  if (context.wearingWreath && context.owned.includes("wreath")) record("wreath-worn");
  if (progress.roomFox.visit === "petted") record("fox-content");
  if (progress.visited.includes("danmaku")) record("cinema-opened");
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
  current: number;
  goal: number;
  progressLabel: string;
  details: string[];
  target?: AchievementTarget;
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
    wreath.details.push("花环已经在背包里。打开背包，选中花环并确认佩戴。");
    wreath.target = undefined;
  }
  meters.set("wreath", wreath);
  meters.set("bass", yesNo(progress.bassSongPlayed));
  const photo = facts.has("photo-opened"), cinema = facts.has("cinema-opened");
  const memories = meter(Number(photo) + Number(cinema), 2, "处回忆", [
    photo ? "相册 · 已翻开单张照片" : "相册 · 点开一张照片",
    cinema ? "放映 · 已打开花园大屏" : "放映 · 去花园的大屏看看",
  ]);
  memories.target = photo && !cinema ? target("garden", "danmaku") : target("room", "album");
  meters.set("memories", memories);
  meters.set("fox", yesNo(facts.has("fox-content")));
  meters.set("fox-peace", yesNo(facts.has("fox-reconciled")));
  const cat = facts.has("petCat"), bunny = facts.has("petBunny");
  const companions = meter(Number(cat) + Number(bunny), 2, "位旅伴", [
    `桃桃 · ${cat ? "已同行" : "去见星星"}`, `棉棉 · ${bunny ? "已同行" : "去见霉霉"}`,
  ]);
  companions.target = target("garden", cat && !bunny ? "garden-guest-decorator" : "garden-guest-balloon-friend");
  meters.set("companions", companions);
  meters.set("bed-note", yesNo(progress.bedNoteUnlocked));

  const talked = new Set(context.townTalked);
  const groups = [
    { name: "小镇", scene: "town" as const, people: TOWN_NPCS.map(n => ({ name: n.name, id: "npc-" + n.id, met: talked.has(n.id) })) },
    { name: "周年花园", scene: "garden" as const, people: gardenResidents.map(([id, name]) => ({ name, id, met: facts.has(id) })) },
    { name: "勇气花园", scene: "challenge" as const, people: [{ name: "园丁爷爷", id: "elder-gardener", met: facts.has("elder-gardener") }] },
    { name: "回声遗迹", scene: "ruins" as const, people: [{ name: "遗迹守护者", id: "elder-guardian", met: facts.has("elder-guardian") }] },
  ];
  const people = groups.flatMap(group => group.people);
  const friends = meter(people.filter(p => p.met).length, people.length, "位朋友", groups.map(group => {
    const remaining = group.people.filter(p => !p.met);
    const suffix = remaining.length ? " · 待相遇：" + remaining.map(p => p.name).join("、") : " · 已见齐";
    return `${group.name} ${group.people.length - remaining.length}/${group.people.length}${suffix}`;
  }));
  for (const group of groups) {
    const next = group.people.find(n => !n.met);
    if (next) { friends.target = target(group.scene, next.id); break; }
  }
  meters.set("friends", friends);

  const story = progress.residents;
  for (const letter of letters) {
    const id = letter.letterId!;
    const got = id === deliveryIds.post ? story.postDelivered
      : id === deliveryIds.patrick ? story.patrickDelivered
      : story.publicLettersRead.includes(id) || !!story.npcLetters[id as keyof typeof story.npcLetters];
    meters.set(letter.id, yesNo(got));
  }
  const unplayed = [];
  for (const g of gameRows) {
    const best = progress.arcadeBests[g.id] ?? 0;
    const score = meter(best, g.goal, g.unit);
    score.progressLabel = "单局最好 " + score.progressLabel;
    meters.set("game-" + g.id, score);
    if (best < g.goal) unplayed.push(g);
  }
  const allGames = meter(gameRows.length - unplayed.length, gameRows.length, "款游戏",
    gameRows.map(g => `${ARCADES[g.id].title} · ${(progress.arcadeBests[g.id] ?? 0) >= g.goal ? "已通关" : "待通关"}`));
  if (unplayed.length) allGames.target = gameTarget(unplayed[0].id);
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
  const earnedInRuins = earnedSeals(progress.astrolabe, progress.echoes.listened);
  for (const seal of seals) meters.set("ruin-" + seal.id, yesNo(earnedInRuins.includes(seal.id)));
  meters.set("ruin-set", meter(progress.astrolabe.found.length, rings.length, "枚星盘环"));
  meters.get("ruin-first")!.target = target("ruins", "star-notebook");
  meters.get("ruin-set")!.target = target("ruins", "star-notebook");
  meters.get("ruin-plate")!.target = target("ruins", "star-plate");
  meters.get("ruin-light")!.target = target("ruins", "star-mirror-0");
  for (const { days: n } of days) {
    const minutes = Math.floor(Math.max(0, Number.isFinite(context.playSeconds) ? context.playSeconds : 0) / 60);
    meters.set("days-" + n, meter(minutes, n * 10, "分钟前台游玩"));
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
