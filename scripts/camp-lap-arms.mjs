import { campEncounterContact } from "../src/camp-encounter-contacts.ts";
import { shortSleeveCap } from "./camp-bodices.mjs";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const outerInk="#603943", skin="#ffe2cb", shadow="#e7b3a3", handInk="#986559";
const num=v=>Math.round(v*100)/100;
const shape=(d,fill,stroke=outerInk,weight=1.28)=>'<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+
  '" stroke-width="'+weight+'" stroke-linecap="round" stroke-linejoin="round"/>';
const stroke=(d,color,width)=>shape(d,"none",color,width);

// In these lap-height gestures the lavender shoulder and its elastic stay
// planted. Recover each side's own ink, skin tones and curved ivory edge from
// the master. Only the gathered fabric and the forearm below it turn.
const garment = fileURLToPath(new URL("../src/assets/fufu-garments.webp",import.meta.url));
const shoulderEdge = "M62.3 117.8 Q56.7 119.5 53.9 124.5 Q52.1 127.5 48.2 131.4 L47.7 135.3 Q53.6 134 58.4 135.35 L62.3 134.8 Q63.9 132.2 64.2 130.6 L64.1 121Z";
const lavenderCaps = await Promise.all([false,true].map(async right => {
  const x=right?81:45, y=117, width=22, height=20;
  const transform=right?' transform="translate(146 0) scale(-1 1)"':"";
  const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}"><path${transform} d="${shoulderEdge}" fill="white"/></svg>`);
  const pixels=await sharp(garment).extract({left:12*144+x,top:y,width,height}).ensureAlpha()
    .composite([{input:mask,blend:"dest-in"}]).png().toBuffer();
  return `<image x="${x}" y="${y}" width="${width}" height="${height}" href="data:image/png;base64,${pixels.toString("base64")}"/>`;
}));

// The approved butterfly painting is a *lap* pose. The wrists turn out,
// palms face up and little fingers meet over the knees. Raising a vertical
// forearm toward her chin would obscure the face and reverse the hand.
const cupAperture=[0,0,0,0,0,0,0,0,0,.2,.66,.92,1,.94,.51,0];
const crook=[
  [51,145],[50,145],[49,145],[48,144],[47.5,144],[48.5,143],[50,143],[49,144],
  [48,144],[49,144.2],[50.5,144.5],[52.3,144.8],[53.5,144.6],[53.2,144.7],[51.4,145],[49,145],
];

function palm(at,spreading) {
  const finger=spreading;
  // The thumb is the short lobe at the far side, clearly separated from
  // the four curled fingertips on the lower rim of the upturned palm.
  const d="M"+at(-9.75,-1.35)+"Q"+at(-10.25,-3.0)+" "+at(-8.7,-4.05)+
    "Q"+at(-7.5,-5.1)+" "+at(-5.65,-4.4)+"Q"+at(-4.45,-4.2)+" "+at(-3.35,-3.65)+
    "Q"+at(.85,-4.5)+" "+at(4.0,-2.15)+"Q"+at(6.3+finger,-.55)+" "+at(7.2+finger,1.35)+
    "Q"+at(8.2+finger,3.45)+" "+at(6.65+finger,4.05)+"Q"+at(5.15,4.52)+" "+at(4.4,3.7)+
    "Q"+at(3.65,5.55)+" "+at(1.65,4.75)+"Q"+at(.5,6.05)+" "+at(-1.85,4.8)+
    "Q"+at(-4.05,5.1)+" "+at(-5.45,3.7)+"Q"+at(-7.05,3.9)+" "+at(-7.48,2.2)+
    "Q"+at(-7.75,.75)+" "+at(-6.5,-.45)+"Q"+at(-8.85,.75)+" "+at(-9.75,-1.35)+"Z";
  let svg=shape(d,skin,handInk,1.05);
  svg+=shape("M"+at(-6.35,1.4)+"Q"+at(-2.8,3.6)+" "+at(1.5,3.0)+"Q"+at(4.05,3.0)+" "+at(6.8,2.65)+
    "Q"+at(6.8,4.15)+" "+at(4.15,3.2)+"Q"+at(2.6,4.8)+" "+at(1.25,3.95)+"Q"+at(-.8,5.2)+" "+at(-2.25,4.05)+
    "Q"+at(-5,4.3)+" "+at(-6.35,1.4)+"Z","#efbaa1","none");
  svg+=stroke("M"+at(-8.9,-.9)+"Q"+at(-6.65,.35)+" "+at(-4.15,-.85)+"Q"+at(-2.65,-1.5)+" "+at(-1.3,-.25), "#be8d77",.84);
  svg+=stroke("M"+at(-4.6,.8)+"Q"+at(-1.8,2.25)+" "+at(.6,1.55),"#e6b299",.92);
  for(const [x,y] of [[-4.75,3.65],[-1.65,4.35],[1.65,4.15],[4.6,3.45]]){
    svg+=stroke("M"+at(x+.8,y)+"Q"+at(x-.52,y-1.4)+" "+at(x+.05,y-2.65),"#aa7969",.76);
  }
  return svg;
}

