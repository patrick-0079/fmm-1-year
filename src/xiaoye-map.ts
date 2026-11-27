import { rainbowFlowers, meadowGate } from "./rainbow-flowers.ts";
import { campfire, campTapeSpot, meadowExit } from "./meadow-ground.ts";
import { xiaoyeSpot } from "./xiaoye-data.ts";
import { scenes } from "./maps.ts";

const sheets = {garden:"周年花园", challenge:"勇气花园", town:"周年小镇"} as const;
type FlowerScene = keyof typeof sheets;
type Point = {x:number; y:number};
type Ink = CanvasRenderingContext2D;
const width = 220, height = 132;

export function xiaoyeMapCover() {
  return '<span class="xiaoye-map-cover" aria-hidden="true"><i>✿</i></span>';
}

export function renderXiaoyeMap() {
  const pages = (Object.keys(sheets) as FlowerScene[]).map(id => {
    const flowers = rainbowFlowers.filter(f => f.scene === id);
    const keys = flowers.map(f => {
      const number = rainbowFlowers.indexOf(f) + 1;
      return `<li><i style="--petal:${f.color}">${number}</i><span><b>${f.name}</b><small>${f.place.split(" · ")[1]}</small></span></li>`;
    }).join("");
    return `<section class="xiaoye-map-fold"><h5>${sheets[id]} · ${flowers.length} 朵</h5><ul>${keys}</ul></section>`;
  }).join("");
  return `<article class="xiaoye-map-paper" tabindex="0" aria-label="小叶子的手绘地图">
    <header class="xiaoye-map-heading"><div><h4>小叶子的花海藏宝图</h4><p>芙芙，把这七朵花的颜色都带回来吧！</p></div>
      <button type="button" data-keepsakes data-map-back data-focus="map-back">返回纪念物</button></header>
    <canvas class="xiaoye-treasure-chart" role="img" aria-label="小叶子用彩笔画了周年花园的两朵花、勇气花园的两朵花和周年小镇的三朵花。七色花集齐后，小叶子左下方草坪上的传送阵会送你去花海。篝火左边，红叉旁是周年录像带。"></canvas>
    <p class="xiaoye-map-itinerary">集齐七色花，去我左下方的草坪找传送阵。去花海的篝火左边捡起录像带，再从月芽传送阵回花园，把它放进东边大屏前的放映机。</p>
    <details class="xiaoye-map-key"><summary>对照地图找七朵花</summary><div class="xiaoye-map-folds">${pages}</div></details>
  </article>`;
}

function path(c:Ink, d:string, fill:string, edge = "", weight = 1) {
  const p = new Path2D(d);
  if (fill) {c.fillStyle=fill; c.fill(p);}
  if (edge) {c.strokeStyle=edge; c.lineWidth=weight; c.stroke(p);}
}

function ellipse(c:Ink,x:number,y:number,rx:number,ry:number,color:string,angle=0) {
  c.fillStyle=color; c.beginPath(); c.ellipse(x,y,rx,ry,angle,0,Math.PI*2); c.fill();
}

function tree(c:Ink,x:number,y:number,size:number,apples=false) {
  c.save(); c.translate(x,y);
  const tilt=Math.sin(x*1.3+y);
  c.rotate(tilt*.14);c.scale(size*(1+tilt*.11),size*(1-tilt*.1));
  ellipse(c,1,0,8,2,"#77865244");
  path(c,"M-1 0 L-.8 -11 L1 -12 L1.7 0Z","#94795a","#786b4f",.65);
  path(c,"M-2 -5 Q-8 -4 -8 -9 Q-10 -14 -6 -16 Q-6 -21 -1 -21 Q4 -23 6 -17 Q10 -15 8 -11 Q10 -5 3 -5Z",tilt>0?"#9fba82":"#afc27e","#6d845b",.9);
  path(c,"M-6 -12 Q-6 -17 -2 -18 M2 -7 Q5 -8 6 -11 M-1 -9 L0 -5","","#84985d",.8);
  if(apples) for(const [dx,dy] of [[-5,-13],[2,-16],[5,-10]]) ellipse(c,dx,dy,1.7,1.9,"#bd6656");
  c.restore();
}

