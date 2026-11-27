import type { Point } from "./core.ts";
import type { VisitorGesture } from "./garden-visitor-dialogue.ts";

export function gesturePulse(age:number,start:number,duration:number) {
  const t=(age-start)/duration;
  return t>0 && t<1 ? Math.sin(Math.PI*t) : 0;
}

/** The sleeve starts at Fufu's shoulder and the open palm follows her wrist. */
export function drawPlayerReach(c:CanvasRenderingContext2D, player:Point, target:Point, reach:number, lift=0) {
  if (reach<=.02) return;
  const side=target.x>=player.x ? 1 : -1;
  const x=player.x+side*5, y=player.y-18;
  const tipX=x+(target.x-x)*reach, tipY=y+(target.y-y)*reach-lift;
  const midX=x+(tipX-x)*.46+side*2, midY=y+(tipY-y)*.48+3;
  c.save();c.lineCap="round";c.lineJoin="round";
  c.beginPath();c.moveTo(x,y);c.lineTo(midX,midY);c.lineTo(tipX,tipY);
  c.strokeStyle="#895c68";c.lineWidth=3.9;c.stroke();
  c.strokeStyle="#ffd4b7";c.lineWidth=2.4;c.stroke();
  c.beginPath();c.moveTo(x,y);c.lineTo(midX,midY);c.strokeStyle="#f2c5d7";c.lineWidth=3.8;c.stroke();
  c.translate(tipX,tipY);c.rotate(Math.atan2(tipY-midY,tipX-midX));
  c.fillStyle="#ffe0c8";c.beginPath();c.ellipse(.8,0,2.5,1.6,0,0,Math.PI*2);c.fill();
  c.strokeStyle="#ffe0c8";c.lineWidth=1;
  for(let finger=0;finger<3;finger++){c.beginPath();c.moveTo(1.4,finger-1);c.lineTo(3.4-Math.abs(finger-1)*.5,finger-1.1);c.stroke();}
  c.restore();
}

export function drawEnvelope(c:CanvasRenderingContext2D,x:number,y:number,angle:number) {
  c.save();c.translate(x,y);c.rotate(angle);
  c.fillStyle="#fff0cf";c.strokeStyle="#995f64";c.lineWidth=.75;
  c.fillRect(-4,-2.7,8,5.4);c.strokeRect(-4,-2.7,8,5.4);
  c.beginPath();c.moveTo(-3.8,-2.5);c.lineTo(0,.25);c.lineTo(3.8,-2.5);c.stroke();
  c.fillStyle="#df7391";c.fillRect(-.8,-.5,1.6,1.4);c.restore();
}

function tendril(c:CanvasRenderingContext2D,root:Point,control:Point,tip:Point) {
  c.beginPath();c.moveTo(root.x,root.y);c.quadraticCurveTo(control.x,control.y,tip.x,tip.y);
  c.strokeStyle="#a75377";c.lineWidth=3.4;c.stroke();
  c.strokeStyle="#f8a2b7";c.lineWidth=2.3;c.stroke();
  for(const t of [.52,.72,.9]){
    const a=1-t;
    const x=a*a*root.x+2*a*t*control.x+t*t*tip.x;
    const y=a*a*root.y+2*a*t*control.y+t*t*tip.y;
    c.fillStyle="#ffe1e4";c.beginPath();c.arc(x,y+.3,.55,0,Math.PI*2);c.fill();
  }
}

