import { canStand, canTravelBetween, facingFromMovement, findPath, obstacleContainsFoot, type Obstacle, type Point } from "./core.ts";
import type { Facing } from "./equipment.ts";
import type { Phase } from "./day.ts";
import type { Hotspot, Scene } from "./maps.ts";
import { gardenGuests } from "./garden-guests.ts";
import { suyanSpot } from "./suyan-data.ts";

type GuestKey = typeof gardenGuests[number]["id"] | "suyan";
type Shift = "working" | "arriving" | "leaving" | "away";
export interface GardenPerformer {
  foot: Point;
  mode: Shift;
  step: number;
  moving: boolean;
  facing: Facing;
  wait: number;
  alternate: boolean;
  route: Point[];
  detourIn:number;
}
const home = Object.fromEntries([...gardenGuests, { ...suyanSpot, id: "suyan" }].map(n => [n.id,{x:n.x,y:n.y}])) as Record<GuestKey,Point>;
const routes = {
  "balloon-friend": { phases:["dawn","day"], near:home["balloon-friend"], door:{x:256,y:343}, pause:12, wall:"庭院来宾 · 星星" },
  "picnic-friend": { phases:["day","dusk"], near:{x:617,y:395}, door:{x:560,y:276}, pause:11, wall:"庭院来宾 · 晴糖" },
  decorator: { phases:["night","dawn"], near:{x:317,y:413}, door:{x:270,y:344}, pause:9, wall:"庭院来宾 · 霉霉" },
  suyan: { phases:["dusk","night"], near:{x:635,y:175}, door:{x:558,y:169}, pause:15, wall:"来宾 · 苏颜" },
};
const keys = Object.keys(routes) as GuestKey[];
const gap=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export function gardenWorking(key:GuestKey,phase:Phase) {
  return routes[key].phases.includes(phase);
}
function atHome(key:GuestKey, phase:Phase): GardenPerformer {
  return {
    foot:{...home[key]}, mode:gardenWorking(key,phase) ? "working" : "away",
    step:0, moving:false, facing:0, wait:routes[key].pause-5, alternate:false, route:[], detourIn:0,
  };
}
interface MapCopy {
  map: Scene;
  terrain: Scene;
  spots: Map<GuestKey,{home:Hotspot; here:Hotspot; wall:Extract<Obstacle,{x:number}>}>;
  revision: number;
}
const npcId=(key:GuestKey)=>"garden-guest-"+key;

/** Each garden variant owns its spots and walls; open dialogue keeps the same point object. */
export class GardenResidents {
  private copies = new WeakMap<Scene,MapCopy>();
  private actors = new Map<GuestKey,GardenPerformer>();
  private present = false;
  private revision = 0;
  private player?: Point;
  private base?: Scene;
  private speaker?: GuestKey;
  private heldAfterJump?: GuestKey;
  private yielding = "";

  get(key:GuestKey) { return this.actors.get(key)!; }
  visible(key:GuestKey) { const a=this.actors.get(key); return !!a && a.mode !== "away"; }
  interactable(key:GuestKey) { return this.actors.get(key)?.mode === "working"; }
  talking(key:GuestKey,yes:boolean) {
    if (yes) this.speaker=key;
    else if (this.speaker===key) this.speaker=undefined;
  }
  leave() { this.present=false; this.speaker=undefined; this.heldAfterJump=undefined; }

