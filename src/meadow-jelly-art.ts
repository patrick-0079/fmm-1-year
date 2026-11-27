import atlasUrl from "./assets/meadow-jelly-bells.webp?no-inline";
import { jellyfish, type JellyVisitor } from "./meadow-jellies";
import { requestSceneImage } from "./texture-cache";

const turn = 2*Math.PI;
const frameTimes = [0,.19,.32,.43,.54,.64,.75,.87];
const folds = [0,.15,.46,1,.83,.47,.16,.03];
const filament = ["#9ee7ee", "#a3ccff", "#c2bef9"];
const fringe = ["#6faedb", "#829fdd", "#9794d8"];
let atlas: HTMLImageElement | undefined;

/** Called on entry to the meadow. A failed optional image can retry on a later visit. */
export function prepareJellyBells() {
  atlas = requestSceneImage(atlasUrl);
}

export function drawJelly(c: CanvasRenderingContext2D, index: number, a: JellyVisitor, seconds: number, still: boolean) {
  if (!atlas?.naturalWidth) return;
  const j = jellyfish[index], time = still ? 0 : seconds;
  const cycle = (time / j.beat + j.offset) % 1;
  let frame = 0;
  while (frame+1 < frameTimes.length && cycle >= frameTimes[frame+1]) frame++;
  const lift = still ? 0 : Math.sin((cycle-.27)*turn)*1.3 + Math.sin(time*.81+index)*.75;
  const span = j.width * (1-.16*folds[frame]);
  const bellY = -6-j.tail-lift;
  c.save();
  c.translate(Math.round(a.at.x*2)/2, Math.round(a.at.y*2)/2);
  c.fillStyle = "#8ab3dc20";
  c.beginPath(); c.ellipse(0,0,j.width*.38,1.6,0,0,turn); c.fill();
  c.translate(0,bellY);
  const segments = j.bell === 0 ? 3 : 4;
  for (let n=0; n<segments; n++) {
    const h = n/(segments-1)*2-1;
    const root = h*.36*span;
    const length = j.tail*(1-Math.abs(h)*(j.bell===2?.48:.22) + (n%2)*.07);
    const rootY = 1+h*a.heading*.9;
    // The root travels with the bell; the last links carry the longer,
    // delayed change of direction and a wave which runs down the strand.
    let lastX = root, lastY=rootY;
    c.lineCap="round";
    for (let k=1; k<=7; k++) {
      const u=k/7, wave=Math.sin(time*2.9+n*1.87-u*4.8);
      const x=root + h*1.65*u - (a.heading*(1-u) + a.trailing*u)*u*u*(2.6+length*.15)
        + wave*u*(1.1+j.bell*.3);
      const y=rootY+u*length-(still ? 0 : Math.sin(cycle*turn-u*1.6)*u*.5);
      c.strokeStyle=k<3 ? fringe[j.bell] : filament[j.bell];
      c.globalAlpha=(n%2===0?.69:.84)*(1-u*.44);
      c.lineWidth=(n%2===0?1.15:1.45)*(1-u*.50);
      c.beginPath(); c.moveTo(lastX,lastY); c.lineTo(x,y); c.stroke();
      lastX=x; lastY=y;
    }
  }
  c.globalAlpha=1;
  const cell=48, scale=j.width/40;
  c.save();
  c.transform(1,.075*a.heading,.09*a.heading,1,0,0);
  c.imageSmoothingEnabled=false;
  c.drawImage(atlas,frame*cell,j.bell*cell,cell,cell,-24*scale,-28*scale,cell*scale,cell*scale);
  if (a.warmth>.01 && !still) {
    // Brighten the actual glass and fringe instead of adding a round halo.
    c.globalCompositeOperation="screen";
    c.globalAlpha=a.warmth*(.19+.12*Math.cos(cycle*turn));
    c.drawImage(atlas,frame*cell,j.bell*cell,cell,cell,-24*scale,-28*scale,cell*scale,cell*scale);
  }
  c.restore();
  c.restore();
}

export function drawKettleSteam(c: CanvasRenderingContext2D, time: number, still: boolean) {
  if (still) return;
  const phase=(time+1.3)%6.7;
  c.save();
  c.translate(242,130);
  c.lineCap="round";
  for (let plume=0; plume<2; plume++) {
    const p=(phase-plume*.68)/2.05;
    if (p<0 || p>=1) continue;
    // A little wisp breaks away from the left spout. Its warm, narrow foot
    // rises first; a cooler curl rolls off and dissolves above it.
    const rise=p*10, x=-.4-3*p*p+.48*Math.sin(p*turn+plume);
    const length=2.2+3.2*Math.sin(p*Math.PI);
    c.globalAlpha=.60*Math.sin(Math.PI*p)**.8;
    c.strokeStyle=p<.42 ? "#f5e2bb" : "#c1d1db";
    c.lineWidth=.68+.55*p;
    c.beginPath(); c.moveTo(x,-rise);
    c.bezierCurveTo(x+2.7,-rise-length*.33,x-2.8,-rise-length*.68,x-.65,-rise-length);
    c.stroke();
  }
  c.restore();
}