function cottage(c:Ink,x:number,y:number,size:number,roof:string) {
  c.save(); c.translate(x,y); c.scale(size,size);
  ellipse(c,0,.5,14,2.4,"#88905d36");
  path(c,"M-10 0 L-10 -12 L1 -18 L11 -11 L11 0Z","#f6dfae","#806e55");
  path(c,"M-13 -11 L-1 -22 L11 -21 L16 -11 L3 -12 L-1 -16 L-9 -9Z",roof,"#806e55");
  path(c,"M3 -12 L3 0 M0 -21 L7 -13 M4 -20 L11 -13 M7 -20 L13 -14","","#8e7057",.65);
  path(c,"M-6 0 L-6 -6 Q-4 -9 -2 -6 L-2 0Z","#967d61");
  path(c,"M6 -8 h3 v4 h-3Z","#90aba2","#806e55",.7); c.restore();
}

function water(c:Ink,outline:string) {
  path(c,outline,"#abcac0","#8baea0",1.2);
  c.save(); c.clip(new Path2D(outline));
  for(let y=8;y<height;y+=8) for(let x=(y%3)*4;x<width;x+=19)
    path(c,`M${x} ${y} q3 1 6 0`,"","#d9e5ce",.95);
  c.restore();
}

function lane(c:Ink, d:string, span:number) {
  path(c,d,"","#c0ac82",span+1.3); path(c,d,"","#eee0b7",span);
}

function ring(c:Ink,at:Point) {
  c.save(); c.translate(at.x,at.y); c.scale(1,.48);
  for(const [r,col] of [[8,"#8d75a0"],[5,"#b29bb9"]] as const) {
    c.strokeStyle=col;c.lineWidth=1.8;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();
  }
  for(let i=0;i<6;i++){c.rotate(Math.PI/3);ellipse(c,7.8,0,1.35,1.9,"#f8dbac");} c.restore();
}

