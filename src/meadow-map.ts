import type { Scene } from "./maps.ts";
import type { Point } from "./core.ts";
const path = (points: number[][]): Point[] => points.map(([x,y])=>({x,y}));

export const meadowScene: Scene = {
  title: "花海", width: 900, height: 600,
  bounds: { x: 55, y: 75, w: 790, h: 510 },
  spawn: {x:447,y:530},
  // Trace the stone avenue, both branching walks, the lookout and the low
  // eastern meadow. The tall planted borders are outside these surfaces.
  surfaces: [
    path([[414,585],[428,480],[422,397],[474,397],[471,479],[481,585]]),
    path([[332,311],[352,279],[398,255],[439,247],[474,249],[526,265],[550,288],[568,315],[561,356],[534,390],[491,407],[450,417],[398,403],[360,381],[338,357]]),
    path([[429,268],[432,151],[424,139],[475,139],[467,153],[468,269]]),
    path([[386,110],[404,98],[434,92],[467,92],[505,102],[521,121],[487,141],[466,151],[431,151],[401,139]]),
    path([[246,307],[293,303],[342,308],[366,314],[361,337],[310,330],[267,325],[246,328]]),
    path([[108,289],[129,267],[162,254],[214,254],[258,269],[279,288],[267,313],[233,327],[188,337],[148,330],[117,314]]),
    path([[537,297],[563,288],[594,278],[613,269],[610,255],[636,249],[645,271],[623,287],[588,300],[555,323]]),
    path([[605,259],[622,233],[658,207],[706,188],[758,203],[814,209],[830,245],[820,284],[788,311],[744,327],[688,328],[653,313],[629,303],[615,278]]),
  ],
  walls: [
    {label:"左侧观花椅",x:133,y:288,w:36,h:12},
    {label:"右侧观花椅",x:222,y:288,w:34,h:12},
    {label:"藤亭左柱",x:383,y:113,w:15,h:20}, {label:"藤亭右柱",x:509,y:113,w:15,h:20},
    {label:"西花灯",x:335,y:340,w:14,h:22}, {label:"东花灯",x:550,y:340,w:14,h:22},
  ], hazards: [],
  spots: [
    {id:"meadow-exit", title:"回周年庭院", portal:"garden", portalExit:"prism-arch",
      x:447,y:565,approach:{x:447,y:539},radius:53,markerOffset:83,color:"#ad8abb"},
    {id:"meadow-breeze", title:"唤起七色花潮", x:448,y:330,approach:{x:476,y:340},radius:44,markerOffset:34,color:"#bd83a9"},
    {id:"meadow-echo", title:"听听花间的晚安", x:450,y:111,approach:{x:450,y:132},radius:43,markerOffset:32,color:"#9c91bf"},
    {id:"meadow-seat-west", title:"坐下赏花", x:150,y:289,approach:{x:151,y:310},radius:35,color:"#99b395"},
    {id:"meadow-seat-east", title:"坐下赏花", x:239,y:289,approach:{x:239,y:309},radius:35,color:"#99b395"},
  ],
};
// Only the foliage above the arch is in front of a visitor behind it. The
// transparent opening and the path below are intentionally outside the mask.
export const meadowArchCrown = path([[376,519],[380,500],[403,485],[428,477],[454,476],[480,480],[501,490],[512,511],
  [501,528],[492,509],[471,499],[450,496],[427,497],[409,505],[397,519],[386,529]]);
