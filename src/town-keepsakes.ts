import { townInteriorKeys, type TownInteriorKey } from "./town-interior-id.ts";

export type RadioTrack = "creek" | "bells";
type PaperShop = "florist" | "post";
type PaperDesign = "cream" | "lilac" | "flags" | "lamps";
const paperShops: readonly PaperShop[] = ["florist", "post"];
const validDesign = (key: PaperShop, value: unknown): value is PaperDesign =>
  key === "florist" ? value === "cream" || value === "lilac" : value === "flags" || value === "lamps";
export interface TownKeepsakes {
  items: TownInteriorKey[];
  designs?: Partial<Record<PaperShop, { choice: PaperDesign; at: number }>>;
  radioTrack?: RadioTrack;
  radioRecordedAt?: number;
}

export function readTownKeepsakes(raw: unknown): TownKeepsakes {
  const saved = raw as Partial<TownKeepsakes> | null | undefined;
  const savedItems = saved?.items;
  const items = Array.isArray(savedItems) ? townInteriorKeys.filter(key => savedItems.includes(key)) : [];
  const book: TownKeepsakes = { items };
  for (const key of paperShops) {
    const design = saved?.designs?.[key];
    if (items.includes(key) && design && validDesign(key, design.choice) && Number.isFinite(design.at) && design.at > 0) {
      (book.designs ??= {})[key] = { choice: design.choice, at: design.at };
    }
  }
  const track = saved?.radioTrack;
  if (!items.includes("radio") || (track !== "creek" && track !== "bells")) return book;
  book.radioTrack = track;
  const recorded = saved?.radioRecordedAt;
  if (typeof recorded === "number" && Number.isFinite(recorded) && recorded > 0) book.radioRecordedAt = recorded;
  return book;
}

export function townKeepsakeChoice(book: TownKeepsakes, key: TownInteriorKey) {
  if (key === "florist") return book.designs?.florist?.choice ?? "lilac";
  if (key === "post") return book.designs?.post?.choice ?? "flags";
  if (key === "radio") return book.radioTrack ?? "creek";
}

export function collectTownKeepsake(book: TownKeepsakes, key: TownInteriorKey, choice?: string, at = Date.now()) {
  const first = !book.items.includes(key);
  if (first) book.items.push(key);
  if ((key === "florist" || key === "post") && validDesign(key, choice)) {
    const previous = book.designs?.[key]?.at ?? 0;
    (book.designs ??= {})[key] = { choice, at: Math.max(previous + 1, at) };
  }
  if (key === "radio" && (choice === "creek" || choice === "bells")) {
    book.radioTrack = choice;
    book.radioRecordedAt = Math.max((book.radioRecordedAt ?? 0) + 1, at);
  }
  return first;
}

export function mergeTownKeepsakes(into: TownKeepsakes, from: TownKeepsakes) {
  for (const key of from.items) if (!into.items.includes(key)) into.items.push(key);
  for (const key of paperShops) {
    const incoming = from.designs?.[key], current = into.designs?.[key];
    if (incoming && (!current || incoming.at > current.at || (incoming.at === current.at && incoming.choice < current.choice))) {
      (into.designs ??= {})[key] = { ...incoming };
    }
  }
  if (!from.radioTrack) return;
  // Legacy tapes have no date. An explicitly claimed remake supersedes them.
  const a = into.radioRecordedAt ?? 0, b = from.radioRecordedAt ?? 0;
  if (into.radioTrack && (a > b || (a === b && from.radioTrack !== "creek"))) return;
  into.radioTrack = from.radioTrack;
  if (from.radioRecordedAt === undefined) delete into.radioRecordedAt;
  else into.radioRecordedAt = from.radioRecordedAt;
}

export const townKeepsakeBadge = (key: TownInteriorKey) => `town-keepsake-${key}`;

export const townKeepsakeInfo: Record<TownInteriorKey, { name: string; note: string; activity: string }> = {
  florist: { name: "窗光花签", activity: "在青芽花店任选一片花瓣，压成花签", note: "举到光里，透光纸下细细的花脉像一条条小路。" },
  baker: { name: "草莓饼干铁盒", activity: "在栗栗烘焙屋烤好草莓小饼，装进铁盒", note: "盒盖上画着一排小草莓，打开还有刚出炉的甜香。" },
  maker: { name: "透星铜片", activity: "在星饰工坊的试光台转动铜片，让星影对准月牙里的刻线", note: "把铜片转向灯，星尖便落到月牙中央。" },
  post: { name: "月牙邮戳明信片", activity: "在周年邮局任选一张风景片，盖上月牙邮戳", note: "月牙刚好贴在邮票一角。寄件人的一栏留给了芙芙。" },
  books: { name: "池畔风琴折页", activity: "在相册书屋折好书页，再拉开折页，让池岸连成一线", note: "展开画着池畔晨光、午影和夜灯的三页，水岸会连成一条线。" },
  radio: { name: "晚安试播带", activity: "在晚安电台任选溪水声或檐铃声，录完一段晚安片头", note: "带壳上留着手写的节目名。带去电台的试听椅，可以再听一遍。" },
  hall: { name: "亮灯夜票根", activity: "在周年纪念馆转动手摇影箱，抽出票根", note: "票根上的第三格，画着周年夜第一盏亮起的街灯。" },
};

export const radioTrackName = { creek: "溪水", bells: "檐铃" } as const;
