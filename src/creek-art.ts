import type { Point, Rect } from "./core";
import { creekOutline, creeks, creekRowAt, type CreekScene } from "./creek-layout";
import { creekDrift, drawDrift } from "./creek-drift";
import type { DaylightMix } from "./daylight-mix";
import type { Phase } from "./day";
import type { DepthLayer } from "./world";

function polygon(points: Point[]) {
  const path = new Path2D();
  points.forEach(({x,y}, i) => i ? path.lineTo(x,y) : path.moveTo(x,y));
  path.closePath();
  return path;
}

function makeReach(rows: typeof creeks.garden.head) {
  const irregular = rows.map(({x,y,halfWidth}, i) => ({
    x: x + Math.sin(i * 2.8) * .6,
    y,
    halfWidth: halfWidth + 1.9 + (Math.sin(i * 1.07) + Math.cos(i * 2.4)) * .8,
  }));
  return {
    rows,
    shore: polygon(creekOutline(irregular)),
    water: polygon(creekOutline(rows)),
    shallow: polygon(creekOutline(rows, .82)),
    deep: polygon(creekOutline(rows, .59)),
  };
}
const channels = {
  garden: [makeReach(creeks.garden.head), makeReach(creeks.garden.tail)],
  challenge: [makeReach(creeks.challenge.head), makeReach(creeks.challenge.tail)],
};
type Reach = ReturnType<typeof makeReach>;
type WetPalette = readonly [shore: string, shallow: string, deep: string, flecks: string];
const colors: Record<CreekScene, Record<Phase, WetPalette>> = {
  garden: {
    dawn: ["#8ebdab","#7cbfc1","#499ca5","#ecffe9"],
    day: ["#84c0a7","#61bbc1","#388eaa","#ecfff0"],
    dusk: ["#99bbac","#74a8af","#487c98","#ffdcb8"],
    night: ["#5a8790","#4f889f","#375a83","#bae6fa"],
  },
  challenge: {
    dawn: ["#99b9a0","#76b1b5","#438f9f","#e3f8d8"],
    day: ["#87b397","#629fae","#367e9b","#dbefdf"],
    dusk: ["#a0a98b","#729aa4","#456d87","#ffe2be"],
    night: ["#597a7f","#4b7e93","#31577e","#c2e6ed"],
  },
};
const sheets = new Map<string, { image: HTMLCanvasElement; rect: Rect }>();

function bankAndBed(c: CanvasRenderingContext2D, reach: Reach, shade: WetPalette) {
  const [shallows, mid, deep, flecks] = shade;
  const {rows, shore, water} = reach;
  c.fillStyle = "#3f644c90";
  c.fill(shore);
  c.strokeStyle = "#8f9b6d7f";
  c.lineWidth = 1.8;
  c.stroke(shore);
  c.fillStyle = shallows;
  c.fill(water);
  c.fillStyle = mid;
  c.fill(reach.shallow);
  c.fillStyle = deep;
  c.globalAlpha = .77;
  c.fill(reach.deep);
  c.globalAlpha = 1;
  c.save();
  c.clip(water);
  // Submerged gravel, faint broken reflections, and occasional light near the
  // shallow edge keep the painted bands from reading as three solid lines.
  for (let i = 2; i < rows.length - 2; i++) {
    const { x, y, halfWidth } = rows[i];
    const side = i % 2 === 0 ? 1 : -1;
    const bank = Math.round(x + side * halfWidth * (.69 + .17 * Math.sin(i * 2.4)));
    c.fillStyle = i % 5 === 0 ? "#f8e2b87d" : i % 3 === 0 ? "#24425578" : "#78a7918a";
    const rowY = Math.round(y + Math.cos(i * 6) * 1.5);
    c.fillRect(bank, rowY, 2 + i % 4, i % 4 === 0 ? 2 : 1);
    if (i % 4 === 1) {
      c.fillStyle = flecks + "48";
      c.fillRect(bank - side * 2, rowY - 1, 3, 1);
    }
    if (i % 3 !== 0) continue;
    c.fillStyle = flecks + "42";
    const rippleX = Math.round(x + halfWidth * .61 * Math.sin(i * 1.9));
    c.fillRect(rippleX - 3, rowY + 1, 5 + i % 6, 1);
    c.fillRect(rippleX - 1, rowY + 2, 6, 1);
  }
  c.restore();
}

function waterSheet(scene: CreekScene, phase: Phase) {
  const key = scene + phase;
  const cached = sheets.get(key);
  if (cached) return cached;
  const reaches = channels[scene];
  const points = [...creeks[scene].upper, ...creeks[scene].lower];
  const xs = points.map(p => p.x);
  const x = Math.floor(Math.min(...xs)) - 5, y = reaches[0].rows[0].y - 5;
  const w = Math.ceil(Math.max(...xs)) + 5 - x, h = reaches[1].rows.at(-1)!.y + 6 - y;
  const image = document.createElement("canvas");
  image.width = w * 2;
  image.height = h * 2;
  const c = image.getContext("2d")!;
  c.setTransform(2,0,0,2,-2*x,-2*y);
  for (const reach of reaches) bankAndBed(c, reach, colors[scene][phase]);
  const sheet = { image, rect: { x,y,w,h } };
  sheets.set(key, sheet);
  return sheet;
}

