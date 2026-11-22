import { TOWN_FRAMES, TOWN_NPCS } from "./town-data.ts";
import type { TownResidentId } from "./town-dialogue.ts";
/** Cell geometry for the stationary workbench and hand gestures. */
export const workCell=100;
export const workFoot=94;
export const workFrames=12;
export const workRows = TOWN_NPCS.map(n=>n.id);

/** Hand/ear centres and their travel in the cropped illustration, as fractions of its painted bounds. */
type Joint = [x:number,y:number,dx:number,dy:number,rx:number,ry:number];
export const workJoints:Record<TownResidentId,Joint[]> = {
  florist: [[.40,.73,.07,-.022,.17,.11],[.60,.73,-.06,-.04,.16,.11]],
  baker: [[.32,.67,.07,-.044,.12,.095],[.63,.68,-.018,-.016,.15,.10]],
  post: [[.25,.67,.077,-.095,.155,.13],[.58,.63,-.034,.035,.17,.13]],
  welcome: [[.44,.69,-.035,-.032,.15,.09],[.55,.69,.035,-.055,.13,.095]],
  maker: [[.20,.67,.061,-.062,.15,.14],[.77,.72,.07,-.104,.15,.13]],
  "radio-host": [[.235,.414,-.057,-.062,.145,.14],[.14,.228,-.025,-.033,.12,.10],[.25,.51,-.025,-.040,.12,.12]],
  books: [[.60,.70,.032,-.034,.15,.11],[.33,.72,.03,-.03,.12,.12]],
  "snake-keeper": [[.20,.70,.095,-.067,.14,.12],[.78,.70,-.08,-.061,.14,.12]],
  "blocks-keeper": [[.18,.70,.08,-.058,.14,.11],[.76,.58,-.064,.045,.14,.11]],
  "hop-keeper": [[.21,.70,-.025,-.081,.14,.12],[.50,.38,-.040,-.008,.36,.2]],
  "flight-keeper": [[.21,.69,.06,-.069,.145,.11],[.77,.69,-.042,-.056,.15,.11]],
  "photo-visitor": [[.26,.68,.085,-.097,.14,.13],[.73,.69,-.076,-.084,.14,.12]],
  walker: [[.25,.73,-.052,-.045,.13,.13],[.71,.66,.036,-.024,.14,.12],[.56,.38,.06,-.048,.35,.24]],
  bunny: [[.36,.16,-.080,.038,.12,.20],[.71,.14,.066,-.025,.12,.18],[.36,.72,.073,-.075,.16,.10]],
  cat: [[.32,.70,.066,-.125,.115,.16],[.52,.50,-.030,.038,.28,.18],[.84,.78,.06,-.05,.12,.2]],
  xiaoyou: [[.31,.64,.107,-.055,.14,.14],[.72,.65,-.030,-.043,.15,.14]],
  guli: [[.21,.67,.134,-.044,.15,.13],[.78,.67,-.068,-.030,.15,.13],[.64,.16,-.040,.03,.2,.13]],
  qianxiao: [[.72,.64,.063,-.047,.17,.13],[.30,.69,.060,-.040,.15,.13]],
};
export function workBeat(frame:number) {
  const t=frame/(workFrames-1);
  const ramp=(s:number)=>{s=Math.min(1,Math.max(0,s));return s*s*(3-2*s);};
  return {lift:ramp(t/.29)*(1-ramp((t-.74)/.26)),
    stroke:t>.29 && t<.75 ? Math.sin((t-.29)/.46*Math.PI*2) : 0};
}
export const residentHeight=(row:number) => {
  const n=TOWN_NPCS[row];
  return n.appearance==="guest"?44 : n.appearance==="yeshenhua"?43:TOWN_FRAMES[n.sprite].h*43/337;
};