// Keep the recognizable landmarks in the same coordinate system as the flower spots.
function ground(c:Ink,id:FlowerScene) {
  const place = scenes[id];
  const at = (p:Point) => ({x:p.x*width/place.width,y:p.y*height/place.height});
  const land = {
    garden:"M8 35 Q8 21 27 18 Q38 8 60 12 Q81 5 93 9 Q120 1 136 12 Q168 12 184 6 Q198 5 208 20 Q214 33 210 51 L214 69 Q219 84 204 101 Q194 111 177 112 Q162 125 140 119 Q117 131 94 121 Q74 128 59 121 Q34 127 22 111 Q6 108 8 89 Q-1 78 6 59 Q1 50 8 35Z",
    challenge:"M10 62 Q14 51 9 40 Q7 27 28 23 Q48 18 58 10 Q74 1 94 14 Q109 28 125 17 Q139 10 154 13 Q175 -1 195 14 Q210 25 201 39 Q197 48 207 59 Q220 69 204 84 Q199 89 199 100 Q189 117 169 114 Q146 106 129 120 Q113 130 94 118 Q82 111 68 120 Q46 128 34 111 Q15 110 16 97 Q0 81 10 62Z",
    town:"M3 47 Q16 35 11 22 Q14 11 34 12 Q47 12 64 9 Q91 4 109 8 Q132 3 149 11 Q172 9 193 11 Q213 12 210 28 Q206 47 214 58 Q222 72 209 82 Q199 94 207 102 Q196 116 177 115 Q156 120 140 117 Q115 120 102 127 Q80 133 60 123 Q42 120 25 124 Q13 119 14 104 Q13 86 4 75 Q-3 61 3 47Z",
  }[id];
  const wash = {garden:"#cedc9b",challenge:"#c1d7a6",town:"#d4d79f"}[id];
  path(c,land,wash,"#a9b987",.9);
  // Tiny pencil strokes leave the paper showing through the grass wash.
  c.save();c.clip(new Path2D(land));
  for(let i=0;i<115;i++) {
    const x=(i*89+13)%221, y=(i*i*23+i*17+32)%133;
    path(c,`M${x} ${y} l-1.4 -2 m1.4 2 2 -2.7`,"",i%3?"#9fad804d":"#fff1cfa0",.7);
  }
  for(let i=0;i<36;i++){
    const x=(i*73+13)%width, y=(i*47+12)%height;
    path(c,`M${x} ${y} l-5 3 8 -4 -6 4`,"",i%3?"#b9c78588":"#e9e9b288",1.6);
  }
  c.restore();
  if(id==="garden"){
    water(c,"M199 7 Q186 23 194 37 T196 69 Q177 88 199 100 Q206 111 186 119 L201 117 Q219 105 206 91 Q191 82 207 68 Q217 46 204 35 Q196 23 212 12Z");
    lane(c,"M111 21 Q114 50 109 70 T110 125 M24 67 Q64 78 109 71 Q149 66 179 55",7);
    ellipse(c,109,73,19,13,"#bca783");ellipse(c,109,73,17,11,"#e8d4b1");
    cottage(c,110,24,1,"#cb8e77");
    path(c,"M59 32 l0 -11 M49 22 Q57 9 69 21 Q65 25 62 22 Q58 26 55 22 Q51 25 49 22Z","#ce8e97","#996e71");
    const screen=at(place.spots.find(s=>s.id==="danmaku")!);
    c.save();c.translate(screen.x,screen.y);
    path(c,"M-12 -8 L12 -7 L12 6 L-12 5Z","#fbf0cf","#78694e",1.3);
    path(c,"M-10 5 l-1 4 M10 6 l1 4 M-7 11 l15 .5 M-8 14 l15 .5","","#887452",1.6);c.restore();
    const leaf=at(xiaoyeSpot);ellipse(c,leaf.x,leaf.y-2,3.1,2.7,"#a57868");
    for(const dx of [-2.7,0,2.7])ellipse(c,leaf.x+dx,leaf.y-5.4-Math.cos(dx)*.8,1.2,1.7,"#a57868");
    ring(c,at(meadowGate)); tree(c,26,48,.83);tree(c,143,35,.78);tree(c,45,112,.72);
  } else if(id==="challenge"){
    water(c,"M56 5 Q37 24 54 40 T67 62 Q76 74 57 88 Q43 102 53 123 L66 126 Q54 107 72 93 Q90 76 79 59 Q73 48 64 39 Q49 23 69 7Z");
    lane(c,"M110 120 Q105 104 87 98 Q68 89 68 75 Q68 63 86 57 Q111 50 109 29 M78 73 Q106 87 132 81 T170 79",6);
    path(c,"M59 71 Q69 66 80 68 L82 74 Q70 73 61 78Z","#cbbd9b","#907e61",1);
    path(c,"M63 70 l2 6 M68 69 l2 6 M73 68 l2 6 M78 68 l2 6","","#96856b",.8);
    tree(c,172,87,1.22,true);tree(c,40,53,.86);tree(c,142,39,1);tree(c,28,89,.78);tree(c,184,51,.75);
    path(c,"M103 121 v-8 q7 -8 15 0 v8 M104 115 q7 -7 13 0","","#897959",1.6);
  } else {
    lane(c,"M13 91 Q40 86 63 76 Q91 73 105 62 Q121 50 159 56 L206 62 M106 120 Q113 97 104 76 Q100 58 99 31 M35 40 Q54 55 75 64 Q90 73 104 76",6);
    water(c,"M82 110 Q84 104 97 104 Q108 103 115 110 Q120 117 108 119 Q90 123 83 117Z");
    cottage(c,37,31,.86,"#b18c99");cottage(c,106,30,1,"#c19370");cottage(c,165,48,.88,"#9faaa0");
    cottage(c,37,78,1.05,"#bb7f70");cottage(c,131,100,.78,"#a4a794");
    path(c,"M153 65 v-7 h6 v7Z M158 65 v-9 h6 v9Z M163 65 v-5 h5 v5Z","#d0a46f","#8d745b",.9);
    for(const [x,y] of [[18,53],[194,38],[81,39],[65,103],[147,117]])tree(c,x,y,.69);
  }
}

