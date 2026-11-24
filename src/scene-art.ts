import playgroundAnimationsUrl from "./assets/town-playground-animation.webp";
import keepsakesUrl from "./assets/garden-keepsakes-v12.webp";
import skiesUrl from "./assets/window-skies-v12.webp";
import gateUrl from "./assets/country-wicket-v18.webp";
import bassUrl from "./assets/white-bass-v18.webp";
import relicsUrl from "./assets/astrolabe-relics.webp";
import astrolabePropsUrl from "./assets/astrolabe-mechanisms.webp";
import foxUrl from "./assets/fufu-room-fox.webp";
import foxRestUrl from "./assets/fox-tail-rest.webp";
import balloonGuestUrl from "./assets/garden-balloon-guest.webp";
import gardenerWorkUrl from "./assets/gardener-tending.webp";
import picnicUrl from "./assets/qingtang-picnic.webp";
import peachWalkUrl from "./assets/peach-walk.webp";
import townQuarryUrl from "./assets/town-quarry.webp";
import elderResidentsUrl from "./assets/elder-residents.webp";
import xiaoyeUrl from "./assets/xiaoye-plush.webp";
import xiaoyeEmbraceUrl from "./assets/xiaoye-embrace-v55.webp";
import yeshenhuaUrl from "./assets/yeshenhua.webp";
import suyanUrl from "./assets/suyan.webp";
import townGuestsUrl from "./assets/town-guests.webp";
import patrickCampUrl from "./assets/patrick-camp.webp";
import visitorsUrl from "./assets/anniversary-visitors.webp";
import townNpcsUrl from "./assets/town-npcs.webp";
import type { BaseSceneId, SceneId } from "./maps";
import { isTownInterior } from "./town-interior-id";
export { keepsakesUrl, skiesUrl, relicsUrl };

export const sceneArt = {foxRest:new Image(), balloonGuest:new Image(), gardenerWork:new Image(), playgroundAnimations:new Image(), keepsakes:new Image(), skies:new Image(), gate:new Image(), bass:new Image(), relics:new Image(), astrolabeProps:new Image(), fox:new Image(), picnic:new Image(), peachWalk:new Image(), quarry:new Image(), elders:new Image(), xiaoye:new Image(), xiaoyeEmbrace:new Image(), yeshenhua:new Image(), suyan:new Image(), townGuests:new Image(), patrickCamp:new Image(), anniversaryVisitors:new Image()};
export const townNpcSheet = new Image();
let npcRequest: Promise<void> | undefined;
function prepareTownNpcSheet() {
  if (!npcRequest) {
    townNpcSheet.src = townNpcsUrl;
    npcRequest = townNpcSheet.decode().catch(error => { npcRequest = undefined; throw error; });
  }
  return npcRequest;
}
type Prop = keyof typeof sceneArt;
const urls: Record<Prop,string> = {foxRest:foxRestUrl, balloonGuest:balloonGuestUrl, gardenerWork:gardenerWorkUrl, playgroundAnimations:playgroundAnimationsUrl, keepsakes:keepsakesUrl, skies:skiesUrl, gate:gateUrl, bass:bassUrl, relics:relicsUrl, astrolabeProps:astrolabePropsUrl, fox:foxUrl, picnic:picnicUrl, peachWalk:peachWalkUrl, quarry:townQuarryUrl, elders:elderResidentsUrl, xiaoye:xiaoyeUrl, xiaoyeEmbrace:xiaoyeEmbraceUrl, yeshenhua:yeshenhuaUrl, suyan:suyanUrl, townGuests:townGuestsUrl, patrickCamp:patrickCampUrl, anniversaryVisitors:visitorsUrl};
const propsByScene: Record<BaseSceneId,Prop[]> = {
  room:["skies","bass","fox"], garden:["keepsakes","gate","picnic","peachWalk","xiaoye","xiaoyeEmbrace","suyan","anniversaryVisitors"], challenge:["keepsakes","elders","anniversaryVisitors"],
  town:["gate","quarry","yeshenhua","townGuests","anniversaryVisitors"], meadow:["patrickCamp"], ruins:["relics","astrolabeProps","elders"],
};
const idleArtByScene: Partial<Record<SceneId, Prop>> = {
  room: "foxRest", garden: "balloonGuest", challenge: "gardenerWork", town: "playgroundAnimations",
};
const requests = new Map<Prop,Promise<void>>();
export function prepareProp(key: Prop, priority: "high" | "low" = "high") {
  const pending=requests.get(key);
  if (pending) return pending;
  const image=sceneArt[key];
  image.fetchPriority=priority;
  image.src=urls[key];
  const ready=image.decode().catch(error=>{ requests.delete(key); throw error; });
  requests.set(key,ready);
  return ready;
}
export function prepareSceneArt(scene: SceneId) {
  if (isTownInterior(scene))
    return scene === "town-radio" ? Promise.all([prepareTownNpcSheet(), prepareProp("yeshenhua")]) : prepareTownNpcSheet();
  const idle = idleArtByScene[scene];
  if (idle) void prepareProp(idle, "low").catch(() => {});
  const props = propsByScene[scene].map(key => prepareProp(key));
  if (scene === "town") props.push(prepareTownNpcSheet());
  return Promise.all(props);
}

/** The three-frame ambient strips share a foot anchor at (96,180) in each 192px cell. */
export function drawIdlePose(c: CanvasRenderingContext2D, sheet: HTMLImageElement,
  frame: number, x: number, y: number, size: number) {
  const cell = sheet.naturalHeight;
  c.drawImage(sheet, frame * cell, 0, cell, cell,
    x - size / 2, y - size * 180 / 192, size, size);
}
export const keepsakeFrames = {
  star: { x: 85, y: 175, w: 770, h: 515 },
  wreath: { x: 1040, y: 45, w: 785, h: 765 },
};
export function drawKeepsake(c: CanvasRenderingContext2D, id: keyof typeof keepsakeFrames, x: number, y: number, width: number) {
  const image = sceneArt.keepsakes;
  if (!image.complete || !image.naturalWidth) return;
  const f = keepsakeFrames[id], height = width * f.h / f.w * (id === "wreath" ? 0.6 : 1);
  c.drawImage(image, f.x, f.y, f.w, f.h, x - width / 2, y - height + 4, width, height);
}
