/** Shared by portals, rendered gates, lighting and solid posts. */
export const townGates = [
  { scene: "garden", id: "town-gate", exit: "town-return", target: "town",
    x: 590, y: 530, width: 88, title: "周年小镇", approach: { x: 590, y: 500 } },
  { scene: "garden", id: "north-town-gate", exit: "town-north-return", target: "town",
    x: 805, y: 108, width: 70, title: "小镇北街", approach: { x: 800, y: 111 } },
  { scene: "town", id: "town-return", exit: "town-gate", target: "garden",
    x: 450, y: 962, width: 88, title: "周年花园", approach: { x: 450, y: 916 } },
  { scene: "town", id: "town-north-return", exit: "north-town-gate", target: "garden",
    x: 562, y: 80, width: 70, title: "花园木桥", approach: { x: 562, y: 126 } },
] as const;
export type TownGate = (typeof townGates)[number];
export const gateSpot = (g: TownGate) => ({
  id: g.id, title: `${g.title} · 穿过花门`, x: g.x, y: g.y,
  portal: g.target, portalExit: g.exit, approach: { ...g.approach },
  radius: 70, markerOffset: g.width + 9, color: "#82b4ab",
});
export const gatePosts = (g: TownGate) => [-1, 1].map((side) => ({
  label: `${g.title}花门立柱`, x: g.x + side * g.width * 0.36 - 6,
  y: g.y - 12, w: 12, h: 15,
}));
export const gardenGateStones = [
  {x: 492, y: 471}, {x: 514, y: 480}, {x: 536, y: 487},
  {x: 558, y: 493}, {x: 580, y: 501},
];