function campsite(c:Ink) {
  // Enlarged western corner of the meadow. Pickups and the return circle follow the real spots.
  const at = (p:Point) => ({x:14+(p.x-43)*.91, y:14+(p.y-91)*.69});
  const tape=at(campTapeSpot), fire=at(campfire), exit=at(meadowExit);
  path(c,"M5 49 Q7 23 34 22 Q57 4 98 16 Q127 4 156 15 Q199 9 214 42 Q229 69 202 101 Q188 127 143 120 Q74 136 28 117 Q-4 100 5 49Z","#cbc4d6","#aaa4bb",1);
  for(let i=0;i<45;i++){
    const x=22+(i*109)%180,y=27+(i*37)%73;
    ellipse(c,x,y,1.3,1.1,i%3?"#fff3c8":"#ac9cbe");
    if(i%7===0) path(c,`M${x-2} ${y} h4 m-2 -2 v4`,"","#fff3c8",.75);
  }
  c.save();c.setLineDash([2,4]);
  path(c,`M${exit.x+9} ${exit.y-1} Q62 100 86 92 T${tape.x} ${tape.y+7}`,"","#796d84",1.2);c.restore();
  c.save();c.translate(91,50);
  path(c,"M-34 11 L-8 -18 L12 -24 L35 5 L10 13Z","#c99782","#887063",1.4);
  path(c,"M-33 11 L-8 -18 L10 13Z","#dfb59a","#887063");
  path(c,"M-18 12 L-8 -11 L3 12Z","#756a70");
  path(c,"M-8 -20 l-3 -4 M-8 -20 l3 -5 M11 -25 l-1 -3 M11 -25 l3 -4","","#867059",1.3);c.restore();
  ring(c,exit);
  c.save();c.translate(fire.x,fire.y);
  ellipse(c,0,1,12,4,"#aa9583");
  path(c,"M-7 3 L7 -1 M-5 -2 L6 4","","#7a6053",2.4);
  path(c,"M-6 0 Q-12 -6 -4 -13 Q-6 -7 -1 -8 Q4 -12 1 -19 Q14 -11 7 -3 Q4 3 -6 0Z","#d39772","#997660");
  path(c,"M-3 -1 Q-5 -5 0 -10 Q0 -6 4 -6 Q4 -1 0 0Z","#f4ce84");c.restore();
  c.save();c.translate(tape.x,tape.y);c.rotate(-.17);
  path(c,"M-8 -4 h16 v9 h-16Z","#8e858f","#675e64");
  ellipse(c,-3.5,-.5,1.8,1.8,"#f6e6c8");ellipse(c,3.5,-.5,1.8,1.8,"#f6e6c8");c.restore();
}

type SceneTile = readonly [number, number, number];
const wideTiles = {garden:[20,43,1.02], challenge:[291,17,.81], town:[528,37,1.02], meadow:[225,160,.95]} as const;
const narrowTiles = {garden:[4,25,.70], challenge:[169,34,.66], town:[3,160,.70], meadow:[163,188,.71]} as const;

function onTile(c:Ink,[x,y,scale]:SceneTile,draw:()=>void) {
  c.save(); c.translate(x,y); c.scale(scale,scale); draw(); c.restore();
}

function flower(c:Ink,x:number,y:number,number:number,color:string) {
  c.save();c.translate(x,y);
  path(c,"M0 0 q1 8 -2 13 M-1 10 q-8 -1 -9 -6 q5 -1 9 6","#99b57c","#688553",1.2);
  for(let k=0;k<5;k++){
    c.rotate(Math.PI*2/5);
    c.beginPath();c.ellipse(0,-6.7,4.3,5.1,.15,0,Math.PI*2);c.fillStyle=color;c.fill();
    c.strokeStyle="#735b4e";c.lineWidth=.95;c.stroke();
    path(c,"M.2 -6 l.9 -3","","#fff4c888",1.1);
  }
  ellipse(c,0,0,5.9,5.5,"#ffe39b");
  c.font="bold 10px Georgia, serif";c.textBaseline="middle";c.textAlign="center";
  c.fillStyle="#54453d";c.fillText(String(number),0,.4);c.restore();
}

function note(c:Ink,x:number,y:number,words:string,size:number,angle=0,red=false) {
  c.save();c.translate(x,y);c.rotate(angle);c.font=`bold ${size}px "KaiTi","楷体","Kaiti SC",serif`;
  c.textBaseline="middle";c.lineWidth=3;c.strokeStyle="#f9efcf";c.strokeText(words,0,0);
  c.fillStyle=red?"#aa5552":"#515e43"; c.fillText(words,0,0); c.restore();
}

function dotted(c:Ink,d:string) {
  c.save();c.setLineDash([4.7,6.4]);path(c,d,"","#b56359",2.35);c.restore();
}

function paw(c:Ink,x:number,y:number,size:number,angle:number) {
  c.save();c.translate(x,y);c.rotate(angle);c.scale(size,size);
  ellipse(c,0,1,4.1,3,"#ae856c");ellipse(c,-4.5,-3,1.6,2.2,"#ae856c",-.35);
  ellipse(c,-1,-4.9,1.5,2.1,"#ae856c");ellipse(c,2.6,-4.1,1.5,2.1,"#ae856c",.3);c.restore();
}

function star(c:Ink,x:number,y:number,r:number) {
  c.save();c.translate(x,y);c.scale(r,r);
  path(c,"M0 -5 L1 -1 L5 -1 L2 1 L3.5 4.3 L0 2.7 L-3.7 4.6 L-2.8 .9 L-5 -1 L-1.4 -1Z","#eed17f","#b18b52",.8);c.restore();
}