/** World coordinates keep a reaching tendril attached to Rabe and to the moving player. */
export function drawNurseGesture(c:CanvasRenderingContext2D,gesture:VisitorGesture,age:number,foot:Point,player:Point,still:boolean) {
  if(!["catch","wave","heart","tug","handshake","case","give","checklist","beckon"].includes(gesture))return;
  const side=player.x<foot.x ? -1 : 1;
  const x=foot.x,y=foot.y;
  const root={x:x+side*14,y:y-11};
  const t=still ? .65 : age;
  c.save();c.lineJoin="round";c.lineCap="round";
  if(gesture==="checklist") {
    c.translate(x+side*5,y-14);c.rotate(side*.16);
    c.fillStyle="#b77b84";c.fillRect(-4.8,-6.3,9.6,12.6);
    c.fillStyle="#fff5df";c.fillRect(-4,-5.5,8,11);
    c.fillStyle="#745563";c.fillRect(-2,-6.2,4,1.3);
    for(let i=0;i<3;i++){
      c.fillStyle="#b88791";c.fillRect(-2.8,-3+i*2.8,1.2,1.2);c.fillRect(-.6,-2.8+i*2.8,3.2,.65);
    }
    const line=still?1:Math.floor(Math.min(age*2,2));
    c.strokeStyle="#965077";c.lineWidth=1.1;c.beginPath();c.moveTo(-2,-2.6+line*2.8);
    c.lineTo(-3,-1.5+line*2.8);c.lineTo(-.7,-3.9+line*2.8);c.stroke();
  } else if(gesture==="beckon") {
    for(const sign of [-1,1]){
      const sway=still ? .65 : Math.sin(t*4+sign*.8);
      tendril(c,{x:x+14*sign,y:y-11},{x:x+sign*(25+sway),y:y-24},
        {x:x+sign*(19-sway*2),y:y-19+sway*2});
    }
  } else if(gesture==="wave") {
    const sway=still ? 1 : Math.sin(t*9)*Math.max(0,1-t/2);
    tendril(c,root,{x:x+side*(24+sway*3),y:y-24},{x:x+side*(19+sway*5),y:y-32});
  } else if(gesture==="heart") {
    const rise=still ? 1 : Math.min(1,t*2.8);
    for(const sign of [-1,1]) {
      const top=y-15-12*rise;
      c.beginPath();c.moveTo(x+sign*14,y-11);
      c.quadraticCurveTo(x+sign*22,y-23,x+sign*10,top);
      c.bezierCurveTo(x+sign*6,top-4,x+sign*2,top-2,x,top+1);
      c.bezierCurveTo(x-sign*2,top-2,x-sign*10,top-1,x-sign*7,top+4);
      c.quadraticCurveTo(x-sign*4,top+8,x,top+10);
      c.strokeStyle="#a75377";c.lineWidth=3.2;c.stroke();c.strokeStyle="#ffa5bc";c.lineWidth=2;c.stroke();
    }
  } else if(gesture==="case" || gesture==="give"){
    const reveal=gesture==="give" ? 1 : still ? .8 : Math.min(1,t/.82);
    const box={x:x+side*10,y:y-4};
    c.fillStyle="#bd8697";c.fillRect(box.x-4.7,box.y-4,9.4,7);
    c.strokeStyle="#795766";c.lineWidth=1.2;c.strokeRect(box.x-4.7,box.y-4,9.4,7);
    c.beginPath();c.moveTo(box.x-4.7,box.y-4);c.lineTo(box.x-5.5,box.y-7);c.lineTo(box.x+4,box.y-7);c.stroke();
    c.fillStyle="#ffe7db";c.fillRect(box.x-.7,box.y-2.5,1.4,4);c.fillRect(box.x-2,box.y-1.3,4,1.4);
    const letter={x:box.x+side*4*reveal,y:box.y-3-13*reveal};
    const handoff=gesture==="give" ? Math.min(1,t/.75) : 0;
    const tip={x:letter.x+(player.x-letter.x)*handoff*.65,y:letter.y+(player.y-18-letter.y)*handoff*.75};
    tendril(c,root,{x:x+side*26,y:y-2},tip);
    if(gesture!=="give" || t<.85)drawEnvelope(c,tip.x,tip.y,side*.13);
  } else {
    const holding=gesture==="catch" ? Math.max(0,Math.min(1,t/.32,(1.35-t)/.48)) :
      gesture==="handshake" ? Math.max(0,Math.min(1,t/.4,(2.1-t)/.55)) : gesturePulse(t,0,1.6);
    if(holding>0) {
      const nearest={x:player.x-side*4,y:player.y-(gesture==="tug"?14:17)};
      const end=gesture==="handshake"?{x:(nearest.x+root.x)*.5,y:(nearest.y+root.y)*.5}:nearest;
      const tip={x:root.x+(end.x-root.x)*holding,y:root.y+(end.y-root.y)*holding};
      const bob=still ? 0 : gesture==="handshake" ? Math.sin(t*11)*1.5*holding : 0;
      tip.y+=bob;
      tendril(c,root,{x:(root.x+tip.x)*.5,y:Math.max(root.y,tip.y)+7},tip);
      c.beginPath();c.ellipse(tip.x,tip.y,2.4,1.4,side*.55,.4,Math.PI*1.85);
      c.strokeStyle="#f8a2b7";c.lineWidth=1.8;c.stroke();
      if(gesture==="handshake")drawPlayerReach(c,player,tip,holding);
    }
  }
  c.restore();
}
