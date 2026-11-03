import type { SceneId } from "./maps";
import { sceneArt } from "./scene-art";
import { townGates, gateSignFoot, southStreetLamp, type TownGate } from "./gate-layout";

function waymark(c: CanvasRenderingContext2D,g: TownGate) {
  const p=gateSignFoot(g), standalone=g.kind!=="wicket";
  c.save(); c.translate(Math.round(p.x),Math.round(p.y));
  if (standalone) {
    c.fillStyle="#34291f45"; c.beginPath(); c.ellipse(1,0,6,2,0,0,Math.PI*2); c.fill();
    c.fillStyle="#654b39"; c.fillRect(-2,-28,5,28);
    c.fillStyle="#ac845d"; c.fillRect(-1,-28,2,26);
    c.fillStyle="#b0c5bd"; c.fillRect(-3,-29,6,2);
    // A short blue ribbon is shared by the two bridge waymarks.
    c.fillStyle="#719eaa"; c.fillRect(0,-14,3,8); c.fillRect(2,-9,2,5);
    c.fillStyle="#c0dcd6"; c.fillRect(0,-14,3,1);
  }
  c.translate(0,standalone ? -20 : -16);
  const side=g.kind==="stairs" ? -1 : 1;
  const board=(dy:number,color:string) => {
    c.fillStyle=color; c.beginPath();
    for (const [i,[x,y]] of [[-13,-5],[9,-5],[14,0],[9,5],[-13,5]].entries())
      if(i) c.lineTo(x*side,y+dy); else c.moveTo(x*side,y+dy);
    c.closePath(); c.fill();
  };
  board(1.5,"#634d3e"); board(0,"#cfb186");
  c.fillStyle="#f0d7a9"; c.fillRect(-9,-4,18,.8);
  c.fillStyle="#514538"; c.textAlign="center"; c.textBaseline="middle";
  c.font='7.5px "Microsoft YaHei","PingFang SC",sans-serif';
  c.fillText(g.sign,-side*.8,0);
  c.restore();
}
export function drawGate(c: CanvasRenderingContext2D,g: TownGate) {
  if (g.kind === "wicket") {
    const image=sceneArt.gate;
    if (!image.naturalWidth) return;
    const h=g.width*image.naturalHeight/image.naturalWidth;
    for (const side of g.scene==="town" ? [1] : [-1,1]) {
      c.fillStyle="#473e3040"; c.beginPath();
      c.ellipse(g.x+side*g.width*.34,g.y-1,g.width*.15,2.4,0,0,Math.PI*2); c.fill();
    }
    if (g.scene==="town") {
      // The opposite side of this entrance is the town's existing iron lamp.
      // Leave its silhouette and the white fence behind it intact.
      c.drawImage(image,image.naturalWidth/2,0,image.naturalWidth/2,image.naturalHeight,g.x,g.y-h,g.width/2,h);
      const p=southStreetLamp;
      c.fillStyle="#86aeb6"; c.fillRect(p.x-3,p.y-17,6,2); c.fillRect(p.x+2,p.y-16,2,5);
      c.fillStyle="#c6d9c9"; c.fillRect(p.x-2,p.y-17,4,1);
    } else c.drawImage(image,g.x-g.width/2,g.y-h,g.width,h);
  }
  waymark(c,g);
}
export function connectionLayers(scene: SceneId) {
  return townGates.filter(g=>g.scene===scene).map(g=>({
    y:g.kind==="wicket" ? g.y : gateSignFoot(g).y, draw:(c:CanvasRenderingContext2D)=>drawGate(c,g),
  }));
}