export function paintXiaoyeMap(root: ParentNode) {
  const canvas=root.querySelector<HTMLCanvasElement>(".xiaoye-treasure-chart");
  if(!canvas)return;
  const compact=canvas.clientWidth<480;
  const tiles=compact?narrowTiles:wideTiles;
  const w=compact?328:780,h=compact?305:285;
  canvas.width=w*2;canvas.height=h*2;
  const c=canvas.getContext("2d");if(!c)return;
  c.scale(2,2);c.lineJoin="round";c.lineCap="round";
  for(const id of Object.keys(sheets) as FlowerScene[])onTile(c,tiles[id],()=>ground(c,id));
  onTile(c,tiles.meadow,()=>campsite(c));
  // Each bend is a pencil mark between numbered flowers, back to the ring, then to the tape.
  if(compact){
    dotted(c,"M54 50 Q55 76 80 75 T119 83 Q147 111 164 89 Q173 67 190 70 T229 76 Q235 91 251 90 T274 87 Q296 115 254 139 Q227 155 178 147 T104 173 Q72 180 54 217 Q79 208 104 208 Q94 224 72 246 Q44 263 20 236 Q1 215 24 183 Q51 156 51 130 T64 80 Q57 102 92 127 Q118 146 148 143 T176 183 Q177 207 209 221 T273 234");
  }else{
    dotted(c,"M91 79 Q101 82 99 99 Q93 115 116 119 T151 123 Q173 134 188 127 Q212 103 237 106 Q261 105 282 79 Q299 53 330 68 Q352 82 364 68 Q376 71 387 78 T421 81 Q446 77 474 99 Q493 111 515 98 Q541 77 566 94 Q582 105 602 120 Q623 128 641 113 T676 107 Q686 132 663 142 Q646 150 628 162 Q609 194 567 186 Q542 182 531 167 Q507 142 481 156 Q451 174 421 159 Q387 143 356 155 Q320 174 280 148 Q244 125 209 150 Q180 164 146 149 Q129 141 108 125 Q85 146 112 167 Q141 191 174 182 Q209 165 235 188 T283 213 Q307 200 333 215 T373 224");
  }
  for(const [i,f] of rainbowFlowers.entries()) {
    const [x,y,s]=tiles[f.scene], place=scenes[f.scene];
    flower(c,x+f.x*width/place.width*s,y+f.y*height/place.height*s,i+1,f.color);
  }
  const [mx,my,ms]=tiles.meadow;
  const tx=mx+(14+(campTapeSpot.x-43)*.91)*ms, ty=my+(14+(campTapeSpot.y-91)*.69)*ms;
  // Cross the grass just below the cassette, so the actual tape stays visible.
  c.save();c.translate(tx,ty+11);c.rotate(-.12);
  path(c,"M-10 -7 Q-2 -2 9 8 M9 -8 Q2 -2 -10 8","","#bb514d",3.6);
  path(c,"M-11 -8 L9 6 M8 -8 L-9 8","","#db7363",1.2);c.restore();
  if(compact){
    note(c,9,16,"周年花园",16,-.05);note(c,188,23,"勇气花园",15,.04);note(c,8,151,"周年小镇",16,-.04);
    note(c,172,184,"星星花海",15,.03);note(c,198,288,"宝藏是录像带！",15,-.06,true);
    star(c,303,157,.9);paw(c,146,224,.7,.3);paw(c,154,213,.65,.55);
  }else{
    note(c,34,37,"周年花园",21,-.08);note(c,310,15,"勇气花园",20,.035);note(c,566,33,"周年小镇",21,-.04);
    note(c,233,171,"星星花海",20,-.09);note(c,432,239,"宝藏是录像带！",22,-.05,true);
    path(c,"M432 246 q-20 8 -46 -3 m7 -2 -7 2 4 5","","#ac5d54",1.5);
    note(c,40,220,"跟着我的爪印走～",16,-.08);paw(c,172,219,.8,-.05);paw(c,185,209,.76,.37);
    star(c,498,37,1.6);star(c,745,193,1.0);star(c,713,208,.75);
  }
  // A dry crayon skips the tiny fibres of the sheet. The same grain stays put when reopened.
  c.save();c.globalCompositeOperation="destination-out";
  let seed=4315;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<w*h*.11;i++) {
    const x=random()*w, y=random()*h, length=.2+random()*1.05;
    c.fillStyle=i%3?"#0003":"#0006";c.fillRect(x,y,length,.3+random()*.5);
  }
  c.restore();
}
