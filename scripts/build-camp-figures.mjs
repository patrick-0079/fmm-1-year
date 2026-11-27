import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { designs, eyes, faceArt, mouthAt } from "./camp-figure-art.mjs";
import { lapArmArt } from "./camp-lap-arms.mjs";
import { reachArmArt } from "./camp-reach-arms.mjs";
import { bodiceArt, neckStencil, shortSleeveCap, leftOldSleeveEdge } from "./camp-bodices.mjs";

const art = name => fileURLToPath(new URL("../src/assets/"+name,import.meta.url));
const fittings=JSON.parse(await readFile(new URL("../src/bag-fittings.json",import.meta.url),"utf8"));
const width=144, height=184, columns=16, rows=designs.length;
const frameWidth=144, frameHeight=152, headroom=height-frameHeight;
const view=(parts,w=width,h=height,top=0)=>Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 '+top+' '+w+' '+h+'">'+parts+'</svg>');
const surface=(w,h)=>sharp({create:{width:w,height:h,channels:4,background:"#0000"}});
const channels={width,height,channels:4};
const sleeveTop=96;
const offset=(x,y)=>(y*width+x)*4;
const color=(data,x,y)=>Array.from(data.subarray(offset(x,y),offset(x,y)+3));
const alphaHex=(c)=>"#"+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");
const ink="#68424a";
const contour=(d,fill,stroke=ink,w=1.35)=>'<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+w+'" stroke-linejoin="round"/>';
const loadCell=async row=>sharp(art("fufu-garments.webp")).extract({left:12*width,top:row*height,width,height}).ensureAlpha().raw().toBuffer();