  private enter(phase:Phase) {
    if (this.present) return;
    this.present=true;
    for (const key of keys) this.actors.set(key,atHome(key,phase));
    this.revision++;
  }
  syncShift(phase:Phase, player:Point) {
    this.enter(phase);
    this.player=player;
    this.heldAfterJump=this.speaker && !gardenWorking(this.speaker,phase) ? this.speaker : undefined;
    for (const key of keys) {
      const actor=this.get(key);
      const mode=gardenWorking(key,phase) ? "working" : "away";
      if (key!==this.speaker && actor.mode!==mode) this.actors.set(key,atHome(key,phase));
    }
    this.revision++;
  }
  private copy(base:Scene) {
    let copy=this.copies.get(base);
    if (copy) return copy;
    const terrain = { ...base, walls:base.walls.filter(w=>!keys.some(k=>routes[k].wall===w.label)) };
    const spots: MapCopy["spots"] = new Map();
    for (const key of keys) {
      const spot=base.spots.find(s=>s.id===npcId(key))!;
      const wall=base.walls.find(w=>w.label===routes[key].wall)!;
      if (!("x" in wall)) throw new Error("Expected a rectangular garden resident footprint.");
      spots.set(key,{home:spot,here:{...spot},wall});
    }
    copy={map:{...base},terrain,spots,revision:-1};
    this.copies.set(base,copy);
    return copy;
  }
  mapFor(base:Scene,phase:Phase) {
    this.enter(phase);
    this.base=base;
    const copy=this.copy(base);
    if (copy.revision===this.revision) return copy.map;
    const walls=copy.terrain.walls.slice();
    const visitors=new Map<string,Hotspot>();
    for (const key of keys) {
      const actor=this.get(key);
      if (actor.mode==="away") continue;
      const original=copy.spots.get(key)!;
      const {home:origin,here,wall}=original;
      const dx=actor.foot.x-origin.x, dy=actor.foot.y-origin.y;
      here.x=actor.foot.x; here.y=actor.foot.y;
      here.hitAreas=origin.hitAreas?.map(r=>({...r,x:r.x+dx,y:r.y+dy}));
      const footprint={...wall,x:wall.x+dx,y:wall.y+dy};
      if (!this.player || !obstacleContainsFoot(this.player,footprint)) walls.push(footprint);
      if (actor.mode==="working") visitors.set(here.id,here);
    }
    copy.map.walls=walls;
    copy.map.spots=base.spots.flatMap(spot=>{
      const current=visitors.get(spot.id);
      if(current)return [current];
      return keys.some(k=>npcId(k)===spot.id) ? [] : [spot];
    });
    for (const {home:origin,here} of copy.spots.values()) {
      if (!visitors.has(here.id)) continue;
      const offset={x:origin.approach.x+here.x-origin.x,y:origin.approach.y+here.y-origin.y};
      const fallback=[offset,{x:here.x-18,y:here.y+8},{x:here.x+18,y:here.y+8},origin.approach];
      here.approach=fallback.find(p=>canStand(p,walls,base.bounds,base.floor,base.surfaces))??offset;
    }
    copy.revision=this.revision;
    return copy.map;
  }
  anchor(key:GuestKey) { return this.copy(this.base!).spots.get(key)!.here; }

