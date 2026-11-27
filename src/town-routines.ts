import { canArriveAt, facingFromMovement, findPath, obstacleContainsFoot, type Point, type Rect } from "./core.ts";
import type { Facing } from "./equipment.ts";
import type { Phase } from "./day.ts";
import { TOWN_NPCS, type TownNpc } from "./town-data.ts";
import type { TownResidentId } from "./town-dialogue.ts";
import { townScene } from "./town-map.ts";
import { townInteriorId } from "./town-interior-id.ts";
import { interiorForResident, townInteriors, type TownArea, type TownInterior } from "./town-interiors.ts";

export type TownShift = Phase | "after-midnight";
export const townShift = (phase: Phase, hours: number): TownShift =>
  phase === "night" && hours < 5 ? "after-midnight" : phase;

type Schedule = "always" | "morning" | "afternoon" | "evening" | "late";
const shifts: Record<Schedule, readonly Phase[]> = {
  always: ["dawn","day","dusk","night"], morning: ["dawn","day"],
  afternoon: ["day","dusk"], evening: ["dusk","night"], late: ["night","dawn"],
};
const p = (x: number, y: number): Point => ({ x, y });
// A worker's public route, and the little stretch to the shop/side street at shift change.
type Shift = { shift: Schedule; stops: Point[]; doorway?: Point[] };
export const townLives: Record<TownResidentId, Shift> = {
  post: { shift:"always", stops:[p(239,624)] },
  welcome: { shift:"always", stops:[] },
  florist: { shift:"morning", stops:[p(448,303)] },
  baker: { shift:"morning", stops:[p(766,310)] },
  "flight-keeper": { shift:"morning", stops:[p(785,488)], doorway:[p(789,484)] },
  maker: { shift:"morning", stops:[p(1164,423)] },
  "blocks-keeper": { shift:"afternoon", stops:[p(1065,551)], doorway:[p(1172,500),p(1166,448),p(1161,422),p(1151,408)] },
  walker: { shift:"afternoon", stops:[p(558,718)], doorway:[p(474,815)] },
  xiaoyou: { shift:"always", stops:[p(451,905)], doorway:[p(448,925)] },
  cat: { shift:"afternoon", stops:[p(1184,127)], doorway:[p(1128,157)] },
  bunny: { shift:"evening", stops:[], doorway:[p(755,523)] },
  guli: { shift:"always", stops:[p(948,332),p(968,352)], doorway:[p(820,324),p(780,316),p(777,289),p(772,270),p(756,252),p(747,252),p(733,252),p(726,250),p(718,246),p(715,245)] },
  qianxiao: { shift:"always", stops:[p(1198,522)], doorway:[p(1170,469),p(1166,448),p(1161,422),p(1151,408)] },
  "radio-host": { shift:"always", stops:[] },
  "hop-keeper": { shift:"late", stops:[p(514,613)], doorway:[p(497,605)] },
  books: { shift:"late", stops:[p(839,803)] },
  "snake-keeper": { shift:"late", stops:[p(516,406)], doorway:[p(516,406),p(368,396)] },
  "photo-visitor": { shift:"late", stops:[p(900,452),p(879,451)] },
};
export const worksInTown = (id: TownResidentId, shift: TownShift) =>
  shifts[townLives[id].shift].includes(shift === "after-midnight" ? "night" : shift);
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const onScreen = (a: Point, v: Rect) => a.x > v.x - 21 && a.x < v.x + v.w + 21 && a.y > v.y - 8 && a.y < v.y + v.h + 48;
interface Station { scene: TownArea; foot: Point; approach?: Point }
const streetStations = new Map<TownResidentId, Station>(TOWN_NPCS.map(npc =>
  [npc.id, { scene: "town", foot: npc }]));
