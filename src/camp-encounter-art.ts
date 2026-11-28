import type { CampEncounter, CampEncounterId } from "./camp-encounters";
import { campEncounterLandmark } from "./camp-encounter-contacts";
import { campEncounterHead, campHeadOffsets } from "./camp-expression-cels";
import { artScale } from "./costume-frames";
import type { Point } from "./core";
import { campSeat } from "./meadow-ground";
import { benchRest } from "./rest";
import { sceneArt } from "./scene-art";
import type { DepthLayer } from "./world";

const feet = benchRest("meadow", campSeat, campSeat).anchor;
const cell = 48;
const campAtlas = {sheet:"campEncounterVisitors", width:cell, height:cell} as const;
const fantasyAtlas = {sheet:"campFantasy", width:80, height:64} as const;
const sprites = {
  bird:        {atlas:campAtlas, row:0, scale:.30, origin:[24,36], hit:[-.5,-4,5.3,4]},
  butterfly:   {atlas:campAtlas, row:1, scale:.21, origin:[24,26], hit:[0,-.7,4.2,3.2]},
  jelly:       {atlas:campAtlas, row:2, scale:.34, origin:[22,40], hit:[.7,-6.4,5.2,6.5]},
  marshmallow: {atlas:campAtlas, row:3, scale:.30, origin:[24,23], hit:[0,0,3.6,3]},
  starFawn:    {atlas:fantasyAtlas, row:0, scale:.42, origin:[40,54], hit:[0,-9,12,9.5]},
  moonBoat:    {atlas:fantasyAtlas, row:1, scale:.35, origin:[40,48], hit:[0,-3,10.8,5]},
  cloudWhale:  {atlas:fantasyAtlas, row:2, scale:.39, origin:[40,36], hit:[0,-1,12,7]},
} as const;

type Offset = readonly [number, number];
type Landmark = Parameters<typeof campEncounterLandmark>[0];
// Named stops follow the outfit's painted knee, cuff, hem or mouth.
// Coordinates are world-pixel offsets from the seated player's feet.
const roast: Offset = [-27.5,-25.5];
const fawnBow: Offset = [18.5,-1.2];
const paths: Record<CampEncounterId, {start: Offset; poses: readonly (Offset | Landmark)[]}> = {
  bird: {start: [-48,-30], poses: [
    [-40,-23],[-31,-15],[-23.5,-5],[-21,1],
    [-21,1],[-21,1],[-14,-17],[8,-39],
    [-20.5,.6],[-15,-4],[-9,-13],"bird","bird","bird",[6,-7.5],[32,-14.5],
  ]},
  butterfly: {start: [-20,-49], poses: [
    [-20.5,-52],[-23.5,-56],[-20,-53],[-15.5,-48],
    [-18.5,-50],[-24,-46],[-31,-52],[-38,-67],
    [-14,-46],[-18,-32],[-11,-18],"butterfly","butterfly","butterfly",[-13,-20],[-27,-39],
  ]},
  jelly: {start: [60,-27], poses: [
    [47,-25],[39,-20],[32,-21.5],[27,-18],
    [27,-18],[32,-22],[41,-22.5],[57,-36],
    [26,-18.5],[22,-16],[16,-11],"jelly","jelly","jelly",[19,-13],[38,-30],
  ]},
  marshmallow: {start: roast, poses: [
    roast,roast,roast,roast, roast,roast,roast,roast,
    roast,[-18,-36],[-8,-22.5],"marshmallow","marshmallow","marshmallow",[5,-10],[34,-15],
  ]},
  starFawn: {start:[58,-5], poses:[
    [48,-5],[38,-3.5],[30,-2.5],[25,-2],
    [24,-1.8],[24,-1.8],[31,-3],[48,-5],
    [24,-1.8],[21,-1.3],fawnBow,fawnBow,fawnBow,fawnBow,[25,-2],[46,-5],
  ]},
  moonBoat: {start:[-53,1], poses:[
    [-43,1.5],[-32,1],[-23,.6],[-16,.5],
    [-15,.8],[-9,1.6],[9,2],[35,1],
    [-16,.5],[-15,.7],[-14.5,.8],[-14,.8],[-14,.8],[-11,1],[4,1.8],[35,.8],
  ]},
  cloudWhale: {start:[61,-34], poses:[
    [49,-36],[39,-33],[30,-31],[25,-33],
    [23,-34],[18,-37],[3,-44],[-24,-50],
    [23,-31],[21,-28],[19,-27],[18,-29],[17,-30],[16,-33],[8,-42],[-22,-50],
  ]},
};
function posePosition(id: CampEncounterId, frame: number, outfit: number): Point {
  const offset = paths[id].poses[frame];
  if (typeof offset !== "string") return {x: offset[0], y: offset[1]};
  const at = campEncounterLandmark(offset,outfit);
  if (id === "jelly") at.x += (22-10) * sprites.jelly.scale;
  if (id === "butterfly") at.y -= 1;
  if (id === "marshmallow") {
    const [dx,dy] = campHeadOffsets[campEncounterHead(id,frame)];
    at.x += dx/artScale;
    at.y += dy/artScale;
    at.x -= frame === 12 ? 2.1 : 2.6;
    at.y += 1;
  }
  return at;
}

