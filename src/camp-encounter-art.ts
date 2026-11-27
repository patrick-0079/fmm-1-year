import type { CampEncounter, CampEncounterId } from "./camp-encounters";
import { campEncounterContact, campEncounterMouth } from "./camp-encounter-contacts";
import type { Point } from "./core";
import { campSeat } from "./meadow-ground";
import { benchRest } from "./rest";
import { sceneArt } from "./scene-art";
import type { DepthLayer } from "./world";

const feet = benchRest("meadow", campSeat, campSeat).anchor;
const cell = 48;
const sprites = {
  bird:        {row: 0, scale: .36, origin: [24,36], hit: [-.5,-4.5,6.3,4.3]},
  butterfly:   {row: 1, scale: .21, origin: [24,26], hit: [0,-.7,4.2,3.2]},
  jelly:       {row: 2, scale: .34, origin: [22,40], hit: [.7,-6.4,5.2,6.5]},
  marshmallow: {row: 3, scale: .30, origin: [24,23], hit: [0,0,3.6,3]},
} as const;

type Offset = readonly [number, number];
// World-pixel positions relative to the sitter. Null cells use the matching
// fingertip or palm in the character artwork. Both branches start at cel 3.
const paths: Record<CampEncounterId, {start: Offset; poses: readonly (Offset | null)[]}> = {
  bird: {start: [-48,-30], poses: [
    [-40,-23],[-31,-15],[-23.5,-5],[-21,1],
    [-21,1],[-21,1],[-14,-17],[8,-39],
    [-20.5,.6],[-18,-11],[-15,-16],null,null,null,[-6,-30],[24,-48],
  ]},
  butterfly: {start: [-20,-49], poses: [
    [-20.5,-52],[-23.5,-56],[-20,-53],[-15.5,-48],
    [-18.5,-50],[-24,-46],[-31,-52],[-38,-67],
    [-14,-46],[-18,-36],[0,-15.55],null,null,null,[6,-27],[17,-43],
  ]},
  jelly: {start: [60,-27], poses: [
    [47,-25],[39,-20],[32,-21.5],[27,-18],
    [27,-18],[32,-22],[41,-22.5],[57,-36],
    [26,-18.5],[21,-21],[18,-19],null,null,null,[21,-23],[38,-32],
  ]},
  marshmallow: {start: [-11,-14], poses: [
    [-14,-16],[-17.75,-18.25],[-21.5,-20.5],[-24,-22.5],
    [-24.25,-22.75],[-7.5,-21.25],[-6.5,-21],[-9,-15.5],
    [-23.5,-22.25],[-16.25,-21.75],[-7.5,-20.5],null,null,null,[-5.75,-18],[-9,-15.5],
  ]},
};
function posePosition(id: CampEncounterId, frame: number, outfit: number): Point {
  const offset = paths[id].poses[frame];
  if (offset) return {x: offset[0], y: offset[1]};
  if (id === "marshmallow") {
    const mouth = campEncounterMouth(outfit);
    const [dx,dy] = [[-2.35,2.25],[-1.7,1.75],[-2.2,1.95]][frame-11];
    return {x: mouth.x + dx, y: mouth.y + dy};
  }
  const palm = campEncounterContact(id, frame);
  return {x: palm.x, y: palm.y - (id === "butterfly" ? 1.55 : 0)};
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
  if (paths[id].poses[frame] === null && id !== "marshmallow") return end;
  const previous = frame === 8 ? 3 : frame - 1;
  const [x,y] = paths[id].start;
  const start = previous < 0 ? {x,y} : posePosition(id, previous, outfit);
  if (id === "jelly" && frame === 14) start.x += (22-10)*sprites.jelly.scale;
  const first = phase === "active" ? 8 : phase === "passive" ? 4 : 0;
  const duration = phase === "passive" ? .5 : .4;
  const progress = Math.max(0, Math.min(1, elapsed / duration - (frame - first)));
  // Travel follows the drawn wingbeats. Once perched, the feet stay locked
  // to that cel's fingertip, including when the sitter relaxes her wrist.
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

// Used between the dressed figure and the foreground sleeves. As the elbow
// folds, the fingers slide up the wooden skewer and its free end comes into view.
export function drawCampHeldProp(c: CanvasRenderingContext2D, event: Readonly<CampEncounter>,
  frame: number, still: boolean, outfit: number) {
  if (event.id !== "marshmallow" || !sceneArt.campEncounterVisitors.naturalWidth) return;
  const grip = campEncounterContact("marshmallow",frame);
  const candy = visitorPosition(event,frame,still,outfit);
  const dx = candy.x - grip.x, dy = candy.y - grip.y;
  const length = Math.hypot(dx,dy);
  if (length < 1) return;
  // As the skewer turns towards her mouth, its far end is foreshortened
  // behind the wrist. It finishes at her lap in the original bite drawing.
  const back = Math.min(5.25, Math.max(1.25, 18.25 - length));
  const x = grip.x - dx / length * back, y = grip.y - dy / length * back;
  c.save();
  c.globalAlpha *= opacity(event,still);
  c.lineCap = "round";
  c.beginPath(); c.moveTo(x,y); c.lineTo(candy.x,candy.y);
  c.strokeStyle = "#68433a"; c.lineWidth = 1.35; c.stroke();
  c.beginPath(); c.moveTo(x+.1,y-.25); c.lineTo(candy.x+.1,candy.y-.25);
  c.strokeStyle = "#d69c61"; c.lineWidth = .55; c.stroke();
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
  if (id === "bird" && at.y > -5) {
    c.fillStyle = "#42383f50";
    c.beginPath(); c.ellipse(x-.4,feet.y+1.25,4.7,1.15,0,0,Math.PI*2); c.fill();
  }
  if (id === "butterfly") {
    const glow = c.createRadialGradient(x,y-.7,1,x,y-.7,8.2);
    glow.addColorStop(0,"#ffcb6555"); glow.addColorStop(1,"#ffba4900");
    c.fillStyle = glow; c.fillRect(x-9,y-10,18,18);
  }
  const originX = id === "jelly" && frame >= 11 && frame <= 13 ? 10 : origin[0];
  c.drawImage(sheet, displayCel(event,frame,still)*cell,row*cell,cell,cell,
    x-originX*scale,y-origin[1]*scale,size,size);
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