// The hands in the seated original lie over the top of the knees. Paint
// these formerly hidden surfaces once per outfit, underneath the new cels.
// The contour mask protects every pixel outside the old sleeves and fingers.
async function underpainting(original,row) {
  const design=designs[row], c=design.shell, k=design.knee;
  const kneeTop=[143,143,142.5,143,143,143,139,143,140][row];
  const leftLeg=[50,51,48,48,51,51,48,51,45][row];
  const rightLeg=146-leftLeg;
  const skirt=row===8, cloth=[2,3,6,8].includes(row);
  const skirtShadow=row===8?"#a92525":row===2?"#355353":row===3?"#958cb9":row===6?"#be8144":"#ddb6a9";
  const fleshOutline=cloth?ink:"#a67971";
  // Pink hair behind the lifted sleeve. The rose dress has a dark red bow
  // at the elbow; that pixel cannot supply the colour of the hidden hair.
  // The left and right locks have separately sampled light and shadow.
  const hairStops=side=>[123,132,142,155,162].map(y=>{
    const samples=[];
    for(let x=29;x<=40;x++){
      const rgb=color(original,side==="left"?x:145-x,y);
      if(rgb[0]>190 && rgb[0]>rgb[1]+24 && rgb[2]>rgb[1]+4)samples.push(rgb);
    }
    const swatch=samples.length?Array.from({length:3},(_,k)=>
      samples.map(rgb=>rgb[k]).sort((a,b)=>a-b)[Math.floor(samples.length/2)]):color(original,side==="left"?33:112,134);
    return '<stop offset="'+((y-123)/39)+'" stop-color="'+alphaHex(swatch)+'"/>';
  }).join("");
  let art='<defs>'+["left","right"].map(side=>'<linearGradient id="'+side+'" x1="0" x2="0" y1="123" y2="162" gradientUnits="userSpaceOnUse">'+hairStops(side)+'</linearGradient>').join("")+'</defs>'+
    '<path d="M0 0H73V184H0Z" fill="url(#left)"/><path d="M73 0H144V184H73Z" fill="url(#right)"/>';
  if(row===2)art+=contour("M51 143 Q47 148.3 43.1 155.1 Q40.2 160.5 35.1 165 L39.7 169 52.6 166 Q53.3 155.2 56 147Z M95 143 Q99 148.3 102.9 155.1 Q105.8 160.5 110.9 165 L106.3 169 93.4 166 Q92.7 155.2 90 147Z","#95afa2","#70625d",1.15);
  if(row===4)art+=contour("M54.3 140.8 Q52 144.6 47.4 148.6 Q44 151.8 41.4 154.4 Q38.4 157.5 34.6 162.1 L44.5 165 57 151Z M91.7 140.8 Q94 144.6 98.6 148.6 Q102 151.8 104.6 154.4 Q107.6 157.5 111.4 162.1 L101.5 165 89 151Z","#efb592","#a36e5e",1.2);
  // The shrine outfit has a cropped white top over a full red hakama.
  // Its own bodice drawing stops at the obi when a long sleeve is raised.
  if(row!==8)art+=contour("M55 125 Q58 125 60 122 Q72 128 84 122 L92 126 Q94 135 96 142 Q99 154 99 160 L46 160 Q46 149 51 140Z",c,ink,1.55);
  if(row===1) art+=contour("M49 145 Q53 138 60 139 L67 152 Q57 149 49 154Z M98 143 Q91 137 86 141 L81 152 Q90 148 98 153Z","#c76782","#945566",1);
  if(row===2) art+=contour("M52 128 L71 134 92 127 98 143 93 145 74 138 49 146 46 141Z","#95b2a5","#72665f",.9);
  if(row===0) art+=contour("M52 137 Q59 138 65 136 M88 137 Q83 138 79 136","none","#b099bd",.8);
  if(row===3) art+=contour("M73 131 L73 143 M60 139 Q59 142 60 143","none","#948bb7",.9)
    +'<circle cx="74" cy="138" r="1.2" fill="#efe8c9" stroke="#9a8b96" stroke-width=".7"/>';
  if(row===4) art+=contour("M55 135 Q58 140 56 143 M90 136 Q87 141 89 143","none","#dba087",1);
  if(row===5) art+=contour("M70 130 L73 130 75 136 73 139Z","#ad5458","#7d4650",.65);
  if(row===6) art+=contour("M56 123 L61 123 62 131 83 131 84 123 89 124 89 146 55 146Z","#d29a59","#976e49",1);
  if(row===7) art+=contour("M54 123 L65 121 73 127 81 121 92 125 99 138 75 134 48 139Z","#70445a","#603645",.95);
  if(row===8) art+=contour("M57 132 Q73 135 90 132 L91 141 Q75 144 54 140Z","#ac342e","#833331",.9);
  if(skirt) {
    art+=contour("M50 "+(kneeTop+8)+" Q53 "+(kneeTop-1)+" 63 "+kneeTop+" Q70 "+kneeTop+" 73 "+(kneeTop+3)+" Q78 "+(kneeTop-1)+" 85 "+kneeTop+" Q95 "+kneeTop+" 99 "+(kneeTop+15)+" L109 166 Q72 177 37 165Z",k);
    art+=contour("M73 "+(kneeTop+3)+" Q72 157 71 168 M53 148 Q51 159 47 166 M89 145 Q94 154 98 164","none",skirtShadow,1.6);
  } else {
    art+=contour("M"+leftLeg+" 169 Q"+(leftLeg-1)+" 151 "+(leftLeg+3)+" "+(kneeTop+4)+" Q"+(leftLeg+5)+" "+(kneeTop-2)+" 64 "+kneeTop+" Q73 "+kneeTop+" 73 "+(kneeTop+7)+" L73 171Z",k,fleshOutline);
    art+=contour("M73 171 L73 "+(kneeTop+8)+" Q73 "+kneeTop+" 82 "+kneeTop+" Q"+(rightLeg-4)+" "+(kneeTop-2)+" "+(rightLeg-1)+" "+(kneeTop+7)+" Q"+(rightLeg+1)+" 158 "+rightLeg+" 169Z",k,fleshOutline);
    if(cloth)art+=contour("M"+(leftLeg+4)+" "+(kneeTop+9)+" Q"+(leftLeg+3)+" "+(kneeTop+13)+" "+(leftLeg+3)+" "+(kneeTop+20)+" M"+(rightLeg-4)+" "+(kneeTop+9)+" q1 7 1 14","none",skirtShadow,.9);
  }
  return sharp(view(art)).ensureAlpha().raw().toBuffer();
}

