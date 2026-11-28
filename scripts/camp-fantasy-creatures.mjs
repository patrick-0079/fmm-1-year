// Inked in an 80 × 64 cell. The fawn's ground mark is (40,54). The whale
// swims around (40,36). A group can change its position; none of the drawings
// are scaled, rotated or reflected to make a new pose.
const path = (d,fill,stroke="none",width=1) =>
  `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const line=(d,color,width=1)=>path(d,"none",color,width);
const dot=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const oval=(x,y,rx,ry,fill)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const place=(x,y,drawing)=>`<g transform="translate(${x} ${y})">${drawing}</g>`;
function star(x,y,r,fill) {
  const c=r*.27;
  return path(`M${x} ${y-r} Q${x+c} ${y-c} ${x+r} ${y} Q${x+c} ${y+c} ${x} ${y+r} Q${x-c} ${y+c} ${x-r} ${y} Q${x-c} ${y-c} ${x} ${y-r}Z`,fill);
}

const deerInk="#684642", throat="#ffe4ad";
const fawnPalette='<defs><linearGradient id="fawnCoat" x2=".3" y2="1"><stop stop-color="#dc9665"/><stop offset=".56" stop-color="#d49869"/><stop offset="1" stop-color="#b67857"/></linearGradient><linearGradient id="fawnFace" x2=".2" y2="1"><stop stop-color="#e4a273"/><stop offset="1" stop-color="#e6b783"/></linearGradient></defs>';

// Radial and cannon bones have separate bends. The pointed tip of each
// dark hoof meets its own sole rather than the end of a round stroke.
function fawnLeg(points,far) {
  const [[hipX,hipY],[kneeX,kneeY],[ankleX,ankleY],[toeX,toeY]]=points;
  const d=`M${hipX-1.9} ${hipY} Q${hipX-1.5} ${hipY+3.2} ${kneeX-1.15} ${kneeY}
    L${ankleX-.65} ${ankleY} ${toeX-.85} ${toeY-.5} Q${toeX-.9} ${toeY+.12} ${toeX+.55} ${toeY}
    L${ankleX+.95} ${ankleY+.2} ${kneeX+1.3} ${kneeY+.5} Q${hipX+3.1} ${hipY+3} ${hipX+2.05} ${hipY}Z`;
  return path(d,far?"#a7756a":"#e7b77c",far?"#795752":deerInk,.86)
    +path(`M${ankleX-.65} ${ankleY-.15} Q${ankleX} ${ankleY+.65} ${ankleX+.85} ${ankleY+.25} L${toeX+.55} ${toeY} Q${toeX-.25} ${toeY+.47} ${toeX-1.5} ${toeY+.14} L${toeX-.8} ${toeY-1}Z`,far?"#655053":"#58454a");
}
// In order: far fore, far hind, near hind, near fore. Airborne and kneeling
// cels have separately inked hocks and fetlocks, with the belly in front.
const fawnLegs={
  canter: [[[34,37],[33,43],[25,46],[22,47]],[[53,37],[59,44],[65,44],[66,46]],[[52,37],[51,44],[54,48],[52,50]],[[32,36],[28,41],[21,42],[18,44]]],
  landing:[[[35,37],[36,45],[33,50],[31,52]],[[54,36],[59,42],[65,46],[65,48]],[[52,37],[54,43],[58,50],[57,53]],[[32,36],[29,44],[24,51],[22,54]]],
  step:   [[[35,38],[36,45],[32,50],[30,52]],[[54,37],[53,44],[49,51],[48,53]],[[52,37],[55,44],[55,51],[54,54]],[[32,36],[32,43],[26,44],[24,47]]],
  stand:  [[[35,38],[36,45],[36,50],[35,53]],[[55,37],[57,43],[55,50],[54,53]],[[51,38],[53,45],[51,51],[50,54]],[[32,37],[31,44],[31,51],[30,54]]],
  lean:   [[[35,38],[36,45],[36,50],[35,53]],[[54,37],[56,43],[55,50],[54,53]],[[51,37],[54,44],[52,51],[51,54]],[[32,37],[29,44],[27,51],[26,54]]],
  graze:  [[[35,38],[34,45],[32,51],[31,53]],[[54,37],[56,42],[56,50],[56,53]],[[51,37],[53,44],[52,51],[51,54]],[[32,38],[29,44],[25,50],[24,54]]],
  pivot:  [[[35,38],[36,45],[38,49],[38,51]],[[53,36],[50,43],[46,49],[45,53]],[[50,37],[54,44],[52,51],[51,54]],[[32,37],[31,44],[34,50],[34,54]]],
  turn:   [[[46,38],[45,45],[48,49],[49,51]],[[28,37],[25,43],[23,50],[24,53]],[[31,37],[29,44],[31,50],[32,54]],[[48,36],[51,43],[57,44],[59,46]]],
  depart: [[[46,35],[48,42],[56,46],[59,47]],[[29,35],[24,40],[18,44],[18,46]],[[31,36],[31,43],[26,49],[26,51]],[[48,34],[54,39],[60,40],[63,43]]],
  salute: [[[35,39],[35,45],[33,50],[32,53]],[[54,36],[57,43],[56,50],[55,53]],[[51,37],[54,44],[52,51],[51,54]],[[32,38],[28,43],[31,48],[30,51]]],
  bow:    [[[35,40],[31,46],[34,50],[32,53]],[[54,36],[57,43],[56,50],[55,53]],[[51,37],[54,44],[52,51],[51,54]],[[32,39],[27,46],[31,51],[29,54]]],
  kneel:  [[[35,41],[31,47],[35,51],[32,53]],[[54,36],[57,43],[57,50],[56,53]],[[51,37],[54,44],[53,51],[52,54]],[[32,40],[27,48],[33,52],[30,54]]],
};

const fawnFaces={
  alert:{outline:"M7 -1 Q6 -6.4 .7 -6.7 Q-4.3 -7 -6.3 -3.7 L-8.9 -.2 -12.9 1.35 Q-14.3 2.6 -12.45 4.7 Q-9.4 6.5 -4.1 5.6 Q.55 8.15 4.55 6.7 Q7.6 4.65 7 -1Z",
    bib:"M-12.6 2.5 Q-9.6 2.25 -6.2 3.8 Q-3.1 5.55 -.8 4.7 Q-2.3 7.1 -4.6 6.05 Q-9.6 6.3 -12 4.4Z",
    nose:[-12.55,2.1],eye:[-2.9,-1.2],horn:[.5,-5.5],ear:[5,-4.5]},
  lift:{outline:"M7.1 1 Q7 -4.9 2.5 -6.05 Q-2 -7.3 -5.8 -4.7 L-8.9 -2.6 -13.1 -2.15 Q-15.3 -1.15 -13.5 1.4 Q-10.7 3.9 -5.9 4.0 Q-2 8.0 2.7 7.15 Q6.8 6.25 7.1 1Z",
    bib:"M-13.35 -.9 Q-9.4 -.55 -6.5 2.2 Q-3.3 4.6 .3 4.75 Q-2 6.8 -5.9 4.4 Q-11.2 3.8 -13.5 .85Z",
    nose:[-13.2,-1.3],eye:[-2.7,-2],horn:[2,-5.1],ear:[5,-4]},
  lower:{outline:"M6.7 -3.3 Q3.7 -7.3 -1.3 -6.35 Q-6.2 -5.4 -6.8 -.35 L-9.05 4.1 -12 6.3 Q-12.8 8.5 -10 9.35 Q-6.3 9.65 -2.9 6.3 Q1.1 7.8 5.4 4.65 Q8.05 2.1 6.7 -3.3Z",
    bib:"M-11.6 7.35 Q-7.7 6.3 -6.3 5.2 Q-3.4 3.95 -.3 4.25 Q-3.35 7.15 -6 8.6 Q-10 10.2 -11.45 8.6Z",
    nose:[-11.4,6.85],eye:[-3,-.05],horn:[-.7,-5.1],ear:[4.1,-5.1]},
  sniff:{outline:"M4.2 -5.2 Q-.05 -7.5 -4.35 -4.85 Q-8 -2.2 -6.6 2.2 L-6.65 6.9 -8.45 10.9 Q-8.2 13.5 -5.45 13.15 Q-2.3 12.1 -1.15 7.8 Q3.45 7.7 6.5 3.15 Q8.55 -1.9 4.2 -5.2Z",
    bib:"M-8 11.4 Q-5.15 9.9 -4.2 7.25 Q-3.4 5.4 -.1 4.8 Q.4 7 -1.35 8.5 Q-3.4 14.25 -6.95 12.8Z",
    nose:[-7.65,11.05],eye:[-2.2,.5],horn:[-2.55,-4.8],ear:[2.1,-5.4]},
  back:{outline:"M-6.8 .15 Q-6.7 -5.3 -1.4 -6.55 Q3.4 -7.15 6.4 -3.7 L9.25 -1.2 12.6 -.3 Q14.4 .65 13.35 2.65 Q10.75 5.55 5.45 5 Q2.15 8.5 -2.9 7.15 Q-6.8 6 -6.8 .15Z",
    bib:"M13.1 .8 Q9.1 1.15 6.65 3.25 Q3.4 5.15 .6 4.95 Q2.4 6.85 5.5 5.4 Q10.95 5.25 13.15 2.3Z",
    nose:[12.85,.45],eye:[2.6,-1.5],horn:[-1.5,-5.7],ear:[-5,-4.5]},
};

function fawnAntlers(x,y,lookBack,mood) {
  const near=lookBack?"M0 1 Q1 -3.4 0 -6.8 L-2 -10 M.15 -5.8 L3 -7.9 3.4 -10.65 M-1.1 -8.4 L-4.1 -8.9"
    :"M0 1 Q-.55 -2.8 1.3 -6.4 L2.05 -10.75 M.8 -5.3 L-2.55 -7.3 -3.45 -10.25 M1.95 -8.8 L4.25 -9.85";
  const far=lookBack?"M-3.25 .9 Q-4.25 -3.35 -4.05 -5.6 L-6.9 -8 M-4.3 -4.65 L-2.95 -7.15":"M3.55 .8 Q4.45 -3.45 4.5 -5.5 L7.3 -7.95 M4.65 -4.6 L3.55 -7.4";
  const tips=lookBack?[[-2,-10],[3.4,-10.65],[-6.9,-8]]:[[2.05,-10.75],[-3.45,-10.25],[7.3,-7.95]];
  let art=line(far,"#566876",2.3)+line(far,"#87c4bb",1.05)+line(near,"#56526b",2.75)+line(near,"#84d8cd",1.45);
  const [a,b,c]=tips;
  for (const [tx,ty] of tips) art+=dot(tx,ty,.92,"#f9d68e");
  if(mood){
    const summit=[.1,-12.3];
    art+=line(`M${a.join(" ")} L${summit.join(" ")} ${b.join(" ")}${mood>1?" L"+c.join(" "):""}`,"#ffd593",.74);
    art+=star(...summit,mood>1?2.1:1.65,"#fff1bd")+star(...b,mood>1?1.85:1.25,"#fff0b2");
    if(mood>1) art+=star(...c,1.5,"#b9fff0")+dot(-4.5,-12.7,.55,"#ddd5ff");
  }
  return place(x,y,art);
}

function fawnHead(kind,ears,closed,stars) {
  const f=fawnFaces[kind], back=kind==="back";
  const near=back?"M2 1 Q-2 -5.5 -12 -5.7 Q-9.4 1.15 -2.1 3.35Z":ears==="perk"?
    "M-1.3 .5 Q1 -6 8 -10.4 Q10 -5.1 7 -1.3 Q5 1.6 1.4 2.1Z":
    ears==="low"?"M-1.2 .1 Q4.8 -4.4 12.2 -3.1 Q10.9 1.25 4.25 2.15 L.6 2.75Z":"M-1.25 .35 Q3.8 -5.2 12 -6.1 Q10.9 .35 4 2.0 L.5 2.9Z";
  const earInner=back?"M.2 .8 Q-4.9 -3.2 -9 -3.9 Q-6.9 -.65 -2 .95Z":
    ears==="perk"?"M1.6 .25 Q3.5 -4.2 7.45 -7.3 Q7.7 -2.85 4 .45Z":
    ears==="low"?"M1.75 .45 Q6.35 -1.7 9.85 -1.6 Q6.85 .9 3.6 1.15Z":"M1.65 .5 Q5.15 -2.8 9.4 -4 Q7.95 -.4 3.65 1.15Z";
  const farEar=back?"M0 1 Q-.2 -4.75 3.9 -8.4 Q7.05 -2.85 3.4 2.25Z":"M0 1 Q1.1 -3.5 -3.8 -8.55 Q-6.6 -4.9 -4.1 .15Z";
  const [ex,ey]=f.eye,[nx,ny]=f.nose;
  const eye=closed?line(`M${ex-2.15} ${ey-.25} Q${ex-.25} ${ey+2.3} ${ex+2.05} ${ey-.85}`,deerInk,1.1):
    oval(ex,ey,2.25,2.4,"#543b40")+oval(ex,ey+.55,1.54,1.37,"#e4a543")+dot(ex-.45,ey-.4,1.02,"#4c3640")+dot(ex-.75,ey-.8,.59,"#fff5d9");
  return place(f.ear[0]+(back?2:-2),f.ear[1]-.1,path(farEar,"#c28c6e",deerInk,.92))
    +path(f.outline,"url(#fawnFace)",deerInk,1.16)+path(f.bib,throat)
    +fawnAntlers(...f.horn,back,stars)
    +place(...f.ear,path(near,"#cb8d69",deerInk,1.0)+path(earInner,"#edb59f"))
    +line(`M${ex-2.1} ${ey-3.2} q1.65 -1.25 3.4 -.5`,"#eec38c",1.15)
    +eye+oval(nx,ny,1.5,1.0,"#63434b")+dot(nx-.4,ny-.3,.35,"#f5cfa0")
    +dot(ex+(back?-3:3),ey+2.8,.77,"#ffe7af")+dot(ex+(back?-4:4.3),ey+1.45,.53,"#fff1c6");
}

// Front neckline, back, chest ruff and markings have a distinct silhouette
// for the final turn: the lead foreleg is now on the right of the sheet.
function fawnBody(hx,hy,right,bodyY,tailUp) {
  const y=bodyY, back=right?24:57, fore=right?47:33;
  const belly=right?"M27 37 Q33 40 41 39.25 L47 37 Q48.7 41.65 44 42.8 Q38 41.2 34.9 42.2 Q29.2 43.3 27 37Z":
    "M57 36.5 Q53.4 40.5 45 39.6 L34.8 38.2 Q32 40.65 35 42.5 Q40.85 41.6 45.4 42.35 Q53.3 43.2 57 36.5Z";
  const tail=right?(tailUp?"M26.3 31 Q21 26.4 17 25.9 Q16.9 31.7 23.7 34.9Z":"M26.7 31 Q20.4 28.7 17.8 29.9 Q19.1 34.2 24.2 35.2Z"):
    (tailUp?"M55.7 31.25 Q60.4 26.65 63.2 25 Q65.2 31.5 58.2 34.4Z":"M55.8 31 Q60.5 28.6 64.3 29.25 Q63.15 33.8 58.45 34.55Z");
  const trunk=right?
    `M${hx-3.2} ${hy+1.8} Q48 ${25+y} 44 ${29.1+y} Q39 ${30.3+y} 33 ${28.8+y} Q23.8 ${26.8+y} 21.9 ${34.75+y} Q20.6 ${39+y} 27.2 ${41.4+y} Q34 ${42.7+y} 40 ${41.85+y} Q47.9 ${44.1+y} 50.1 ${38.3+y} Q51 ${32.8+y} ${hx+4.9} ${hy+4.9}Z`:
    `M${hx+3.1} ${hy+.15} Q32.5 ${25.5+y} 36.9 ${28.8+y} Q41.5 ${30.1+y} 47.9 ${28.6+y} Q56 ${26.7+y} 59.3 ${32.85+y} Q62.7 ${39.1+y} 56.1 ${41.25+y} Q49.1 ${42.9+y} 43 ${41.85+y} Q34 ${44.25+y} 30.25 ${38.65+y} Q28.4 ${35+y} ${hx-3} ${hy+4.9}Z`;
  const chest=right?`M${hx-2.4} ${hy+5.9} Q49.8 30 48.3 ${34+y} L50 ${32+y} Q49.3 ${37.2+y} 46.3 ${38.6+y} L46.7 ${36+y} Q44.7 ${37.25+y} 43.2 ${37.1+y} Q46.5 ${34+y} 46.7 ${29+y}Z`:
    `M${hx-3.35} ${hy+4.75} Q29.1 ${29.9+y} 31.5 ${33.45+y} L30 ${32.6+y} Q31.3 ${37.2+y} 34 ${38.45+y} L33.4 ${36.1+y} 36 ${37.1+y} Q33.2 ${33.3+y} 32.1 ${29.15+y} L${hx+1.6} ${hy+5.05}Z`;
  let art=place(0,y,path(tail,"#f6d79f",deerInk,1.02))+path(trunk,"url(#fawnCoat)",deerInk,1.25)+place(0,y,path(belly,"#e5b782"))+path(chest,throat);
  const spots=right?[[28.8,31.6,1.62],[33.3,31,1.12],[36.6,31.2,.9],[31.2,34.25,1.04],[35.2,33.85,.74]]:
    [[53.9,31.65,1.6],[49.8,31.0,1.2],[45.1,31.35,.9],[51.35,34.45,1.04],[47.25,33.95,.73]];
  for(const [x,spotY,r] of spots)art+=oval(x,spotY+y,r,r*.68,"#ffe4ad");
  return art+line(`M${back} ${37.75+y} q${right?1.6:-1.6} 2.1 ${right?4.1:-4.1} 2.15 M${fore} ${39.8+y} l.9 .65`,"#ae7557",.75);
}

// Gait, coat rise, skull drawing and position, ears, blink, antler lights.
const fawnFrames=[
  ["canter",-1.7,"lift",27,20.1,"perk",0,0],["landing",-.5,"alert",26.2,22.7,"back",0,0],
  ["step",-.6,"alert",26,21.7,"perk",0,0],["stand",0,"alert",26.3,22.3,"back",0,0],
  ["lean",.2,"lower",25,27.1,"back",0,0],["graze",.65,"sniff",23.1,37.15,"low",0,0],
  ["pivot",0,"back",36.8,23.2,"perk",0,0],["depart",-1.5,"back",51.5,20.2,"back",0,0],
  ["stand",0,"alert",26.5,22,"perk",0,0],["step",-.45,"lift",26.6,20.95,"back",0,0],
  ["salute",.35,"lower",25.5,25.85,"back",0,1],["bow",.8,"lower",23.9,30.4,"low",1,1],
  ["kneel",1.05,"lower",23.45,32.3,"low",1,2],["salute",.25,"lift",25.9,21.8,"perk",0,2],
  ["turn",-.5,"back",49.5,22.1,"perk",0,1],["depart",-1.85,"back",52.45,20.3,"back",0,0],
];
export const starFawnCels=fawnFrames.map(([gait,y,face,hx,hy,ears,closed,lights],i)=>{
  const legs=fawnLegs[gait],right=gait==="turn" || gait==="depart";
  let ground="";
  if ([0,1,2,7,15].includes(i)) {
    const x=right?24:49;
    ground=star(x,53.9,i===1?2.05:1.4,"#f7d8a1")+dot(x+(right?-5:5),54.8,.67,"#9ee0cf");
  }
  return fawnPalette+ground+fawnLeg(legs[0],true)+fawnLeg(legs[1],true)
    +fawnLeg(legs[2],false)+fawnLeg(legs[3],false)
    +fawnBody(hx,hy,right,y,i%3!==1)+place(hx,hy,fawnHead(face,ears,closed,lights));
});

const whaleInk="#4e5175";
const whalePalette='<defs><linearGradient id="whaleBack" x1=".15" y1=".1" x2=".7" y2="1"><stop stop-color="#c2dae9"/><stop offset=".36" stop-color="#95bdd9"/><stop offset="1" stop-color="#8596c2"/></linearGradient><linearGradient id="whaleSky" x1="0" y1="0" x2=".65" y2="1"><stop stop-color="#9da7d8"/><stop offset=".58" stop-color="#7469a7"/><stop offset="1" stop-color="#635f94"/></linearGradient><linearGradient id="whaleFin" x2=".45" y2="1"><stop stop-color="#9497ca"/><stop offset="1" stop-color="#6a6b9b"/></linearGradient><linearGradient id="flukeShade" gradientUnits="userSpaceOnUse" x1="55" x2="66" y1="30" y2="30"><stop stop-color="#8789bb" stop-opacity="0"/><stop offset="1" stop-color="#8789bb"/></linearGradient><radialGradient id="pearl"><stop stop-color="#fff8cc" stop-opacity=".7"/><stop offset="1" stop-color="#d0edfa" stop-opacity=".04"/></radialGradient></defs>';
const flukes={
  fan:["M53 30.2 Q58.3 30.2 61.7 26.5 Q63.2 22.1 68.1 20.8 L73.8 18.1 Q73.45 24.9 67.4 29.15 Q71.1 28.9 75.3 31.65 Q72.2 35.05 66.5 34.45 Q62.7 34.2 60.8 32.6 L54.1 36.75Z",
    "M60.8 31.5 Q63.9 28.6 67.5 25.8 M64.1 31.1 Q68 31.2 71.05 32.05"],
  high:["M53.1 30.4 Q59.4 28.55 60.3 23.9 Q59.7 20.3 62.2 16.6 L65.55 11.9 Q68.05 17.25 65.5 23.1 Q69.2 20.15 74.1 20.4 Q73.15 25.8 67.4 28.2 Q62.8 29.3 61.35 32.15 L55.25 35.3Z",
    "M60.95 27.35 Q63.4 24.05 64.2 19.15 M65 26.3 Q68.5 23.85 71 23.1"],
  low:["M53 30.7 Q59.3 32.2 62.3 33.7 Q66.1 30.3 74.65 30.8 Q71.1 36.45 65.9 37.3 Q70.05 37.95 73 43.9 Q65.95 43 62.85 39.6 Q60.85 37.1 59.1 36.1 L53.7 36.3Z",
    "M61.4 35.4 Q66.25 35.2 70.3 32.8 M64.8 38.3 Q67 40 69.2 41"],
  sweep:["M53 30.25 Q58.6 30.7 61.6 28.5 Q62.15 24.1 67.05 20 L69.6 16 Q71.4 21.4 67.65 27.45 Q72 25.45 75.15 26.25 Q73.45 31.5 67.05 32.65 L61.3 33.65 54.5 36.5Z",
    "M61.2 30.95 Q64.7 28.05 66.9 23.4 M64.8 30.8 L71.1 28.6"],
};
const fins={
  folded:["M36.85 36.35 Q39.8 36.6 42.3 39.3 Q44.15 41.3 47.9 42.85 Q45 44.95 41.6 43.6 Q37 41.35 35.45 38.1Z","M37.6 37.75 Q40 40.1 44.35 42.25"],
  dip:["M36.2 36.7 Q39.8 35.8 41.4 39.7 Q42.15 44.9 45.5 49.35 Q40.7 50.1 37.55 45.8 Q34.8 42.05 35.3 38.55Z","M37.25 38 Q37.6 43.65 42.4 47.2"],
  deep:["M35.9 36.5 Q38.65 36.5 39.7 40.1 Q39.45 45.1 40.9 50.55 Q37.2 50 34.8 46 Q32.8 41.2 35.1 37.6Z","M36.3 38.8 Q35 44 39.05 48.25"],
  reach:["M37.1 36.9 Q37.9 39.6 35.1 43.55 Q31.5 47.4 27.55 49 Q27.5 44.75 30.35 40.3 Q32.2 37.4 35.25 36.5Z","M34.9 38.55 Q31.3 41.65 29.15 46.35"],
  bank:["M36.6 37.2 Q39.6 34.8 44 33.9 Q47.3 32.55 49.6 30.65 Q50.6 34.7 45.9 38.3 Q40.8 41.25 37.45 39.6Z","M39.25 37.75 Q44.6 37.3 47.3 33.95"],
};
// The nose opens to release a pearl. Even on a full exhale the eye and
// blowhole follow the rounded forehead. The underside carries a night sky.
const whaleShapes={
  glide:["M12.35 35 Q11.55 29.5 16.95 25.45 Q22.1 21.35 30.3 21.6 Q39.8 21.55 47.2 26.05 Q52.3 29.3 57.35 29.25 |Q44.7 46.4 33.3 47 Q22.6 47.55 16 42.65 Q12.45 40.1 12.35 35Z",
    "M13.4 36.5 Q17.9 38.95 23.7 37.2 Q29.4 35.2 35.3 37.5 Q42.55 39.65 48.2 36.5 Q54.3 33.2 57.5 32.35 Q54.1 34.25 51 38.4 Q43.6 46 33.05 46.25 Q22.5 46.9 16.7 42 Q14.1 40.1 13.4 36.5Z", [23,32.3],[13.25,36.3]],
  rise:["M11.8 33.45 Q10.95 27.3 17.25 23.55 Q23.45 19.8 31.3 20.95 Q41.6 21.55 47.85 26.3 Q52.75 29.8 57.7 29.4 |Q43.2 45.9 32.5 46 Q21 45.9 15.15 40.3 Q12.4 37.75 11.8 33.45Z",
    "M12.85 34.95 Q17.3 37.9 23.05 36.1 Q29.6 34.55 35 37 Q41.65 40 48.3 36.1 Q52.1 34.15 57.2 32.45 Q53.3 35.1 50.8 38.2 Q42.65 45.3 32.55 45.35 Q19.7 45.35 14.8 39.2 Q13.2 37.45 12.85 34.95Z",[22.55,31],[12.5,34.6]],
  drift:["M12.7 36.25 Q12.1 30.45 17.25 26.35 Q23.55 21.8 31.3 22.3 Q40.15 22.3 47.35 26.5 Q53.4 29.55 57.7 29.45 |Q43.5 46.85 32.8 47.55 Q22.5 47.95 16.1 43.3 Q13.3 40.85 12.7 36.25Z",
    "M13.6 37.45 Q17.55 39.55 23.5 37.9 Q29.65 35.85 35.2 38.1 Q41.7 40.25 48.15 36.9 Q52.85 34.3 57.2 32.6 Q53.7 35.25 51.3 38.85 Q43.1 46.4 32.85 46.9 Q22.9 47.25 16.8 42.8 Q14.35 40.6 13.6 37.45Z",[23.3,33.15],[13.5,37.15]],
  puff:["M11.6 33.8 Q11.1 28.55 16.75 24.2 Q23.15 19.5 31.5 21.25 Q40.65 22.45 47.35 26.75 Q53.3 30.1 57.75 29.45 |Q42.5 46.95 32.5 46.6 Q21.4 46.7 15.6 41.4 Q13.25 39.55 13.1 37.05 Q11.2 37.25 10.85 36.2 Q10.3 34.85 11.6 33.8Z",
    "M13.2 37.3 Q18.05 38.3 23.35 36.75 Q29.6 35.1 35.05 37.8 Q41.4 40.35 48.4 36.65 Q53 33.95 57.6 32.6 Q53 35.8 51.2 38.6 Q43.15 46.15 32.4 45.95 Q21.45 46.05 16.1 40.95 Q13.7 39 13.2 37.3Z",[22.6,31.8],[11.9,35.45]],
};

function whaleCloud(crest) {
  const shape=crest==="tower"?
    "M22.8 23.85 Q21.3 21.2 23.8 19.7 Q24.25 16.05 27.4 16.65 Q29.05 12.8 32.7 14.15 Q35.4 15.1 35.05 17.7 Q39 16.8 40 20.1 Q43.9 19.8 45.1 23.6 L44.5 25.3 Q39.55 23.1 35 22.8 Q29.55 23.5 26.4 22.6Z":
    crest==="flat"?"M23.3 24.35 Q21.95 21.9 24.55 20.9 Q25.1 18.65 28.4 19.15 Q30 16.85 32.7 17.65 Q35.1 17.9 35.2 20 Q38.25 19.15 40 21 Q43 20.7 44.5 24.85 Q37.45 22.4 33.75 23.2 Q27.5 24.5 25.5 22.95Z":
    "M22.5 24 Q21.15 20.8 24.55 20 Q25.05 17.2 28.3 17.75 Q29.95 14.9 33.05 15.95 Q35.6 16.35 35.25 18.8 Q38.9 17.95 40.25 20.95 Q43.4 20.65 45 24.65 Q39.5 22.85 34.6 22.8 Q28.85 24.3 25.45 22.6Z";
  return path(shape,"#e5e8ed","#727d9d",.88)
    +line(crest==="flat"?"M26.4 20.8 q1.45 -1.25 2.6 -.4 M32 19 q1.75 .25 1.25 1.7":"M26.2 20.2 q1 -1.6 2.65 -1.15 M32.05 18.15 q1.55 -.1 1.4 1.8","#fff4e8",1.13);
}

function whaleFace(eye,nose,lid,blowing) {
  const [x,y]=eye,[nx,ny]=nose;
  let art=lid==="shut"?line(`M${x-2.15} ${y+.2} q1.65 2.4 4.05 -.1`,"#454559",1.15):
    oval(x,y,2.25,lid==="soft"?1.45:2.05,"#454459")+dot(x+.3,y+.55,.85,"#bb997c")
      +dot(x-.55,y-.45,.62,"#fff0cf");
  art+=oval(x-2.4,y+3.05,1.6,.62,"#d9b2c2");
  if (blowing) return art+oval(nx,ny,1.55,.8,"#715b7e")+line(`M${nx+1.15} ${ny+1.05} q1.2 .55 2.5 .15`,"#d6bcd6",.66);
  return art+line(`M${nx} ${ny} q2.15 1.55 4.95 1.0`,"#68718d",.83);
}
function starPearl(x,y,r,lit) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#pearl)" stroke="${lit?"#f6daa2":"#b6dbe5"}" stroke-width=".79"/>`
    +line(`M${x-r*.67} ${y-r*.12} q.3 ${-r*.55} ${r*.74} ${-r*.57}`,"#fff8df",.76)
    +(lit?star(x+.12,y+.25,r*.57,"#fff1ac"):"");
}
const whaleFrames=[
  ["glide","sweep","dip","low","open",0,0],["rise","high","deep","flat","open",0,-.4],
  ["glide","fan","folded","low","soft",0,-.25],["drift","low","dip","low","open",0,0],
  ["glide","sweep","deep","flat","open",0,0],["puff","high","reach","tower","shut",1,-.25],
  ["rise","fan","bank","low","soft",2,-.65],["rise","sweep","folded","flat","open",0,-1.35],
  ["drift","low","dip","flat","open",0,.3],["glide","sweep","deep","low","soft",0,.25],
  ["rise","high","reach","tower","open",0,-.55],["puff","sweep","reach","tower","soft",3,-.65],
  ["puff","fan","folded","tower","shut",4,-.8],["puff","low","deep","low","soft",5,-.45],
  ["rise","fan","bank","low","open",0,-1.0],["rise","high","folded","flat","open",0,-1.5],
];
export const cloudWhaleCels=whaleFrames.map(([body,tail,fin,crest,lid,bubble,y])=>{
  const [back,belly,eye,nose]=whaleShapes[body], [fluke,flukeLine]=flukes[tail], [flipper,ridge]=fins[fin];
  // The flukes share one outer contour with the back, even through the
  // upward flick. A separate outline across the narrow tail looks jointed.
  const [upper,lower]=back.split("|");
  const silhouette=upper+fluke.slice(fluke.indexOf("Q"),-1)+lower;
  let art=path(fin==="reach"?"M35.8 36 Q30.5 36.8 25.5 41.35 Q27.8 42.35 31.7 40.4 L37.7 37.5Z":
    "M38.3 37.3 Q45 38.95 49.9 39.65 Q47.8 43.55 40.2 41.75Z","#7d7ba8",whaleInk,.95)
    +path(silhouette,"url(#whaleBack)",whaleInk,1.34)+path(fluke,"url(#flukeShade)")
    +line(flukeLine,"#bad2e2",1.02)+path(belly,"url(#whaleSky)")
    +whaleCloud(crest)+line("M39.85 27.4 q2.9 -2.35 5.15 .25 q1.2 1.3 .2 2.15 q-1.1 .75 -1.85 -.35 M46.7 28.65 q3.2 2.2 6 1.65","#c4dbe6",1.1)
    +line("M17.8 29.25 q1.5 -2.25 3.65 -2.85 M23 25.7 l1.55 -.25","#e1eaf0",1.35);
  const sy=body==="drift"?.45:body==="rise"?-.55:0;
  art+=place(0,sy,star(24.6,40.75,1.7,"#fae7b5")+star(45.4,40.05,1.12,"#e3dbff")
    +dot(20.1,40,.76,"#c5d6fb")+dot(29.05,42.6,.8,"#e9d5f2")+dot(32.05,40.65,.62,"#fff1c3")
    +line("M24.7 43.3 Q27.5 45.05 30.25 44.55","#ad9acb",.79));
  art+=path(flipper,"url(#whaleFin)",whaleInk,1.03)+line(ridge,"#b9cde3",.85)+whaleFace(eye,nose,lid,body==="puff");
  if(bubble===1)art+=starPearl(8.6,32.8,2.15,false);
  if(bubble===2)art+=starPearl(6.4,28.65,2.15,false)+starPearl(10.15,31.7,1.1,false);
  if(bubble===3)art+=starPearl(9.55,34.2,1.55,true);
  if(bubble===4)art+=starPearl(8,31.55,2.9,true)+dot(5.35,34.1,.68,"#fff1c2");
  if(bubble===5)art+=starPearl(6.4,28.9,2.35,true)+dot(9.6,31.35,.67,"#f1daae");
  return whalePalette+place(0,y,art);
});

