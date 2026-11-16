/** The trimmed conical sprite and the click targets share this exact rectangle. */
export const BOTTLE_REFERENCE = { width: 801, height: 1204 } as const;
export const BOTTLE_COMPACT_WIDTH = 600;
export interface BottlePerson { id: string; name: string; message: string; shape?: "cross" }
export interface BottleEntry extends BottlePerson { slot: number }

export function bottleEntries(people: readonly BottlePerson[], found: readonly string[]): BottleEntry[] {
  const ids=new Set(found);
  // Stable catalogue slots: finding another star never shuffles the old ones.
  return people.map((person,slot)=>({...person,slot})).filter(person=>ids.has(person.id));
}

const restingStars = [
  [.49,.48,-12,1.04], [.36,.60,17,.87], [.63,.57,-20,.94],
  [.51,.71,9,1.08], [.24,.77,-8,.91], [.76,.73,22,.83],
  [.39,.89,-18,.97], [.64,.90,12,1.02], [.80,.87,-7,.86],
];

export function bottleGeometry(availableWidth: number,availableHeight: number,compact: boolean,count=9) {
  const ratio=BOTTLE_REFERENCE.width/BOTTLE_REFERENCE.height;
  const height=Math.max(0,Math.min(availableHeight,availableWidth/ratio,compact?400:620));
  const width=height*ratio,base=Math.min(44,Math.max(compact?16:22,height*.075));
  const slots=Array.from({length:count},(_,index)=>{
    const [x,y,angle,scale]=restingStars[index]??[.3+(index*.618%1)*.4,.6+(index*.382%1)*.28,(index*17%35)-17,.86];
    return {x:x*width,y:y*height,angle,size:base*scale};
  });
  return {width,height,slots};
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
