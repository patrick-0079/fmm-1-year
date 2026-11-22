import { arriveHome, leaveHome, petFox, foxWords, type FoxCall, type FoxMemory } from "./fox-memory";
import { foxDoor, foxNook } from "./room-props";
import { drawIdlePose, sceneArt } from "./scene-art";
import { foxCry } from "./sound";
import type { World } from "./world";

export class RoomFox {
  private bubble = document.createElement("span");
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private farewellAt: number | null = null;
  private call: FoxCall | null = null;
  private until = 0;
  private interruptedRest = -1;
  private position = {x:foxNook.x,y:foxNook.y};
  constructor(private world: World, private memory: () => FoxMemory, private save: () => void) {
    this.bubble.className = "fox-bubble";
    this.bubble.hidden = true;
    this.bubble.setAttribute("role","status");
    world.canvas.parentElement!.append(this.bubble);
    const layers = world.getDepthLayers;
    world.getDepthLayers = () => world.scene === "room"
      ? [...layers(), {y:this.position.y, draw:c => this.draw(c)}] : layers();
  }
  private speak(call: FoxCall) {
    this.call = call;
    this.until = performance.now() + 1850;
    this.bubble.textContent = foxWords[call];
    this.bubble.hidden = false;
    this.placeBubble();
    foxCry(call);
  }
  private placeBubble() {
    const p = this.world.project({x:this.position.x,y:this.position.y-28});
    this.bubble.style.left = (p.x / 600 * 100)+"%";
    this.bubble.style.top = (p.y / 400 * 100)+"%";
  }
  clear() {
    this.farewellAt = null;
    this.position = {x:foxNook.x,y:foxNook.y};
    this.call = null;
    this.interruptedRest = -1;
    this.bubble.hidden = true;
  }
  arrive(fromTrap: boolean) {
    this.clear();
    const state = this.memory();
    arriveHome(state,fromTrap);
    this.save();
    if (!fromTrap && state.missed < 3) this.speak("welcome");
  }
  departed(countVisit: boolean) {
    leaveHome(this.memory(),countVisit);
    this.save();
    this.clear();
  }
  pet() {
    const state = this.memory();
    const wasRebuffed = state.missed === 3 && state.rebuffed;
    const call = petFox(state);
    this.save();
    this.speak(call);
    if (call === "content") {
      this.world.onAchievementEvent("fox-content");
      if (wasRebuffed) this.world.onAchievementEvent("fox-reconciled");
    }
  }
  async farewell() {
    this.farewellAt = performance.now();
    this.bubble.hidden = true;
    const doorstep = this.world.config.spots.find(spot => spot.id === "door")!.approach;
    await Promise.all([
      this.world.walkToDoorstep(doorstep),
      this.reduced.matches ? undefined : new Promise<void>(done => setTimeout(done, 550)),
    ]);
    this.position = {...foxDoor};
    this.speak("farewell");
    await new Promise<void>(r=>setTimeout(r,780));
  }
  tick(noteOpen: boolean, canGreet: boolean) {
    if (this.world.scene !== "room") return;
    const now = performance.now(), state = this.memory();
    if (this.farewellAt !== null) {
      const t = this.reduced.matches ? 1 : Math.min(1,(now-this.farewellAt)/550);
      this.position = {x:foxNook.x+(foxDoor.x-foxNook.x)*t,y:foxNook.y+(foxDoor.y-foxNook.y)*t};
    }
    if (state.waitingForNote && canGreet && !noteOpen) {
      state.waitingForNote = false;
      this.save();
      if (state.missed < 3) this.speak("welcome");
    }
    if (now >= this.until) { this.bubble.hidden = true; this.call = null; }
    if (!this.bubble.hidden) this.placeBubble();
  }
  private draw(c: CanvasRenderingContext2D) {
    const sheet = sceneArt.fox;
    if (!sheet.naturalWidth) return;
    const t = performance.now()/1000, still = this.reduced.matches;
    const {x,y} = this.position;
    const near = Math.hypot(this.world.player.x-x,this.world.player.y-y)<58;
    const running = this.farewellAt !== null && y < foxDoor.y-.5;
    let pose = 0;
    if (running) pose = Math.floor(t*11)%2 ? 4 : 5;
    else if (this.call === "farewell" || this.call === "welcome") pose = 1;
    else if (this.call === "content") pose = 2;
    else if (this.memory().missed===3) pose = 3;
    else if (near) pose = 1;
    const cell = sheet.width/3, h=27;
    c.save(); c.translate(x,y);
    c.fillStyle="#764e613b"; c.beginPath(); c.ellipse(0,0,9.5,2.5,0,0,Math.PI*2); c.fill();
    const restTime = this.world.ambientTime + 9.8;
    const cycle = Math.floor(restTime / 15.3), age = restTime % 15.3;
    if (pose !== 0 || this.farewellAt !== null || this.call || this.memory().waitingForNote || still) {
      this.interruptedRest = cycle;
    } else if (age < 2.3 && this.interruptedRest !== cycle && sceneArt.foxRest.naturalWidth) {
      const frame = age < .34 || age >= 2.01 ? 0 : age < .77 || age >= 1.75 ? 1 : 2;
      drawIdlePose(c, sceneArt.foxRest, frame, 0, 0, 32);
      c.restore();
      return;
    }
    if (!still) {
      if (running) c.translate(0,-Math.abs(Math.sin(t*21))*1.8);
      else if (pose===1 || pose===2) {
        const toward = this.world.player.x < x ? -1 : 1;
        c.rotate((toward*.035+Math.sin(t*8)*.035)*(pose===2 ? 1.8 : 1));
      } else if (this.call==="cross") c.translate(Math.sin(t*25)*.55,0);
    }
    const sx=pose%3*cell, sy=Math.floor(pose/3)*cell;
    if (!still && (pose===1 || pose===2)) {
      // The outermost third contains the tail. Lift its tip without moving the feet or eyes.
      const split=Math.floor(cell*2/3), dx=h/cell;
      c.drawImage(sheet,sx,sy,split,cell,-h*.5,-h,split*dx,h);
      const wave=this.call==="content" ? Math.sin(Math.max(0,(1850-this.until+performance.now()))/1850*Math.PI*4) : Math.sin(t*7);
      for(let i=split;i<cell;i+=6) {
        const w=Math.min(6,cell-i), lift=wave*((i-split)/(cell-split))**2*2;
        c.drawImage(sheet,sx+i,sy,w,cell,-h*.5+i*dx,-h-lift,w*dx,h);
      }
    } else {
      c.drawImage(sheet,sx,sy,cell,cell,-h*.5,-h,h,h);
      if (pose===0 && !still && t%4.1<.13) {
        for (const x of [-2.4,2.4]) {
          c.fillStyle="#f2b6bf"; c.beginPath(); c.ellipse(x,-11.5,1.65,1.7,0,0,Math.PI*2); c.fill();
          c.strokeStyle="#835362"; c.lineWidth=.7; c.beginPath(); c.moveTo(x-1.2,-11.6);
          c.quadraticCurveTo(x,-10.5,x+1.2,-11.6); c.stroke();
        }
      }
    }
    c.restore();
  }
}