const indoorStations = new Map([...interiorForResident].map(([id, room]) => [
  id, Object.fromEntries(Object.entries(room.shifts).map(([phase, stop]) => [
    phase, { ...stop, scene: townInteriorId(room.key) },
  ])) as Partial<Record<Phase, Station>>,
]));
const radioStreet: Station = {scene:"town", foot:p(1356,828), approach:p(1327,833)};
function station(id: TownResidentId, shift: TownShift) {
  if (id === "radio-host") {
    if (shift === "night") return indoorStations.get(id)?.night;
    return shift === "dusk" ? streetStations.get(id) : radioStreet;
  }
  const phase = shift === "after-midnight" ? "night" : shift;
  return indoorStations.get(id)?.[phase] ?? (worksInTown(id, phase) ? streetStations.get(id) : undefined);
}
export function residentTownScene(id: TownResidentId, phase: TownShift) {
  return station(id, phase)?.scene;
}
const streetGeometry = { ...townScene, walls: townScene.walls.filter(w => !w.yieldsOnArrival) };
const geometry = (scene: TownArea) => scene === "town" ? streetGeometry : townInteriors[scene].scene;
const doorIn = (house: TownInterior, scene: TownArea) => scene === "town" ? house.exterior : house.exit;
const threshold = (house: TownInterior, scene: TownArea) => {
  const door = doorIn(house, scene);
  return door.crossing ? p(door.x, door.y) : door.approach;
};

type Status = "absent" | "arriving" | "present" | "leaving";
export interface ResidentMotion extends Point {
  id: TownResidentId;
  scene: TownArea;
  destination?: Station;
  approach?: Point;
  status: Status;
  route: Point[];
  away: boolean;
  wait: number;
  odometer: number;
  facing: Facing;
  walking: boolean;
  opacity: number;
  workTime: number;
  avoiding?: Point;
}
function initialize(n: TownNpc, i: number, phase: TownShift): ResidentMotion {
  const destination = station(n.id, phase);
  const foot = destination?.foot ?? n;
  return {id:n.id, x:foot.x, y:foot.y, scene:destination?.scene ?? "town", destination,
    approach:destination?.approach, status:destination ? "present" : "absent",
    route:[], away:false, wait:2.5+(i*4.13)%15, odometer:0, facing:0, walking:false,
    opacity:1, workTime:(i*2.37)%13, avoiding: undefined};
}

export class TownRoutines {
  readonly people = new Map<TownResidentId,ResidentMotion>();
  private phase: TownShift = "day";
  private heldAfterJump?: TownResidentId;
  constructor(phase: TownShift = "day") { this.enter(phase); }
  enter(phase: TownShift) {
    this.phase=phase;
    this.heldAfterJump=undefined;
    TOWN_NPCS.forEach((n,i)=>this.people.set(n.id,initialize(n,i,phase)));
  }

  syncShift(phase:TownShift, speaking?:TownResidentId) {
    this.phase=phase;
    this.heldAfterJump=speaking;
    TOWN_NPCS.forEach((npc,index)=>{
      const actor=this.people.get(npc.id)!;
      const target = station(npc.id, phase);
      if (npc.id!==speaking && (actor.destination !== target || actor.status !== (target ? "present" : "absent"))) {
        Object.assign(actor,initialize(npc,index,phase));
      }
    });
  }

  private arrive(actor: ResidentMotion, destination: Station, house: TownInterior) {
    const door = threshold(house, destination.scene);
    Object.assign(actor, { scene: destination.scene, x: door.x, y: door.y, approach: undefined, away: false,
      status: "arriving", opacity: 0, avoiding: undefined,
      route: findPath(door, destination.foot, geometry(destination.scene)) ?? [] });
  }