function visitorPosition(event: Readonly<CampEncounter>, frame: number, still: boolean, outfit: number): Point {
  const {id, phase, elapsed} = event;
  const end = posePosition(id, frame, outfit);
  if (still) return end;
  if (phase === "waiting") {
    if (id === "jelly" || id === "butterfly" || id === "cloudWhale") {
      const rate = id === "cloudWhale" ? 1.25 : id === "jelly" ? 1.8 : 3.1;
      end.x += Math.sin(elapsed * rate * .65) * .8;
      end.y += Math.sin(elapsed * rate) * .95;
    }
    return end;
  }
  const previous = frame === 8 ? 3 : frame - 1;
  const [x,y] = paths[id].start;
  const start = previous < 0 ? {x,y} : posePosition(id, previous, outfit);
  const first = phase === "active" ? 8 : phase === "passive" ? 4 : 0;
  const duration = phase === "passive" ? .5 : .4;
  const progress = Math.max(0, Math.min(1, elapsed / duration - (frame - first)));
  return {x: start.x + (end.x-start.x)*progress, y: start.y + (end.y-start.y)*progress};
}

function opacity(event: Readonly<CampEncounter>, still: boolean) {
  if (still) return 1;
  if (event.phase === "arrival") return Math.min(1, event.elapsed / .15);
  const end = event.phase === "active" ? 3.2 : event.phase === "passive" ? 2 : Infinity;
  return Math.max(0, Math.min(1,(end - event.elapsed) / .23));
}

const waitingLoops = {
  bird:      {rate:2, cels:[3,3,11,13,3,3]},
  butterfly: {rate:8, cels:[3,2,6,2,4,3]},
  jelly:     {rate:3.5, cels:[3,4,5,4,3,3]},
  starFawn:  {rate:2, cels:[3,3,3,4,3]},
  moonBoat:  {rate:2, cels:[3,3,3,4,3]},
  cloudWhale:{rate:2.5, cels:[3,2,3,0]},
} as const;

function displayCel(event: Readonly<CampEncounter>, frame: number, still: boolean) {
  if (still || event.phase !== "waiting") return frame;
  if (event.id === "marshmallow") return event.elapsed < 3 ? frame : 8;
  const {rate,cels} = waitingLoops[event.id];
  return cels[Math.floor(event.elapsed*rate) % cels.length];
}

const antlerTips: readonly Offset[] = [[24.9,8.45],[23.3,13],[22.85,14.9],[28,4.4]];
function drawAntlerStars(c: CanvasRenderingContext2D, frame: number, at: Point) {
  if (frame < 10) return;
  // The bottom star touches the painted tine until the fawn turns away.
  // The last two cels leave the broken constellation hanging over the grass.
  const [u,v] = antlerTips[Math.min(frame-10,3)];
  const deer = sprites.starFawn;
  const x = feet.x + (frame<14 ? at.x : fawnBow[0]) + (u-deer.origin[0])*deer.scale;
  const y = feet.y + (frame<14 ? at.y : fawnBow[1]) + (v-deer.origin[1])*deer.scale;
  const scale = .27;
  c.drawImage(sceneArt.campFantasy,frame*80,5*64,80,64,x-40*scale,y-42*scale,80*scale,64*scale);
}

// The first pearl appears at the painted muzzle as the whale exhales on cel 11.
// The ring detaches and rises over Fufu while the whale swims on.
const ringTrail = [
  {time:0,    cel:9,  x:7.1, y:-28},
  {time:.14,  cel:10, x:6,   y:-30},
  {time:.31,  cel:11, x:4.7, y:-33},
  {time:.53,  cel:12, x:2.5, y:-37.5},
  {time:1.25, cel:13, x:-2,  y:-46.5},
  {time:1.55, cel:14, x:-8,  y:-51.5},
  {time:1.91, cel:15, x:-14, y:-56},
];
function drawStarRing(c: CanvasRenderingContext2D, elapsed: number, still: boolean) {
  const age = still ? .9 : elapsed-1.2;
  if (age < 0) return;
  let key = 0;
  while (key+1 < ringTrail.length && age >= ringTrail[key+1].time) key++;
  const a = ringTrail[key], b = ringTrail[key+1] ?? a;
  const t = a === b ? 0 : (age-a.time)/(b.time-a.time);
  const x = feet.x+a.x+(b.x-a.x)*t, y = feet.y+a.y+(b.y-a.y)*t;
  const scale = .38;
  c.drawImage(sceneArt.campFantasy,a.cel*80,3*64,80,64,x-40*scale,y-32*scale,80*scale,64*scale);
}

