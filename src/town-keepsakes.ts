import { townInteriorKeys, type TownInteriorKey } from "./town-interior-id.ts";

export type RadioTrack = "creek" | "bells";
export interface TownKeepsakes {
  items: TownInteriorKey[];
  radioTrack?: RadioTrack;
}

export function readTownKeepsakes(raw: unknown): TownKeepsakes {
  const saved = raw as Partial<TownKeepsakes> | null | undefined;
  const savedItems = saved?.items;
  const items = Array.isArray(savedItems) ? townInteriorKeys.filter(key => savedItems.includes(key)) : [];
  const track = saved?.radioTrack;
  return items.includes("radio") && (track === "creek" || track === "bells") ? { items, radioTrack: track } : { items };
}

export const townKeepsakeInfo: Record<TownInteriorKey, { name: string; note: string }> = {
  florist: { name: "窗光花签", note: "举到光里，透光纸下细细的花脉像一条条小路。" },
  baker: { name: "草莓饼干铁盒", note: "盖上一排小草莓，打开还有刚出炉的甜香。" },
  maker: { name: "透星铜片", note: "把铜片转向灯，星尖便落到月牙中央。" },
  post: { name: "月牙邮戳明信片", note: "月牙刚好贴在邮票一角。寄件人的一栏留给了芙芙。" },
  books: { name: "池畔风琴折页", note: "把池边的晨光、午影、灯下三折拉开，水岸会连成一条线。" },
  radio: { name: "晚安试播带", note: "带壳上留着手写的节目名。带去电台的试听椅，可以再听一遍。" },
  hall: { name: "亮灯夜票根", note: "票根上的第三格，画着周年夜第一盏亮起的街灯。" },
};

export const radioTrackName = { creek: "溪水", bells: "檐铃" } as const;
