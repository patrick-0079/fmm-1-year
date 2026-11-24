import type { Point } from "./core.ts";
import { campfire, campLetterSpot, meadowExit, meadowFlock, starJar } from "./meadow-ground.ts";

const turn = 2 * Math.PI;
export const jellyfish = [
  { x: 225, y: 368, rx: 44, ry: 14, period: 20, offset: .38, width: 15, tail: 9, beat: 1.48, bell: 0 },
  { x: 492, y: 244, rx: 49, ry: 18, period: 29, offset: .68, width: 21, tail: 14, beat: 2.14, bell: 1 },
  { x: 683, y: 468, rx: 43, ry: 19, period: 25, offset: .13, width: 18, tail: 19, beat: 1.86, bell: 2 },
  { x: 509, y: 126, rx: 36, ry: 12, period: 26, offset: .24, width: 13, tail: 8, beat: 1.66, bell: 0 },
  { x: 801, y: 258, rx: 28, ry: 22, period: 31, offset: .81, width: 22, tail: 15, beat: 2.49, bell: 1 },
  { x: 393, y: 530, rx: 42, ry: 11, period: 23, offset: .54, width: 16, tail: 11, beat: 1.72, bell: 2 },
] as const;

interface Keepout extends Point { radius: number }
interface Habitat extends Point { scale: number }
interface Sweep { start: Point; control: Point; endControl: Point; end: Point }
export interface JellyVisitor {
  phase: "drift" | "approach" | "stay" | "return";
  visible: boolean;
  at: Point;
  heading: number;
  trailing: number;
  warmth: number;
  routeTime: number;
  elapsed: number;
  cooling: number;
  lastEncounter?: Point;
  sweep?: Sweep;
  host?: Point;
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Circles are in ground-projection space. Their padding includes the bell, long
// tentacles, sheep's entire grazing walk and the space above each collectible.
const quietAreas: Keepout[] = [
  { ...campfire, radius: 63 }, { ...campLetterSpot, radius: 44 },
  { ...starJar, radius: 44 }, { ...meadowExit, radius: 46 },
  ...meadowFlock.map(sheep => ({ x: sheep.x + 9, y: sheep.y, radius: 45 })),
];
const starArea = (star: Point): Keepout => ({ x: star.x, y: star.y + 9, radius: 34 });

function patrol(index: number, home: Habitat, t: number): Point {
  const j = jellyfish[index];
  const beat = turn * (t / j.beat + j.offset);
  // One short jet per bell stroke, followed by a long, slower glide.
  const a = turn * (j.offset + t / j.period) + .043 * Math.sin(beat - 2.1);
  return {
    x: home.x + home.scale * j.rx * Math.cos(a),
    y: home.y + home.scale * j.ry * (.84 * Math.sin(a) + .16 * Math.sin(2 * a + .3)),
  };
}
const clearance = (p: Point, areas: readonly Keepout[]) =>
  areas.reduce((gap, area) => Math.min(gap, distance(p, area) - area.radius), Infinity);

function chooseHabitat(index: number, areas: Keepout[]): Habitat | undefined {
  const j = jellyfish[index];
  // Resolve a new resident's loop before displaying it on the grass.
  for (const scale of [1, .74, .48]) {
    for (const [dx,dy] of [[0,0],[0,-24],[0,24],[-25,0],[25,0],[-22,-23],[22,23],[-30,24],[30,-24]]) {
      const home = { x: j.x + dx, y: j.y + dy, scale };
      let gap = Infinity;
      for (let i = 0; i < 64; i++)
        gap = Math.min(gap, clearance(patrol(index, home, j.period * i / 64), areas));
      // Three spare pixels also cover the gap between consecutive samples.
      if (gap > 3) return home;
    }
  }
  return undefined;
}

function sweepPoint(curve: Sweep, t: number): Point {
  const u = 1 - t, a = u*u*u, b = 3*u*u*t, c = 3*u*t*t, d = t*t*t;
  return {
    x: a*curve.start.x + b*curve.control.x + c*curve.endControl.x + d*curve.end.x,
    y: a*curve.start.y + b*curve.control.y + c*curve.endControl.y + d*curve.end.y,
  };
}
function safeCurve(curve: Sweep, areas: readonly Keepout[]) {
  for (let step = 0; step <= 16; step++)
    if (clearance(sweepPoint(curve, step/16), areas) < 2) return false;
  return true;
}

export class MeadowJellies {
  readonly animals: JellyVisitor[];
  private homes: (Habitat | undefined)[];
  private starAreas: Map<string, Keepout>;
  private still = false;
  private waiting = 0;
  private candidate = -1;
  private observed?: Point;
  private lastCollected = "";
  private collected = new Set<string>();
  private areas: Keepout[];

