/** Dedicated atlas; keep the shared town sheet intact for the other residents. */
export const yeshenhuaFrames = [
  { x:219, y:33, w:506, h:828, footX:464.5, footY:857, headY:35 },
  { x:1083, y:34, w:506, h:827, footX:1328.5, footY:857, headY:36 },
] as const;

export const yeshenhuaPose = (page:string) =>
  ["start", "offer-letter", "dawn", "night", "studio", "again"].includes(page) ? 1 : 0;

/** The existing work atlas has twelve poses derived from her raised palm. */
export function radioWaveFrame(elapsed: number, still: boolean) {
  if (still || elapsed >= 2) return 4;
  return Math.round(4 * (1 - Math.cos(elapsed * Math.PI * 2.5)) / 2);
}

// The rightmost physical fader on the studio mixing desk, in room coordinates.
export const radioFader = {x:199.5, top:141.7, bottom:148.5, foot:{x:214,y:165}};
export function radioFaderPosition(elapsed: number, still: boolean) {
  const step = (n: number) => { const t = Math.min(1, Math.max(0,n)); return t*t*(3-2*t); };
  const approach = still ? 1 : step(elapsed/.55);
  const level = still ? .68 : step((elapsed-.55)/.62) - .32*step((elapsed-1.25)/.45);
  return {approach, cap:radioFader.bottom - level*(radioFader.bottom-radioFader.top)};
}

export function yeshenhuaPlacement(pose:number, x:number, y:number, height:number) {
  const frame = yeshenhuaFrames[pose === 1 ? 1 : 0];
  const scale = height / (frame.footY - frame.headY);
  return { frame, x:x - (frame.footX-frame.x)*scale,
    y:y - (frame.footY-frame.y)*scale, w:frame.w*scale, h:frame.h*scale };
}

/** Map and dialogue both anchor to the feet, including the greeting pose. */
export function drawYeshenhua(c:CanvasRenderingContext2D, image:HTMLImageElement,
  x:number, y:number, height:number, pose=0) {
  if (!image.complete || !image.naturalWidth) return false;
  const p=yeshenhuaPlacement(pose,x,y,height),f=p.frame;
  c.drawImage(image,f.x,f.y,f.w,f.h,p.x,p.y,p.w,p.h);
  return true;
}
