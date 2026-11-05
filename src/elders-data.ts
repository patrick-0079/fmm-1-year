import type { Hotspot } from "./maps.ts";
import { starLit, type AstrolabeState } from "./astrolabe.ts";

export const elderPlaces = {
  challenge: {
    id: "elder-gardener", title: "园丁爷爷", x: 386, y: 482,
    approach: { x: 408, y: 484 }, radius: 42, markerOffset: 54, color: "#90a265",
  },
  ruins: {
    id: "elder-guardian", title: "遗迹守护者", x: 493, y: 383,
    approach: { x: 508, y: 395 }, radius: 40, markerOffset: 54, color: "#a791be",
  },
} satisfies Record<"challenge" | "ruins", Hotspot>;

export type ElderPage = "gardenWelcome" | "gardenHistory" | "gardenWish" |
  "challenge" | "riddle" | "blessing" | "notebook" | "solved";
export type ElderPose = "dig" | "stand" | "point" | "watch" | "raiseStaff" | "bow";
export interface ElderLine {
  text: string;
  pose: ElderPose;
  reply?: { title: string; next: ElderPage };
  showNotebook?: boolean;
}
export const elderLines: Record<ElderPage, ElderLine> = {
  gardenWelcome: {
    text: "咳咳...你好啊孩子。这里好久都没有人来过了。", pose: "stand",
    reply: { title: "为什么呀？", next: "gardenHistory" },
  },
  gardenHistory: {
    text: "这里是勇气花园，我见证了无数有抱负的年轻人踏入这里，却又带着遗憾离开。", pose: "point",
    reply: { title: "那这里很危险吗？", next: "gardenWish" },
  },
  gardenWish: { text: "并不是，只需要坚定的意志就能安全地走出这里。加油吧孩子。", pose: "stand" },
  challenge: {
    text: "年轻人，既然来了这里，要不要做一个大胆的尝试？", pose: "watch",
    reply: { title: "什么尝试？", next: "riddle" },
  },
  riddle: {
    text: "这处遗迹，藏着一个谜题，近百年来都没有人能成功解开。我看你蕴含了无穷的力量，你可愿意尝试去解开这个谜题？", pose: "raiseStaff",
    reply: { title: "好，我去试一下", next: "blessing" },
  },
  blessing: { text: "太好了，祝你好运。", pose: "bow", showNotebook: true },
  notebook: { text: "南阶的手记里，记着前人看见过的痕迹。走累了，就翻开看看吧。", pose: "raiseStaff", showNotebook: true },
  solved: { text: "年轻人，我看见那块星纹砖亮了。原来这束月光，等的是你呀。", pose: "bow" },
};

export function guardianGreeting(astrolabe: AstrolabeState, invited: boolean): ElderPage {
  if (starLit(astrolabe)) return "solved";
  return invited ? "notebook" : "challenge";
}
