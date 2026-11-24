import type { Point } from "./core.ts";
import type { BaseSceneId, Hotspot, SceneId } from "./maps.ts";
import { isTownInterior } from "./town-interior-id.ts";
import { townInteriors } from "./town-interiors.ts";

export type InteractionCueKind = "talk" | "pet" | "collect" | "read" | "rest" | "celebrate" | "game" | "exit" | "mechanism";
export interface InteractionCue {
  kind: InteractionCueKind;
  action: string;
  verb: string;
  /** Small reflective detail, relative to the hotspot's current foot position. */
  anchor: Point;
  /** The illustration already communicates this target without extra sparkles. */
  natural: boolean;
  /** Painted subject bounds relative to the hotspot, for the adjacent label. */
  objectBox: { x: number; y: number; w: number; h: number };
}

const verbs: Record<InteractionCueKind, string> = {
  talk: "交谈", pet: "摸摸", collect: "拾取", read: "阅读", rest: "休息",
  celebrate: "体验", game: "游玩", exit: "前往", mechanism: "查看",
};
function cue(kind: InteractionCueKind, action: string, x: number, y: number,
  box: [number, number, number, number], natural = false, verb = verbs[kind]): InteractionCue {
  return { kind, action, verb, anchor: { x, y }, natural,
    objectBox: { x: box[0], y: box[1], w: box[2], h: box[3] } };
}

// Anchors follow a visible detail of the illustration, not the former floating
// exclamation mark. These offsets are also safe for the moving NPC foot points.
const objects: Record<string, InteractionCue> = {
  "white-bass": cue("celebrate", "弹奏白色贝斯", 3, -34, [-14, -62, 28, 64], false, "弹奏"),
  "room-fox": cue("pet", "摸摸小狐狸", 10, -16, [-18, -29, 36, 31], true),
  bed: cue("rest", "躺下休息", 33, 11, [-59, -53, 118, 104]),
  cake: cue("celebrate", "享用周年蛋糕", 19, 25, [-39, -24, 78, 83], false, "享用"),
  gifts: cue("celebrate", "拆开礼物", -13, -5, [-51, -37, 99, 112], false, "拆礼物"),
  letters: cue("read", "阅读晚安来信", 7, 14, [-15, 7, 35, 31]),
  album: cue("read", "翻开回忆相册", -13, -7, [-26, -20, 41, 29], false, "翻阅"),
  balloons: cue("celebrate", "放飞心愿气球", 14, 8, [-65, -63, 130, 110], false, "放飞"),
  danmaku: cue("celebrate", "观看周年放映", 59, 10, [-72, -49, 147, 86], true, "观看"),
  fireworks: cue("celebrate", "绽放周年烟花", 6, 9, [-42, -20, 82, 54], false, "放烟花"),
  bili: cue("celebrate", "到小电视前打卡", 10, -5, [-36, -37, 72, 72], false, "打卡"),
  courage: cue("collect", "摘一朵勇气之花", 7, -1, [-15, -20, 30, 33], false, "采下"),
  apple: cue("collect", "摘一颗苹果", -17, -9, [-42, -71, 84, 98], false, "采摘"),
  flowers: cue("collect", "采一朵小花", 8, -8, [-24, -22, 48, 35], false, "采下"),
  wreath: cue("collect", "捡起花环", 11, -7, [-17, -20, 34, 24]),
  drop: cue("collect", "捡起闪亮星屑", 8, -10, [-16, -22, 32, 27]),
  rest: cue("rest", "坐下歇一会", 26, -15, [-38, -25, 76, 46]),
  dew: cue("collect", "采下晨露花", 8, -21, [-16, -30, 32, 40], false, "采下"),
  sunset: cue("collect", "拾起金色小纸船", 8, -1, [-17, -14, 34, 24]),
  firefly: cue("celebrate", "收下一份萤火心愿", 0, -20, [-28, -26, 56, 45], true, "许愿"),
  "echo-altar": cue("mechanism", "试听祭坛回声", 18, -26, [-40, -49, 80, 70], true, "试听"),
  "echo-pool": cue("mechanism", "倾听旧电波", 6, -16, [-23, -26, 46, 37], true, "倾听"),
  "star-notebook": cue("read", "查阅寻环线索", 9, -18, [-15, -26, 30, 30], false, "翻阅"),
  "star-plate": cue("mechanism", "查看月相星盘", 20, -32, [-30, -54, 60, 60], true),
  "star-brick": cue("mechanism", "查看星纹砖", 8, -8, [-12, -19, 24, 30], true),
  "meadow-camp": cue("rest", "在营火边坐坐", 13, -15, [-24, -28, 48, 43], true),
  "meadow-jar": cue("read", "看看星光瓶", 5, -15, [-9, -24, 18, 28], true, "查看"),
};
const destinations: Record<BaseSceneId, string> = {
  room: "晚安小屋", garden: "周年花园", challenge: "勇气花园", town: "周年小镇", meadow: "花海", ruins: "回声遗迹",
};
const names = (spot: Hotspot) => spot.title.split(" · ")[0];

/** Rendering-only metadata. Availability and click geometry remain with World. */
export function resolveCue(spot: Hotspot, scene: SceneId): InteractionCue {
  if (spot.cue) return spot.cue;
  if (spot.portal) {
    const tall = spot.id === "echo-gate" || spot.id === "prism-arch";
    const title = isTownInterior(spot.portal) ? townInteriors[spot.portal].scene.title : destinations[spot.portal];
    return cue("exit", "前往" + title, 0, tall ? -31 : -7,
      tall ? [-35, -72, 70, 76] : [-27, -20, 54, 30], true);
  }
  const known = objects[spot.id];
  if (spot.id === "apple" && scene === "garden")
    return cue("collect", spot.title, 11, -11, [-21, -23, 42, 28], false, "拿苹果");
  if (known) return known;
  if (spot.id === "npc-cat")
    return cue("pet", "摸摸奶糖", 10, -24, [-17, -29, 34, 33]);
  if (spot.id.startsWith("npc-") || spot.id.startsWith("garden-guest-") || spot.id.startsWith("elder-"))
    return cue("talk", "与" + names(spot) + "交谈", 13, -43, [-17, -44, 34, 49]);
  if (spot.id.startsWith("arcade-")) {
    const ruin = scene === "ruins";
    return cue("game", "玩" + spot.title, ruin ? 16 : 23, ruin ? -13 : -5,
      ruin ? [-26, -35, 52, 54] : [-34, -89, 68, 106], ruin);
  }
  if (spot.id.startsWith("prism-"))
    return cue("collect", spot.title, 4, -8, [-9, -17, 18, 23], true, "采下");
  if (spot.id.startsWith("star-ring-"))
    return cue("collect", spot.title, 6, -11, [-12, -19, 24, 25], true);
  if (spot.id.startsWith("star-mirror-"))
    return cue("mechanism", spot.id.endsWith("0") ? "转动上方铜镜" : "转动下方铜镜", 8, -6, [-12, -12, 24, 24], true, "转动");
  if (scene === "meadow" && spot.id.startsWith("star-"))
    return cue("collect", "拾起草间的落星", 5, -10, [-12, -18, 24, 24], true);
  // New authored hotspots remain usable before their decorative offset is tuned.
  // They receive an explicit action label, but no speculative ambient sparkle.
  return cue("read", "查看" + spot.title, 0, -12, [-16, -32, 32, 36], true, "查看");
}
