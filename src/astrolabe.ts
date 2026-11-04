// Puzzle progress is independent of arcade scores and of the older altar melody.
export const rings = [
  { id: "vine", name: "藤纹内环", band: "内环", clue: "西廊的玉蛇望向藤根，叶尖勾住了一圈旧铜。", x: 182, y: 336, color: "#a1d6a9" },
  { id: "star", name: "星纹中环", band: "中环", clue: "北廊星图右下方，石缝里闪着三颗小星。", x: 502, y: 170, color: "#c6c1f6" },
  { id: "brass", name: "黄铜外环", band: "外环", clue: "东廊绞盘的西侧，一道金边混在旧齿痕里。", x: 733, y: 334, color: "#edbf77" },
] as const;
export type RingId = typeof rings[number]["id"];
export type Mirror = "/" | "\\";
export const directions = ["北", "东", "南", "西"] as const;
export interface AstrolabeState {
  found: RingId[];
  installed: boolean;
  turns: [number, number, number];
  mirrors: [Mirror, Mirror];
}
export const plateAligned = (s: AstrolabeState) => s.installed && s.turns.every(n => n === 0);

export function readAstrolabe(value?: Partial<AstrolabeState> | null): AstrolabeState {
  const found = rings.map(r => r.id).filter(id => Array.isArray(value?.found) && value.found.includes(id));
  const installed = found.length === rings.length && value?.installed === true;
  const result: AstrolabeState = {found, installed, turns: [1, 2, 3], mirrors: ["/", "\\"]};
  const turns = value?.turns, mirrors = value?.mirrors;
  if (installed && Array.isArray(turns)) {
    result.turns.forEach((_, i) => {
      const n = turns[i];
      if (Number.isInteger(n) && n >= 0 && n <= 3) result.turns[i] = n;
    });
  }
  if (plateAligned(result) && Array.isArray(mirrors)) {
    result.mirrors.forEach((_, i) => {
      const face = mirrors[i];
      if (face === "/" || face === "\\") result.mirrors[i] = face;
    });
  }
  return result;
}

export function collectRing(s: AstrolabeState, id: RingId) {
  if (s.found.includes(id)) return false;
  s.found.push(id);
  return true;
}
export function installRings(s: AstrolabeState) {
  if (s.installed || s.found.length !== rings.length) return false;
  s.installed = true;
  return true;
}
export function turnRing(s: AstrolabeState, id: RingId) {
  if (!s.installed || plateAligned(s)) return false;
  const index = rings.findIndex(r => r.id === id);
  s.turns[index] = (s.turns[index] + 1) % 4;
  return true;
}

export const lightBoard = {x: 534, y: 286, step: 20, cols: 4, rows: 3};
export const sourceCell = {x:0,y:0}, targetCell = {x:0,y:2};
export const mirrorCells = [{x:2,y:0}, {x:2,y:2}] as const;
export function traceMoonlight(mirrors: AstrolabeState["mirrors"]) {
  const points = [{...sourceCell}];
  let {x, y} = sourceCell, dx = 1, dy = 0;
  // With two distinct mirrors this layout always ends on the star or at an edge.
  for (;;) {
    x += dx; y += dy;
    if (x < 0 || x >= lightBoard.cols || y < 0 || y >= lightBoard.rows) {
      points.push({x:x-dx/2, y:y-dy/2});
      return {points, reachesStar: false};
    }
    if (x === targetCell.x && y === targetCell.y) {
      points.push({x,y});
      return {points, reachesStar: true};
    }
    const i = mirrorCells.findIndex(m => m.x === x && m.y === y);
    if (i >= 0) {
      points.push({x,y});
      [dx, dy] = mirrors[i] === "/" ? [-dy, -dx] : [dy, dx];
    }
  }
}
export const starLit = (s: AstrolabeState) => plateAligned(s) && traceMoonlight(s.mirrors).reachesStar;
export function tiltMirror(s: AstrolabeState, i: 0 | 1) {
  if (!plateAligned(s) || starLit(s)) return false;
  s.mirrors[i] = s.mirrors[i] === "/" ? "\\" : "/";
  return true;
}

export const seals = [
  {id:"first", name:"初拾月痕", mark:"月", hint:"拾起任意一枚星盘环"},
  {id:"set", name:"三环归位", mark:"环", hint:"找齐三枚星盘环"},
  {id:"plate", name:"月相复圆", mark:"盘", hint:"把三道缺口连成一线"},
  {id:"light", name:"引月成路", mark:"光", hint:"让月光抵达星纹砖"},
  {id:"radio", name:"晚安收听员", mark:"声", hint:"听见听月泉里的旧电波"},
] as const;
export type SealId = typeof seals[number]["id"];
export function earnedSeals(s: AstrolabeState, listened: boolean): SealId[] {
  const earned: SealId[] = [];
  if (s.found.length) earned.push("first");
  if (s.found.length === rings.length) earned.push("set");
  if (plateAligned(s)) earned.push("plate");
  if (starLit(s)) earned.push("light");
  if (listened) earned.push("radio");
  return earned;
}