function grip(at,raised) {
  // At the fire the back of the hand lies almost horizontal. As her elbow
  // tucks in, the thumb crosses the near edge of the upright skewer.
  if(!raised){
    let svg=shape("M"+at(4.9,2.55)+"Q"+at(3.9,4.4)+" "+at(1.9,4.3)+"Q"+at(.95,5)+" "+at(-.6,4.25)+
      "Q"+at(-2.25,4.85)+" "+at(-3.35,3.7)+"Q"+at(-4.8,3.9)+" "+at(-5.7,2.45)+
      "Q"+at(-6.6,1.4)+" "+at(-5.9,-.4)+"Q"+at(-5.4,-2.0)+" "+at(-3.2,-3.4)+
      "Q"+at(-.95,-5.0)+" "+at(1.25,-4.05)+"Q"+at(4.9,-3.65)+" "+at(5.6,-.75)+"Q"+at(6.2,.85)+" "+at(4.9,2.55)+"Z",skin,handInk,1.08);
    svg+=stroke("M"+at(-5.2,.35)+"Q"+at(-4.45,-1.25)+" "+at(-3.55,-1.4)+" M"+at(-3.5,3.35)+"Q"+at(-3.55,1.05)+" "+at(-2.05,-.45)+
      " M"+at(-.65,3.9)+"Q"+at(-.95,1.9)+" "+at(.4,.55)+" M"+at(1.9,3.8)+"Q"+at(1.75,2.4)+" "+at(2.8,1.2),"#be8978",.74);
    return svg;
  }
  let svg=shape("M"+at(3.5,3.65)+"Q"+at(2.4,5.35)+" "+at(.45,6.0)+"Q"+at(-1.0,6.45)+" "+at(-2.4,5.6)+
    "Q"+at(-4.5,5.8)+" "+at(-5.3,4.25)+"Q"+at(-6.15,3.25)+" "+at(-5.7,1.65)+
    "Q"+at(-6.15,.15)+" "+at(-5.1,-1.5)+"Q"+at(-4.55,-4.05)+" "+at(-2.65,-5.45)+
    "Q"+at(-1.1,-6.65)+" "+at(.65,-6.05)+"Q"+at(2.5,-5.65)+" "+at(3.1,-4.25)+
    "Q"+at(4.95,-4.75)+" "+at(5.4,-3.3)+"Q"+at(6.05,-1.4)+" "+at(4.7,.85)+"Q"+at(4.3,2.65)+" "+at(3.5,3.65)+"Z",skin,handInk,1.08);
  svg+=stroke("M"+at(3.15,-4.15)+"Q"+at(3.8,-2.2)+" "+at(2.15,-.3)+"Q"+at(1.55,.65)+" "+at(2.2,1.55),
    "#be8978",.8);
  for(const [x,y] of [[-.95,-3.4],[-2.1,-1.0],[-2.8,1.3]])svg+=stroke("M"+at(x-1,y)+"Q"+at(x+.6,y+.15)+" "+at(x+1.45,y+1.45),"#bc8673",.72);
  return svg;
}