function clearFace(pixels,row) {
  const [left,right,top]=eyes[row], source=Buffer.from(pixels);
  for(const lx of [left,right]) {
    // Follow the actual lash at each column. A rectangular skin-colour patch
    // would remove the pink bangs, particularly above the inner eye corner.
    for(let x=lx-1;x<=lx+15;x++){
      let first=999, last=-1;
      for(let y=top-1;y<=top+10;y++){
        const [r,g,b]=color(source,x,y);
        if((r<148 && g<130 && b<143) || (r<g-10 && b<g+8) || (r>g+64 && g<103)){
          first=Math.min(first,y);last=y;
        }
      }
      if(last<0)continue;
      const under=color(source,Math.max(60,Math.min(86,x)),top+13);
      const t=Math.min(1,Math.abs((x-lx-6.8)/8.15));
      const bottom=Math.max(last+1,Math.round(top+5+7.4*Math.sqrt(1-t*t)));
      for(let y=first-1;y<=bottom+1;y++) {
        const i=offset(x,y);
        const feather=y===first-1?.55:y===bottom+1?.38:1;
        const warm=[251,222,204].map((v,k)=>Math.round(v*.82+under[k]*.18));
        for(let c=0;c<3;c++)pixels[i+c]=Math.round(source[i+c]*(1-feather)+warm[c]*feather);
      }
    }
  }
  const [cx,cy]=mouthAt(row);
  for(let y=Math.floor(cy-2);y<cy+3.65;y++)for(let x=cx-5;x<=cx+5;x++){
    const r=((x-cx)/5.8)**2+((y-cy-.6)/3.1)**2;
    if(r>=1)continue;
    const mix=Math.min(1,(1-r)*3);
    const a=color(source,cx-6,y),b=color(source,cx+6,y),i=offset(x,y);
    for(let c=0;c<3;c++)pixels[i+c]=Math.round(pixels[i+c]*(1-mix)+(a[c]+b[c])/2*mix);
  }
}

export async function sourceLayers(row,event) {
  const source=await loadCell(row), substrate=await underpainting(source,row);
  const outline=fittings[designs[row].name][12][0];
  // Wardrobe fittings describe the part of the sleeve over a strap. The
  // elbows and flared hems below that seam also have to leave the knee.
  const elbows=[
    "M46 139 Q40 144 44 151 Q49 157 55 147Z",
    "M51 137 Q48 144 53 149 L59 143Z",
    "M45 138 Q37 149 45 155 Q49 155 54 148 L62 143 61 135Z",
    "M49 131 Q39 140 43 150 Q47 157 55 153 L63 143 58 135Z",
    "M51 130 Q40 137 41 147 Q43 156 51 155 Q57 156 63 145L62 137Z",
    "M50 135 Q45 140 50 150 Q53 154 58 147 L65 141Z",
    "M45 132 Q41 139 48 145 L57 142 60 135Z",
    "M48 134 Q44 142 48 150 Q52 154 58 146 L64 140Z",
    "M54.1 129.4 Q44.5 137 44 143 Q45.6 147 44 151 Q40 155 41.2 160.7 Q42 164.5 47 164.8 L53.2 153.8 61.4 143.1 70.4 139.4 69.4 132.3Z",
  ][row];
  const extra=contour(elbows,"white","white",2.2);
  const mask=await sharp(view(contour(outline,"white","white",2.5)+extra+
    '<g transform="translate(146 0) scale(-1 1)">'+extra+'</g>')).ensureAlpha().raw().toBuffer();
  const oldEdge=leftOldSleeveEdge(row);
  const leftEdge=oldEdge?contour(oldEdge,"white","white",1.2):"";
  const repair=await sharp(view(leftEdge+'<g transform="translate(146 0) scale(-1 1)">'+leftEdge+'</g>')).ensureAlpha().raw().toBuffer();
  const jacket=await sharp(view(bodiceArt(row))).ensureAlpha().raw().toBuffer();
  const collar=await sharp(view(neckStencil(row))).ensureAlpha().raw().toBuffer();
  const activeCap=Buffer.alloc(source.length), capPath=shortSleeveCap(row);
  const cuffs=await sharp(view(contour(capPath,"white","none")+
    (event==="butterfly"?'<g transform="translate(146 0) scale(-1 1)">'+contour(capPath,"white","none")+'</g>':""))).ensureAlpha().raw().toBuffer();
  const body=Buffer.from(source), originalFore=Buffer.alloc(source.length), restingFore=Buffer.alloc(source.length);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const i=offset(x,y),alpha=mask[i+3]/255;
    if(alpha){
      source.copy(restingFore,i,i,i+4);
      restingFore[i+3]=Math.round(source[i+3]*alpha);
    }
    // On a one-handed action the hand on the opposite knee remains the
    // original costume drawing. It still occludes bag straps and shoe strips.
    const active=event==="butterfly" || (event==="jelly"?x>=73:x<73);
    if(active) {
      const removed=Math.max(alpha,repair[i+3]/255);
      // Preserve the original pleats and hem outside the two long sleeves.
      const skirtBlend=row===8?Math.max(0,Math.min(1,(y-138)/4)):0;
      const paint=jacket[i+3]/255*(1-skirtBlend*(1-alpha)), neck=collar[i+3]/255;
      for(let c=0;c<3;c++){
        let v=source[i+c]*(1-removed)+substrate[i+c]*removed;
        v=v*(1-paint)+jacket[i+c]*paint;
        body[i+c]=Math.round(v*(1-neck)+source[i+c]*neck);
      }
      if((row===5 || row===6) && (event==="marshmallow" || event==="butterfly") && cuffs[i+3]){
        // The bangs cross the shoulder in the seated master. Its rose edge
        // belongs behind the short sleeve when the forearm comes forward.
        const [r,g,b]=source.subarray(i,i+3);
        if(r>g+22 && b>g+3)continue;
        source.copy(activeCap,i,i,i+4);
        activeCap[i+3]=Math.round(source[i+3]*cuffs[i+3]/255);
      }
    } else if(alpha) {
      source.copy(originalFore,i,i,i+4);
      originalFore[i+3]=Math.round(originalFore[i+3]*alpha);
    }
  }
  clearFace(body,row);
  clearFace(source,row);
  for(let i=3;i<headroom*width*4;i+=4) {
    if(body[i])throw Error("Camp figure would clip "+designs[row].name+" at the crown");
  }
  const plate=await sharp(body,{raw:channels}).extract({left:0,top:headroom,width,height:frameHeight}).png().toBuffer();
  const resting=await sharp(source,{raw:channels}).extract({left:0,top:headroom,width,height:frameHeight}).png().toBuffer();
  const placedArm=await sharp(originalFore,{raw:channels}).extract({left:0,top:sleeveTop,width,height:72}).png().toBuffer();
  const restingArm=await sharp(restingFore,{raw:channels}).extract({left:0,top:sleeveTop,width,height:72}).png().toBuffer();
  const cap=await sharp(activeCap,{raw:channels}).extract({left:0,top:sleeveTop,width,height:72}).png().toBuffer();
  return {plate,placedArm,resting,restingArm,cap};
}

