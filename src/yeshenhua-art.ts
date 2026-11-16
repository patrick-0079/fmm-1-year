/** Dedicated atlas; keep the shared town sheet intact for the other residents. */
export const yeshenhuaFrames = [
  { x:219, y:33, w:506, h:828, footX:464.5, footY:857, headY:35 },
  { x:1083, y:34, w:506, h:827, footX:1328.5, footY:857, headY:36 },
] as const;

export const yeshenhuaPose = (page:string) =>
  ["start","cow-horns","cow-stroll"].includes(page) ? 1 : 0;

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

export function drawYeshenhuaGuide(c:CanvasRenderingContext2D, image:HTMLImageElement) {
  if (!image.complete || !image.naturalWidth) return;
  const f=yeshenhuaFrames[0],h=Math.min(f.h,f.w*1.1),scale=Math.min(72/f.w,80/h);
  c.clearRect(0,0,80,88);
  c.imageSmoothingEnabled=true;
  c.drawImage(image,f.x,f.y,f.w,h,(80-f.w*scale)/2,4,f.w*scale,h*scale);
}
