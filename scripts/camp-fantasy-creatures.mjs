// Cloud whale and antler starlight cels, inked in an 80 × 64 cell.
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