  private commute(actor: ResidentMotion, npc: TownNpc, house: TownInterior, phase: TownShift, visible: boolean,
    area: TownArea, view: Rect, still: boolean) {
    const next = station(npc.id, phase);
    if (actor.destination === next) return;
    const arrivingInView = next?.scene === area && onScreen(next.foot, view);
    if (still || (!visible && !arrivingInView && actor.status !== "leaving")) {
      Object.assign(actor, initialize(npc, TOWN_NPCS.indexOf(npc), phase));
      return;
    }
    actor.destination = next;
    if (actor.status === "absent") {
      if (next) this.arrive(actor, next, house);
      return;
    }
    const sameRoom = next?.scene === actor.scene;
    const target = sameRoom ? next.foot : threshold(house, actor.scene);
    actor.status = sameRoom ? "arriving" : "leaving";
    actor.approach = undefined;
    actor.avoiding = undefined;
    actor.route = findPath(actor, target, geometry(actor.scene)) ?? [];
  }

  private detour(actor: ResidentMotion, house: TownInterior, player: Point, clearance: Rect) {
    if (actor.avoiding && distance(actor.avoiding, player) < 4) return;
    if (obstacleContainsFoot(actor, clearance)) return;
    actor.avoiding = { ...player };
    const map = geometry(actor.scene), guarded = { ...map, walls: [...map.walls, clearance] };
    const target = actor.status === "leaving" ? threshold(house, actor.scene) : actor.destination!.foot;
    const crossing = doorIn(house, actor.scene).crossing;
    // Leave an occupied doorway using the clear side of the same opening.
    const alternatives = actor.status === "leaving" && obstacleContainsFoot(target, clearance)
      ? [-11, 11, -14, 14, -17, 17].map(dx => p(target.x + dx, target.y))
      : [target];
    if (!crossing && alternatives.length > 1) alternatives.push(p(target.x, target.y + 16));
    for (const stop of alternatives) {
      if (!canArriveAt(stop, guarded)) continue;
      const path = findPath(actor, stop, guarded);
      const end = path?.at(-1);
      if (path && end?.x === stop.x && end.y === stop.y) { actor.route = path; return; }
    }
  }

  private finishRoute(actor: ResidentMotion, npc: TownNpc, house?: TownInterior) {
    if (actor.status === "leaving") {
      if (house && actor.destination) this.arrive(actor, actor.destination, house);
      else { actor.status = "absent"; actor.opacity = 0; }
      return;
    }
    actor.status = "present";
    actor.opacity = 1;
    actor.approach = actor.destination?.approach;
    actor.wait = 6 + (TOWN_NPCS.indexOf(npc) * 2.61 + actor.odometer * .08) % 9;
  }