// The pin of this separate light drawing is (40,32). The growing line
// starts ten pixels below it at (40,42), on the little star on the antlers.
// The last two drawings shed their connecting threads as the fawn turns.
const starPalette='<defs><radialGradient id="antlerHoney"><stop stop-color="#ffedb4" stop-opacity=".72"/><stop offset=".45" stop-color="#f6d487" stop-opacity=".33"/><stop offset="1" stop-color="#eeb46a" stop-opacity="0"/></radialGradient><radialGradient id="antlerMint"><stop stop-color="#e2ffec" stop-opacity=".7"/><stop offset=".45" stop-color="#b9fae6" stop-opacity=".32"/><stop offset="1" stop-color="#86cdbc" stop-opacity="0"/></radialGradient></defs>';
function antlerStar(x,y,r,mint=false) {
  const core=mint?"#e0fff2":"#fff3bf", edge=mint?"#91e5d9":"#efc581";
  let ink=dot(x,y,r*2.15,mint?"url(#antlerMint)":"url(#antlerHoney)");
  if(r<1.45)return ink+dot(x,y,r*.7,core);
  ink+=star(x,y,r*1.17,edge)+star(x,y,r*.81,core);
  if(r>=2.6) ink+=line(`M${x-r*.66} ${y-r*.57} l${r*.22} ${r*.19} M${x+r*.51} ${y+r*.54} l${r*.21} ${r*.19}`,core,.63);
  return ink;
}
function antlerThread(d,mint=false) {
  return '<g opacity=".26">'+line(d,mint?"#8be5dc":"#ecc58e",2.8)+'</g>'
    +line(d,mint?"#b9ede2":"#f7db9f",.96);
}
function antlerConstellation(frame) {
  if(frame<10)return "";
  let ink="";
  if(frame===10) {
    ink=antlerStar(39.8,41.25,1.65)+antlerStar(44.2,36.65,1.23,true);
  } else if(frame===11) {
    ink=antlerThread("M40 42 Q37 38.55 34.6 35.3 Q30.25 34.95 26.8 32.2")
      +antlerThread("M40 42 Q43.65 38.4 46.1 33.15",true)
      +antlerStar(34.6,35.3,1.7)+antlerStar(26.8,32.2,2.4)
      +antlerStar(46.1,33.15,1.7,true)+antlerStar(48.6,27.2,.98,true);
  } else if(frame===12 || frame===13) {
    const peak=frame===12;
    const lime=peak?"M40 42 Q44.4 37.1 46.8 32.3 Q50.25 31.7 57.35 26.8 M46.8 32.3 Q48.9 28.7 51.55 20.2":
      "M40 42 Q44.2 37.35 46.8 32 Q51.55 30.8 58.05 26 M46.8 32 Q48.7 26.75 51.9 19.5";
    const gold=peak?"M40 42 Q37.5 37.35 33.85 34.15 Q28.1 34.4 22.4 29.55 M33.85 34.15 Q31.25 29.85 30.1 22.35":
      "M40 42 Q37.15 37.1 33.6 33.7 Q27.3 33.5 21.8 29.15 M33.6 33.7 Q31.6 29 29.9 21.9";
    ink=antlerThread(gold)+antlerThread(lime,true)+dot(40,42,.76,"#fff3c9");
    ink+=peak?antlerStar(22.4,29.55,3.05)+antlerStar(30.1,22.35,2.0)+antlerStar(33.85,34.15,1.5)
      +antlerStar(46.8,32.3,1.65,true)+antlerStar(51.55,20.2,3.2)+antlerStar(57.35,26.8,2.0,true):
      antlerStar(21.8,29.15,2.8)+antlerStar(29.9,21.9,2.25)+antlerStar(33.6,33.7,1.45)
      +antlerStar(46.8,32,1.55,true)+antlerStar(51.9,19.5,3.5)+antlerStar(58.05,26,2.3,true);
  } else if(frame===14) {
    ink='<g opacity=".72">'+antlerThread("M22.1 29.45 q2.6 1.55 4.45 2.05 M32.3 29.75 l.82 2.2")+antlerThread("M47.85 30.25 q2 -2.9 2.45 -4.6",true)+'</g>'
      +antlerStar(21.25,28.2,2.2)+antlerStar(29.1,21.1,1.12)+antlerStar(51.8,18.55,2.65)
      +antlerStar(58.7,25.1,1.44,true)+dot(43.2,36.9,.69,"#b8e7da")+dot(33.1,34,.74,"#f0d09a");
  } else {
    ink=antlerStar(19.6,27.4,1.15)+antlerStar(52.3,17.6,1.62)+antlerStar(59.8,24.4,.98,true)
      +dot(27.6,20,.61,"#dec6a2")+dot(47.2,27.6,.52,"#c2e1d8");
  }
  return starPalette+ink;
}
export const antlerStarsCels=Array.from({length:16},(_,frame)=>antlerConstellation(frame));