  tick(dt:number,phase:Phase,player:Point,pending:string|null,still:boolean,inView:(p:Point)=>boolean,quiet=false) {
    if (!this.present || !this.base) return;
    if (this.heldAfterJump && this.speaker!==this.heldAfterJump) {
      if (!gardenWorking(this.heldAfterJump,phase)) {
        const actor=this.get(this.heldAfterJump);
        actor.mode="away"; actor.moving=false; actor.route=[]; this.revision++;
      }
      this.heldAfterJump=undefined;
    }
    this.player=player;
    // Only crossings of a footprint boundary require rebuilding the wall list.
    const copy=this.copy(this.base);
    const yielding=keys.filter(key=>{
      const actor=this.get(key), {wall,home:origin}=copy.spots.get(key)!;
      return actor.mode!=="away" && obstacleContainsFoot(player,{...wall,x:wall.x+actor.foot.x-origin.x,y:wall.y+actor.foot.y-origin.y});
    }).join(",");
    if(yielding!==this.yielding){this.yielding=yielding;this.revision++;}
    if (!dt) return;
    // Departures have priority over entrances. At most two guests are on the move.
    const order = keys.slice().sort((a,b)=>Number(gardenWorking(a,phase))-Number(gardenWorking(b,phase)));
    let walkers=0;
    for (const key of order) {
      const a=this.get(key), rule=routes[key], on=gardenWorking(key,phase);
      const booked=this.speaker===key || pending===npcId(key);
      a.moving=false;
      a.detourIn=Math.max(0,a.detourIn-dt);
      if (this.speaker===key) continue;
      if (!on && a.mode!=="away" && a.mode!=="leaving") {
        a.route=[]; a.mode="leaving"; this.revision++;
        if (still || !inView(a.foot)) { a.mode="away"; continue; }
      } else if(on && a.mode==="leaving") {
        a.mode="arriving";a.route=[];this.revision++;
      } else if(on && a.mode==="away") {
        if(keys.filter(k=>this.get(k).mode!=="away").length>=2) continue;
        a.mode=still || !inView(home[key]) ? "working":"arriving";
        a.foot={...(a.mode==="working"?home[key]:rule.door)}; a.route=[];a.wait=rule.pause;
        this.revision++;
      }
      if (a.mode==="away") continue;
      const movingShift=a.mode!=="working";
      if (still) {
        if(movingShift){a.mode=on?"working":"away";a.foot={...home[key]};a.route=[];this.revision++;}
        continue;
      }
      // A click holds that actual foot. Give approaching pedestrians time to choose E.
      if (!movingShift && (booked || quiet || gap(a.foot,player)<43)) continue;
      if(walkers>=2) continue;
      if (!a.route.length) {
        if (!movingShift) {
          if(key==="balloon-friend") continue;
          a.wait-=dt;
          if(a.wait>0) continue;
        }
        const target=a.mode==="leaving"?rule.door : a.mode==="arriving"?home[key] : a.alternate?home[key]:rule.near;
        const route=findPath(a.foot,target,copy.terrain);
        if(!route || !route.length){a.wait=rule.pause;continue;}
        a.route=route;
      }
      const target=a.route[0], dist=gap(a.foot,target);
      const length=Math.min(dist,dt*(movingShift ? 30 : 11));
      if(dist>.001) {
        const dx=target.x-a.foot.x,dy=target.y-a.foot.y;
        const foot={x:a.foot.x+dx*length/dist,y:a.foot.y+dy*length/dist};
        const neighbours=[player,...keys.filter(k=>k!==key && this.visible(k)).map(k=>this.get(k).foot)];
        const blocked=neighbours.some(p=>gap(foot,p)<15 && gap(foot,p)<gap(a.foot,p));
        if(blocked) {
          // A walker gives way, then steps around a person who has stopped in the lane.
          if(a.detourIn===0){
            a.detourIn=1.3;
            const blockers=neighbours.map(p=>({label:"guest clearance",x:p.x-5,y:p.y-5,w:10,h:10}));
            const terrain={...copy.terrain,walls:[...copy.terrain.walls,...blockers]};
            const goal=a.route[a.route.length-1],choices=[goal];
            if(movingShift)choices.push({x:goal.x-11,y:goal.y},{x:goal.x+11,y:goal.y},{x:goal.x,y:goal.y-11});
            for(const p of choices){
              if(neighbours.some(n=>gap(n,p)<15))continue;
              const route=findPath(a.foot,p,terrain);
              if(route?.length){a.route=route; break;}
            }
          }
          continue;
        }
        if(!canTravelBetween(a.foot,foot,copy.terrain)) {a.route=[];continue;}
        a.foot=foot; a.step+=length; a.moving=true;
        a.facing=facingFromMovement(a.facing,dx,dy);
        this.revision++;walkers++;
      }
      if(length>=dist-.001) {
        a.route.shift();
        if(!a.route.length) {
          if(a.mode==="leaving")a.mode="away";
          else if(a.mode==="arriving"){a.mode="working";a.alternate=false;}
          else a.alternate=!a.alternate;
          a.wait=rule.pause+(a.alternate?2:0); this.revision++;
        }
      }
    }
  }
}
