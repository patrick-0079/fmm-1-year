import test from "node:test";
import assert from "node:assert/strict";
import { polygonContains, type Point } from "../src/core.ts";
import { gardenSign } from "../src/garden-sign.ts";
import { televisionSilhouette } from "../src/cinema-config.ts";
import { townForeground } from "../src/town-foreground.ts";
import { townCanopyOutlines } from "../src/town-canopy-contours.ts";

function landmarks(name:string,outline:Point[],solid:number[][],clear:number[][]){
  for(const [x,y]of solid)assert.ok(polygonContains({x,y},outline),`${name}: missing object at ${x},${y}`);
  for(const [x,y]of clear)assert.ok(!polygonContains({x,y},outline),`${name}: background retained at ${x},${y}`);
}

test("both television props retain round antenna tips and leave the gap between aerials clear",()=>{
  landmarks("sign",gardenSign,[[191,415],[208,415],[182,433],[198,470]],[[197,420],[201,420],[205,471],[189,478]]);
  landmarks("cinema",televisionSilhouette,[[708,163],[721,164],[679.5,180],[750.5,184]],[[711,162],[716,169],[680,175],[729,169]]);
});

test("street bunting follows the flag tips rather than slicing them off or covering paving between flags",()=>{
  landmarks("west flags",townForeground.find(p=>p.id==="plaza-west-pennants")!.points,
    [[608,387],[620,385],[630,380],[643,373]],[[613,387],[626,385],[640,378],[606,394]]);
  landmarks("bakery flags",townForeground.find(p=>p.id==="bakery-fence-pennants")!.points,
    [[949,179],[963,185],[978,186],[993,184],[1006,178],[1019,173]],
    [[955,182],[969,185],[985,185],[998,184],[1012,179]]);
});

test("tree foregrounds omit wall seams, lamps and paving next to the leaves",()=>{
  const tree=(i:number)=>townCanopyOutlines[i].map(([x,y])=>({x,y}));
  landmarks("west tree",tree(0),[[340,350],[320,370]],[[330,331],[345,334],[365,335],[380,400]]);
  landmarks("lamp-side tree",tree(4),[[1338,458],[1345,466]],[[1327,473],[1325,477],[1354,444]]);
  landmarks("south pine",tree(11),[[541,844],[545,867]],[[560,866],[550,839],[551,892]]);
  landmarks("stair pine",tree(13),[[261,385],[261,408],[255,427]],[[248,383],[270,386],[284,427]]);
});
