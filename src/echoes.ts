export const echoes = {
  leaf: { name: "叶", chamber: "西廊 · 蛇纹苔庭", inscription: "藤蛇守着第一道刻痕。碑上写着：「当石厅醒来，最先落下的是一片叶。」", color: "#9bd2a8", sound: "echo-leaf" },
  bell: { name: "铃", chamber: "东廊 · 琥珀矿井", inscription: "矿壁上嵌着半枚铜铃。「我听见叶子落下，才轻轻回了一声。」", color: "#edbb72", sound: "echo-bell" },
  star: { name: "星", chamber: "北廊 · 星图室", inscription: "星盘上留着一行细字：「等铃声远去，最后一颗星才亮起。」", color: "#bbace7", sound: "echo-star" },
} as const;
export type Echo = keyof typeof echoes;
export const melody: readonly Echo[] = ["leaf", "bell", "star"];
export const trialEcho = { snake: "leaf", miner: "bell", mines: "star" } as const;
export interface EchoMemory { found: Echo[]; played: number; listened: boolean }
export function readEchoMemory(value?: Partial<EchoMemory> | null): EchoMemory {
  const found = melody.filter(note => Array.isArray(value?.found) && value.found.includes(note));
  const count = value?.played;
  const played = found.length === melody.length && typeof count === "number" && Number.isInteger(count)
    ? Math.max(0, Math.min(melody.length, count)) : 0;
  return { found, played, listened: played === melody.length && value?.listened === true };
}
export function playEcho(memory: EchoMemory, note: Echo) {
  if (memory.found.length !== melody.length || melody[memory.played] !== note) return false;
  memory.played++;
  return true;
}
