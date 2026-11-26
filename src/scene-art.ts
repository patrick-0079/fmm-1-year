import playgroundAnimationsUrl from "./assets/town-playground-animation.webp";
import smallMapPropsUrl from "./assets/small-map-props.webp";
import { drawMapProp } from "./map-prop-frames";
import skiesUrl from "./assets/window-skies-v12.webp";
import bassUrl from "./assets/white-bass-v18.webp";
import relicsUrl from "./assets/astrolabe-relics.webp";
import astrolabePropsUrl from "./assets/astrolabe-mechanisms.webp";
import astrolabeMapUrl from "./assets/astrolabe-map.webp";
import balloonMapUrl from "./assets/festival-balloons-map.webp";
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
import { prepareShelfKeepsakes, prepareTownKeepsakeArt } from "./town-keepsake-art";
import { drawItem } from "./item-art";
import { loadSceneImage, sceneImage } from "./texture-cache";
export { skiesUrl, relicsUrl };

const urls = {astrolabeMap:astrolabeMapUrl, balloonMap:balloonMapUrl, foxRest:foxRestUrl, balloonGuest:balloonGuestUrl, gardenerWork:gardenerWorkUrl, playgroundAnimations:playgroundAnimationsUrl, smallMapProps:smallMapPropsUrl, skies:skiesUrl, bass:bassUrl, relics:relicsUrl, astrolabeProps:astrolabePropsUrl, fox:foxUrl, picnic:picnicUrl, peachWalk:peachWalkUrl, quarry:townQuarryUrl, elders:elderResidentsUrl, xiaoye:xiaoyeUrl, xiaoyeEmbrace:xiaoyeEmbraceUrl, yeshenhua:yeshenhuaUrl, suyan:suyanUrl, townGuests:townGuestsUrl, patrickCamp:patrickCampUrl, anniversaryVisitors:visitorsUrl};
type Prop = keyof typeof urls;
export const sceneArt = Object.fromEntries(Object.entries(urls).map(([key, url]) => [key, sceneImage(url)])) as Record<Prop, HTMLImageElement>;
export const townNpcSheet = sceneImage(townNpcsUrl);
const propsByScene: Record<BaseSceneId,Prop[]> = {
  room:["smallMapProps","skies","bass","fox"], garden:["balloonMap","smallMapProps","picnic","peachWalk","xiaoye","xiaoyeEmbrace","suyan","anniversaryVisitors"], challenge:["smallMapProps","elders","anniversaryVisitors"],
  town:["smallMapProps","balloonMap","quarry","yeshenhua","townGuests","anniversaryVisitors"], meadow:["patrickCamp","smallMapProps"], ruins:["astrolabeMap","relics","astrolabeProps","elders"],
};
const idleArtByScene: Partial<Record<SceneId, Prop>> = {
  room: "foxRest", garden: "balloonGuest", challenge: "gardenerWork", town: "playgroundAnimations",
};
export function prepareProp(key: Prop, priority: "high" | "low" = "high") {
  return loadSceneImage(urls[key], priority);
}
export function prepareSceneArt(scene: SceneId) {
  if (scene === "town-baker" || scene === "town-florist")
    return Promise.all([loadSceneImage(townNpcsUrl), prepareProp("smallMapProps")]);
  if (scene === "town-hall") return Promise.all([loadSceneImage(townNpcsUrl), prepareTownKeepsakeArt(), prepareShelfKeepsakes()]);
  if (scene === "town-radio") return prepareProp("yeshenhua");
  if (isTownInterior(scene)) return loadSceneImage(townNpcsUrl);
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
export function drawKeepsake(c: CanvasRenderingContext2D, id: "star" | "wreath", x: number, y: number, width: number) {
  if (id === "wreath") return drawItem(c, "wreath", x-width/2, y-width*.55+4, width, width*.55);
  const height = width * 515 / 770;
  drawMapProp(c, sceneArt.smallMapProps, "groundStar", x - width / 2, y - height + 4, width, height);
}
