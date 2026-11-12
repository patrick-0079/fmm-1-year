import type { Hazard } from "./core";
import { trapSprite } from "./trap-art";

function leaf(c: CanvasRenderingContext2D, x: number, y: number, angle: number, gold: boolean) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.rotate(angle);
  c.fillStyle = gold ? "#9a7b45" : "#577347";
  c.beginPath(); c.moveTo(-3, 0); c.lineTo(-1, -1.5); c.lineTo(2, -1);
  c.lineTo(3, 0); c.lineTo(1, 1.5); c.lineTo(-2, 1); c.closePath(); c.fill();
  c.fillStyle = gold ? "#e2c57d" : "#b6c783";
  c.fillRect(-1.5, -1, 3, 1);
  c.fillStyle = "#746342"; c.fillRect(-3, 0, 4, .6);
  c.restore();
}

function mist(c: CanvasRenderingContext2D, trap: Hazard, time: number) {
  const {x,y,radius:r} = trap;
  // Low irregular banks of fog spread across the actual circular trigger area.
  // Each edge thins into the paving beneath it; no opaque cloud decal or halo.
  const banks = [[-.45,-.28,.76],[.36,-.36,.72],[-.5,.37,.68],[.28,.4,.82],[0,0,.82]];
  for (const [i,[dx,dy,size]] of banks.entries()) {
    const fx = x + dx*r + Math.sin(time*.33+i*1.7)*1.2;
    const fy = y + dy*r + Math.cos(time*.28+i)*.7;
    const reach = r*size;
    const fog = c.createRadialGradient(fx,fy,0,fx,fy,reach);
    fog.addColorStop(0,"#edf0dc65");
    fog.addColorStop(.48,"#e0e7d52e");
    fog.addColorStop(1,"#e0e7d500");
    c.fillStyle=fog;
    c.fillRect(fx-reach,fy-reach,reach*2,reach*2);
  }
  // A few broken low wisps remain legible against the warm path, even while still.
  c.lineWidth = 1; c.strokeStyle = "#f1f1df9a";
  for (let i=0;i<3;i++) {
    const fy=y+(i-1)*r*.52;
    const shift=Math.sin(time*.42+i*2)*2;
    c.beginPath(); c.moveTo(x-r*.6+shift,fy+1);
    c.bezierCurveTo(x-r*.22+shift,fy-3,x+r*.05+shift,fy+2,x+r*.5+shift,fy-1);
    c.stroke();
  }
  leaf(c,x-r*.68,y+r*.58,-.4,false);
  leaf(c,x+r*.7,y-r*.52,.6,true);
}

function breeze(c: CanvasRenderingContext2D, trap: Hazard, time: number) {
  const {x,y,radius:r}=trap;
  c.lineWidth=.65;
  // Short dust strokes and a handful of garden leaves, rather than a solid tornado.
  for(let i=0;i<3;i++) {
    const angle=time*.28+i*2.2;
    c.strokeStyle=i===1?"#b8ba8b55":"#e2d7ad65";
    c.beginPath();
    c.ellipse(x,y-1,r*(.45+i*.17),r*(.42+i*.16),-.12,angle,angle+1.5);
    c.stroke();
  }
  for(let i=0;i<8;i++) {
    const angle=i*2.4+time*(.32+(i%3)*.035);
    const orbit=r*(.65+(i%3)*.12);
    const fx=x+Math.cos(angle)*orbit, fy=y+Math.sin(angle)*orbit;
    leaf(c,fx,fy-1.5-Math.sin(time*.6+i)*1.4,angle+.7,i%3===0);
  }
}

export function drawGardenHazard(c: CanvasRenderingContext2D, image: HTMLImageElement | undefined,
  trap: Hazard, time: number, reduced: boolean) {
  c.save();
  const t=reduced?0:time;
  if(trap.kind==="ribbon" || trap.kind==="stone") {
    const {frame:f,x,y,w,h}=trapSprite({...trap,kind:trap.kind});
    if(image) c.drawImage(image,f.x,f.y,f.w,f.h,x,y,w,h);
  } else if(trap.kind==="mist") mist(c,trap,t);
  else breeze(c,trap,t);
  c.restore();
}