  tick(dt:number, phase:TownShift, player:Point, view:Rect, held:string|null, speaking:string|undefined, still:boolean,
    area: TownArea = "town") {
    if (this.heldAfterJump && speaking!==this.heldAfterJump) {
      const npc = TOWN_NPCS.find(person => person.id === this.heldAfterJump)!;
      const actor = this.people.get(npc.id)!;
      if (actor.destination !== station(npc.id, phase)) Object.assign(actor, initialize(npc, TOWN_NPCS.indexOf(npc), phase));
      this.heldAfterJump=undefined;
    }
    if (!dt && phase===this.phase) return;
    this.phase=phase;
    // Continue the two moving feet already in view before offering a new turn to a neighbour.
    const ordered = [...this.people.values()].sort((a,b)=>Number(b.walking)-Number(a.walking) || a.wait-b.wait);
    const clearance = { x: player.x - 6, y: player.y - 6, w: 12, h: 12 };
    let walkingInView=0;
    for (const a of ordered) {
      const npc = TOWN_NPCS.find(n=>n.id===a.id)!;
      const house = interiorForResident.get(a.id);
      const sameArea = a.scene === area;
      const life=townLives[a.id], visible=sameArea && onScreen(a,view);
      const duty=worksInTown(a.id,phase), talking=speaking===a.id;
      const available = a.status === "present" || a.status === "arriving" && a.opacity >= .8;
      const reserved=sameArea && available && held==="npc-"+a.id &&
        (house ? a.destination === station(a.id, phase) : duty);
      a.walking=false;
      if (house) {
        if (!talking && !reserved) this.commute(a, npc, house, phase, visible, area, view, still);
      } else if (!talking && !reserved) {
        a.destination=station(npc.id,phase);
        if (!duty && (!visible || still)) {
          a.status="absent"; a.opacity=0; a.route=[]; continue;
        }
        if (!duty && a.status!=="absent" && a.status!=="leaving") {
          a.status="leaving";
          // Retrace the known walkable street before taking the last steps to the doorway.
          const stopPath = [npc,...life.stops];
          const next = a.route[0];
          const nextIndex = next ? stopPath.findIndex(p=>p.x===next.x && p.y===next.y) : -1;
          const returnPath = a.away ? (nextIndex<0 ? [...stopPath].reverse() : stopPath.slice(0,nextIndex).reverse()) :
            (nextIndex<0 ? [npc] : stopPath.slice(0,nextIndex+1).reverse());
          a.route = [...returnPath,...(life.doorway??[])];
        } else if (duty && (a.status==="absent" || a.status==="leaving")) {
          if ((!visible && !onScreen(npc,view)) || still) {
            Object.assign(a,initialize(npc,TOWN_NPCS.indexOf(npc),phase));
            continue;
          }
          // A fast second phase change can find someone part-way through departing.
          // Finish that short exit before re-entering from the same threshold.
          if (a.status==="absent") {
            const entrance=life.doorway??[];
            const start=entrance.at(-1)??npc;
            Object.assign(a,{x:start.x,y:start.y,status:"arriving",away:false,opacity:0,
              route:[...entrance].reverse().slice(1).concat(npc)});
          }
        }
      }
      if (a.status==="absent") continue;
      if (talking || reserved) { a.wait=Math.max(a.wait,1.4); continue; }
      if (a.status==="present") {
        a.workTime+=dt;
        if (a.scene !== "town" || still || sameArea && distance(player,a)<43 || !life.stops.length) continue;
        if (!a.route.length) {
          a.wait-=dt;
          if (a.wait>0) continue;
          a.away=!a.away;
          a.route=a.away ? [...life.stops] : [npc,...life.stops.slice(0,-1)].reverse();
        }
      }
      if (still) { Object.assign(a,initialize(npc,TOWN_NPCS.indexOf(npc),phase)); continue; }
      if (visible && walkingInView>=2) continue;
      while (a.route.length && distance(a,a.route[0])<.1) a.route.shift();
      const next=a.route[0];
      if (!next) {
        this.finishRoute(a, npc, house);
        continue;
      }
      const gap=distance(a,next), dx=(next.x-a.x)/gap, dy=(next.y-a.y)/gap;
      const speed=house && a.status !== "present" ? 43 : a.id==="cat"?14 : a.id==="guli"?19 : a.id==="walker"?17 : 13;
      const step=Math.min(gap,dt*speed);
      const x=a.x+dx*step, y=a.y+dy*step;
      // Commuters use the open side of an occupied corridor or doorway.
      const nextGap = distance({x,y}, player), currentGap = distance(a, player);
      if (a.scene === area && nextGap < 14) {
        if (!house || a.status === "present") {
          if (nextGap < currentGap) continue;
        } else if (obstacleContainsFoot({x,y}, clearance) &&
            (nextGap <= currentGap || !obstacleContainsFoot(a, clearance))) {
          this.detour(a, house, player, clearance);
          continue;
        }
      }
      a.x=x; a.y=y; a.facing=facingFromMovement(a.facing,dx,dy); a.walking=step>0;
      a.odometer+=step;
      if (visible && a.walking) walkingInView++;
      if (a.status==="leaving" && a.route.length===1) a.opacity=Math.min(a.opacity,gap/12,1);
      if (a.status==="arriving") a.opacity=Math.min(1,a.opacity+step/12);
      if (step>=gap) {
        a.route.shift();
        if (!a.route.length) this.finishRoute(a, npc, house);
      }
    }
  }
}
