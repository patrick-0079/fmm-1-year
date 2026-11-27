import { campEncounterMouth } from "../src/camp-encounter-contacts.ts";

// Artist coordinates are the seated outfit master's 144 × 184 cell. The
// pelvis, shoes, collar and crown stay on the existing wardrobe registration.
// The drawn bend, wrist, palm, eyelids and fingertip change from cel to cel.
const designs = [
  {name:"base", sleeve:"#d5bce0", shade:"#b69bc5", cuff:"#fff0db", shell:"#cbb2d5", knee:"#f9d9c7", type:"detached"},
  {name:"roseDress", sleeve:"#fff0dd", shade:"#debfb0", cuff:"#f7dfbd", shell:"#be577a", knee:"#fadbc7", type:"puff"},
  {name:"mintCape", sleeve:"#fbf0dd", shade:"#d5c7bb", cuff:"#f1e7cb", shell:"#91ada1", knee:"#496c6e", type:"cape"},
  {name:"cloudPajamas", sleeve:"#b4addc", shade:"#938dbd", cuff:"#f8edde", shell:"#b1abdb", knee:"#b3addd", type:"piping"},
  {name:"apricotNightgown", sleeve:"#f9c4a6", shade:"#dfa386", cuff:"#fff0d9", shell:"#f5bd9c", knee:"#fadac8", type:"puff"},
  {name:"sailorSet", sleeve:"#fff2e0", shade:"#e0cbba", cuff:"#716478", shell:"#fff0dc", knee:"#fbddc8", type:"short"},
  {name:"honeyOveralls", sleeve:"#aaa989", shade:"#888a73", cuff:"#babb99", shell:"#d49a58", knee:"#dfa054", type:"short"},
  {name:"witchDress", sleeve:"#f3e1de", shade:"#cfb1be", cuff:"#faece3", shell:"#554157", knee:"#fad9c6", type:"mantle"},
  {name:"mikoOutfit", sleeve:"#fff4f0", shade:"#ddcdd0", cuff:"#ba3338", shell:"#fff1ec", knee:"#ce2922", type:"bell"},
];
export { designs };

const n = value => Math.round(value*100)/100;
const p = point => n(point[0])+" "+n(point[1]);
const path = (d,fill,stroke="none",width=1) =>
  '<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+n(width)+'" stroke-linejoin="round" stroke-linecap="round"/>';
const line = (d,color,width=1) => path(d,"none",color,width);
const ellipse = (x,y,rx,ry,color) => '<ellipse cx="'+n(x)+'" cy="'+n(y)+'" rx="'+n(rx)+'" ry="'+n(ry)+'" fill="'+color+'"/>';

const look = {
  bird: {
    x:[-.4,-.7,-1.0,-1.25,-1.3,-1.0,-.7,-1.0,-1.0,-1.2,-1.45,-1.65,-1.6,-1.5,-1.1,-.65],
    y:[.25,.5,.8,.9,.9,.8,.7,.7,.7,.55,.3,.12,0,.12,.4,.5],
    lid:[1,1,.97,1,.97,.87,.68,.97,.96,1,1,.96,.88,.98,.98,.92],
    mouth:[0,0,1,1,1,0,0,1,1,1,2,2,3,2,1,0],
  },
  butterfly: {
    x:[-1.45,-1.3,-1.16,-.95,-1.0,-1.15,-1.3,-.9,-.85,-.6,-.4,-.12,-.05,-.12,-.25,-.55],
    y:[-.5,-.85,-1,-1.15,-1.15,-.98,-.78,-1.05,-.75,-.28,.2,.65,.9,.65,.2,-.45],
    lid:[.93,1,1,1,.96,.88,.95,1,1,.98,1,.95,.9,.96,.98,.94],
    mouth:[0,1,1,2,1,0,0,1,1,1,2,2,3,2,1,0],
  },
  jelly: {
    x:[.4,.7,1.1,1.35,1.4,1.15,.85,1.1,1.05,1.35,1.55,1.65,1.7,1.55,1.15,.8],
    y:[-.25,-.4,-.6,-.75,-.7,-.5,-.3,-.6,-.6,-.7,-.9,-1,-1.05,-.85,-.55,-.35],
    lid:[.98,1,.98,1,.95,.83,.95,.99,1,1,1,.98,.96,.99,1,.98],
    mouth:[0,0,1,1,1,0,0,1,1,1,2,3,3,2,1,0],
  },
  marshmallow: {
    x:[-1,-1.15,-1.35,-1.4,-1.5,-1.15,-.85,-1.2,-1.45,-1.12,-.85,-.5,0,0,-.5,-.95],
    y:[.5,.55,.65,.7,.7,.5,.35,.55,.75,.65,.45,.3,.2,.15,.3,.5],
    lid:[1,.98,.96,.97,.95,.73,.42,.86,.97,.93,.78,.28,0,0,.5,.92],
    mouth:[0,0,1,1,1,0,0,1,1,1,1,2,4,4,1,0],
  },
};

