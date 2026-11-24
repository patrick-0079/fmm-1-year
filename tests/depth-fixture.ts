import { World, type DepthLayer } from "../src/world";
import type { Point } from "../src/core";
import type { SceneId } from "../src/maps";
import { gardenForeground } from "../src/garden-foreground";
import { courageBorder } from "../src/courage-border";
import { roomFurniture } from "../src/room-furniture";
import { ruinsForeground } from "../src/ruins-foreground";
import { gardenGateLamp } from "../src/garden-gate-lamp";
import { townForeground } from "../src/town-foreground";
import playgroundMasks from "../src/town-playground-masks.generated.json";
import streetlightMasks from "../src/town-streetlight-outlines.json";
import waterfrontMasks from "../src/town-waterfront-masks.json";
import streetFurnitureMasks from "../src/town-street-furniture-masks.json";
import plazaTreeOutlines from "../src/town-plaza-trees.json";
import gardenDetails from "../src/garden-street-details.json";
import meadowScenery from "../src/meadow-scenery-outlines.json";
import { workshopCanopies } from "../src/town-workshop-vegetation";
import { southEdgeCanopies, townCanopies } from "../src/town-scenery";
import { gardenSign } from "../src/garden-sign";
import { rainbowFlowers } from "../src/rainbow-flowers";
import { televisionSilhouette } from "../src/cinema-config";

// This standalone page uses the complete game but never writes its real saves.
const prefix="fufu-depth-fixture/";
Object.defineProperty(window,"localStorage",{value:{
  getItem:(key:string)=>sessionStorage.getItem(prefix+key),
  setItem:(key:string,value:string)=>sessionStorage.setItem(prefix+key,value),
  removeItem:(key:string)=>sessionStorage.removeItem(prefix+key),
}});
localStorage.setItem("nemu-anniversary-v1", JSON.stringify({rainbowFlowers:rainbowFlowers.map(f => f.id)}));
let world!:World;
const originalLoad=World.prototype.load;
World.prototype.load=function(){world=this;World.prototype.load=originalLoad;return originalLoad.call(this);};
await import("../src/main");

interface DepthCase {
  id:string;
  scene:SceneId;
  depth:number;
  // Suspended cloth must also cover an actor in front of both supports.
  overhead?:boolean;
  solid:Point[];
  clear:Point[];
  // The old lamp's right handle aperture is less than two device pixels wide
  // at DPR 1 on a 390 px screen; permit edge antialiasing, never an opaque fill.
  subpixelClear?:number[];
  actor?:{x:number;positions:number[]};
  // Compare the real avatar with the empty painting at a reported standing position.
  actorOverlap?:{feet:Point;facing:World["facing"];covered:Point[];visible:Point};
  canopyEdge?:Point;
  existingOutline?:Point[];
  fragments?:Point[][];
  // Original-image pixel centres, checked at 3 rendered pixels per source
  // pixel so mobile canvas resampling cannot hide a dirty one-pixel edge.
  edges?:{solid:Point[];clear:Point[]};
}
// Pixel landmarks are authored independently of the masks. Deriving them from
// those polygons would let an accidentally filled doorway pass its own test.
const gardenScale=900/1536;
const gp=(x:number,y:number):Point=>({x:x*gardenScale,y:y*gardenScale});
const pixel=(x:number,y:number)=>gp(x+.5,y+.5);
const foregroundByScene = { room:roomFurniture, garden:gardenForeground, town:townForeground,
  challenge:courageBorder, ruins:ruinsForeground, meadow:[] };
