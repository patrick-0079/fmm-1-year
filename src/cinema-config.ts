export const gardenFilm = {
  title: "芙芙的周年放映",
  src: "https://cdn.xn--nemu-k77ja176r.space/1-year/2026-08-30%2000-28-58.mp4",
};
// Local display coordinates. The painted TV is tilted, so its world placement
// comes from all four inner corners, rather than an axis-aligned rectangle.
export const gardenScreen = { x: 0, y: 0, w: 105, h: 47 };
const artScale = 900 / 1536;
export const gardenScreenCorners = [
  [1130, 343], // top left, measured on garden-colorful.webp (1536 × 1024)
  [1309, 352], // top right
  [1309, 431], // bottom right
  [1130, 420], // bottom left
].map(([x, y]) => ({ x: x * artScale, y: y * artScale }));
// Crop the television and its frame from the garden art to occlude walkers behind it.
export const televisionSilhouette = [
  [641,256],[641,206],[638,205],[636,202],[638,190],[644,190],
  [644,185],[646,183],[648,179],[650,182],[654,183],[655,185],
  [655,183],[664,183],[670,182],[676,183],[678,182],[678,180],
  [679,178],[680,178],[681,182],[685,184],[688,184],[689,185],
  [699,185],[699,178],[701,176],[704,173],[707,172],
  [708,172],[706,167],[706,165],[705.5,164],[705.5,162],
  [706.5,161],[708.5,161],[710,162],[710.5,164],[710,166],
  [713,173],[715,173],[718,167],[718.5,164],[720,162],
  [722,162],[723,163],[723.5,165],[722,167],[719,173],
  [729,173],[731,173.5],[732,175],[732.5,177],[732.5,185],
  [735,186],[746,186],[749,184],[750,182],[751.5,182],
  [753,185],[757,187],[759,187],[760,186.5],[763,187],
  [769,188],[777,187.5],[779,187],[779.5,194],[783,197],
  [785,199],[786,256],
  [792,264],[784,280],[768,279],[652,272],[641,268],
].map(([x,y]) => ({x,y}));
