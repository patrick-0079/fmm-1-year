import type { Point } from "./core.ts";

// The west end is the original silk cord. Its eastern half climbs to the
// timber post behind the orange planter, just below its brass cap.
const knots = [
  [746,323.8], [758.5,324.3], [771,321.1], [781.5,314.5], [790.4,305.1],
  [797.6,293.3], [803.8,279.7], [809.1,264.2], [813.4,250.1],
];
const tips = [
  [753.4,335.9], [768.3,334.4], [779.1,329.9], [790,321.2],
  [798.5,310.3], [804.7,296.5], [809.7,281.1],
];
const mix = (a: number, b: number, t: number) => a + (b-a)*t;
export const bakeryPennants = knots.slice(0, -1).map(([x,y], index) => {
  const [endX,endY] = knots[index+1];
  const along = (t: number, drop=0): Point =>
    ({x:mix(x,endX,t), y:mix(y,endY,t)+drop});
  const tip = tips[index];
  const cloth = tip ? [along(.07),along(.91),{x:tip[0],y:tip[1]}] : [];
  // The outlines hug the cord and folded cloth; adjacent flags leave a gap.
  const points = [along(0,-.65),along(1,-.65),along(1,.75),
    ...(tip ? [along(.94,.8),{x:tip[0]+.35,y:tip[1]+.55},
      {x:tip[0]-.4,y:tip[1]+.55},along(.04,.8)] : []),along(0,.8)];
  return {id:"bakery-stair-rise-"+(index+1),y:Math.round(mix(359,269,index/7)),
    points,cord:[along(0),along(1)],cloth};
});

export const bakeryPostKnot = {
  id:"bakery-stair-post-knot", y:268,
  points:[[809.9,249.1],[815.5,248.2],[816.6,249.1],[816.6,251.1],
    [814.6,252],[815.8,254.4],[815.3,255],[813.4,252.8],[811.4,252.3],
    [810,251.1]].map(([x,y])=>({x,y})),
};