function movingWater(c: CanvasRenderingContext2D, reach: Reach, time: number, ink: string) {
  const top = reach.rows[0].y, span = reach.rows.at(-1)!.y - top;
  for (let i = 0; i < span / 9; i++) {
    const y = top + (i * 43 + (6 + i % 3) * time) % span;
    const {x,halfWidth} = creekRowAt(reach.rows, y);
    const start = Math.round(x + Math.sin(i * 4.2) * halfWidth * .67);
    const fade = Math.min(1, (y-top) / 7, (top+span-y) / 7);
    c.globalAlpha = fade * (.24 + .36 * (1 + Math.cos(i * 3.1 + time * .7)) / 2);
    c.fillStyle = ink;
    c.fillRect(start - 3, Math.round(y), 4 + i % 5, 1);
    c.fillRect(start + 2, Math.round(y) + 1, 2 + i % 4, 1);
  }
}

// All props use foot positions. Lilies and small stones stay at the outer bank.
type BankProp = readonly [index: number, x: number, y: number, width: number, flip?: boolean];
const props: Record<CreekScene, readonly BankProp[]> = {
  garden: [
    [1,583,160,22],[2,599,175,13],[1,576,204,11],[3,600,210,12],
    [2,574,233,14,true],[1,601,236,13],[1,580,293,12],[2,606,292,14],
    [3,591,310,13],[1,603,333,10],[2,575,345,14,true],[1,585,356,23,true],
  ],
  challenge: [
    [1,232,117,24],[2,242,130,16],[1,222,153,11],[2,241,179,13,true],
    [3,213,211,12],[1,232,237,13],[2,213,261,17],[1,246,279,15,true],
    [2,227,295,14],[1,254,357,13],[2,228,369,15,true],[1,239,390,11],
    [3,214,404,12],[1,231,421,13],[2,211,440,17,true],[1,234,460,14],[1,214,488,23],
  ],
};
const frames = [[0,0,160,88],[168,0,84,60],[257,0,84,63],[168,64,64,45]];

function drawBankProp(c: CanvasRenderingContext2D, atlas: HTMLImageElement, [index,x,y,width,flip]: BankProp) {
  const [sx,sy,sw,sh] = frames[index], h = Math.round(width * sh / sw);
  c.save();
  c.translate(x,y);
  if (flip) c.scale(-1,1);
  c.drawImage(atlas,sx,sy,sw,sh,-width/2,-h,width,h);
  c.restore();
}

function bridgeImage(bridge: Rect) {
  return { x:bridge.x, y:bridge.y-7, w:bridge.w, h:bridge.h+17 };
}
function drawDeck(c: CanvasRenderingContext2D, atlas: HTMLImageElement, rect: Rect) {
  const [x,y,w,h] = frames[0];
  c.drawImage(atlas,x,y,w,h,rect.x,rect.y,rect.w,rect.h);
}

function bridgeGround(c: CanvasRenderingContext2D, bridge: Rect) {
  const {x,y,w,h} = bridge;
  c.fillStyle = "#33574339";
  c.beginPath();
  c.ellipse(x+w/2,y+h/2+6,w*.53,h*.46,0,0,Math.PI*2);
  c.fill();
}

export function drawCreek(
  c: CanvasRenderingContext2D, atlas: HTMLImageElement | undefined, scene: CreekScene, time: number, light: DaylightMix,
) {
  const first = waterSheet(scene, light.from);
  const { x,y,w,h } = first.rect;
  c.save();
  c.drawImage(first.image,x,y,w,h);
  if (light.mix > 0) {
    c.globalAlpha = light.mix;
    c.drawImage(waterSheet(scene, light.to).image,x,y,w,h);
    c.globalAlpha = 1;
  }
  const floating = creekDrift(scene,time);
  for (const reach of channels[scene]) {
    c.save();
    c.clip(reach.water);
    movingWater(c, reach, time, colors[scene][light.from][3]);
    c.globalAlpha = 1;
    for (const floater of floating) drawDrift(c,floater);
    c.restore();
  }
  if (atlas?.naturalWidth) {
    for (const prop of props[scene]) if (prop[0] === 3) drawBankProp(c, atlas, prop);
    const bridge = creeks[scene].bridge;
    bridgeGround(c, bridge);
    drawDeck(c, atlas, bridgeImage(bridge));
  }
  c.restore();
}

// Trace the wood lips and stone posts. The open deck must not repaint over actors.
const railProfiles = [
  [[0,0],[1,0],[1,.53],[.889,.53],[.889,.38],[.76,.335],[.58,.30],[.42,.30],[.24,.335],[.112,.39],[.112,.53],[0,.53]],
  [[0,.53],[.115,.53],[.115,.685],[.24,.646],[.42,.619],[.58,.619],[.76,.646],[.886,.685],[.886,.53],[1,.53],[1,1],[0,1]],
];
const rails = Object.fromEntries((["garden","challenge"] as const).map(scene => {
  const bridge = creeks[scene].bridge, rect = bridgeImage(bridge);
  const masks = railProfiles.map(poly => polygon(poly.map(([x,y]) => ({x:rect.x+x*rect.w,y:rect.y+y*rect.h}))));
  return [scene, { rect, masks, depths:[bridge.y+3,bridge.y+bridge.h-3] }];
})) as Record<CreekScene, { rect: Rect; masks: Path2D[]; depths: number[] }>;

export function creekDepthLayers(scene: CreekScene, atlas: HTMLImageElement | undefined): DepthLayer[] {
  if (!atlas?.naturalWidth) return [];
  const { rect, masks, depths } = rails[scene];
  return [
    ...props[scene].filter(([index]) => index !== 3).map(prop => ({
      y: prop[2], draw: (c: CanvasRenderingContext2D) => drawBankProp(c,atlas,prop),
    })),
    ...masks.map((mask, i): DepthLayer => ({y:depths[i], draw(c) {
      c.save();
      c.clip(mask);
      drawDeck(c,atlas,rect);
      c.restore();
    }})),
  ];
}