  constructor(stars: readonly (Point & { id: string })[]) {
    this.starAreas = new Map(stars.map(s => [s.id, starArea(s)]));
    this.areas = [...quietAreas, ...this.starAreas.values()];
    this.homes = jellyfish.map((_, i) => chooseHabitat(i, this.areas));
    this.animals = jellyfish.map((j, i) => ({
      at: this.homes[i] ? patrol(i, this.homes[i]!, 0) : { x: j.x, y: j.y },
      visible: !!this.homes[i], heading: -.35, trailing: -.35, warmth: 0,
      routeTime: 0, elapsed: 0, cooling: 0, phase: "drift",
    }));
  }

  setCollected(ids: readonly string[]) {
    const signature = ids.join("|");
    if (signature === this.lastCollected) return;
    this.lastCollected = signature;
    const found = new Set(ids);
    const restoredStars = [...this.collected].some(id => !found.has(id));
    this.collected = found;
    this.areas = [...quietAreas, ...Array.from(this.starAreas).filter(([id]) => !found.has(id)).map(([,area]) => area)];
    // A crowded future catalogue can occupy a whole patch. Let its resident
    // return only after collecting a star has opened a completely clear loop.
    this.animals.forEach((a, i) => {
      if (a.visible && !restoredStars) return;
      const home = chooseHabitat(i, this.areas);
      this.homes[i] = home;
      a.visible = !!home;
      a.phase = "drift";
      a.sweep = undefined;
      a.host = a.lastEncounter = undefined;
      a.elapsed = a.warmth = a.cooling = 0;
      if (home) {
        a.at = patrol(i, home, a.routeTime);
      }
    });
  }

  private forgetCandidate() {
    this.candidate = -1;
    this.waiting = 0;
    this.observed = undefined;
  }

  /** Reading, resting and scene transitions cancel a pending invitation. */
  interrupt() {
    this.forgetCandidate();
    this.animals.forEach((animal, i) => {
      if (animal.phase === "approach" || animal.phase === "stay") this.headHome(i);
    });
  }

  private headHome(index: number) {
    const animal = this.animals[index], home = this.homes[index]!, j = jellyfish[index];
    let best = Infinity;
    // Pick a nearby point whose arriving tangent rejoins the original drift.
    // A session can only begin on a checked curve; its reverse is a safe
    // return even if the player takes us around the far side of a new star.
    const arrival = animal.sweep;
    let chosen: Sweep | undefined;
    let rejoin = animal.routeTime;
    for (let slot = 0; slot < 48; slot++) {
      const t = animal.routeTime + slot * j.period / 48;
      const end = patrol(index, home, t), ahead = patrol(index, home, t + .38);
      const d = distance(animal.at, end);
      const curve = { start: animal.at, control: { x: animal.at.x + animal.heading * 5, y: animal.at.y - 2 },
        endControl: { x: 2*end.x-ahead.x, y: 2*end.y-ahead.y }, end };
      if (d < best && safeCurve(curve, this.areas)) { chosen = curve; rejoin = t; best = d; }
    }
    if (!chosen && arrival) {
      // Subdivide at the current progress, then precisely retrace the safe arc.
      const u = animal.phase === "stay" ? 1 : Math.min(1, animal.elapsed / 2);
      const mix = (a: Point, b: Point) => ({ x: a.x+(b.x-a.x)*u, y: a.y+(b.y-a.y)*u });
      const left = mix(arrival.start, arrival.control);
      chosen = { start: animal.at, control: mix(left, mix(arrival.control, arrival.endControl)), endControl:left, end:arrival.start };
    }
    animal.phase = "return";
    animal.routeTime = rejoin;
    animal.sweep = chosen;
    animal.elapsed = 0;
    animal.host = undefined;
  }