function limb(point,ax,ay,bx,by,aRadius,bRadius,belly){
  const length=Math.hypot(bx-ax,by-ay), tx=(bx-ax)/length, ty=(by-ay)/length;
  const nx=-ty, ny=tx;
  const edge=(t,r)=>point(ax+t*(bx-ax)+r*nx,ay+t*(by-ay)+r*ny);
  const half=(aRadius+bRadius)/2;
  return "M"+edge(0,aRadius)+"Q"+edge(.5,half+belly)+" "+edge(1,bRadius)+
    "C"+edge(1+bRadius*.72/length,bRadius)+" "+edge(1+bRadius*.72/length,-bRadius)+" "+edge(1,-bRadius)+
    "Q"+edge(.5,-half+belly)+" "+edge(0,-aRadius)+
    "C"+edge(-aRadius*.72/length,-aRadius)+" "+edge(-aRadius*.72/length,aRadius)+" "+edge(0,aRadius)+"Z";
}

export function lapArmArt(row,event,frame,side,design,overCap=false) {
  const cup=event==="butterfly", k=cupAperture[frame];
  const contact=campEncounterContact(event,frame), right=side==="right";
  const P=(x,y)=>num(right?146-x:x)+" "+num(y);
  const origin=[72+contact.x*4,184+contact.y*4];
  // The attached palms meet at their little fingertips, below the chin.
  const hx=cup?65.7-k*1.85:origin[0], hy=cup?origin[1]+3.15:origin[1];
  const thumb=(x,y)=>P(hx+x,hy+y);
  const e=cup?[49-k*1.0,145.5+k*.95]:crook[frame];
  const [ex,ey]=e;
  const bite=!cup && frame>=10 && frame<=14;
  const wristX=cup?hx-8.45:hx+(bite?2.85:4.25);
  const wristY=hy+(cup?.25:bite?4.1:1.8);
  const w=(x,y)=>P(wristX+x,wristY+y);
  const short=design.type==="short";
  let svg="";
  if(overCap && !short)return "";
  if(short) {
    // The cuff leaves the underside of the upper arm in shadow. When she
    // takes a bite the elbow points out, while her hand swings back in.
    // Both masses stay joined even as the forearm crosses the upper arm.
    // The elbow stays outside the knuckles as the skewer comes to her
    // mouth. Moving it across the grip leaves a sliver of dark sleeve
    // sticking out between the fist and the forearm.
    const elbowX=cup?47.7-k:bite?[47.8,47.7,48.1,48.3,47.8][frame-10]:Math.min(49.1,ex)-.6;
    const elbowY=cup?145.4+k*.5:ey-.25;
    const ax=row===6?52.45:53.5, ay=row===6?136.0:137.0;
    const upper=limb(P,ax,ay,elbowX,elbowY,4.1,3.48,-.32);
    const fore=limb(P,elbowX,elbowY,wristX,wristY,3.5,2.65,bite?.72:-.62);
    // After inking both masses the fills remove only their shared elbow
    // line. Double the border width here so a full native pixel remains
    // outside the union, matching the master arm against pink hair.
    svg+=shape(upper,skin,handInk,2.1)+shape(fore,skin,handInk,2.1)+
      shape(upper,skin,"none")+shape(fore,skin,"none");
    if(overCap){
      // The upper arm goes under its original short sleeve. The folded
      // forearm comes forward again only over the actual fabric. Its rim
      // is sloped differently on the sailor blouse and the olive T-shirt.
      svg="";
      if(bite) {
        const clip="cap-overlap-"+row+"-"+event+"-"+side+"-"+frame;
        svg='<defs><clipPath id="'+clip+'"><path d="'+shortSleeveCap(row)+'"/></clipPath></defs><g clip-path="url(#'+clip+')">'+
          shape(fore,skin,handInk,1.65)+"</g>";
      }
      return svg+(cup?palm(thumb,k):grip(thumb,bite));
    }
    const midx=(elbowX+wristX)/2,midy=(elbowY+wristY)/2;
    if(bite)svg+=stroke("M"+P(elbowX+2.65,elbowY+1.55)+"Q"+P(midx+2.0,midy+1.45)+" "+P(wristX+1.5,wristY+.9),
      "#e8b49f",.9);
    svg+=stroke("M"+P(elbowX-1.4,elbowY+2.8)+"Q"+P(elbowX,elbowY+3.35)+" "+P(elbowX+1.45,elbowY+2.95),shadow,.9);
  } else {
    const bell=design.type==="bell", detached=design.type==="detached";
    const puff=design.type==="puff", trim=design.type==="cape"||design.type==="mantle";
    const ax=detached?52.5:55.6, ay=detached?134.4:129;
    const elbowX=cup?47.75-k:Math.min(49.05,ex)-(bite?3.9:.75);
    const elbowY=cup?144.8+k*.85:ey-.2;
    const r=puff?5.85:trim?4.5:5.25;
    const upper=limb(P,ax,ay,elbowX,elbowY,r,r+.3,-.65);
    const fore=limb(P,elbowX,elbowY,wristX,wristY,r+.3,bell?4.1:3.55,bite?.65:-.72);
    if(bell && cup){
      // The broad back of the sleeve is a single sheet; its open, hanging
      // end faces the palm. There is no seam from the shoulder to the hand.
      const edge=(x,y)=>P(x+(.25-k*.25),y);
      const bottomX=44.5-k*.7, bottomY=158.1+k*2.7;
      const outer="M"+edge(64,119.0)+"Q"+edge(58.4,120.6)+" "+edge(55.2,125.9)+
        "Q"+edge(52.7,130)+" "+edge(50.7,134.5)+"Q"+edge(46.8,138.3)+" "+edge(44.7,145.3)+
        "Q"+edge(42.65,152.7)+" "+edge(bottomX-1.4,bottomY-.9)+"Q"+edge(bottomX-1,bottomY+1.75)+" "+edge(bottomX+1.8,bottomY+2.05)+
        "Q"+edge(bottomX+4.05,bottomY+2.15)+" "+edge(bottomX+5.95,bottomY-2.2)+
        "Q"+edge(55.1,150.7)+" "+w(1.1,3.1);
      svg+=shape(outer+"Q"+w(2.2,-4.3)+" "+edge(57.4,133.2)+"Q"+edge(62.5,127.4)+" "+edge(66.2,124.1)+"Z",design.sleeve,"none");
      svg+=stroke(outer,outerInk,1.36);
      const opening="M"+w(-4.55,-1.95)+"Q"+w(-3.25,-4.45)+" "+w(.4,-4.6)+"Q"+w(4.5,-4.5)+" "+w(5.25,-.9)+
        "Q"+w(5.6,2.25)+" "+w(2.75,5.8)+"Q"+edge(53.2,153.8)+" "+edge(bottomX+3.3,bottomY-.1)+
        "Q"+edge(51.65,152.1)+" "+w(-4.55,-1.95)+"Z";
      svg+=shape(opening,"#d3c0c0","#9d8485",.92);
      svg+=stroke("M"+w(-4.95,-1.1)+"Q"+w(-4.05,-5.45)+" "+w(.55,-5.65)+"Q"+w(3.9,-5.65)+" "+w(5.2,-2.95),"#fff8ef",1.75);
      svg+=stroke("M"+edge(46.3,150.9)+"Q"+edge(45.4,154.8)+" "+edge(bottomX+.75,bottomY-.25),"#e7dad6",1.45);
    } else if(bell){
      // A kimono is cut in a rectangle. Its lower fold hangs free below
      // the elbow while the wrist emerges next to the softly rounded hem.
      const root=(x,y)=>P(x,y);
      const bottomX=elbowX-3.25,bottomY=elbowY+11.5;
      const hem="M"+root(60.5,121.95)+"Q"+root(56.1,122.7)+" "+root(52,129.8)+
        "Q"+root(elbowX-4.9,elbowY-6)+" "+root(elbowX-5.8,elbowY+.15)+
        "Q"+root(bottomX-3.0,bottomY-2.4)+" "+root(bottomX-.8,bottomY)+
        "Q"+root(bottomX+.65,bottomY+1.2)+" "+root(bottomX+2.6,bottomY-.5)+
        "Q"+root(elbowX+5,elbowY+4.15)+" "+w(2.7,2.45)+"Q"+w(4.35,.65)+" "+w(1.6,-3.2)+
        "Q"+w(-.5,-4.65)+" "+w(-3,-3.1)+"Q"+root(elbowX+.7,elbowY-2.3)+" "+root(elbowX+1.55,elbowY-3.4)+
        "Q"+root(54.9,133.5)+" "+root(61.5,125.6);
      svg+=shape(hem,design.sleeve,outerInk,1.34);
      svg+=shape("M"+w(-2.9,-2.85)+"Q"+w(-.65,-4.35)+" "+w(1.9,-2.65)+"Q"+w(3.6,-.4)+" "+w(2.5,2.1)+
        "Q"+root(bottomX+4.5,bottomY-4)+" "+root(bottomX+.2,bottomY-1.7)+"Q"+root(bottomX+2.5,bottomY-6.1)+" "+w(-2.9,-2.85)+"Z","#dfd1cf","#a99796",.72);
      svg+=stroke("M"+root(elbowX-3.7,elbowY+6.5)+"Q"+root(elbowX-4.3,elbowY+1.5)+" "+root(elbowX-2,elbowY-2.5),design.shade,1.0);
    } else {
      svg+=shape(upper,design.sleeve,outerInk,2.08)+shape(fore,design.sleeve,outerInk,2.08)+
        shape(upper,design.sleeve,"none")+shape(fore,design.sleeve,"none");
      if(detached){
        svg+=lavenderCaps[Number(right)];
      } else if(!trim){
        // Ink only the outside edge of an inset sleeve. The shoulder line
        // disappears under the hair/collar, where the original joins it.
        svg+=shape("M"+P(61,121.5)+"Q"+P(56.5,122.2)+" "+P(53.4,125.5)+"Q"+P(50.5,128.2)+" "+P(49.8,131.7)+
          "Q"+P(53.4,134.1)+" "+P(58.9,133.4)+"Q"+P(61.2,129.4)+" "+P(62.3,125.5),design.sleeve,"none");
        svg+=stroke("M"+P(60.1,121.8)+"Q"+P(52.9,123.1)+" "+P(49.8,131.4),outerInk,1.16);
      }
      svg+=stroke("M"+P(elbowX-2.65,elbowY+3.75)+"Q"+P(elbowX-1.3,elbowY+4.3)+" "+P(elbowX+.8,elbowY+3.6),design.shade,1.22);
      const len=Math.hypot(wristX-elbowX,wristY-elbowY),ux=(wristX-elbowX)/len,uy=(wristY-elbowY)/len;
      const rim=(along,across)=>P(wristX+ux*along-uy*across,wristY+uy*along+ux*across);
      svg+=shape("M"+rim(-4.65,-3.55)+"Q"+rim(-3.5,-4.3)+" "+rim(-.15,-3.55)+"Q"+rim(1.35,0)+" "+rim(.05,3.65)+
        "Q"+rim(-2.3,4.3)+" "+rim(-4.65,3.65)+"Q"+rim(-3.5,0)+" "+rim(-4.65,-3.55)+"Z",design.cuff,outerInk,.95);
      if(trim){
        const shade=row===2?"#93af9d":"#5c3b4e", rimColor=row===2?"#edddc0":"#8b6579";
        svg+=shape("M"+P(65.25,120.9)+"Q"+P(56.2,121.7)+" "+P(51.6,128.4)+"Q"+P(48.5,132.2)+" "+P(47.6,136.8)+
          "Q"+P(51.6,135)+" "+P(55.4,135.4)+"L"+P(62.2,137.0)+"Q"+P(66.1,132.9)+" "+P(67.9,127),shade,"none");
        svg+=stroke("M"+P(61,121.95)+"Q"+P(52,123.8)+" "+P(47.6,136.8)+"Q"+P(54.7,133.9)+" "+P(62.2,137.0),outerInk,1.12);
        svg+=stroke("M"+P(49.5,135.05)+"Q"+P(54.6,133.3)+" "+P(61.2,135.8),rimColor,1.12);
      }
    }
  }
  return svg+(cup?palm(thumb,k):grip(thumb,bite));
}
