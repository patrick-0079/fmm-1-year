import { lightBoard, mirrorCells, targetCell, plateAligned, rings, starLit, traceMoonlight, type AstrolabeState, type RingId } from "./astrolabe";
import { moonPlate, southNotebook } from "./ruins-map";
import { drawRelic } from "./relic-icons";
import { sceneArt } from "./scene-art";

type Ctx = CanvasRenderingContext2D;
const toolCells = {plate:0, book:1, mirror:2, star:3} as const;
function tool(c:Ctx, name:keyof typeof toolCells, x:number, y:number, size:number) {
  const image=sceneArt.astrolabeProps;
  if (!image.naturalWidth) return;
  const i=toolCells[name], cell=image.naturalWidth/2;
  c.drawImage(image,(i%2)*cell,Math.floor(i/2)*cell,cell,cell,x,y,size,size);
}
function glow(c:Ctx, x:number, y:number, radius:number, color:string) {
  const light=c.createRadialGradient(x,y,0,x,y,radius);
  light.addColorStop(0,color+"95"); light.addColorStop(1,color+"00");
  c.fillStyle=light; c.fillRect(x-radius,y-radius,radius*2,radius*2);
}
export function drawGroundRing(c:Ctx, id:RingId, x:number, y:number, near:boolean, t:number) {
  c.save();
  c.fillStyle="#20343262"; c.beginPath(); c.ellipse(x,y,7,2,0,0,Math.PI*2); c.fill();
  if (near) {
    glow(c,x,y-6,12+Math.sin(t*1.6),"#ffe8a8");
    c.fillStyle="#fff4c7"; c.fillRect(x+6,y-12,5,1); c.fillRect(x+8,y-14,1,5);
  }
  drawRelic(c,id,x-9,y-15,18);
  c.restore();
}
export function drawSouthNotebook(c:Ctx) {
  tool(c,"book",southNotebook.x-15,southNotebook.y-26,30);
}
export function drawMoonPlate(c:Ctx, s:AstrolabeState) {
  const {x,y}=moonPlate, solved=plateAligned(s);
  tool(c,"plate",x-30,y-54,60);
  // The empty recess of the illustrated plinth is centred above its foot.
  c.save(); c.translate(x,y-29); c.scale(1,.77);
  rings.forEach((ring,i)=>{
    const radius=6+i*5, gap=s.turns[i]*Math.PI/2-Math.PI/2;
    c.lineWidth=3; c.strokeStyle=s.installed?ring.color:"#667777";
    c.beginPath(); c.arc(0,0,radius,gap+.24,gap+Math.PI*2-.24); c.stroke();
    c.lineWidth=.8; c.strokeStyle=s.installed?"#fff1c4":"#8b9990";
    c.beginPath(); c.arc(0,0,radius+1,gap+.30,gap+Math.PI*2-.30); c.stroke();
    if (s.installed) {
      c.fillStyle=solved?"#fff2ae":"#c3995d";
      c.fillRect(Math.round(Math.cos(gap)*radius)-1,Math.round(Math.sin(gap)*radius)-1,2,2);
    }
  });
  if (solved) {
    c.strokeStyle="#ffe29b"; c.lineWidth=1.5;
    c.beginPath(); c.moveTo(0,0); c.lineTo(0,-23); c.stroke();
  }
  c.fillStyle="#f2d294"; c.beginPath(); c.arc(0,0,2.5,0,Math.PI*2); c.fill();
  c.restore();
}
export function drawLightBoard(c:Ctx, s:AstrolabeState, t:number) {
  const {x,y,step,cols,rows}=lightBoard, active=plateAligned(s);
  c.save();
  if (active) {
    c.beginPath(); c.moveTo(moonPlate.x,moonPlate.y-47); c.lineTo(moonPlate.x,197);
    c.lineTo(x,197); c.lineTo(x,y);
    c.strokeStyle="#866f48"; c.lineWidth=3; c.stroke();
    c.strokeStyle="#ffe2a6"; c.lineWidth=1; c.stroke();
  }
  c.translate(x,y);
  for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
    const left=col*step-step/2, top=row*step-step/2;
    // Let the original stone paving show through the engraved seams.
    c.fillStyle=(row+col)%2?"#224a4638":"#4a686e20"; c.fillRect(left,top,step,step);
    c.strokeStyle="#455745a0"; c.lineWidth=.7; c.strokeRect(left+1,top+1,step-2,step-2);
    c.fillStyle="#c1b586ab"; c.fillRect(left+2,top+2,3,1); c.fillRect(left+2,top+2,1,3);
  }
  if (active) {
    const ray=traceMoonlight(s.mirrors);
    c.beginPath();
    ray.points.forEach((p,i)=>i?c.lineTo(p.x*step,p.y*step):c.moveTo(p.x*step,p.y*step));
    c.strokeStyle="#ffe69475"; c.lineWidth=4; c.stroke();
    c.strokeStyle="#fff2be"; c.lineWidth=1.5; c.stroke();
  }
  c.fillStyle="#805f43"; c.fillRect(-7,-5,13,10);
  c.fillStyle=active?"#fff1a9":"#c7be92"; c.beginPath(); c.arc(0,0,5,0,Math.PI*2); c.fill();
  c.fillStyle="#60756b"; c.beginPath(); c.arc(2,-1.7,3.8,0,Math.PI*2); c.fill();
  s.mirrors.forEach((face,i)=>{
    const cx=mirrorCells[i].x*step, cy=mirrorCells[i].y*step;
    c.save(); c.translate(cx,cy);
    c.fillStyle="#35494c"; c.beginPath(); c.ellipse(0,2,7,5,0,0,Math.PI*2); c.fill();
    c.strokeStyle="#b1915f"; c.lineWidth=1; c.stroke();
    c.rotate(face==="/"?-Math.PI/4:Math.PI/4); tool(c,"mirror",-11,-11,22);
    c.restore();
  });
  c.translate(targetCell.x*step,targetCell.y*step);
  tool(c,"star",-10,-10,20);
  if (starLit(s)) {
    glow(c,0,0,15,"#ffe3a4"); drawRelic(c,"brooch",-9,-16+Math.sin(t*1.6),18);
  }
  c.restore();
}
