import { sceneArt } from "./scene-art";
import { bassStand } from "./room-props";
import { pluckBass } from "./sound";
import type { World } from "./world";

const strings = [{note:28,name:"E"}, {note:33,name:"A"}, {note:38,name:"D"}, {note:43,name:"G"}];
export class RoomBass {
  private next = 0;
  private age = 2;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  constructor(world: World, private toast: (s:string)=>void) {
    const layers=world.getDepthLayers, tick=world.onTick;
    world.getDepthLayers=()=> world.scene === "room" ? [...layers(),{y:bassStand.y,draw:c=>this.draw(c)}] : layers();
    world.onTick=(dt,t)=> { tick(dt,t); this.age=world.scene==="room" ? Math.min(2,this.age+dt) : 2; };
  }
  play() {
    const string=strings[this.next];
    this.next=(this.next+1)%strings.length; this.age=0;
    pluckBass(string.note);
    this.toast("白色贝斯 · "+string.name+" 弦");
  }
  private draw(c: CanvasRenderingContext2D) {
    const image=sceneArt.bass;
    if(!image.naturalWidth) return;
    const {x,y,height}=bassStand, w=height*image.naturalWidth/image.naturalHeight;
    c.save(); c.translate(x,y);
    c.fillStyle="#68514645"; c.beginPath(); c.ellipse(1,-1,w*.58,2.8,0,0,Math.PI*2); c.fill();
    c.drawImage(image,-w/2,-height,w,height);
    if(this.age<1.25) {
      const t=this.age/1.25, lift=this.reduced.matches ? 0 : t*7;
      c.globalAlpha=Math.min(1,(1-t)*2);
      c.fillStyle="#77516b"; c.beginPath(); c.ellipse(-10,-32-lift,2,1.4,-.25,0,Math.PI*2); c.fill();
      c.fillRect(-8.8,-39-lift,1,7); c.fillRect(-8.2,-39-lift,3,1.5);
    }
    c.restore();
  }
}
