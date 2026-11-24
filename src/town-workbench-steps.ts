import type { Point } from "./core";
import type { TownInteriorKey } from "./town-interior-id";
import { townRadioDuration } from "./sound";

export const workbenchSize = { width: 336, height: 134 };

const point = (x: number, y: number): Point => ({ x, y });
const tool = (id: string, label: string, x: number, y: number) => ({ id, label, at: point(x, y) });
export type WorkbenchTool = ReturnType<typeof tool>;

export type WorkbenchStep = { id: string; instruction: string } & (
  | { kind: "place"; tools: readonly WorkbenchTool[]; target: Point; radius?: number }
  | { kind: "slide"; tools: readonly [WorkbenchTool]; target: Point }
  | { kind: "hold" | "dial" | "crank"; tools: readonly [WorkbenchTool] }
  | { kind: "wait"; seconds: number }
);

export const pressDuration = 640;
export const copperStart = -55;
export const copperTolerance = 14;

export const workbenchSteps: Record<TownInteriorKey, readonly WorkbenchStep[]> = {
  florist: [
    { id: "petal", kind: "place", instruction: "挑一片洋桔梗花瓣，拖到透光纸上。",
      tools: [tool("lilac", "浅紫花瓣", 68, 42), tool("cream", "奶白花瓣", 68, 94)], target: point(218, 66) },
    { id: "press", kind: "hold", instruction: "按住木压板，等压合进度填满再松开。",
      tools: [tool("press", "按住木压板", 218, 66)] },
  ],
  baker: [
    { id: "dough", kind: "place", instruction: "把草莓压模拖进面片的轮廓，松手压出小饼。",
      tools: [tool("mold", "草莓压模", 70, 68)], target: point(223, 68) },
    { id: "oven", kind: "place", instruction: "把装好小饼的托盘推进砖炉。",
      tools: [tool("tray", "一盘待烤小饼", 74, 77)], target: point(237, 79) },
    { id: "baking", kind: "wait", instruction: "炉火升起来了。等炉铃翻牌就可以装盒。", seconds: 1.45 },
    { id: "tin", kind: "place", instruction: "出炉了！把小饼拖进打开的草莓铁盒。",
      tools: [tool("cookies", "刚出炉的小饼", 72, 69)], target: point(231, 69) },
  ],
  maker: [
    { id: "mount", kind: "place", instruction: "把铜片放到试光台的转轴上。",
      tools: [tool("copper", "透星铜片", 76, 67)], target: point(227, 67) },
    { id: "align", kind: "dial", instruction: "沿铜片边缘转动，星影对准月牙中的刻线时松手。",
      tools: [tool("copper", "旋转铜片", 227, 67)] },
  ],
  post: [
    { id: "postcard", kind: "place", instruction: "选一张风景片，把它推入定位框，让邮票角对准槽口。",
      tools: [tool("flags", "广场彩旗风景片", 66, 36), tool("lamps", "池边街灯风景片", 66, 98)], target: point(218, 71) },
    { id: "stamp", kind: "slide", instruction: "把邮戳手柄拉到下方的压线，松开后看月牙印。",
      tools: [tool("lever", "月牙邮戳手柄", 233, 39)], target: point(233, 91) },
  ],
  books: [
    { id: "fold-left", kind: "slide", instruction: "把晨光一页沿左边折线向右折。",
      tools: [tool("morning", "晨光页左边缘", 72, 67)], target: point(143, 67) },
    { id: "fold-right", kind: "slide", instruction: "把灯下的一页沿右边折线向左折。",
      tools: [tool("night", "灯下页右边缘", 266, 67)], target: point(197, 67) },
    { id: "unfold", kind: "slide", instruction: "捏住折页外沿向右拉开，对照连成一线的池岸。",
      tools: [tool("unfold", "折页外沿", 191, 67)], target: point(270, 67) },
  ],
  radio: [
    { id: "track", kind: "place", instruction: "把溪水或檐铃的磁带放进第一轨。",
      tools: [tool("creek", "溪水声带", 68, 42), tool("bells", "檐铃声带", 68, 95)], target: point(228, 64) },
    { id: "fader", kind: "slide", instruction: "把第二轨的推杆推到右边的刻度线，开始试听。",
      tools: [tool("fader", "片头音乐推杆", 108, 94)], target: point(237, 94) },
    { id: "listen", kind: "wait", instruction: "晚安片头正在试播。可以看两轨电平和播出灯。", seconds: townRadioDuration },
  ],
  hall: [
    { id: "reel", kind: "crank", instruction: "顺时针转一圈。每转过一道刻线，影箱就显出一幕。",
      tools: [tool("crank", "转动影箱手柄", 244, 68)] },
    { id: "ticket", kind: "slide", instruction: "把露出一角的票根沿着浅色线拉出影箱。",
      tools: [tool("ticket", "亮灯夜票根", 207, 85)], target: point(276, 85) },
  ],
};