function drawRoastingRack(c: CanvasRenderingContext2D) {
  const scale = .38;
  const x = feet.x + roast[0] - 40 * scale, y = feet.y + roast[1] - 10 * scale;
  c.drawImage(sceneArt.campEncounterVisitors, 0,4*cell,cell,cell,x,y,cell*scale,cell*scale);
}

function drawDeliveryBird(c: CanvasRenderingContext2D, candy: Point, elapsed: number, still: boolean) {
  const scale = .26;
  const approach = still ? 1 : Math.min(1, elapsed / .4);
  const wingbeat = [0,2,9,1,10,14,15,1];
  const wing = still ? 2 : wingbeat[Math.floor(elapsed * 9) % wingbeat.length];
  // Start outside the fire ring. From pickup onwards, the beak meets the
  // candy's left edge, including the instant when its right edge meets her lips.
  const x = feet.x + candy.x - 2.5 - 37.5*scale - (1-approach)*22;
  const y = feet.y + candy.y - 18.5*scale - (1-approach)*11;
  c.save();
  c.globalAlpha *= Math.min(1, approach * 3);
  c.drawImage(sceneArt.campEncounterVisitors, wing*cell,0,cell,cell,x,y,cell*scale,cell*scale);
  c.restore();
}

function drawVisitor(c: CanvasRenderingContext2D, event: Readonly<CampEncounter>,
  frame: number, still: boolean, at: Point) {
  const {id, phase} = event;
  const {atlas, row, scale, origin} = sprites[id];
  const {width,height} = atlas, sheet = sceneArt[atlas.sheet];
  if (!sheet.naturalWidth) return;
  const x = feet.x + at.x, y = feet.y + at.y;
  const cel = displayCel(event,frame,still);
  c.save();
  c.globalAlpha *= opacity(event,still);
  if (id === "marshmallow") {
    drawRoastingRack(c);
    if (phase === "active") drawDeliveryBird(c,at,event.elapsed,still);
  }
  if (id === "bird" && at.y > -5) {
    c.fillStyle = "#42383f50";
    c.beginPath(); c.ellipse(x-.4,feet.y+1.25,4.7,1.15,0,0,Math.PI*2); c.fill();
  }
  if (id === "starFawn") {
    c.fillStyle = "#333e4052"; c.beginPath();
    c.ellipse(x+.5,y+.4,8.6,1.45,0,0,Math.PI*2); c.fill();
  } else if (id === "moonBoat") {
    c.drawImage(sheet,cel*width,4*height,width,height,
      x-40*scale,y-32*scale+.4,width*scale,height*scale);
  }
  if (id === "butterfly") {
    const glow = c.createRadialGradient(x,y-.7,1,x,y-.7,8.2);
    glow.addColorStop(0,"#ffcb6555"); glow.addColorStop(1,"#ffba4900");
    c.fillStyle = glow; c.fillRect(x-9,y-10,18,18);
  }
  c.drawImage(sheet,cel*width,row*height,width,height,
    x-origin[0]*scale,y-origin[1]*scale,width*scale,height*scale);
  if (id === "starFawn" && phase === "active") drawAntlerStars(c,frame,at);
  if (id === "cloudWhale" && phase === "active") drawStarRing(c,event.elapsed,still);
  if (id === "marshmallow" && phase === "passive" && (frame === 5 || frame === 6)) {
    c.strokeStyle = "#ffe6bd9c"; c.lineWidth = .55; c.lineCap = "round";
    c.beginPath(); c.moveTo(x+.4,y-3.1);
    c.bezierCurveTo(x-.9,y-5,x+2.7,y-4.8,x+2,y-6.5); c.stroke();
  }
  c.restore();
}

export function campEncounterLayers(event: Readonly<CampEncounter>, frame: number, still: boolean,
  outfit: number): DepthLayer[] {
  const position = visitorPosition(event,frame,still,outfit);
  const behindHead = event.id === "bird" && position.y < -25;
  return [{y: feet.y + (behindHead ? -.1 : .1), draw: c => drawVisitor(c,event,frame,still,position)}];
}

export function campEncounterHit(point: Point, event: Readonly<CampEncounter>, frame: number,
  still: boolean, outfit: number, pointerType: string): boolean {
  const sprite = sprites[event.id];
  if (event.phase !== "waiting" || !sceneArt[sprite.atlas.sheet].naturalWidth) return false;
  const target = visitorPosition(event,frame,still,outfit);
  const [cx,cy,rx,ry] = sprite.hit;
  const pad = pointerType === "touch" ? 6 : 2;
  const dx = (point.x - feet.x - target.x - cx) / (rx+pad);
  const dy = (point.y - feet.y - target.y - cy) / (ry+pad);
  return dx*dx + dy*dy <= 1;
}
