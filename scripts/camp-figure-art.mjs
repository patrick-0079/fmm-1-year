import { campEncounterLandmark } from "../src/camp-encounter-contacts.ts";

// Coordinates measured on each of the nine seated originals. Each pupil has
// its own centre. In particular the two irises are not mirror images.
const features = [
  {eyes: [51,81,95], pupils: [[59.95,100.45],[85.15,100.45]]},
  {eyes: [51,82,96], pupils: [[60.15,101.8],[86.7,101.85]]},
  {eyes: [50,81,97], pupils: [[59.2,103.65],[85.7,103.5]]},
  {eyes: [51,82,95], pupils: [[60.1,101.65],[86.4,101.55]]},
  {eyes: [50,81,96], pupils: [[59.4,101.8],[85.7,101.8]]},
  {eyes: [52,83,96], pupils: [[61.25,101.8],[87.35,101.8]]},
  {eyes: [50,80,93], pupils: [[59.0,99.4],[84.7,99.4]]},
  {eyes: [51,82,96], pupils: [[60.4,102.4],[86.35,102.3]]},
  {eyes: [52,82,95], pupils: [[61.1,100.5],[86.35,100.45]]},
];
const gaze = {
  glanceLeft: [-.6,.2],    lookLeft: [-1.15,.4],
  glanceUp: [-.28,-.5],    lookUp: [-.58,-1],
  glanceRight: [.55,-.12], lookRight: [1.2,-.25],
  glanceDown: [-.25,.5],   lookDown: [-.5,.95],
};
const offset = (x,y) => 4*(y*144+x);
const clamp = value => Math.min(255,Math.max(0,Math.round(value)));

// Each gaze cel repaints only the little dark pupil inside the original iris.
// Lift its ink at the old centre and lay it down at the new one. Both pigment
// and iris undertone come from this eye on this garment. The iris rim, white,
// highlights, upper and lower lashes, hair, smile and jaw stay on the master.
function paintGaze(pixels, source, row, direction) {
  const [dx,dy] = gaze[direction];
  for (const [cx,cy] of features[row].pupils) {
    const x0 = Math.round(cx), y0 = Math.round(cy);
    const core = offset(x0,y0), left = offset(x0-2,y0), right = offset(x0+2,y0);
    const pigment = [0,1,2].map(k => Math.max(0,(source[left+k]+source[right+k])/2-source[core+k]));
    const dot = (x,y) => Math.exp(-1.45*((x/.99)**2+(y/1.15)**2));
    for (let y=y0-2;y<=y0+2;y++) for (let x=x0-2;x<=x0+2;x++) {
      const coverage = dot(x-cx,y-cy)-dot(x-cx-dx,y-cy-dy);
      const i = offset(x,y);
      for (let k=0;k<3;k++) pixels[i+k]=clamp(source[i+k]+coverage*pigment[k]);
    }
  }
}

const n = value => Math.round(value*100)/100;
const p = point => n(point[0])+" "+n(point[1]);
const path = (d,fill,stroke="none",width=1) =>
  '<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+n(width)+'" stroke-linejoin="round" stroke-linecap="round"/>';
const line = (d,color,width=1) => path(d,"none",color,width);
const ellipse = (x,y,rx,ry,color) => '<ellipse cx="'+n(x)+'" cy="'+n(y)+'" rx="'+n(rx)+'" ry="'+n(ry)+'" fill="'+color+'"/>';

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

function lip(row) {
  const {x,y} = campEncounterLandmark("marshmallow",row);
  return [72+4*x,184+4*y-.7];
}

// Only the bite requires painting the skin behind the original open eyes.
// Find the upper lash column by column to follow the fringe, then sample the
// wearer's own skin on the inner cheek to feather the small cleared aperture.
function prepareBite(pixels, source, row) {
  const [left,right,top] = features[row].eyes;
  for (const lx of [left,right]) {
    const leftEye=lx===left;
    const near=offset(leftEye?65:79,top+12), far=offset(leftEye?63:81,top+13);
    const skin=[0,1,2].map(k=>.6*source[near+k]+.4*source[far+k]);
    for (let x=lx-2;x<=lx+16;x++) {
      let first=Infinity, last=-1;
      for (let y=top-1;y<=top+10;y++) {
        const i=offset(x,y), r=source[i], g=source[i+1], b=source[i+2];
        const ink=(r<148 && g<130 && b<143) || (r<g-10 && b<g+8) || (r>g+64 && g<103);
        // On some garments the white at the inner corner extends one pixel
        // past the end of the lash. That white also disappears on closure.
        const inner=leftEye?x>=lx+13:x<=lx+1;
        const white=inner && y>=top+3 && y<=top+9 && g>skin[1]+6 && b>skin[2]+8;
        if ((ink && x>=lx-1 && x<=lx+15) || white) {
          first=Math.min(first,y);
          last=y;
        }
      }
      if (last<first) continue;
      const t=Math.min(1,Math.abs((x-lx-6.8)/8.15));
      const bottom=Math.max(last+1,Math.round(top+5+7.4*Math.sqrt(1-t*t)));
      const cheek=offset(x,Math.min(top+14,bottom+2));
      const hasCheek=source[cheek]>227 && source[cheek+1]>176 && source[cheek+1]>source[cheek+2]+2;
      for (let y=first-1;y<=bottom+1;y++) {
        const i=offset(x,y), feather=y===first-1?.55:y===bottom+1?.38:1;
        const cheekMix=hasCheek?.65*Math.min(1,Math.max(0,(y-top-3)/9)):0;
        for (let k=0;k<3;k++) {
          const tone=skin[k]*(1-cheekMix)+source[cheek+k]*cheekMix;
          pixels[i+k]=clamp(source[i+k]*(1-feather)+tone*feather);
        }
      }
    }
  }
  const [cx,cy]=lip(row);
  for (let y=Math.floor(cy-2);y<cy+3.65;y++) for (let x=cx-5;x<=cx+5;x++) {
    const radius=((x-cx)/5.8)**2+((y-cy-.6)/3.1)**2;
    if (radius>=1) continue;
    const mix=Math.min(1,(1-radius)*3);
    const i=offset(x,y), a=offset(cx-6,y), b=offset(cx+6,y);
    for (let k=0;k<3;k++) pixels[i+k]=clamp(source[i+k]*(1-mix)+(source[a+k]+source[b+k])*.5*mix);
  }
}

export function expressionDrawing(source,row,drawing) {
  const pixels=Buffer.from(source);
  if (drawing in gaze) {
    paintGaze(pixels,source,row,drawing);
    return {pixels};
  }
  prepareBite(pixels,source,row);
  const [left,right,top]=features[row].eyes;
  const closing=drawing==="closing";
  const [mx,my]=lip(row);
  const bite=drawing==="taste"?.6:0;
  const strokes=tastingCheeks(left,right,top,closing?11:12)
    +tastingEye(0,left,top,closing)+tastingEye(1,right,top+.65,closing)
    +line("M"+p([mx-3.3,my-.7])+"q.55 1.35 1.35 1.15 q1.25 .95 2.6 .75 q1.85 .35 3.6 "+n(-1.95+bite),"#935950",1.05)
    +line("M"+p([mx-2.8,my-.8])+"q-.25 1.25 .65 2.1","#a56c5f",.7);
  return {pixels,strokes};
}