export async function cel(row,event,frame,base) {
  const acting=event==="marshmallow" || (frame>=9 && frame<=14);
  let arms="";
  if(acting){
    arms=event==="bird" || event==="jelly" ? reachArmArt(row,event,frame,designs[row]) :
      lapArmArt(row,event,frame,"left",designs[row]);
    if(event==="butterfly")arms+=lapArmArt(row,event,frame,"right",designs[row]);
  }
  const hands=acting && (event==="marshmallow" || event==="butterfly") && (row===5 || row===6)?
    lapArmArt(row,event,frame,"left",designs[row],true)+
      (event==="butterfly"?lapArmArt(row,event,frame,"right",designs[row],true):""):"";
  const body=await sharp(acting?base.plate:base.resting).composite([
    {input:view(faceArt(row,event,frame),width,frameHeight,headroom)},{input:view(arms,width,frameHeight,headroom)},
    ...(acting?[{input:base.cap,left:0,top:sleeveTop-headroom}]:[]),{input:view(hands,width,frameHeight,headroom)}]).png().toBuffer();
  const foreground=await sharp(acting?base.placedArm:base.restingArm).composite([{input:view(arms,width,72,sleeveTop)},
    ...(acting?[{input:base.cap,left:0,top:0}]:[]),{input:view(hands,width,72,sleeveTop)}]).png().toBuffer();
  return {body:{input:body,left:frame*frameWidth,top:row*frameHeight},
    foreground:{input:foreground,left:frame*width,top:row*72}};
}

const events=["bird","butterfly","jelly","marshmallow"];
if(process.argv[1] && fileURLToPath(import.meta.url).replaceAll("\\","/")===process.argv[1].replaceAll("\\","/")) {
 for(const event of process.argv.length>2?process.argv.slice(2):events){
  if(!events.includes(event))throw Error("Unknown camp artwork: "+event);
  const bodies=[], sleeves=[];
  for(let row=0;row<rows;row++){
    const base=await sourceLayers(row,event);
    const cels=await Promise.all(Array.from({length:columns},(_,frame)=>cel(row,event,frame,base)));
    for(const {body,foreground} of cels){bodies.push(body);sleeves.push(foreground);}
  }
  const output=art("meadow-camp-"+event);
  await surface(columns*frameWidth,rows*frameHeight).composite(bodies).webp({lossless:true,effort:5}).toFile(output+".webp");
  await surface(columns*width,rows*72).composite(sleeves).webp({lossless:true,effort:5}).toFile(output+"-sleeves.webp");
 }
}