  private invite(index: number, player: Point) {
    if (clearance(player, this.areas) < 4) return false;
    const animal = this.animals[index];
    const here = animal.at;
    const sides = [-1,1].map(side => {
      const end = { x: player.x+27*side, y: player.y+3 };
      const curve = { start: here, control: { x: here.x+7*animal.heading, y: here.y-3 },
        endControl: { x:end.x+8*side, y:end.y-5 }, end };
      return { curve, gap: clearance(end,this.areas), length:distance(here,end) };
    }).filter(({curve,length})=>length<=80 && safeCurve(curve,this.areas)
      && safeCurve(curve,[{x:player.x,y:player.y+2,radius:16}]))
      .sort((l,r) => Math.min(45,r.gap)-Math.min(45,l.gap) || l.length-r.length);
    if (!sides.length) return false;
    animal.phase = "approach";
    animal.elapsed = 0;
    animal.host = {...player};
    animal.sweep = sides[0].curve;
    animal.lastEncounter = {...player};
    return true;
  }

  private advance(index: number, dt: number, player: Point) {
    const animal = this.animals[index], previous = animal.at;
    animal.elapsed += dt;
    switch (animal.phase) {
      case "drift":
        animal.routeTime += dt;
        animal.at = patrol(index, this.homes[index]!, animal.routeTime);
        break;
      case "approach":
      case "stay":
        if (distance(player, animal.host!) > 14) {
          this.headHome(index);
        } else if (animal.phase === "approach") {
          animal.at = sweepPoint(animal.sweep!, Math.min(1, animal.elapsed / 2));
          if (animal.elapsed >= 2) {
            animal.phase = "stay";
            animal.elapsed = 0;
          }
        } else if (animal.elapsed >= 2) {
          this.headHome(index);
        }
        break;
      case "return":
        animal.at = sweepPoint(animal.sweep!, Math.min(1, animal.elapsed / 2.4));
        if (animal.elapsed >= 2.4) {
          animal.phase = "drift";
          animal.elapsed = 0;
          animal.cooling = 12;
          animal.sweep = undefined;
        }
        break;
    }
    const heading = animal.phase === "stay" ? Math.sign(player.x-animal.at.x) :
      Math.max(-1, Math.min(1, (animal.at.x-previous.x)/(dt*5)));
    animal.heading += (heading-animal.heading)*(1-Math.exp(-dt*4));
    animal.trailing += (animal.heading-animal.trailing)*(1-Math.exp(-dt*1.6));
    animal.warmth += ((animal.phase === "stay" ? 1 : 0)-animal.warmth)*(1-Math.exp(-dt*3));
  }

  tick(dt: number, player: Point, canMeet: boolean, reduced: boolean) {
    if (this.still !== reduced) {
      this.still = reduced;
      this.forgetCandidate();
      this.animals.forEach((a,i) => {
        if (!a.visible) return;
        a.phase = "drift";
        a.host = a.sweep = undefined;
        a.elapsed = a.warmth = 0;
        a.at = patrol(i, this.homes[i]!, a.routeTime);
      });
    }
    if (!canMeet) this.interrupt();
    if (dt <= 0) return;
    let nearest = -1, closest = 52;
    for (let i=0; i<this.animals.length; i++) {
      const animal = this.animals[i];
      if (!animal.visible) continue;
      animal.cooling = Math.max(0, animal.cooling-dt);
      if (animal.lastEncounter && distance(player, animal.lastEncounter)>55) animal.lastEncounter = undefined;
      if (!reduced) this.advance(i, dt, player);
      const gap = distance(animal.at, player);
      if (gap<closest && canMeet && animal.phase==="drift" && !animal.cooling && !animal.lastEncounter) {
        nearest = i;
        closest = gap;
      }
    }
    if (nearest<0 || this.animals.some(a=>a.phase!=="drift")) {
      this.forgetCandidate();
      return;
    }
    if (nearest!==this.candidate || !this.observed || distance(this.observed,player)>7) {
      this.candidate = nearest;
      this.observed = {...player};
      this.waiting = 0;
    }
    this.waiting += dt;
    if (this.waiting < .5) return;
    const a=this.animals[nearest];
    if (reduced) {
      if (clearance(player,this.areas)>4) a.heading=a.trailing=Math.sign(player.x-a.at.x);
      a.lastEncounter={...player};
    } else if (!this.invite(nearest,player)) a.cooling=1;
    this.forgetCandidate();
  }
}
