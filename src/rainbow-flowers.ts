import type { Hotspot, SceneId } from "./maps.ts";

export const rainbowFlowers = [
  { id: "prism-rose", name: "绯红心愿蔷薇", scene: "garden", place: "周年庭院 · 粉伞茶桌下方", color: "#c95673", x: 291, y: 160, approach: {x:314,y:169} },
  { id: "prism-calendula", name: "橙光晚霞金盏菊", scene: "garden", place: "周年庭院 · 放映草坪南缘", color: "#db963d", x: 676, y: 376, approach: {x:700,y:385} },
  { id: "prism-lily", name: "金黄星愿百合", scene: "challenge", place: "勇气花园 · 石桥东边的草地", color: "#b5913f", x: 370, y: 287, approach: {x:393,y:294} },
  { id: "prism-peony", name: "碧绿四叶芍药", scene: "challenge", place: "勇气花园 · 苹果树西边", color: "#4f956f", x: 650, y: 361, approach: {x:674,y:371} },
  { id: "prism-bell", name: "天青溪语风铃", scene: "town", place: "周年小镇 · 南岸池塘边", color: "#4f9fae", x: 685, y: 949, approach: {x:710,y:966} },
  { id: "prism-iris", name: "靛蓝月影鸢尾", scene: "town", place: "周年小镇 · 周年积木角西南的花草边", color: "#6679b6", x: 1026, y: 535, approach: {x:1049,y:541} },
  { id: "prism-cosmos", name: "浅紫晚安秋英", scene: "town", place: "周年小镇 · 邮局旁的草坪", color: "#a071b1", x: 515, y: 631, approach: {x:495,y:642} },
] as const;
export const rainbowIds: readonly string[] = rainbowFlowers.map(f => f.id);
export const meadowOpen = (found: readonly string[]) => rainbowIds.every(id => found.includes(id));

export function rainbowReminderStrength(elapsed: number, reducedMotion: boolean) {
  const interval = 30, duration = 3;
  if (elapsed < interval) return 0;
  const phase = elapsed % interval;
  if (phase >= duration) return 0;
  return reducedMotion ? 1 : Math.min(1, phase / .4, (duration - phase) / .6);
}

export function pickRainbow(found: string[], scene: SceneId, id: string) {
  const flower = rainbowFlowers.find(f => f.id === id && f.scene === scene);
  if (!flower || found.includes(id)) return;
  found.push(flower.id);
  return flower;
}
export function rainbowSpot(flower: typeof rainbowFlowers[number]): Hotspot {
  // The blossom is its own marker; keep the generous reach for touch and keyboard.
  return { ...flower, title: "采下" + flower.name, markerOffset: 8, radius: 37, selfMarked: true };
}
const meadowGateFoot = { x: 205, y: 378 };
export const meadowGate: Hotspot = {
  id:"prism-arch", title:"穿过七色花门", portal:"meadow", portalExit:"meadow-exit",
  ...meadowGateFoot, approach: {x:meadowGateFoot.x,y:meadowGateFoot.y+20}, color:"#b28cc9", radius:48, markerOffset:72,
  hitAreas: [
    {x:meadowGateFoot.x-15,y:meadowGateFoot.y-72,w:30,h:10},
    {x:meadowGateFoot.x-28,y:meadowGateFoot.y-63,w:56,h:10},
    {x:meadowGateFoot.x-35,y:meadowGateFoot.y-54,w:70,h:54},
  ],
};
export const meadowGatePosts = [-26,26].map(offset => ({
  x:meadowGate.x+offset-4,y:meadowGate.y-7,w:8,h:8,label:"七色花门立柱",
}));
