import type { CreditStar } from "./content.ts";

/** The trimmed conical sprite and the click targets share this exact rectangle. */
export const BOTTLE_REFERENCE = { width: 801, height: 1204 } as const;
export const BOTTLE_COMPACT_WIDTH = 600;
export type BottlePerson = Pick<CreditStar, "id" | "name" | "message" | "shape" | "sprite">;
export interface BottleEntry extends BottlePerson { slot: number }

export function bottleEntries(people: readonly BottlePerson[], found: readonly string[]): BottleEntry[] {
  const ids=new Set(found);
  // Stable catalogue slots: finding another star never shuffles the old ones.
  return people.map((person,slot)=>({...person,slot})).filter(person=>ids.has(person.id));
}

type RestingStar = readonly [x: number, y: number, angle: number, scale: number];
const restingStars: RestingStar[] = [
  [.49,.48,-12,1.04], [.36,.60,17,.87], [.63,.57,-20,.94],
  [.51,.71,9,1.08], [.24,.77,-8,.91], [.76,.73,22,.83],
  [.39,.89,-18,.97], [.64,.90,12,1.02], [.80,.87,-7,.86],
  [.52,.82,4,1], [.17,.89,-8,.95], [.51,.35,-5,.84],
];

const bottleRatio = BOTTLE_REFERENCE.width / BOTTLE_REFERENCE.height;
const layout: RestingStar[] = [...restingStars];
// The maximum common sprite diameter for each prefix, measured in bottle heights.
const diameterByCount = Array<number>(restingStars.length + 1).fill(Infinity);

function addRestingStar() {
  const slot = layout.length;
  const angle = (slot * 17 % 41) - 20;
  const scale = .85 + (slot * .127 % .21);
  let best: RestingStar = [.5, .6, angle, scale];
  let bestDiameter = 0;
  // Take the roomiest of several deterministic samples inside the sloping glass.
  // Adding stars preserves earlier positions on all screen sizes.
  for (let i = 0; i < 40; i++) {
    const sequence = slot * 40 + i + 1;
    const y = .41 + (sequence * .754877666 % 1) * .50;
    const halfWidth = Math.min(.38, .035 + .73 * (y - .40));
    const x = .5 + (2 * (sequence * .569840291 % 1) - 1) * halfWidth;
    let diameter = Infinity;
    for (const [otherX, otherY, , otherScale] of layout) {
      const distance = Math.hypot((x - otherX) * bottleRatio, y - otherY);
      diameter = Math.min(diameter, 2 * distance / (scale + otherScale));
    }
    if (diameter > bestDiameter) {
      best = [x, y, angle, scale];
      bestDiameter = diameter;
    }
  }
  layout.push(best);
  diameterByCount.push(Math.min(diameterByCount[slot], bestDiameter * .90));
}

function visibleDiameter(slots: readonly number[]) {
  let limit = Infinity;
  for (let i = 1; i < slots.length; i++) {
    const [x, y, , scale] = layout[slots[i]];
    for (let j = 0; j < i; j++) {
      const [otherX, otherY, , otherScale] = layout[slots[j]];
      const distance = Math.hypot((x - otherX) * bottleRatio, y - otherY);
      limit = Math.min(limit, 1.8 * distance / (scale + otherScale));
    }
  }
  return limit;
}

export function bottleGeometry(availableWidth: number, availableHeight: number, compact: boolean, count = restingStars.length, visibleSlots?: readonly number[]) {
  while (layout.length < count) addRestingStar();
  const height = Math.max(0, Math.min(availableHeight, availableWidth / bottleRatio, compact ? 400 : 620));
  const width = height * bottleRatio;
  const preferred = Math.min(44, Math.max(compact ? 16 : 22, height * .075));
  const crowded = count > restingStars.length && visibleSlots && visibleSlots.length < count;
  const limit = crowded ? visibleDiameter(visibleSlots) : diameterByCount[count];
  const base = Math.min(preferred, height * Math.min(.09, limit));
  const slots = layout.slice(0, count).map(([x, y, angle, scale]) => ({
    x: x * width, y: y * height, angle, size: base * scale,
  }));
  return {width, height, slots};
}

/** Pointer selection uses one nearest-centre rule, never overlapping DOM order. */
export function nearestBottleStar(points:readonly {slot:number;x:number;y:number}[],x:number,y:number,radius=22) {
  let nearest:number|null=null,distance=radius*radius;
  for(const point of points){const d=(point.x-x)**2+(point.y-y)**2;if(d<=distance){distance=d;nearest=point.slot;}}
  return nearest;
}

/** Native keys must never fall through to the webpage when a letter reaches its edge. */
export function bottleScrollTop(key:string,shift:boolean,top:number,height:number,scrollHeight:number) {
  const page=Math.max(40,height*.9),destinations:Record<string,number>={ArrowUp:top-40,ArrowDown:top+40,
    ArrowLeft:top,ArrowRight:top,Home:0,End:scrollHeight,PageUp:top-page,PageDown:top+page," ":top+(shift?-page:page)};
  return Object.hasOwn(destinations,key)?Math.max(0,Math.min(scrollHeight-height,destinations[key])):null;
}
