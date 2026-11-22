import { facingFromMovement, type Point, type Rect } from "./core.ts";
import type { Facing } from "./equipment.ts";
import type { Phase } from "./day.ts";
import { TOWN_NPCS, type TownNpc } from "./town-data.ts";
import type { TownResidentId } from "./town-dialogue.ts";

type Schedule = "always" | "morning" | "afternoon" | "evening" | "late";
const shifts: Record<Schedule, readonly Phase[]> = {
  always: ["dawn","day","dusk","night"], morning: ["dawn","day"],
  afternoon: ["day","dusk"], evening: ["dusk","night"], late: ["night","dawn"],
};
const p = (x: number, y: number): Point => ({ x, y });
// A worker's public route, and the little stretch to the shop/side street at shift change.
type Shift = { shift: Schedule; stops: Point[]; doorway?: Point[] };
export const townLives: Record<TownResidentId, Shift> = {
  post: { shift:"always", stops:[p(337,674)] },
  welcome: { shift:"always", stops:[] },
  florist: { shift:"morning", stops:[p(448,303)], doorway:[p(500,364),p(492,372),p(428,388),p(368,396)] },
  baker: { shift:"morning", stops:[p(766,310)], doorway:[p(756,252),p(715,245)] },
  "flight-keeper": { shift:"morning", stops:[p(785,488)], doorway:[p(789,484)] },
  maker: { shift:"morning", stops:[p(1194,427)], doorway:[p(1108,399)] },
  "blocks-keeper": { shift:"afternoon", stops:[p(1109,563)], doorway:[p(1172,500),p(1132,420),p(1108,399)] },
  walker: { shift:"afternoon", stops:[p(558,718)], doorway:[p(474,815)] },
  xiaoyou: { shift:"afternoon", stops:[p(451,905)], doorway:[p(448,925)] },
  cat: { shift:"afternoon", stops:[p(1184,127)], doorway:[p(1128,157)] },
  bunny: { shift:"evening", stops:[], doorway:[p(766,523)] },
  guli: { shift:"evening", stops:[p(948,332),p(968,352)], doorway:[p(820,324),p(756,252),p(715,245)] },
  qianxiao: { shift:"evening", stops:[p(1220,527)], doorway:[p(1108,399)] },
  "radio-host": { shift:"evening", stops:[], doorway:[p(1288,817)] },
  "hop-keeper": { shift:"late", stops:[p(514,613)], doorway:[p(497,605)] },
  books: { shift:"late", stops:[p(867,757)], doorway:[p(867,753)] },
  "snake-keeper": { shift:"late", stops:[p(516,391)], doorway:[p(368,396)] },
  "photo-visitor": { shift:"late", stops:[p(900,452),p(879,451)], doorway:[p(1124,508),p(1267,496)] },
};
export const worksInTown = (id: TownResidentId, phase: Phase) => shifts[townLives[id].shift].includes(phase);
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const onScreen = (a: Point, v: Rect) => a.x > v.x - 21 && a.x < v.x + v.w + 21 && a.y > v.y - 8 && a.y < v.y + v.h + 48;
type Status = "absent" | "arriving" | "present" | "leaving";
export interface ResidentMotion extends Point {
  id: TownResidentId;
  status: Status;
  route: Point[];
  away: boolean;
  wait: number;
  odometer: number;
  facing: Facing;
  walking: boolean;
  opacity: number;
  workTime: number;
}
function initialize(n: TownNpc, i: number, phase: Phase): ResidentMotion {
  return {id:n.id, x:n.x, y:n.y, status:worksInTown(n.id,phase) ? "present" : "absent",
    route:[], away:false, wait:2.5+(i*4.13)%15, odometer:0, facing:0, walking:false,
    opacity:1, workTime:(i*2.37)%13};
}

export class TownRoutines {
  readonly people = new Map<TownResidentId,ResidentMotion>();
  private phase: Phase = "day";
  private heldAfterJump?: TownResidentId;
  constructor(phase: Phase = "day") { this.enter(phase); }
  enter(phase: Phase) {
    this.phase=phase;
    this.heldAfterJump=undefined;
    TOWN_NPCS.forEach((n,i)=>this.people.set(n.id,initialize(n,i,phase)));
  }

  syncShift(phase:Phase, speaking?:TownResidentId) {
    this.phase=phase;
    this.heldAfterJump=speaking && !worksInTown(speaking,phase) ? speaking : undefined;
    TOWN_NPCS.forEach((npc,index)=>{
      const actor=this.people.get(npc.id)!;
      const status=worksInTown(npc.id,phase) ? "present" : "absent";
      if (npc.id!==speaking && actor.status!==status) {
        Object.assign(actor,initialize(npc,index,phase));
      }
    });
  }

  tick(dt:number, phase:Phase, player:Point, view:Rect, held:string|null, speaking:string|undefined, still:boolean) {
    if (this.heldAfterJump && speaking!==this.heldAfterJump) {
      if (!worksInTown(this.heldAfterJump,phase)) {
        const actor=this.people.get(this.heldAfterJump)!;
        actor.status="absent"; actor.walking=false; actor.route=[];
      }
      this.heldAfterJump=undefined;
    }
    if (!dt && phase===this.phase) return;
    this.phase=phase;
    // Continue the two moving feet already in view before offering a new turn to a neighbour.
    const ordered = [...this.people.values()].sort((a,b)=>Number(b.walking)-Number(a.walking) || a.wait-b.wait);
    let walkingInView=0;
    for (const a of ordered) {
      const npc = TOWN_NPCS.find(n=>n.id===a.id)!;
      const life=townLives[a.id], visible=onScreen(a,view);
      const duty=worksInTown(a.id,phase), talking=speaking===a.id;
      const reserved=duty && held==="npc-"+a.id;
      a.walking=false;
      if (!talking && !reserved) {
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
        if (still || distance(player,a)<43 || !life.stops.length) continue;
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
        if (a.status==="leaving") { a.status="absent"; a.opacity=0; }
        else { a.status="present"; a.opacity=1; a.wait=6+(TOWN_NPCS.indexOf(npc)*2.61+a.odometer*.08)%9; }
        continue;
      }
      const gap=distance(a,next), dx=(next.x-a.x)/gap, dy=(next.y-a.y)/gap;
      const speed=a.id==="cat"?14 : a.id==="guli"?19 : a.id==="walker"?17 : 13;
      const step=Math.min(gap,dt*speed);
      const x=a.x+dx*step, y=a.y+dy*step;
      // Traffic yields to the player and to an occupied doorstep.
      if (distance({x,y},player)<14 && distance({x,y},player)<distance(a,player)) continue;
      if (a.status==="arriving" && distance(a,player)<13 && a.opacity===0) continue;
      a.x=x; a.y=y; a.facing=facingFromMovement(a.facing,dx,dy); a.walking=step>0;
      a.odometer+=step;
      if (visible && a.walking) walkingInView++;
      if (a.status==="leaving" && a.route.length===1) a.opacity=Math.min(a.opacity,gap/12,1);
      if (a.status==="arriving") a.opacity=Math.min(1,a.opacity+step/12);
      if (step>=gap) {
        a.route.shift();
        if (!a.route.length) {
          if (a.status==="leaving") {a.status="absent"; a.opacity=0;}
          else {a.status="present"; a.opacity=1; a.wait=6+(TOWN_NPCS.indexOf(npc)*2.61+a.odometer*.08)%9;}
        }
      }
    }
  }
}
