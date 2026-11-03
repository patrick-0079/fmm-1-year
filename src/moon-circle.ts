const tau = Math.PI * 2;
const stones = [
  [-20,-3,3.2],[-14,-9,2.6],[-4,-11,2.3],[9,-10,2.6],
  [18,-6,2.8],[21,2,2.8],[14,8,3.4],[3,11,2.4],[-9,10,2.5],[-18,5,3.1],
] as const;

/** Flat moonstone laid in the grass. Draw on the ground, underneath feet and sheep. */
export function drawMoonCircle(c: CanvasRenderingContext2D, x: number, y: number, time: number, near: number) {
  c.save(); c.translate(x,y);
  const wave = (1 + Math.sin(time*1.5))*.5;
  c.fillStyle = "#273f4870";
  c.beginPath(); c.ellipse(0,1,23,12,0,0,tau); c.fill();
  c.save(); c.scale(1,.51);
  const halo = c.createRadialGradient(0,0,2,0,0,27);
  halo.addColorStop(0,"#b6f3da12"); halo.addColorStop(.65,"#a3e9d52d"); halo.addColorStop(1,"#a3e9d500");
  c.fillStyle=halo; c.fillRect(-27,-27,54,54);
  c.lineWidth=1.15; c.strokeStyle="#b6e6d4b8";
  for (let i=0;i<4;i++) {
    c.beginPath(); c.arc(0,0,17.5,i*tau/4+.13,(i+1)*tau/4-.13); c.stroke();
  }
  c.restore();
  for (const [sx,sy,r] of stones) {
    c.fillStyle="#314c52"; c.fillRect(sx-r,sy-1,r*2+1,3);
    c.fillStyle="#65857e";
    c.beginPath(); c.moveTo(sx-r-1,sy); c.lineTo(sx-r*.6,sy-2.1); c.lineTo(sx+r*.6,sy-2.5);
    c.lineTo(sx+r,sy-.4); c.lineTo(sx+r*.52,sy+1); c.lineTo(sx-r*.55,sy+1.1); c.closePath(); c.fill();
    c.fillStyle="#bbcec0"; c.fillRect(sx-r*.55,sy-2,r*.95,1);
  }
  // Two engraved leaves form the waymark, not a collectible star.
  c.strokeStyle="#dbf3d5"; c.lineWidth=.95;
  c.beginPath(); c.moveTo(-4,3); c.quadraticCurveTo(1,1,5,-3);
  c.quadraticCurveTo(0,-4,-.5,1); c.moveTo(-.5,1); c.quadraticCurveTo(-5,-2,-7,-.5);
  c.quadraticCurveTo(-6,2,-.5,1); c.stroke();
  c.fillStyle="#e2ffde";
  for (let i=0;i<3;i++) {
    const phase=(time*.23+i/3)%1, a=i*2.18+1;
    c.globalAlpha=(.23+near*.5)*Math.sin(Math.PI*phase);
    c.fillRect(Math.round(Math.cos(a)*15),Math.round(Math.sin(a)*6-3-phase*8),1,1.5);
  }
  c.globalAlpha=.28+wave*.2+near*.3;
  c.fillRect(-1,-11,2,1); c.fillRect(0,10,2,1);
  c.restore();
}
