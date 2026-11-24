import type { Obstacle, Point } from "./core.ts";
import * as art from "./town-plaza-contours.ts";

const points = (pairs: number[][]): Point[] => pairs.map(([x, y]) => ({ x, y }));

// At an oblique planter the near edge changes depth along its length. Slice
// the painted silhouette at load time so each portion sorts at its own foot.
function clipAt(vertices: Point[], x: number, keepRight: boolean): Point[] {
  const result: Point[] = [];
  let previous = vertices[vertices.length - 1];
  for (const current of vertices) {
    const a = keepRight ? previous.x >= x : previous.x <= x;
    const b = keepRight ? current.x >= x : current.x <= x;
    if (a !== b) {
      const t = (x - previous.x) / (current.x - previous.x);
      result.push({ x, y: previous.y + (current.y - previous.y) * t });
    }
    if (b) result.push(current);
    previous = current;
  }
  return result;
}

function planter(id: string, silhouette: number[][], feet: number[][]) {
  const outline = points(silhouette);
  return feet.slice(1).flatMap(([right, endDepth], index) => {
    const [left, startDepth] = feet[index];
    const count = Math.max(1, Math.ceil(Math.abs(endDepth - startDepth) / 6));
    return Array.from({ length: count }, (_, i) => {
      const step = (right - left) / count;
      let part = outline;
      if (index || i) part = clipAt(part, left + step * i - .25, true);
      if (index !== feet.length - 2 || i !== count - 1) part = clipAt(part, left + step * (i + 1) + .25, false);
      return { id: id + "-" + index + "-" + i, y: startDepth + (endDepth - startDepth) * (i + .5) / count, points: part };
    }).filter(part => part.points.length >= 3);
  });
}

export const plazaForeground = [
  ...planter("plaza-west-pots", art.westPots, [[590,454],[610,462],[631,451],[650,443],[675,430]]),
  ...planter("plaza-west-rail", art.westRail, [[628,491],[634,468],[651,440]]),
  ...planter("plaza-west-roses", art.westRoseBorder, [[629,491],[647,507],[665,522],[685,534],[716,539]]),
  ...planter("plaza-east-roses", art.eastRoseBorder, [[765,541],[782,545],[797,539],[819,528],[850,520],[869,506],[887,489]]),
  ...planter("plaza-north-bed", art.northBed, [[724,412],[742,416],[761,406],[783,398],[810,392]]),
  ...planter("plaza-north-roses", art.northRoses, [[798,373],[830,382],[870,376]]),
  ...planter("plaza-east-masonry", art.eastMasonry, [[860,409],[873,418],[887,425]]),
  { id:"plaza-east-stone-post", y:438, points:points(art.eastPost) },
  ...planter("plaza-east-violets", art.northEastBed, [[812,412],[831,427],[851,442],[868,434]]),
  ...planter("plaza-north-bench", art.northBench, [[765,409],[809,423]]),
  ...planter("plaza-south-bench", art.southBenchSeat, [[799,542],[841,526]]),
];

// Only the physical bed, fence foot or furniture base stops a walker.
// Overhanging blooms beyond these outlines still participate in depth sorting.
export const plazaWalls: Obstacle[] = [
  {label:"广场西口花盆", points:points([[592,446],[613,436],[637,420],[652,418],[671,421],[669,432],[650,443],[630,449],[618,458],[609,462],[595,455]])},
  {label:"广场西花圃弧栏", points:points([[628,489],[628,465],[631,449],[638,438],[651,425],[653,431],[641,447],[635,462],[634,489]])},
  {label:"广场西南玫瑰篱", points:points([[630,481],[640,473],[655,479],[673,488],[691,499],[707,505],[717,516],[716,535],[708,539],[694,536],[675,528],[657,515],[639,500],[628,491]])},
  {label:"广场东南花槽", points:points([[767,517],[777,509],[792,497],[803,492],[818,485],[836,477],[852,469],[869,469],[882,475],[888,479],[885,495],[870,507],[851,520],[831,518],[807,529],[789,543],[774,545],[767,540]])},
  {label:"广场南侧长椅", points:points([[795,524],[836,509],[843,512],[842,525],[807,538],[803,542],[799,539]])},
  {label:"广场北花池", points:points([[726,393],[750,378],[774,369],[797,368],[809,377],[810,390],[793,398],[761,402],[746,413],[730,414]])},
  {label:"广场北侧玫瑰花坛", points:points([[794,368],[802,353],[821,346],[848,342],[867,346],[875,358],[870,378],[845,385],[823,381],[805,376]])},
  {label:"广场后排长椅", points:points([[765,400],[813,405],[815,412],[811,420],[806,419],[766,409]])},
  {label:"广场东口石沿与紫花盆", points:points([[810,395],[822,389],[852,391],[865,397],[884,404],[901,418],[905,427],[900,437],[890,434],[887,423],[868,418],[864,436],[855,442],[846,441],[837,434],[832,425],[812,414]])},
];
