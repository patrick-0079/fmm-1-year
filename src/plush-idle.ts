import { xiaoyeFrames } from "./xiaoye-data";

const frames=new Map<string,HTMLCanvasElement>();
const eyes=[[.546,.345,.062,.052],[.820,.312,.052,.049]];
const lidColor=[99,60,45];
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const x=clamp(v);return x*x*(3-2*x);};
export function plushIdleMotion(time:number,night:boolean,quiet:boolean) {
  if(quiet)return {ear:0,blink:0,up:0,swing:0};
  const t=(time+(night?5.25:8.6))%(night?15.6:11.8);
  if(night) {
    const up=t<.7?smooth(t/.7):t<1.45?1:t<2.15?1-smooth((t-1.45)/.7):0;
    const swing=t<1.45 || t>2.7?0:Math.sin((t-1.45)*Math.PI*2/1.25)*(1-(t-1.45)/1.25);
    return {ear:0,blink:0,up:Math.round(up*5),swing:Math.round(swing*3)};
  }
  const ear=t>.24 && t<1.15?Math.sin((t-.24)*Math.PI/.91):0;
  const blink=t>1.18 && t<1.55?Math.sin((t-1.18)*Math.PI/.37):0;
  return {ear:Math.round(ear*4),blink:Math.round(blink*3),up:0,swing:0};
}
export const lampLift=(p:ReturnType<typeof plushIdleMotion>,height:number,mirror:boolean)=>({
  x:(p.up/5*.016 + p.swing/3*.022)*height*(mirror?-1:1),y:-p.up/5*.07*height,
});

/** Pose the original plush, including its actual lantern and yarn stitches, in one pass. */
export function plushIdleFrame(image:HTMLImageElement,night:boolean,pose:ReturnType<typeof plushIdleMotion>) {
  if(!(pose.ear || pose.blink || pose.up || pose.swing))return;
  const key=[night,pose.ear,pose.blink,pose.up,pose.swing].join("/");
  const cached=frames.get(key);
  if(cached)return cached;
  const f=xiaoyeFrames[night?2:0], h=174,w=Math.round(f.w/f.h*h);
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  const c=canvas.getContext("2d",{willReadFrequently:true})!;
  c.drawImage(image,f.x,f.y,f.w,f.h,0,0,w,h);
  const src=c.getImageData(0,0,w,h),out=c.createImageData(w,h);
  const pixel=(x:number,y:number)=>(Math.max(0,Math.min(h-1,Math.round(y)))*w+Math.max(0,Math.min(w-1,Math.round(x))))*4;
  const blink=pose.blink/3,shine=lampLift(pose,h,false);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/w,v=y/h;
    let dx=0,dy=0;
    if(night){
      const lift=(1-smooth((u-.23)/.18))*smooth((v-.37)/.12);
      dx=shine.x*lift;dy=shine.y*lift;
    } else {
      const ear=(1-smooth((u-.33)/.13))*(1-smooth((v-.09)/.15))*smooth((u-.1)/.12);
      dx=ear*pose.ear*.8;dy=ear*pose.ear*.47;
    }
    const s=pixel(x-dx,y-dy),dest=(y*w+x)*4;
    for(let ch=0;ch<4;ch++)out.data[dest+ch]=src.data[s+ch];
    if(!blink)continue;
    for(const [ex,ey,rx,ry] of eyes){
      const nx=(u-ex)/rx,ny=(v-ey)/ry;
      if(nx*nx+ny*ny>1.13)continue;
      const edge=smooth((1.13-nx*nx-ny*ny)/.17);
      const top=pixel(x,(ey-ry*1.15)*h),bottom=pixel(x,(ey+ry*1.18)*h);
      const opening=1-blink*.95,curve=.08-.20*nx*nx;
      const inside=(ny-curve)/opening;
      const useEye=nx*nx+inside*inside<1 && blink<1;
      const sample=pixel(x,(ey+(inside+curve)*ry)*h);
      for(let ch=0;ch<3;ch++){
        const skin=src.data[top+ch]*(.5-ny*.35)+src.data[bottom+ch]*(.5+ny*.35);
        const ink=blink>.99 && Math.abs(ny-curve)<.1 && Math.abs(nx)<.83;
        const value=useEye ? src.data[sample+ch] : ink ? lidColor[ch] : skin;
        out.data[dest+ch]=src.data[s+ch]*(1-edge)+value*edge;
      }
    }
  }
  c.putImageData(out,0,0);frames.set(key,canvas);return canvas;
}