// Left and right eyes have subtly different placements on the independently
// authored outfit masters. These are the outer corner x and upper lash y.
export const eyes = [
  [51,81,95], [51,82,96], [50,81,97], [51,82,95], [50,81,96],
  [52,83,96], [50,80,93], [51,82,96], [52,82,95],
];
export function mouthAt(row) {
  const {x,y}=campEncounterMouth(row);
  return [72+4*x,184+4*y];
}

// Traced from the approved marshmallow bite. The shorter screen-left crescent
// rises at its outer corner. The longer right lash slopes down into its flick.
// These are closed filled lashes, with a warm lid fold and hatching on the
// cheek. The 2D body keeps the seated master registration for worn hats.
function tastingEye(side,x,y,closing) {
  const at=(u,v)=>p([x+u,y+v+(closing?-.65:0)]);
  const lash=side ?
    "M"+at(-.15,5.1)+"Q"+at(2.7,1.2)+" "+at(6.75,1.45)+"Q"+at(9.45,1.4)+" "+at(12.75,3.85)+
      "Q"+at(14.05,4.85)+" "+at(15.65,4.2)+"Q"+at(14.5,6.4)+" "+at(13.35,6.95)+
      "Q"+at(12.5,7.2)+" "+at(11.8,6.45)+"Q"+at(6.05,3)+" "+at(-.05,6.1)+"Z" :
    "M"+at(-1,.1)+"Q"+at(-.35,2.55)+" "+at(1.15,3.55)+"Q"+at(3.75,1.15)+" "+at(6.6,1.35)+
      "Q"+at(10.6,1.3)+" "+at(13.6,5.15)+"L"+at(13.9,6.75)+"Q"+at(9.4,3.65)+" "+at(6.25,3.95)+
      "Q"+at(4.05,4.25)+" "+at(2.2,5.5)+"Q"+at(.55,5.55)+" "+at(-.9,3.3)+"Z";
  const fold=side?"M"+at(.7,2.3)+"Q"+at(3.2,.3)+" "+at(6.55,.45):
    "M"+at(8.35,-.5)+"Q"+at(10.8,.05)+" "+at(12.6,2.2);
  return line(fold,"#d49c90",.72)+path(lash,"#422f38");
}

function tastingCheeks(left,right,top,frame) {
  let svg='<defs><radialGradient id="peach"><stop stop-color="#ef9c90" stop-opacity=".64"/><stop offset="1" stop-color="#f2ad9e" stop-opacity="0"/></radialGradient></defs>';
  for(const [i,cx] of [left+3.4,right+10.1].entries()) {
    const cy=top+9.6+i*.75;
    svg+=ellipse(cx,cy,5.5,2.8,"url(#peach)");
    for(const [dx,dy] of [[-2.1,.45],[-.1,.75],[1.8,.6]]) {
      svg+=line("M"+p([cx+dx-.55,cy+dy])+"q.65 -.7 1.4 -1.45",
        frame===11?"#eab0a0":"#e89b8e",.57);
    }
  }
  return svg;
}