const masksByScene = {
  town: [...playgroundMasks, ...streetlightMasks, ...waterfrontMasks, ...streetFurnitureMasks, ...plazaTreeOutlines],
  garden: gardenDetails,
  meadow: meadowScenery,
};
const cases:DepthCase[]=[
  {id:"plaza-south-fir",scene:"town",depth:662.5,solid:[{x:748,y:565},{x:749,y:600},{x:748,y:643}],
    clear:[{x:737,y:572},{x:762,y:577},{x:768,y:626}],actor:{x:747,positions:[575,587,665]}},
  {id:"plaza-bookshop-lime",scene:"town",depth:605,solid:[{x:820,y:565},{x:806,y:577}],clear:[{x:820,y:550},{x:820,y:591},{x:850,y:578}],actor:{x:820,positions:[563,578,609]}},
  {id:"gift-hatbox",scene:"room",depth:305,solid:[{x:550,y:273}],clear:[{x:502,y:261},{x:524,y:263}]},
  {id:"gardener-gate-lamp-and-flowers",scene:"challenge",depth:559,solid:[{x:382,y:498}],clear:[{x:408,y:484},{x:419,y:484}]},
  {id:"south-stair-west-jamb",scene:"ruins",depth:553,solid:[{x:391,y:506}],clear:[{x:450,y:511},{x:450,y:480}]},
  {id:"photo-east-border",scene:"garden",depth:483,solid:[{x:231,y:439}],clear:[{x:235,y:418},{x:212,y:433}]},
  {id:"balloon-stall",scene:"garden",depth:281,
    solid:[{x:175,y:184},{x:219,y:199},{x:238,y:216},{x:256,y:225},{x:249,y:235}],
    clear:[{x:212,y:184},{x:224,y:185},{x:232,y:197},{x:251,y:205},{x:257,y:241}]},
  {id:"photo-south-boulder",scene:"garden",depth:528,solid:[{x:144,y:510}],clear:[{x:140,y:500},{x:162,y:511}]},
  {id:"workshop-tea-middle-post",scene:"town",depth:436.5,solid:[{x:1251.3,y:417.8},{x:1251,y:431}],clear:[{x:1248,y:413},{x:1262,y:415}],actor:{x:1251.9,positions:[414,430,443]}},
  {id:"workshop-tea-front-east-1",scene:"town",depth:436.75,solid:[{x:1262,y:422.3},{x:1262,y:430}],clear:[{x:1262,y:426.2},{x:1262,y:414}]},
  {id:"workshop-tea-inner-east-post",scene:"town",depth:431,solid:[{x:1256.5,y:404.4},{x:1256.5,y:411}],clear:[{x:1261.5,y:408},{x:1256,y:426}]},
  {id:"workshop-tea-umbrella",scene:"town",depth:399,solid:[{x:1302,y:355.5},{x:1299,y:366},{x:1305,y:379},{x:1302,y:384.5}],clear:[{x:1297,y:384.5},{x:1307,y:384}],
    actor:{x:1302.1,positions:[385.7,398,424]},actorOverlap:{feet:{x:1302.1,y:385.7},facing:2,covered:[{x:1302,y:355.5},{x:1302,y:365},{x:1305,y:379},{x:1302,y:384.5}],visible:{x:1301,y:350}}},
  {id:"workshop-tea-back-chairs",scene:"town",depth:413,solid:[{x:1286,y:393},{x:1308,y:392}],clear:[{x:1314.8,y:391.7},{x:1289,y:384}]},
  {id:"rabbit-north-east-post",scene:"town",depth:444.5,solid:[{x:438.6,y:424.3},{x:438.4,y:433.5}],clear:[{x:432,y:423.5},{x:445,y:423.5}],actor:{x:438.1,positions:[433.5,441,449]}},
  {id:"rabbit-north-middle-rail-3",scene:"town",depth:438.88,solid:[{x:428.7,y:420.6}],clear:[{x:428.7,y:425.1},{x:428.7,y:415.5}]},
  {id:"rabbit-north-east-rail-3",scene:"town",depth:452.94,solid:[{x:458,y:435.3}],clear:[{x:458,y:439.8},{x:458,y:432}]},
  {id:"workshop-tea-table-and-front-seats",scene:"town",depth:419,solid:[{x:1300,y:400},{x:1275,y:405.5}],clear:[{x:1267,y:405},{x:1294.5,y:384}]},
  {id:"lookout-east-turn-post",scene:"town",depth:902.5,solid:[{x:1287,y:881},{x:1286,y:895}],clear:[{x:1280,y:891},{x:1294,y:882}],actor:{x:1286,positions:[892,902,911]}},
  {id:"lookout-east-side-2",scene:"town",depth:912.81,solid:[{x:1293.8,y:895.9}],clear:[{x:1293.8,y:888.5},{x:1293.8,y:911}]},
  {id:"lookout-west-path-three-1",scene:"town",depth:899.5,solid:[{x:1193.5,y:880.8},{x:1193.5,y:889.4}],clear:[{x:1193.5,y:885.3},{x:1193.5,y:894.2}]},
  {id:"lookout-south-west-1",scene:"town",depth:934,solid:[{x:1275,y:922.5},{x:1275,y:930}],clear:[{x:1275,y:926.9},{x:1275,y:949}]},
  {id:"lookout-stair-east-stone",scene:"town",depth:880,solid:[{x:1333,y:858}],clear:[{x:1314,y:856},{x:1314,y:865}]},
  {id:"dock-north-post",scene:"town",depth:895.8,solid:[{x:870,y:877}],clear:[{x:864,y:866},{x:877,y:870}]},
  {id:"dock-north-back-0-1",scene:"town",depth:900,solid:[{x:893,y:882.7}],clear:[{x:893,y:887},{x:893,y:898}],actor:{x:888.2,positions:[891.7,900,910]}},
  {id:"wheat-stair-solitary-post",scene:"town",depth:740,solid:[{x:156,y:725}],clear:[{x:146,y:721},{x:165,y:725}]},
  {id:"blocks-pine",scene:"town",depth:607,solid:[{x:1124,y:544}],clear:[{x:1109,y:523},{x:1136,y:520}],existingOutline:workshopCanopies[0].points,fragments:[workshopCanopies[0].points]},
  {id:"camp-kettle",scene:"meadow",depth:145,solid:[{x:250,y:117.5},{x:253,y:135}],clear:[{x:251,y:123},{x:238,y:141}]},
  {id:"campfire",scene:"meadow",depth:170,solid:[{x:231,y:146},{x:221,y:162}],clear:[{x:207,y:146}]},
  {id:"south-rose-arch",scene:"garden",depth:976*gardenScale,solid:[gp(750,830)],clear:[gp(750,900),gp(750,984)],actor:{x:750*gardenScale,positions:[860,950,980].map(y=>y*gardenScale)},edges:{
    solid:[[753,820],[751,829],[735,833],[747,849],[769,851],[764,845]].map(([x,y])=>pixel(x,y)),
    clear:[[736,816],[738,815],[741,816],[745,816],[725,822],[735,820],[728,820],[799,871],[807,884],[805,893],[802,935],[798,866]].map(([x,y])=>pixel(x,y)),
  }},
  {id:"west-rose-crown",scene:"garden",depth:760*gardenScale,solid:[gp(218,676)],clear:[gp(211,725),gp(197,775)],actor:{x:210*gardenScale,positions:[714,750,790].map(y=>y*gardenScale)},edges:{
    solid:[[204,680],[216,677],[222,667],[215,664],[201,694],[224,696]].map(([x,y])=>pixel(x,y)),
    clear:[[204,660],[205,663],[202,665],[217,660],[215,661],[217,661],[213,693],[233,700]].map(([x,y])=>pixel(x,y)),
  }},
  {id:"west-alcove-arch",scene:"garden",depth:606*gardenScale,solid:[gp(198,510)],clear:[gp(204,564),gp(204,614)],edges:{
    solid:[[199,503],[175,507],[229,519]].map(([x,y])=>pixel(x,y)),
    clear:[[192,494],[201,494],[217,503],[224,506]].map(([x,y])=>pixel(x,y)),
  }},
  {id:"northeast-bench-arbour",scene:"garden",depth:184*gardenScale,solid:[gp(1100,114)],clear:[gp(1100,138),gp(1100,192)]},
  {id:"garden-gate-lamp",scene:"garden",depth:984*gardenScale,solid:[gp(625,874)],clear:[gp(616,854),gp(635,856),gp(625,991)],subpixelClear:[1],existingOutline:gardenGateLamp.flat(),fragments:gardenGateLamp,edges:{
    solid:[[625,844],[610,852],[639,857],[625,874],[625,901],[626,908],[625,934],[635,976]].map(([x,y])=>pixel(x,y)),
    clear:[[607,875],[610,886],[619,899],[631,903],[621,905],[636,914],[640,924],[640,939],[616,966],[616,854],[635,855]].map(([x,y])=>pixel(x,y)),
  }},
  {id:"northwest-path-lamp",scene:"garden",depth:418*gardenScale,solid:[gp(670,345)],clear:[gp(710,365),gp(670,433)],edges:{
    solid:[[672,325],[667,333],[670,347],[672,362]].map(([x,y])=>pixel(x,y)),
    clear:[[668,318],[661,329],[659,345],[679,362]].map(([x,y])=>pixel(x,y)),
  }},
  {id:"northeast-path-lamp",scene:"garden",depth:418*gardenScale,solid:[gp(832,345)],clear:[gp(795,365),gp(832,433)],edges:{
    solid:[[833,325],[830,334],[832,347],[833,363]].map(([x,y])=>pixel(x,y)),
    clear:[[829,318],[823,328],[820,345],[839,328]].map(([x,y])=>pixel(x,y)),
  }},
  {id:"southwest-square-lamp",scene:"garden",depth:735*gardenScale,solid:[gp(659,695)],clear:[gp(700,705),gp(659,750)],edges:{
    solid:[[657,668],[654,680],[656,695]].map(([x,y])=>pixel(x,y)),
    clear:[[659,659],[668,674],[672,686]].map(([x,y])=>pixel(x,y)),
  }},
  {id:"southeast-square-lamp",scene:"garden",depth:735*gardenScale,solid:[gp(843,695)],clear:[gp(800,705),gp(843,750)],edges:{
    solid:[[848,668],[844,680],[849,695]].map(([x,y])=>pixel(x,y)),
    clear:[[842,659],[836,674],[834,687]].map(([x,y])=>pixel(x,y)),
  }},
  {id:"flower-arch",scene:"town",depth:328,solid:[{x:236,y:262}],clear:[{x:234,y:295},{x:233,y:338}]},
  {id:"pond-arch",scene:"town",depth:909,solid:[{x:928,y:834}],clear:[{x:929,y:878},{x:926,y:916}]},
  {id:"wheat-flower-arch",scene:"town",depth:887,solid:[{x:153,y:809},{x:130,y:844},{x:179,y:851}],clear:[{x:148,y:843},{x:161,y:878}],actor:{x:156,positions:[849,876,900]}},
  {id:"wheat-gate-west-post",scene:"town",depth:889,solid:[{x:144,y:879}],clear:[{x:152,y:876},{x:137,y:876}]},
  {id:"wheat-bench-south-roses",scene:"town",depth:1025,solid:[{x:172,y:995},{x:197,y:991}],clear:[{x:169,y:977},{x:190,y:974}]},
  {id:"wheat-bench-back-rail",scene:"town",depth:998,solid:[{x:137,y:962}],clear:[{x:125,y:976},{x:140,y:996}]},
  {id:"wheat-bench-seat",scene:"town",depth:998,solid:[{x:146,y:975}],clear:[{x:130,y:996},{x:147,y:987.5}]},
  {id:"wheat-streetlight",scene:"town",depth:894,solid:[{x:391,y:822},{x:400,y:848}],clear:[{x:402,y:821},{x:412,y:851}]},
  {id:"south-gate-streetlight",scene:"town",depth:997,solid:[{x:406,y:919},{x:416,y:943}],clear:[{x:416,y:919},{x:425,y:943}]},
  {id:"pond-streetlight",scene:"town",depth:953,solid:[{x:585,y:891},{x:596,y:915}],clear:[{x:596,y:891},{x:609,y:915}]},
  {id:"post-office-red-postbox",scene:"town",depth:622,solid:[{x:215,y:592},{x:215,y:609}],clear:[{x:226,y:605},{x:232,y:616}]},
  {id:"rabbit-east-flower-planter",scene:"town",depth:614,solid:[{x:559,y:563},{x:569,y:600}],clear:[{x:550,y:553},{x:574,y:566}],actor:{x:562,positions:[575,607,628]}},
  {id:"rabbit-east-square-planter",scene:"town",depth:625,solid:[{x:545,y:612}],clear:[{x:531,y:612},{x:560,y:619}]},
  {id:"workshop-rose-pots",scene:"town",depth:472,solid:[{x:985,y:410},{x:974,y:461},{x:989,y:464}],clear:[{x:960,y:410},{x:1006,y:451}]},
  {id:"workshop-stair-spruce",scene:"town",depth:643,solid:[{x:1032,y:611},{x:1035,y:625}],clear:[{x:1044,y:615},{x:1047,y:639}]},
  {id:"workshop-stone-front",scene:"town",depth:619,solid:[{x:1007,y:588},{x:1027,y:593}],clear:[{x:1036,y:589},{x:1038,y:602}]},
  {id:"quarry-lintel",scene:"town",depth:91,solid:[{x:1428,y:31}],clear:[{x:1428,y:65},{x:1428,y:99}]},
  {id:"north-stair-pennants",scene:"town",overhead:true,depth:272,solid:[{x:525,y:200},{x:539.5,y:201.75}],clear:[{x:536,y:209},{x:532.5,y:200.5}]},
  {id:"radio-garland",scene:"town",overhead:true,depth:886,existingOutline:[{x:1241,y:835},{x:1327,y:885}],
    solid:[{x:1284,y:855},{x:1262,y:850}],clear:[{x:1289.5,y:860},{x:1262,y:862}]},
  {id:"radio-garland-post",scene:"town",depth:886,existingOutline:[{x:1240,y:835},{x:1245,y:884}],
    solid:[{x:1242,y:868}],clear:[{x:1248,y:868}]},
  {id:"north-cottages-streetlight",scene:"town",depth:199,solid:[{x:1043,y:131},{x:1032,y:165}],clear:[{x:1055,y:165},{x:1043,y:208}]},
  {id:"post-fork-streetlight",scene:"town",depth:713,solid:[{x:472,y:639},{x:482,y:663}],clear:[{x:485,y:695},{x:484,y:717}]},
  {id:"river-bridge-streetlight",scene:"town",depth:535,solid:[{x:1327,y:477},{x:1314,y:500}],clear:[{x:1339,y:502},{x:1327,y:546}]},
  {id:"bakery-stair-pennants",scene:"town",overhead:true,depth:362,solid:[{x:739,y:331}],clear:[{x:750,y:348},{x:750,y:361}]},
  {id:"plaza-west-pennants",scene:"town",overhead:true,depth:441,solid:[{x:620,y:385}],clear:[{x:626,y:385},{x:606,y:394}]},
  {id:"plaza-west-left-pennants",scene:"town",overhead:true,depth:441,solid:[{x:551.25,y:380.5}],clear:[{x:555,y:381.5},{x:566,y:372}]},
  {id:"plaza-east-upper-pennants",scene:"town",overhead:true,depth:396,solid:[{x:893,y:300.5},{x:902,y:309}],clear:[{x:894.8,y:306.5},{x:918,y:316}]},
  {id:"plaza-east-lower-pennants",scene:"town",overhead:true,depth:434,solid:[{x:879.4,y:310},{x:872.3,y:321}],clear:[{x:885,y:310},{x:877,y:323}]},
  {id:"wish-crossing-lamp",scene:"town",depth:444,solid:[{x:582,y:371},{x:582,y:419}],clear:[{x:568,y:368},{x:582,y:451}]},
  {id:"block-board-lamp",scene:"town",depth:547,solid:[{x:1170,y:472},{x:1170,y:529}],clear:[{x:1156,y:468},{x:1170,y:554}],actor:{x:1170,positions:[521,531,557]}},
  {id:"rabbit-east-lamp",scene:"town",depth:592,solid:[{x:584,y:515},{x:584,y:568}],clear:[{x:569,y:513},{x:584,y:605}],actor:{x:584,positions:[566,576,614]}},
  {id:"plaza-east-lamp",scene:"town",depth:435,solid:[{x:834,y:358},{x:834,y:419}],clear:[{x:846,y:356},{x:834,y:445}]},
  {id:"workshop-blue-postbox",scene:"town",depth:526,solid:[{x:976,y:491},{x:976,y:514}],clear:[{x:989,y:481},{x:993,y:512}]},
  {id:"workshop-rose-border-west",scene:"town",depth:560,solid:[{x:968,y:538},{x:962,y:546}],clear:[{x:985,y:525},{x:997,y:534}],actor:{x:972,positions:[525,540,574]}},
  {id:"workshop-rose-border-east",scene:"town",depth:578,solid:[{x:1009,y:561},{x:1019,y:564}],clear:[{x:1020,y:546},{x:1034,y:569}]},
  {id:"workshop-junction-lamp",scene:"town",depth:396,solid:[{x:939,y:316},{x:939,y:373}],clear:[{x:928,y:316},{x:959,y:374}],actor:{x:939,positions:[328,382,407]}},
  {id:"workshop-patio-middle-top",scene:"town",depth:376,solid:[{x:1048,y:361}],clear:[{x:1048,y:357},{x:1048,y:363.5}],actor:{x:1050,positions:[362,372,388]}},
  // Probe the middle of the rail gap so a 320px canvas pixel misses both edges.
  {id:"workshop-patio-east-middle-post",scene:"town",depth:395,solid:[{x:1111,y:389}],clear:[{x:1101,y:384},{x:1119,y:388}]},
  {id:"workshop-patio-ivy-stone-face",scene:"town",depth:407,solid:[{x:1079,y:391}],clear:[{x:1079,y:373},{x:1091,y:382}]},
  {id:"bakery-stair-rise-3",scene:"town",overhead:true,depth:333,solid:[{x:777,y:323}],clear:[{x:775,y:328},{x:780,y:334}]},
  {id:"bakery-stair-post-knot",scene:"town",overhead:true,depth:268,solid:[{x:813,y:250}],clear:[{x:809,y:255},{x:806,y:251}]},
  {id:"flight-ring",scene:"town",depth:457,solid:[{x:696,y:356},{x:676,y:453}],clear:[{x:697,y:433},{x:694,y:472}],actor:{x:676,positions:[434,440,477]}},
  {id:"flight-small-ring",scene:"town",depth:427,solid:[{x:770,y:395}],clear:[{x:750,y:394},{x:756,y:438}],actor:{x:755,positions:[403,418,446]}},
  {id:"plaza-west-roses-1-0",scene:"town",depth:509.5,solid:[{x:649,y:466}],clear:[{x:649,y:446},{x:674,y:472}]},
  {id:"plaza-east-roses-2-0",scene:"town",depth:536.25,solid:[{x:803,y:501}],clear:[{x:803,y:485},{x:802,y:549}]},
  {id:"plaza-east-stone-post",scene:"town",depth:438,solid:[{x:900,y:424}],clear:[{x:910,y:416},{x:894,y:417}]},
  {id:"quarry-verge-blossoms",scene:"town",depth:166,solid:[{x:1319,y:140}],clear:[{x:1324,y:125},{x:1327,y:123}]},
  {id:"wheat-stair-overhanging-shrub",scene:"town",depth:765,solid:[{x:94,y:743}],clear:[{x:107,y:733},{x:104,y:725}]},
  {id:"rabbit-west-hedge",scene:"town",depth:582,solid:[{x:400,y:549},{x:406,y:555}],clear:[{x:424,y:545},{x:431,y:592}]},
  {id:"bakery-fence-pennants",scene:"town",overhead:true,depth:247,solid:[{x:978,y:186}],clear:[{x:985,y:185},{x:998,y:184}]},
  {id:"garden-sign",scene:"garden",depth:479,solid:[{x:191,y:415},{x:208,y:415}],clear:[{x:197,y:420},{x:205,y:471}],existingOutline:gardenSign,fragments:[gardenSign]},
  {id:"garden-screen",scene:"garden",depth:273,solid:[{x:708,y:163},{x:721,y:164}],clear:[{x:716,y:169},{x:680,y:175}],existingOutline:televisionSilhouette,fragments:[televisionSilhouette]},
  {id:"town-west-tree",scene:"town",depth:432,solid:[{x:340,y:350},{x:320,y:370}],clear:[{x:330,y:331},{x:345,y:334}],existingOutline:townCanopies[0].points,fragments:[townCanopies[0].points]},
  {id:"south-road-west-crowns",scene:"town",depth:1025,solid:[{x:533,y:966},{x:579,y:978}],clear:[{x:560,y:970},{x:595,y:984}],canopyEdge:{x:533,y:996},existingOutline:southEdgeCanopies[0].points,fragments:[southEdgeCanopies[0].points]},
  // Use a leaf inside the face aperture with a stable colour on both town textures.
  {id:"south-road-east-crowns",scene:"town",depth:1025,solid:[{x:737,y:970},{x:804,y:1001}],clear:[{x:775,y:970},{x:791,y:991}],canopyEdge:{x:737,y:998},existingOutline:southEdgeCanopies[1].points,fragments:[southEdgeCanopies[1].points]},
];
const run=document.querySelector<HTMLButtonElement>("#depth-run")!;
const summary=document.querySelector<HTMLElement>("#depth-summary")!;
const results=document.querySelector<HTMLElement>("#depth-results")!;
const gallery=document.querySelector<HTMLElement>("#depth-gallery")!;
const wait=async(check:()=>boolean)=>{const until=performance.now()+20000;while(!check()){if(performance.now()>until)throw Error("地图加载超时");await new Promise(done=>setTimeout(done,20));}};
const assert=(condition:unknown,message:string)=>{if(!condition)throw Error(message);};
const rgb=[255,0,255];
type Sample={point:Point;rgb:number[]};
type Evidence={id:string;scene:SceneId;depth:number;behind:Sample[];front:Sample[];mask?:Sample[];edges?:{solid:Sample[];clear:Sample[]};status:string};
const evidence:Evidence[]=[];
function drawNow(){(world as unknown as {draw:()=>void}).draw();}
function sample(point:Point):Sample {
  const p=world.project(point),canvas=world.canvas;
  const x=Math.floor(p.x*canvas.width/600),y=Math.floor(p.y*canvas.height/400);
  assert(x>=0&&y>=0&&x<canvas.width&&y<canvas.height,"采样点超出当前视口");
  return {point,rgb:[...canvas.getContext("2d")!.getImageData(x,y,1,1).data].slice(0,3)};
}
const pink=(value:Sample,tolerance=3)=>value.rgb.every((v,i)=>Math.abs(v-rgb[i])<=tolerance);
function capture(points:Point[]) {
  const projected=points.map(p=>world.project(p));
  const left=Math.max(0,Math.floor(Math.min(...projected.map(p=>p.x))-25));
  const top=Math.max(0,Math.floor(Math.min(...projected.map(p=>p.y))-25));
  const right=Math.min(600,Math.ceil(Math.max(...projected.map(p=>p.x))+25));
  const bottom=Math.min(400,Math.ceil(Math.max(...projected.map(p=>p.y))+30));
  const image=document.createElement("canvas");image.width=(right-left)*2;image.height=(bottom-top)*2;
  const c=image.getContext("2d")!;c.imageSmoothingEnabled=false;
  c.drawImage(world.canvas,left*world.canvas.width/600,top*world.canvas.height/400,
    (right-left)*world.canvas.width/600,(bottom-top)*world.canvas.height/400,0,0,image.width,image.height);
  return image.toDataURL();
}
function sampleEdges(outlines:Point[][],landmarks:NonNullable<DepthCase["edges"]>){
  // Draw the actual fragment renderer at an exact integer multiple of the
  // source resolution, rather than upscaling an already downsampled screenshot.
  const source=[...outlines.flat(),...landmarks.solid,...landmarks.clear].map(p=>({x:p.x/gardenScale,y:p.y/gardenScale}));
  const left=Math.floor(Math.min(...source.map(p=>p.x)))-2;
  const top=Math.floor(Math.min(...source.map(p=>p.y)))-2;
  const width=Math.ceil(Math.max(...source.map(p=>p.x)))-left+2;
  const height=Math.ceil(Math.max(...source.map(p=>p.y)))-top+2;
  const zoom=3,canvas=document.createElement("canvas");canvas.width=width*zoom;canvas.height=height*zoom;
  const c=canvas.getContext("2d")!;c.imageSmoothingEnabled=false;c.fillStyle="#ff00ff";c.fillRect(0,0,canvas.width,canvas.height);
  c.setTransform(zoom/gardenScale,0,0,zoom/gardenScale,-left*zoom,-top*zoom);
  for(const outline of outlines)world.drawMapFragment(c,outline);
  const read=(point:Point):Sample=>({point,rgb:[...c.getImageData(Math.floor((point.x/gardenScale-left)*zoom),Math.floor((point.y/gardenScale-top)*zoom),1,1).data].slice(0,3)});
  return {image:canvas.toDataURL(),solid:landmarks.solid.map(read),clear:landmarks.clear.map(read)};
}
async function verify(test:DepthCase){
  const foreground=foregroundByScene[test.scene];
  const masks = test.scene === "town" || test.scene === "garden" || test.scene === "meadow" ? masksByScene[test.scene] : [];
  const baked = masks.find(mask => mask.id === test.id);
  const target=baked ? {
    id:baked.id,y:baked.depth,points:[{x:baked.x,y:baked.y},{x:baked.x+baked.w,y:baked.y+baked.h}],
  } : test.existingOutline?{id:test.id,y:test.depth,points:test.existingOutline}:foreground.find(f=>f.id===test.id);
  assert(target,"缺少前景定义 "+test.id);
  assert(Math.abs(target!.y-test.depth)<.5,"前景深度偏离实景柱脚："+target!.y+" / "+test.depth);
  await world.prepareScene(test.scene);world.switchScene(test.scene);
  const center={x:(Math.min(...target!.points.map(p=>p.x))+Math.max(...target!.points.map(p=>p.x)))/2,y:test.depth-30};
  const saved={layers:world.getDepthLayers,hidden:world.actorHidden,paused:world.paused,
    light:world.onLighting,effects:world.onEffects,overlay:world.onOverlay,draw:world.onDraw,player:{...world.player},facing:world.facing};
  const section=document.createElement("section"),heading=document.createElement("h2"),images=document.createElement("div");
  heading.textContent=test.scene+" · "+test.id;images.className="depth-images";section.append(heading,images);gallery.append(section);
  const bounds=[...target!.points,...test.solid,...test.clear,{x:center.x,y:test.depth+15}];
  if(test.actorOverlap) bounds.push(test.actorOverlap.visible,{x:test.actorOverlap.feet.x,y:test.actorOverlap.feet.y-50});
  const photo=(title:string)=>{const figure=document.createElement("figure"),img=document.createElement("img"),caption=document.createElement("figcaption");img.src=capture(bounds);img.alt=title;caption.textContent=title;figure.append(img,caption);images.append(figure);};
  const points=[...test.solid,...test.clear];
  const probe=(depth:number):DepthLayer=>({y:depth,draw(c){c.fillStyle="#ff00ff";for(const p of points)c.fillRect(p.x-4,p.y-4,8,8);}});
  const record:Evidence={id:test.id,scene:test.scene,depth:test.depth,behind:[],front:[],status:"检查中"};evidence.push(record);
  try{
    world.clearInput();world.paused=true;world.actorHidden=true;
    world.onLighting=()=>{};world.onEffects=()=>{};world.onOverlay=()=>{};world.onDraw=()=>{};
    world.setFocus(center,1.3);
    drawNow();photo("原景（不含人物）");
    world.getDepthLayers=()=>[...saved.layers(),probe(test.depth-1)];drawNow();
    record.behind=points.map(sample);photo("脚底在柱后：拱顶遮挡；门洞保留（其他前景树仍会遮挡）");
    const frontDepth=test.overhead ? world.config.height+1 : test.depth+1;
    world.getDepthLayers=()=>[...saved.layers(),probe(frontDepth)];drawNow();
    record.front=points.map(sample);photo(test.overhead?"人物经过旗绳下方，布面遮挡，旗间可见":"脚底在柱前，人物挡住柱脚");
    if(test.canopyEdge){
      world.player=test.canopyEdge;world.actorHidden=false;
      world.getDepthLayers=()=>[...saved.layers(),probe(test.depth-1)];drawNow();
      for(const [i,point] of test.solid.entries()){
        const faded=sample(point),leaf=record.behind[i];
        const expected = i === 0 ? leaf.rgb.map((v,j)=>(v+rgb[j])/2) : leaf.rgb;
        assert(faded.rgb.every((channel,j)=>Math.abs(channel-expected[j])<8),
          "树冠只在脸前透光，树根和远处枝叶仍须遮住人物");
      }
      world.player={...saved.player};world.actorHidden=true;
    }
    if(baked){
      const shape=new Path2D(baked.path);
      world.getDepthLayers=()=>[{y:baked.depth,draw:c=>world.drawMapCover(c,baked,shape)},probe(test.depth-1)];
      drawNow();record.mask=points.map(sample);
    } else if(!test.existingOutline || test.fragments){
      // Isolate the actual map fragment separately from neighbouring scenery.
      world.getDepthLayers=()=>[{y:target!.y,draw:c=>{for(const outline of test.fragments??[target!.points])world.drawMapFragment(c,outline);}},probe(test.depth-1)];
      drawNow();record.mask=points.map(sample);
    }
    if(test.edges){
      const edge=sampleEdges(test.fragments??[target!.points],test.edges);record.edges={solid:edge.solid,clear:edge.clear};
      const figure=document.createElement("figure"),img=document.createElement("img"),caption=document.createElement("figcaption");
      img.src=edge.image;img.alt="原图像素3倍边缘采样";caption.textContent="单片边缘 ×3：地砖/草地空隙透明，花瓣/叶尖保留";
      figure.append(img,caption);images.append(figure);
    }
    world.getDepthLayers=saved.layers;world.actorHidden=false;
    if(test.actorOverlap){
      const {feet,facing,covered,visible}=test.actorOverlap;
      const landmarks=[...covered,visible];
      world.player=feet;world.facing=facing;world.actorHidden=true;drawNow();
      const bare=landmarks.map(sample);
      world.actorHidden=false;world.getDepthLayers=()=>[];drawNow();
      const changed=(point:Sample,i:number)=>point.rgb.some((v,j)=>Math.abs(v-bare[i].rgb[j])>8);
      assert(landmarks.map(sample).every(changed),"人物没有经过指定像素，请核实脚点和朝向");
      world.getDepthLayers=saved.layers;drawNow();
      assert(!covered.map(sample).some(changed)&&changed(sample(visible),covered.length),"人物与伞顶、伞沿或伞杆的前后关系有误");
      photo("反馈位置：人物站在伞后，头顶从伞面上方露出");
    }
    const positions=test.actor?.positions??[test.solid[0].y+24,test.depth-18,test.depth+15];
    for(const [index,label]of ["人物经过上方背后","人物位于门洞／支柱中段","人物站在门前／柱前"].entries()){world.player={x:test.actor?.x??center.x,y:positions[index]};drawNow();photo(label);}
    if(test.edges){
      world.player={x:test.actor?.x??center.x,y:positions[0]};
      world.setFocus({x:world.player.x,y:test.solid[0].y+12},2.8);
      drawNow();photo("固定脚点近看：人物在花冠后方，检查花叶间是否混入地砖/草地");
    }
    assert(record.behind.slice(0,test.solid.length).every(p=>!pink(p)),"柱后人物压在实体拱顶上");
    assert(record.behind.slice(test.solid.length).every((p,i)=>pink(p,test.subpixelClear?.includes(i)?40:3)),"完整场景门洞/地面遮挡不符合实景");
    if(test.overhead){
      assert(record.front.slice(0,test.solid.length).every(p=>!pink(p)),"高挂的彩带被人物盖住");
      assert(record.front.slice(test.solid.length).every(p=>pink(p)),"彩带前景填住了旗间的空隙或立柱");
    }else{
      assert(record.front.every(p=>pink(p)),"柱前人物遮挡不符合实景");
    }
    if(record.mask){
      assert(record.mask.slice(0,test.solid.length).every(p=>!pink(p)),"单片拱顶遮罩未覆盖实体");
      assert(record.mask.slice(test.solid.length).every((p,i)=>pink(p,test.subpixelClear?.includes(i)?40:3)),"门洞/地面被单片前景贴图擦除");
    }
    if(record.edges){
      const missing=record.edges.solid.filter(p=>pink(p)),dirty=record.edges.clear.filter(p=>!pink(p));
      assert(!missing.length,"边缘花瓣/叶尖被错误删掉："+JSON.stringify(missing));
      assert(!dirty.length,"边缘带入地砖/草地："+JSON.stringify(dirty));
    }
    record.status="通过";
  }catch(error){record.status=String(error);throw error;}
  finally{
    const report=document.createElement("pre");report.textContent=JSON.stringify(record,null,2);section.append(report);
    world.getDepthLayers=saved.layers;world.actorHidden=saved.hidden;world.paused=saved.paused;
    world.onLighting=saved.light;world.onEffects=saved.effects;world.onOverlay=saved.overlay;world.onDraw=saved.draw;
    world.player=saved.player;world.facing=saved.facing;world.setFocus(null);drawNow();
  }
}
async function verifyAll(){
  run.disabled=true;results.replaceChildren();gallery.replaceChildren();evidence.length=0;summary.textContent="检查中…";
  if(!document.querySelector(".intro-screen")!.classList.contains("dismissed"))document.querySelector<HTMLButtonElement>(".enter-button")!.click();
  let passed=0,failed=0;
  for(const test of cases){const li=document.createElement("li");try{await verify(test);passed++;li.className="pass";li.textContent="通过 · "+test.id;}catch(e){failed++;li.className="fail";li.textContent="失败 · "+test.id+" · "+String(e);}results.append(li);}
  summary.textContent=`${passed} 项通过，${failed} 项失败`;run.disabled=false;
}
run.addEventListener("click",()=>void verifyAll());
await wait(()=>!!world&&!document.querySelector<HTMLButtonElement>(".enter-button")!.disabled);
summary.textContent="可以开始";run.disabled=false;
Object.assign(window,{depthQA:{run:verifyAll,evidence:()=>evidence,cases:()=>cases}});
