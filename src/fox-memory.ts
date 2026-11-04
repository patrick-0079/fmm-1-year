export type FoxCall = "welcome" | "farewell" | "content" | "cross";
export const foxWords: Record<FoxCall, string> = {
  welcome: "嗷呜！", farewell: "呜…呜呜", content: "嗷～嗷呜", cross: "嗷呜！！呜呜！！",
};
export interface FoxMemory {
  missed: number;
  visit: "none" | "untouched" | "petted";
  rebuffed: boolean;
  waitingForNote: boolean;
}
export function readFoxMemory(raw?: Partial<FoxMemory> | null): FoxMemory {
  const visit = raw?.visit === "untouched" || raw?.visit === "petted" ? raw.visit : "none";
  const n=raw?.missed;
  const missed = visit !== "petted" && typeof n==="number" && Number.isInteger(n) ? Math.min(3, Math.max(0,n)) : 0;
  return { missed, visit,
    rebuffed: missed === 3 && raw?.rebuffed === true,
    waitingForNote: visit === "untouched" && raw?.waitingForNote === true };
}
export function arriveHome(fox: FoxMemory, fromTrap: boolean) {
  fox.visit = "untouched";
  fox.rebuffed = false;
  fox.waitingForNote = fromTrap;
}
export function leaveHome(fox: FoxMemory, countVisit: boolean) {
  if (countVisit && fox.visit === "untouched") fox.missed = Math.min(3, fox.missed + 1);
  fox.visit = "none";
  fox.rebuffed = false;
  fox.waitingForNote = false;
}
export function petFox(fox: FoxMemory): FoxCall {
  if (fox.missed === 3 && !fox.rebuffed) {
    fox.rebuffed = true;
    return "cross";
  }
  fox.missed = 0;
  fox.rebuffed = false;
  if (fox.visit !== "none") fox.visit = "petted";
  return "content";
}
