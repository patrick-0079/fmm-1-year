import type { CampEncounter, CampEncounterId } from "./camp-encounters";
import { campEncounterLandmark } from "./camp-encounter-contacts";
import type { Point } from "./core";
import { campSeat } from "./meadow-ground";
import { benchRest } from "./rest";
import { sceneArt } from "./scene-art";
import type { DepthLayer } from "./world";

const feet = benchRest("meadow", campSeat, campSeat).anchor;
const cell = 48;
const sprites = {
  bird:        {row: 0, scale: .30, origin: [24,36], hit: [-.5,-4,5.3,4]},
  butterfly:   {row: 1, scale: .21, origin: [24,26], hit: [0,-.7,4.2,3.2]},
  jelly:       {row: 2, scale: .34, origin: [22,40], hit: [.7,-6.4,5.2,6.5]},
  marshmallow: {row: 3, scale: .30, origin: [24,23], hit: [0,0,3.6,3]},
} as const;

type Offset = readonly [number, number];
// Null marks a visit to this outfit's painted knee, cuff, hem or mouth.
// The other positions are world-pixel offsets from the seated player's feet.
const roast: Offset = [-27.5,-25.5];
const paths: Record<CampEncounterId, {start: Offset; poses: readonly (Offset | null)[]}> = {
  bird: {start: [-48,-30], poses: [
    [-40,-23],[-31,-15],[-23.5,-5],[-21,1],
    [-21,1],[-21,1],[-14,-17],[8,-39],
    [-20.5,.6],[-15,-4],[-9,-13],null,null,null,[6,-7.5],[32,-14.5],
  ]},
  butterfly: {start: [-20,-49], poses: [
    [-20.5,-52],[-23.5,-56],[-20,-53],[-15.5,-48],
    [-18.5,-50],[-24,-46],[-31,-52],[-38,-67],
    [-14,-46],[-18,-32],[-11,-18],null,null,null,[-13,-20],[-27,-39],
  ]},
  jelly: {start: [60,-27], poses: [
    [47,-25],[39,-20],[32,-21.5],[27,-18],
    [27,-18],[32,-22],[41,-22.5],[57,-36],
    [26,-18.5],[22,-16],[16,-11],null,null,null,[19,-13],[38,-30],
  ]},
  marshmallow: {start: roast, poses: [
    roast,roast,roast,roast, roast,roast,roast,roast,
    roast,[-18,-36],[-8,-22.5],null,null,null,[5,-10],[34,-15],
  ]},
};
function posePosition(id: CampEncounterId, frame: number, outfit: number): Point {
  const offset = paths[id].poses[frame];
  if (offset) return {x: offset[0], y: offset[1]};
  const at = campEncounterLandmark(id,outfit);
  if (id === "jelly") at.x += (22-10) * sprites.jelly.scale;
  if (id === "butterfly") at.y -= 1;
  if (id === "marshmallow") {
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
    if (id === "jelly" || id === "butterfly") {
      const rate = id === "jelly" ? 1.8 : 3.1;
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

function displayCel(event: Readonly<CampEncounter>, frame: number, still: boolean) {
  if (still || event.phase !== "waiting") return frame;
  if (event.id === "bird") {
    const glance = [3,3,11,13,3,3];
    return glance[Math.floor(event.elapsed * 2) % glance.length];
  }
  if (event.id === "butterfly") {
    const wingbeat = [3,2,6,2,4,3];
    return wingbeat[Math.floor(event.elapsed * 8) % wingbeat.length];
  }
  if (event.id === "jelly") {
    const stroke = [3,4,5,4,3,3];
    return stroke[Math.floor(event.elapsed * 3.5) % stroke.length];
  }
  return event.elapsed < 3 ? frame : 8;
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
  const sheet = sceneArt.campEncounterVisitors;
  if (!sheet.naturalWidth) return;
  const {id, phase} = event;
  const {row, scale, origin} = sprites[id];
  const x = feet.x + at.x, y = feet.y + at.y, size = cell * scale;
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
  if (id === "butterfly") {
    const glow = c.createRadialGradient(x,y-.7,1,x,y-.7,8.2);
    glow.addColorStop(0,"#ffcb6555"); glow.addColorStop(1,"#ffba4900");
    c.fillStyle = glow; c.fillRect(x-9,y-10,18,18);
  }
  c.drawImage(sheet, displayCel(event,frame,still)*cell,row*cell,cell,cell,
    x-origin[0]*scale,y-origin[1]*scale,size,size);
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
  if (event.phase !== "waiting" || !sceneArt.campEncounterVisitors.naturalWidth) return false;
  const target = visitorPosition(event,frame,still,outfit);
  const [cx,cy,rx,ry] = sprites[event.id].hit;
  const pad = pointerType === "touch" ? 6 : 2;
  const dx = (point.x - feet.x - target.x - cx) / (rx+pad);
  const dy = (point.y - feet.y - target.y - cy) / (ry+pad);
  return dx*dx + dy*dy <= 1;
}
