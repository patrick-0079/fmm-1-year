import poseUrl from "./assets/town-work-poses.webp?no-inline";
import { workCell,workFoot,workRows,workBeat,workFrames,workJoints } from "./town-work-poses.ts";
import { paintedBounds } from "./town-work-bounds.ts";
import type { TownNpc } from "./town-data.ts";
import type { Point } from "./core.ts";

let sheet: HTMLImageElement | undefined;
export function prepareTownWork() {
  if (sheet && (sheet.naturalWidth || !sheet.complete)) return;
  sheet=new Image();
  sheet.decoding="async"; sheet.fetchPriority="low"; sheet.src=poseUrl;
}
type Ctx=CanvasRenderingContext2D;
function line(c:Ctx,points:number[],ink:string,width=1) {
  c.beginPath();c.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);
  c.lineJoin="round";c.lineCap="round";c.strokeStyle=ink;c.lineWidth=width;c.stroke();
}
function oval(c:Ctx,x:number,y:number,rx:number,ry:number,color:string) {
  c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
}
function face(c:Ctx,points:number[],paper:string,edge:string,width=.8) {
  c.beginPath();c.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);
  c.closePath();c.fillStyle=paper;c.fill();c.lineWidth=width;c.strokeStyle=edge;c.stroke();
}
const ink="#755350",gold="#d9a450",paper="#ffeac7";
function finger(c:Ctx,h:Point) {
  oval(c,h.x,h.y,1.15,1,"#a47862");oval(c,h.x-.15,h.y-.27,.88,.72,"#f3d0ac");
}
function prop(c:Ctx,n:TownNpc,h:Point,k:Point,work:number,stroke:number,received:boolean){
  const x=(h.x+k.x)/2,y=(h.y+k.y)/2;
  switch(n.id){
    case "florist":{
      const stems=[[-2.3,-4.2],[.4,-5.6],[2.9,-3.7]];
      for(const [dx,dy] of stems){
        line(c,[x+dx,y+dy,x,y+1,x+.5,y+3.2],"#587853",.77);
        for(let i=0;i<5;i++){const a=i*2*Math.PI/5;oval(c,x+dx+Math.cos(a)*.85,y+dy+Math.sin(a)*.68,1,.75,i%2?"#ecc7bf":"#fff0ce");}
        oval(c,x+dx,y+dy,.6,.52,gold);
      }
      line(c,[h.x,h.y,x+.5,y+.1,k.x,k.y],"#b77479",.8);finger(c,h);finger(c,k);break;
    }
    case "baker":{
      const bx=3.5,by=-12;
      const berry=work>.07?Math.min(1,work*1.4):0;
      if(berry){c.save();c.beginPath();c.rect(bx-2,by-3,berry*4.1,6);c.clip();
        face(c,[bx-1.9,by-1,bx+1.8,by-1.2,bx+1,by+1.1,bx-.2,by+2,bx-1.4,by+.8],"#db8d8e","#bd7279",.5);
        line(c,[bx-1.8,by-1.7,bx-.5,by-1.2,bx,by-2.4,bx+.6,by-1.3,bx+1.4,by-1.7],"#80976c",.65);c.restore();}
      if(work>.08){const end={x:bx-1.4+work*2.2,y:by-.2+stroke*.56};
        line(c,[h.x,h.y,end.x,end.y],"#826959",1.05);finger(c,h);}
      break;
    }
    case "post":{
      if(work<=0)break;
      c.save();c.translate(x,y-1.7);c.rotate(-.16+stroke*.03);
      for(const offset of [-1,-.25,.5])
        face(c,[-3.6+offset,-1.9+offset,3.4+offset,-2.1+offset,3.4+offset,1.9+offset,-3.5+offset,2+offset],paper,"#b99881",.55);
      line(c,[-3.1,-1.3,.1,.7,3.5,-1.4],"#b68b78",.55);c.restore();finger(c,h);finger(c,k);break;
    }
    case "welcome":{
      if(received){
        line(c,[x-.9,y-3.1,x+.4,y-.5,x-1.4,y+3.4],"#d48d95",1.65);
        line(c,[x+.4,y-.5,x+1.6,y+2.8],"#eaacaa",1.25);
      }else{
        oval(c,x,y-1.1,1.85,1.7,"#9c7548");oval(c,x,y-1.35,1.5,1.35,"#efc773");
        oval(c,x+.2,y-1.45,.72,.67,"#d58b89");}
      break;
    }
    case "maker":{
      c.save();c.beginPath();c.moveTo(h.x,h.y);c.bezierCurveTo(h.x+1,y+4+2*work,k.x-1,y+4+3*work,k.x,k.y);
      c.strokeStyle="#97764c";c.lineWidth=2;c.stroke();c.strokeStyle="#f8d49a";c.lineWidth=1.4;c.stroke();
      for(let i=1;i<7;i++){const t=i/7;const a=1-t;const px=a*a*a*h.x+3*a*a*t*(h.x+1)+3*a*t*t*(k.x-1)+t*t*t*k.x;
        const py=a*a*a*h.y+3*a*a*t*(y+4+2*work)+3*a*t*t*(y+4+3*work)+t*t*t*k.y;
        line(c,[px,py-.5,px+.2,py+.25],"#9e7752",.45);}
      c.restore();finger(c,h);finger(c,k);break;
    }
    case "radio-host":{
      // A thin monitor wire disappears into the blouse. The real illustrated
      // hand from the raised-palm pose presses the cup from underneath.
      line(c,[h.x+.4,h.y+.6,h.x+1.1,h.y+2.4,h.x+2.4,h.y+3.2],"#755665",.55);
      oval(c,h.x-.28,h.y-.75,1.5,1.8,"#744e66");
      oval(c,h.x-.6,h.y-.85,.85,1.15,"#b4839e");finger(c,h);
      break;
    }
    case "snake-keeper":{
      const extent=2.3+work*2;
      face(c,[x-extent,y-3,x-.3,y-2.6,x+extent,y-3.4,x+extent,y+2.4,x+.3,y+2.9,x-extent,y+2],paper,"#967f66");
      line(c,[x,y-2.5,x+.35,y+2.3],"#c7b093",.54);
      line(c,[x-extent+1,y+1,x-1,y+.2,x-.6,y-1,x+extent-1,y-1.6],"#779381",.75);
      oval(c,x+extent-1,y-1.6,.53,.53,"#b77b70");finger(c,h);finger(c,k);break;
    }
    case "blocks-keeper":{
      c.save();c.translate(h.x+1,h.y-1);c.rotate(work*.24);
      face(c,[-2,-1.9,1.3,-2.4,3,-1.1,-.8,-.6],"#ffccc0","#9b6770");
      face(c,[-2,-1.9,-.8,-.6,-.8,1.9,-2,.8],"#cd8993","#986e70");
      face(c,[-.8,-.6,3,-1.1,3,1.3,-.8,1.9],"#dfa0a6","#986e70");c.restore();
      c.save();c.translate(k.x-1,k.y-1);c.rotate(-.42+work*.45);
      face(c,[-1.8,-1.6,1.4,-2,2.3,-.9,-.9,-.4],"#c6e5d0","#698981");
      face(c,[-1.8,-1.6,-.9,-.4,-.9,1.7,-1.8,.8],"#8eafa2","#698981");
      face(c,[-.9,-.4,2.3,-.9,2.3,1.3,-.9,1.7],"#a3c6b6","#698981");c.restore();
      break;
    }
    case "hop-keeper":{
      if(work>.1){line(c,[h.x+.2,h.y,h.x-1.6,h.y-1.1+stroke*.5,h.x-2.2,h.y-1.6+stroke*.7],"#f2d3b7",1.1);}
      break;
    }
    case "flight-keeper":{
      line(c,[h.x,h.y,h.x-.7,h.y-1.6,h.x-3,h.y-3.4-work*1.6],"#a78476",.62);
      oval(c,k.x-.5,k.y,2.5,2.5,"#a36c52");oval(c,k.x-.6,k.y-.3,1.85,1.8,"#f2c98b");
      const a=work*2.4+stroke*.35;line(c,[k.x-.5,k.y,k.x-.5+1.5*Math.cos(a),k.y+1.5*Math.sin(a)],ink,.85);break;
    }
    case "photo-visitor":{
      c.save();c.translate(x,y-1.9);c.rotate(stroke*.04);
      face(c,[-4.6,-2.3,-2,-2.3,-1.4,-3,1,-3,1.7,-2.4,4.5,-2.3,4.4,2.7,-4.4,2.8],"#756970","#513f4b",.75);
      oval(c,.4,0,2.45,2.35,"#c1aaa0");oval(c,.4,0,1.92,1.8,"#42545d");
      oval(c,.2,-.28,1.05,.86,"#7faaa9");oval(c,-.17,-.72,.42,.39,"#d9e6d0");
      c.fillStyle="#e9c88d";c.fillRect(-3.5,-1.7,1.5,.72);c.restore();finger(c,h);finger(c,k);break;
    }
    case "cat":{
      if(work>.3){oval(c,h.x+.7,h.y-1,.95,.9,"#f0dac2");}
      break;
    }
    case "xiaoyou":{
      if(work>.05){const px=h.x+.4,py=h.y-.8;
        oval(c,px,py,1.7*work+.6,1.6*work+.6,"#cf854b");
        oval(c,px-.2,py-.4,1.35*work+.45,1.2*work+.45,"#f9b35b");
        line(c,[px-.7,py-1.7,px+.5,py-2.2],"#788759",.7);finger(c,h);}
      break;
    }
    case "qianxiao":{
      if(work<=.05)break;
      for(let i=0;i<3;i++){
        c.save();c.translate(h.x,h.y);c.rotate((i-1)*(.14+.28*work));
        face(c,[-1.5,-3.9,1.4,-3.9,1.4,.65,-1.5,.65],"#71506a","#d0ab77",.6);
        oval(c,0,-1.9,.65,.65,"#ecc486");c.restore();
      }
      finger(c,h);break;
    }
  }
}
export function drawTownWork(c:Ctx,npc:TownNpc,time:number,still:boolean,received:boolean) {
  if (!sheet?.naturalWidth) return false;
  const row=workRows.indexOf(npc.id), period=10.2+(row*1.43)%4.7;
  const local=time%period, gesture=still?5:local<2.65?Math.min(workFrames-1,Math.floor(local/2.65*workFrames)):0;
  c.drawImage(sheet,gesture*workCell,row*workCell,workCell,workCell,
    -workCell/4,-workFoot/2,workCell/2,workCell/2);

  const [left,top,w,h]=paintedBounds[npc.id], {lift,stroke}=workBeat(gesture);
  const hands=workJoints[npc.id].slice(0,2).map(([x,y,dx,dy])=>{
    const weight=lift+.14*stroke*(x<.5?1:-1);
    return {x:(left+(x+dx*weight)*w-workCell/2)/2,y:(top+(y+dy*weight)*h-workFoot)/2};
  });
  prop(c,npc,hands[0],hands[1]??hands[0],lift,stroke,received);
  return true;
}
