import type { Hotspot, SceneId } from "./maps.ts";

type VisitorKey = "zhenghao" | "rabe" | "dianziyang" | "pigeon";
export interface AnniversaryVisitor {
  key: VisitorKey;
  scene: SceneId;
  row: number;
  size: number;
  spot: Hotspot;
  footWidth: number;
}

function visitor(key: VisitorKey, name: string, scene: SceneId, row: number, size: number,
  x: number, y: number, approachX: number, approachY: number, width: number, height: number,
  footWidth: number): AnniversaryVisitor {
  const pet = key === "zhenghao";
  const objectBox = {x: -width / 2, y: -height, w: width, h: height + 2};
  return {key, scene, row, size, footWidth, spot: {
    id: "visitor-" + key, title: name, x, y, approach: {x: approachX, y: approachY},
    radius: 36, selfMarked: true, markerOffset: Math.round(height / 2),
    hitAreas: [{...objectBox, x: x + objectBox.x, y: y + objectBox.y}],
    cue: {kind: pet ? "pet" : "talk", action: pet ? "摸摸正号" : "与" + name + "交谈",
      verb: pet ? "摸摸" : "交谈", anchor: {x: Math.round(width * .29), y: 4 - height},
      natural: true, objectBox},
  }};
}

// These all-day encounters have their own identities outside the scheduled resident roster.
export const anniversaryVisitors = [
  visitor("zhenghao", "正号", "town", 0, 36, 798, 955, 777, 958, 25, 30, 10),
  visitor("rabe", "Rabe", "challenge", 1, 56, 531, 491, 501, 487, 43, 49, 12),
  visitor("dianziyang", "电子羊", "town", 2, 40, 982, 273, 958, 283, 32, 33, 12),
  visitor("pigeon", "鸽子", "garden", 3, 29, 710, 144, 686, 149, 23, 24, 8),
];
