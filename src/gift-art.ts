import giftUrl from "./assets/gift-v37.webp";
import type { Point } from "./core";
import type { GiftUnwrapping } from "./gift-unwrapping";
import { drawItem } from "./item-art";

const art = new Image();
art.src = giftUrl;

type Frame = { crop: readonly [number, number, number, number]; anchor: readonly [number, number] };
// Each anchor is an actual corner in the source atlas, never the crop's centre.
// All four frames share one camera and one uniform source-to-world scale.
const SCALE = .142;
const frames = {
  tied: { crop: [218, 45, 466, 451], anchor: [451, 491] },
  closed: { crop: [849, 47, 466, 449], anchor: [1083, 491] },
  body: { crop: [220, 550, 462, 433], anchor: [452, 977] },
  lid: { crop: [846, 573, 474, 363], anchor: [1083, 928] },
} satisfies Record<string, Frame>;
const mouthFrontY = (855 - frames.body.anchor[1]) * SCALE;
const smooth = (t: number) => { const n = Math.max(0, Math.min(1,t)); return n*n*(3-2*n); };

function sprite(c: CanvasRenderingContext2D, frame: Frame, x = 0, y = 0, opacity = 1) {
  if (opacity <= 0) return;
  const [sx,sy,w,h] = frame.crop;
  c.save(); c.globalAlpha *= opacity;
  c.drawImage(art, sx,sy,w,h, x+(sx-frame.anchor[0])*SCALE, y+(sy-frame.anchor[1])*SCALE, w*SCALE,h*SCALE);
  c.restore();
}

/** Lift, carry to the left, lower. The lid never rotates or changes scale. */
export function giftLidTranslation(progress: number): Point {
  if (progress < .32) return {x:0, y:-14*smooth(progress/.32)};
  if (progress < .76) return {x:-67*smooth((progress-.32)/.44), y:-14};
  return {x:-67, y:-14+(14-mouthFrontY)*smooth((progress-.76)/.24)};
}

function drawFrontRim(c: CanvasRenderingContext2D) {
  // Repaint the front walls of the SAME open-box sprite over the emerging shoes.
  // This mask follows the cream mouth rim, so it introduces no new perspective.
  const [ax,ay] = frames.body.anchor;
  const corners = [[222,699],[452,855],[678,699],[680,844],[452,983],[220,844]];
  c.save(); c.beginPath();
  corners.forEach(([x,y],i) => i ? c.lineTo((x-ax)*SCALE,(y-ay)*SCALE) : c.moveTo((x-ax)*SCALE,(y-ay)*SCALE));
  c.closePath(); c.clip(); sprite(c,frames.body); c.restore();
}

function tailFeedback(c: CanvasRenderingContext2D, x: number, y: number, time: number, reduced: boolean) {
  const pulse = reduced ? 1 : .8+Math.sin(time*3)*.2;
  const glow = c.createRadialGradient(x,y,0,x,y,7);
  glow.addColorStop(0,`rgba(255,239,178,${.65*pulse})`); glow.addColorStop(1,"#fff4c000");
  c.fillStyle=glow;c.fillRect(x-7,y-7,14,14);
  c.fillStyle="#fff9dc";c.fillRect(x-.7,y-.7,1.4,1.4);
}

function contactShadow(c: CanvasRenderingContext2D, x: number, halfWidth: number, halfDepth: number, opacity: number) {
  c.save();c.translate(x+1,1.2);c.globalAlpha*=opacity;c.fillStyle="#75465a";
  c.beginPath();c.moveTo(0,0);c.lineTo(halfWidth,-halfDepth);
  c.lineTo(0,-halfDepth*2);c.lineTo(-halfWidth,-halfDepth);c.closePath();c.fill();
  c.restore();
}

export function drawGiftArt(c: CanvasRenderingContext2D, gift: GiftUnwrapping, time: number, reduced: boolean, at: Point) {
  if (!art.complete || !art.naturalWidth) return;
  c.save(); c.translate(at.x,at.y);
  contactShadow(c,0,32,20,.1);

  if (gift.stage === "tied") {
    sprite(c,frames.tied);
    if(gift.ribbons[0]) tailFeedback(c,-13,-21,time,reduced);
    if(gift.ribbons[1]) tailFeedback(c,13,-21,time,reduced);
  } else if (gift.stage === "untying") {
    const amount=smooth(gift.time/.55);
    sprite(c,frames.tied,0,0,1-amount); sprite(c,frames.closed,0,0,amount);
  } else if (gift.stage === "ready") {
    sprite(c,frames.closed);
  } else {
    const progress=gift.stage === "opening" ? Math.min(1,gift.time/.9) : 1;
    const lid=giftLidTranslation(progress);
    const reveal=smooth((progress-.40)/.5);
    const settling=smooth((progress-.76)/.24);

    if (lid.x < -5) {
      contactShadow(c,lid.x,34,22,.035+.065*settling);
    }
    if(reveal) {
      const glow=c.createRadialGradient(0,-38,1,0,-38,36);
      glow.addColorStop(0,`rgba(255,240,181,${.35*reveal})`);glow.addColorStop(1,"#fff3bd00");
      c.fillStyle=glow;c.fillRect(-38,-76,76,76);
    }
    sprite(c,frames.body);
    if(reveal) {
      const sway=reduced || gift.stage === "opening" ? 0 : Math.sin(time*2)*.45;
      c.save();c.globalAlpha=reveal;
      drawItem(c,"ribbonShoes",-21,-41-14*reveal+sway,42,33);
      c.restore();
      drawFrontRim(c);
    }
    sprite(c,frames.lid,lid.x,mouthFrontY+lid.y);
    // The reference closed sprite masks the tiny illustration differences only
    // while the cover begins lifting; subsequent frames use the fixed open body.
    if(progress<.24) sprite(c,frames.closed,0,0,1-smooth(progress/.24));

    if(reveal && !reduced) {
      for(let i=0;i<9;i++) {
        const p=(time*.22+i*.119)%1;
        c.globalAlpha=Math.sin(p*Math.PI)*.45*reveal;
        c.fillStyle=["#f6c6b1","#fff2bd","#d3dcad"][i%3];
        c.fillRect(Math.sin(i*2.4)*24,-40-p*30,.8,i%2?1:.8);
      }
    }
  }
  c.restore();
}
