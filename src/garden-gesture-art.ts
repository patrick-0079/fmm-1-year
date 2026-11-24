import gardenUrl from "./assets/garden-guest-routines.webp?no-inline";
import brimUrl from "./assets/gardener-hat.webp?no-inline";
import staffUrl from "./assets/guardian-moonstone.webp?no-inline";
import type { GardenPerformer } from "./garden-residents";

const urls={garden:gardenUrl,challenge:brimUrl,ruins:staffUrl};
const pictures:Partial<Record<keyof typeof urls,HTMLImageElement>>={};
export function prepareGardenGestures(scene:keyof typeof urls="garden") {
  if(pictures[scene])return;
  const image=new Image();
  pictures[scene]=image;
  image.decoding="async";
  image.fetchPriority="low";
  image.onerror=()=>{delete pictures[scene];};
  image.src=urls[scene];
}

const performers={
  decorator:{row:0,offset:3.1,interval:12.4,resting:0,start:1,end:2.35},
  "picnic-friend":{row:1,offset:8.4,interval:14.8,resting:0,start:1,end:2.35},
  suyan:{row:2,offset:4.6,interval:13.7,resting:1,start:1.35,end:2.38},
};
const cell=192, sole=181, body=164;

export function drawGardenGesture(c:CanvasRenderingContext2D,who:keyof typeof performers,
  actor:GardenPerformer,time:number,still:boolean,height:number) {
  const sheet=pictures.garden;
  if(!sheet?.naturalWidth)return false;
  const {row,offset,interval,resting,start,end}=performers[who];
  const work=(time+offset)%interval;
  const frame=!still && work>start && work<end ? 1-resting : resting;
  const scale=height/body;
  c.drawImage(sheet,frame*cell,row*cell,cell,cell,
    actor.foot.x-cell*scale/2,actor.foot.y-sole*scale,cell*scale,cell*scale);
  return true;
}

export function drawElderIdle(c:CanvasRenderingContext2D,scene:"challenge"|"ruins",time:number) {
  const sheet=pictures[scene];
  if(!sheet?.naturalWidth)return false;
  const age=(time+(scene==="challenge"?7.7:9.4))%(scene==="challenge"?30.4:18.5);
  if(age>3.4)return false;
  const frame=age<.68?0:age<2.03?1:2;
  // The kneeling gardener is shorter than the standing guardian.
  const h=scene==="challenge"?34:40.5,scale=h/body;
  c.drawImage(sheet,cell*frame,0,cell,cell,-96*scale,-sole*scale,cell*scale,cell*scale);
  return true;
}
