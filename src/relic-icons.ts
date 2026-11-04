import { sceneArt } from "./scene-art";
import type { RingId } from "./astrolabe";

const cells = {vine:0, star:1, brass:2, brooch:3} as const;
const moonPin = [
  "..gg.....","..gg.....",".gg....p.",".gg...ppp",
  ".gg.ppipp",".ggg.ppp.","..ggg..p.","...ggggg.","....ttt..",
];
const ink: Record<string,string> = {g:"#ffda86",t:"#a76c4f",p:"#e697a7",i:"#ffecd2"};

/** The worn pin only occupies a few world pixels; keep its crescent and star legible. */
export function drawRelic(c: CanvasRenderingContext2D, id: RingId | "brooch", x: number, y: number, w: number, h = w) {
  const sheet=sceneArt.relics;
  if (id==="brooch" && (w<9 || !sheet.naturalWidth)) {
    moonPin.forEach((row,j)=>[...row].forEach((p,i)=>{
      if (ink[p]) {c.fillStyle=ink[p]; c.fillRect(x+i*w/9,y+j*h/9,w/9+.05,h/9+.05);}
    }));
    return;
  }
  if (!sheet.naturalWidth) return;
  const tile=sheet.naturalWidth/2, index=cells[id];
  c.drawImage(sheet,(index%2)*tile,Math.floor(index/2)*tile,tile,tile,x,y,w,h);
}
