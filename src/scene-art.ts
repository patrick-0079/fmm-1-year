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
import { prepareTownKeepsakeArt } from "./town-keepsake-art";
import { drawItem } from "./item-art";
import { loadSceneImage, sceneImage } from "./texture-cache";
export { keepsakesUrl, skiesUrl, relicsUrl };

const urls = {foxRest:foxRestUrl, balloonGuest:balloonGuestUrl, gardenerWork:gardenerWorkUrl, playgroundAnimations:playgroundAnimationsUrl, keepsakes:keepsakesUrl, skies:skiesUrl, gate:gateUrl, bass:bassUrl, relics:relicsUrl, astrolabeProps:astrolabePropsUrl, fox:foxUrl, picnic:picnicUrl, peachWalk:peachWalkUrl, quarry:townQuarryUrl, elders:elderResidentsUrl, xiaoye:xiaoyeUrl, xiaoyeEmbrace:xiaoyeEmbraceUrl, yeshenhua:yeshenhuaUrl, suyan:suyanUrl, townGuests:townGuestsUrl, patrickCamp:patrickCampUrl, anniversaryVisitors:visitorsUrl};
type Prop = keyof typeof urls;
export const sceneArt = Object.fromEntries(Object.entries(urls).map(([key, url]) => [key, sceneImage(url)])) as Record<Prop, HTMLImageElement>;
export const townNpcSheet = sceneImage(townNpcsUrl);
const propsByScene: Record<BaseSceneId,Prop[]> = {
  room:["skies","bass","fox"], garden:["keepsakes","gate","picnic","peachWalk","xiaoye","xiaoyeEmbrace","suyan","anniversaryVisitors"], challenge:["keepsakes","elders","anniversaryVisitors"],
  town:["gate","quarry","yeshenhua","townGuests","anniversaryVisitors"], meadow:["patrickCamp"], ruins:["relics","astrolabeProps","elders"],
};
const idleArtByScene: Partial<Record<SceneId, Prop>> = {
  room: "foxRest", garden: "balloonGuest", challenge: "gardenerWork", town: "playgroundAnimations",
};
export function prepareProp(key: Prop, priority: "high" | "low" = "high") {
  return loadSceneImage(urls[key], priority);
}
export function prepareSceneArt(scene: SceneId) {
  if (scene === "town-hall") return Promise.all([loadSceneImage(townNpcsUrl), prepareTownKeepsakeArt()]);
  if (isTownInterior(scene))
    return scene === "town-radio" ? Promise.all([loadSceneImage(townNpcsUrl), prepareProp("yeshenhua")]) : loadSceneImage(townNpcsUrl);
  const idle = idleArtByScene[scene];
  const props = propsByScene[scene].map(key => prepareProp(key));
  if (idle) props.push(prepareProp(idle));
  if (scene === "town") props.push(loadSceneImage(townNpcsUrl));
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
  if (id === "wreath") return drawItem(c, "wreath", x-width/2, y-width*.55+4, width, width*.55);
  const image = sceneArt.keepsakes;
  if (!image.complete || !image.naturalWidth) return;
  const f = keepsakeFrames[id], height = width * f.h / f.w;
  c.drawImage(image, f.x, f.y, f.w, f.h, x - width / 2, y - height + 4, width, height);
}