export function faceArt(row,event,frame) {
  const acting=look[event], sky=acting.y[frame], gaze=acting.x[frame], open=acting.lid[frame];
  const [left,right,top]=eyes[row];
  const tasting=event==="marshmallow" && frame>=11 && frame<=13;
  let svg=tasting?tastingCheeks(left,right,top,frame):"";
  for (let side=0;side<2;side++) {
    const x=side?right:left, width=14, near=side?1:-1;
    const z=(px,py)=>p([x+(side?width-px:px),top+py]);
    if(tasting) {
      svg+=tastingEye(side,x,top+(side?.65:0),frame===11);
      continue;
    }
    const lift=2.6*(1-open), floor=4.5+6.2*open;
    const outline="M"+z(.25,4.3+lift)+"Q"+z(5,-.7+lift)+" "+z(12.6,1.35+lift)
      +"Q"+z(14.7,4.7+lift)+" "+z(12.2,floor-2.2)+"Q"+z(8.6,floor+2.6)+" "+z(4,floor-.8)
      +"Q"+z(1.8,floor-2)+" "+z(.25,4.3+lift)+"Z";
    const id="eye"+side, cx=x+(side?6:8)+gaze, cy=top+5.75+sky;
    svg+='<defs><clipPath id="'+id+'"><path d="'+outline+'"/></clipPath></defs>';
    svg+=path(outline,"#fff1e9");
    svg+='<g clip-path="url(#'+id+')">';
    svg+=ellipse(cx,cy,5.25,6.45,side?"#733652":"#355956")
      +ellipse(cx,cy+.4,4.45,5.6,side?"#ac466f":"#548b79")
      +ellipse(cx,cy+1.8,3.65,3.8,side?"#d16a99":"#7fbc9d")
      +ellipse(cx,cy-.3,1.45,2.25,side?"#73324f":"#28564a")
      +ellipse(cx-1.5,cy-2.4,.92,1.0,"#fff9ef")
      +ellipse(cx+1.2,cy+3.0,.49,.63,side?"#f7beca":"#bae5cf")+'</g>';
    svg+=line("M"+z(-.35,4.05+lift)+"Q"+z(4.6,-1+lift)+" "+z(12.55,1.4+lift), "#54313c",2.35);
    svg+=line("M"+z(.4,4+lift)+"l"+n(near*.5)+" 1.35","#6c3b49",1.05);
  }
  const [mx,my]=mouthAt(row), smile=acting.mouth[frame];
  if(tasting){
    const bite=frame===13?.6:0;
    svg+=line("M"+p([mx-3.3,my-.7])+"q.55 1.35 1.35 1.15 q1.25 .95 2.6 .75 q1.85 .35 3.6 "+n(-1.95+bite),
      "#935950",1.05);
    svg+=line("M"+p([mx-2.8,my-.8])+"q-.25 1.25 .65 2.1","#a56c5f",.7);
  } else if(smile===2 || smile===3) {
    const w=smile===3?3.3:2.7, h=smile===3?2.75:2.2;
    svg+=path("M"+p([mx-w,my])+"Q"+p([mx,my+1.4])+" "+p([mx+w,my-.5])+"Q"+p([mx+w*.48,my+h+1.3])+" "+p([mx,my+h])+"Q"+p([mx-w*.75,my+h*.9])+" "+p([mx-w,my])+"Z","#a2515d","#80444b",.85);
    svg+=line("M"+p([mx-1,my+h-.85])+"q1.5 .5 2.5 -.55","#ec9c99",.8);
  } else {
    const w=smile===4?3.1:smile===1?3.2:2.5;
    svg+=line("M"+p([mx-w,my+.15])+"Q"+p([mx-.15,my+(smile===4?3.2:2.1)])+" "+p([mx+w,my-.5]),"#955e57",.93);
  }
  return svg;
}
