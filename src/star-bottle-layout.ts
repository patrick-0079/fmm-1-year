/** The trimmed conical sprite and the click targets share this exact rectangle. */
export const BOTTLE_REFERENCE = { width: 801, height: 1204 } as const;
export const BOTTLE_COMPACT_WIDTH = 600;
export const BOTTLE_TARGET_SIZE = 44;
export interface BottlePerson { id: string; name: string; message: string }
export interface BottleEntry extends BottlePerson { slot: number; page: number }

export function bottleEntries(people: readonly BottlePerson[], found: readonly string[], compact: boolean): BottleEntry[] {
  const ids=new Set(found),pageSize=compact ? 2 : 8;
  return people.filter(person=>ids.has(person.id)).map((person,index)=>({...person,slot:index%pageSize,page:Math.floor(index/pageSize)}));
}

export function bottleGeometry(availableWidth: number,availableHeight: number,compact: boolean) {
  const ratio=BOTTLE_REFERENCE.width/BOTTLE_REFERENCE.height;
  const height=Math.max(0,Math.min(availableHeight,availableWidth/ratio,compact?400:620));
  const width=height*ratio,mid=width/2,gap=Math.max(BOTTLE_TARGET_SIZE,width*.2);
  const slots=compact ? [{x:mid,y:height*.6},{x:mid,y:height*.84}] : [
    {x:mid-gap/2,y:height*.58},{x:mid+gap/2,y:height*.58},
    {x:mid-gap,y:height*.75},{x:mid,y:height*.75},{x:mid+gap,y:height*.75},
    {x:mid-gap,y:height*.9},{x:mid,y:height*.9},{x:mid+gap,y:height*.9},
  ];
  if(compact&&slots[1].y-slots[0].y<BOTTLE_TARGET_SIZE) {
    const center=Math.min(height-BOTTLE_TARGET_SIZE,Math.max(BOTTLE_TARGET_SIZE,(slots[0].y+slots[1].y)/2));
    slots[0].y=center-BOTTLE_TARGET_SIZE/2;slots[1].y=center+BOTTLE_TARGET_SIZE/2;
  }
  return {width,height,slots};
}

/** Native keys must never fall through to the webpage when a letter reaches its edge. */
export function bottleScrollTop(key:string,shift:boolean,top:number,height:number,scrollHeight:number) {
  const page=Math.max(40,height*.9),destinations:Record<string,number>={ArrowUp:top-40,ArrowDown:top+40,
    ArrowLeft:top,ArrowRight:top,Home:0,End:scrollHeight,PageUp:top-page,PageDown:top+page," ":top+(shift?-page:page)};
  return Object.hasOwn(destinations,key)?Math.max(0,Math.min(scrollHeight-height,destinations[key])):null;
}
