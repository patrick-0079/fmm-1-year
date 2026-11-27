import type { Activities } from "./activities";
import { facingFromMovement } from "./core";
import { anniversaryVisitors, type AnniversaryVisitor } from "./anniversary-visitor-spots";
import { handedLetters, letterChoice, type LetterHandoff } from "./resident-story";
import { sceneArt } from "./scene-art";
import type { World } from "./world";
import { southGatePlanting } from "./courage-south-gate";
import { gardenChatTopics, introduceSender, senderIntroductions, showGardenChat } from "./garden-chat-topics";
import { greetGardenVisitor, type VisitorGesture } from "./garden-visitor-dialogue";
import { drawEnvelope, drawNurseGesture, drawPlayerReach, gesturePulse } from "./visitor-gesture-art";

type Action = VisitorGesture | "hello";
interface Encounter { visitor: AnniversaryVisitor; action: Action; start: number; }
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

function frameFor(visitor: AnniversaryVisitor, active: Encounter | null, time: number) {
  if (active?.visitor !== visitor) {
    if (reduced.matches) return 0;
    const age = (time + visitor.row * 3.7) % (10 + visitor.row);
    if (visitor.key === "pigeon") return age < 1.35 ? 2 : 0;
    return age < .58 ? 1 : 0;
  }
  const age = time - active.start;
  if(visitor.key==="pigeon")return active.action==="push" ? age<.75?2:1 : active.action==="tilt" ? 1 : 0;
  if(visitor.key==="zhenghao") {
    if(active.action==="bow")return 3;
    if(active.action==="nuzzle")return age<.18 ? 2 : age<.82 ? 3 : age<1.12 ? 4 : age<2.0 ? 3 : 4;
    if(active.action==="rub" || active.action==="stroke")return age<.18 ? 2 : age<1.35 ? 3 : 4;
    return 1;
  }
  if (active.action === "give")
    return reduced.matches ? 5 : age < .24 ? 2 : age < 1.05 ? 5 : 4;
  if(visitor.key==="rabe")return active.action==="case" ? 5 : active.action==="idle" ? 0 : 3;
  if (reduced.matches) return 3;
  return age < .32 ? 1 : age < .68 ? 2 : 3;
}

// Positions are in the nurse's 96px atlas cell. Her forearms move between
// poses, but the uniform pocket and the two curled tentacles stay registered.
const nurseSuckers = [
  [21, 68, 1.7], [18.5, 72, 1.45], [22, 76, 1.25],
  [72.5, 68, 1.7], [74.5, 71.5, 1.45], [71.5, 75, 1.25],
] as const;

function drawNurseDetails(c: CanvasRenderingContext2D) {
  // A rose pen cap and its pale clip peek above the breast pocket.
  c.fillStyle = "#96365b"; c.fillRect(51, 49, 2.5, 5.5);
  c.fillStyle = "#f981ac"; c.fillRect(51, 49, 1.5, 4.5);
  c.fillStyle = "#ffe5dc"; c.fillRect(53, 49.5, 1, 2.5);
  c.fillStyle = "#ab7780"; c.fillRect(50, 54, 5.5, 2);
  c.fillStyle = "#fff0e5"; c.fillRect(50, 54, 5.5, 1);
  for (const [x, y, radius] of nurseSuckers) {
    c.fillStyle = "#ffcfda";
    c.beginPath(); c.ellipse(x, y, radius, radius * .78, -.25, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#bb5b83";
    c.beginPath(); c.ellipse(x, y + .15, radius * .54, radius * .43, -.25, 0, Math.PI * 2); c.fill();
  }
}

function drawVisitor(c: CanvasRenderingContext2D, visitor: AnniversaryVisitor, frame: number,
  x: number, y: number, size: number, mirror = false) {
  const atlas = sceneArt.anniversaryVisitors;
  if (!atlas.naturalWidth) return;
  const cell = atlas.naturalWidth / 6;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  if (mirror) c.scale(-1, 1);
  c.drawImage(atlas, frame * cell, visitor.row * cell, cell, cell,
    -size / 2, -size * 90 / 96, size, size);
  if (visitor.key === "rabe") {
    c.scale(size / 96, size / 96); c.translate(-48, -90);
    drawNurseDetails(c);
  }
  c.restore();
}

// Trace the opaque brass and the first petals of the south gate's flowerbed.
// The warm halo can tint the lawn; the painted lamp and foliage sit above it.
const southGateMask = new Path2D();
for (const [index, point] of southGatePlanting.entries()) {
  if (index === 0) southGateMask.moveTo(point.x, point.y);
  else southGateMask.lineTo(point.x, point.y);
}
southGateMask.closePath();

// The rose-ink sigil lies flat in the lawn. Passing feet and both of Rabe's
// instrument-bearing tendrils are painted over it by the normal depth pass.
function drawSigil(c: CanvasRenderingContext2D, x: number, y: number, time: number) {
  c.save();
  c.translate(x, y);
  c.scale(1, .32);
  c.globalAlpha = reduced.matches ? .67 : .68 + Math.sin(time * .85) * .08;
  c.strokeStyle = "#9d4978"; c.lineWidth = 2;
  c.beginPath(); c.arc(0, 0, 21.5, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = "#ffb0d2"; c.lineWidth = 1.3;
  c.beginPath(); c.arc(0, 0, 21.5, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(0, 0, 17.5, 0, Math.PI * 2); c.stroke();
  for (let n = 0; n < 6; n++) {
    c.rotate(Math.PI / 3);
    c.beginPath(); c.moveTo(0, -19); c.lineTo(2.6, -16);
    c.lineTo(0, -12); c.lineTo(-2.6, -16); c.closePath(); c.stroke();
    c.fillStyle = "#ffe0de"; c.fillRect(-.85, -22.2, 1.7, 1.7);
  }
  c.restore();
}

export class AnniversaryVisitors {
  private active: Encounter | null = null;

  constructor(private world: World, private activities: Activities, private mail: LetterHandoff) {
    const ground = world.onEnvironment, depth = world.getDepthLayers, presentation = world.getActorPresentation;
    const nurse = anniversaryVisitors.find(visitor => visitor.key === "rabe")!.spot;
    world.onEnvironment = (c, time) => {
      ground(c, time);
      if (world.scene === "challenge") drawSigil(c, nurse.x, nurse.y, world.ambientTime);
    };
    world.getDepthLayers = () => {
      if (world.scene !== "town" && world.scene !== "garden" && world.scene !== "challenge") return depth();
      const layers = [...depth()];
      if (world.scene === "challenge") {
        const view = world.visibleArea;
        if (view.x < 555 && view.x + view.w > 484 && view.y < 566 && view.y + view.h > 485)
          layers.push({y: 565, draw: c => world.drawMapCover(c, {x:483, y:484, w:73, h:83}, southGateMask)});
      }
      for (const visitor of anniversaryVisitors) {
        if (visitor.scene !== world.scene) continue;
        const foot = visitor.spot;
        const encounter = this.active?.visitor === visitor ? this.active : null;
        const action=encounter?.action;
        const pet=action==="stroke" || action==="nuzzle" || action==="rub";
        const age = encounter ? world.ambientTime - encounter.start : 0;
        const direction = world.player.x > foot.x ? 1 : -1;
        // The cat leans its whole weight into the stroke, then settles back on
        // the fish. The poses already include the bending paws and swinging bell.
        const near = Math.hypot(world.player.x - foot.x, world.player.y - foot.y) < 27;
        const lean=pet && near ? reduced.matches ? .55 : action==="nuzzle"
          ? gesturePulse(age,.08,.75)+gesturePulse(age,.94,1.15)
          : gesturePulse(age,0,1.5) : 0;
        const x=foot.x+lean*direction*(action==="rub"?10:6),y=foot.y+lean;
        const tilt=action==="tilt" || action==="tiltBack"
          ? (reduced.matches ? .65 : gesturePulse(age,0,.88))*.18*direction*(action==="tiltBack"?-1:1) : 0;
        const bow=action==="bow" ? (reduced.matches ? 1 : Math.min(1,age/.36)) : 0;
        layers.push({y, draw: c => {
          c.save();
          c.fillStyle = "#4a424134";
          c.beginPath(); c.ellipse(x, y, visitor.footWidth * .75, 2.3, 0, 0, Math.PI * 2); c.fill();
          c.translate(x,y);c.rotate(tilt+direction*.15*bow);c.scale(1,1-.12*bow);
          drawVisitor(c, visitor, frameFor(visitor, this.active, world.ambientTime), 0, 0,
            visitor.size, (pet || bow>0) && near && direction > 0);
          c.restore();
        }});
        if(!encounter || Math.hypot(world.player.x-foot.x,world.player.y-foot.y)>55)continue;
        const front=Math.max(foot.y,world.player.y)+.5;
        if(visitor.key==="rabe" && action && action!=="hello") {
          layers.push({y:front,draw:c=>drawNurseGesture(c,action,age,foot,world.player,reduced.matches)});
        } else if(visitor.key==="pigeon" && action==="push") {
          const t=reduced.matches?1:Math.min(1,Math.max(0,(age-.15)/.8));
          const to={x:foot.x+direction*9+(world.player.x-foot.x-direction*9)*t*.8,y:foot.y-5+(world.player.y-foot.y+5)*t*.8};
          layers.push({y:front,draw:c=>drawEnvelope(c,to.x,to.y,-direction*.18)});
        } else if(pet && action!=="rub" && near) {
          const reach=reduced.matches ? age<1 ? .9 : 0 : gesturePulse(age,0,action==="nuzzle" ? .86 : 1.25);
          layers.push({y:front,draw:c=>drawPlayerReach(c,world.player,{x:x+direction*3,y:y-18},reach)});
        }
      }
      return layers;
    };
    world.getActorPresentation = () => {
      const encounter = this.active;
      if (encounter && world.scene === encounter.visitor.scene) {
        const spot = encounter.visitor.spot;
        const dx = spot.x - world.player.x, dy = spot.y - world.player.y;
        if (Math.hypot(dx, dy) < (spot.radius ?? 36))
          return {facing: facingFromMovement(world.facing, dx, dy)};
      }
      return presentation();
    };
  }

  interact(id: string) {
    const visitor = anniversaryVisitors.find(v => v.spot.id === id && v.scene === this.world.scene);
    if (!visitor) return false;
    if (this.active?.visitor === visitor && this.activities.dialogueOpen) return true;
    if (this.world.busy || this.world.paused || this.world.suspended) return true;
    if (visitor.key === "zhenghao") {
      const spot = visitor.spot;
      if (Math.hypot(this.world.player.x - spot.x, this.world.player.y - spot.y) >= 27 ||
          Math.abs(this.world.player.x - spot.x) < 16 || this.world.player.y < spot.y - 2) {
        this.world.visit(spot.id);
        return true;
      }
    }
    if(visitor.key==="dianziyang") {
      const key = "visitor-dianziyang";
      const speak = (text: string, choices: {title: string; run: () => void}[]) => this.say(visitor, "hello", text, choices);
      if (this.mail.received(handedLetters[visitor.key])) {
        showGardenChat(this.world.chats.next(id, gardenChatTopics[key], this.world.currentPhase), speak);
      } else introduceSender(senderIntroductions[key], speak, () => this.offer(visitor, "hello"));
    } else greetGardenVisitor(visitor.key,id,this.world,this.mail,
      (text,choices,gesture,title)=>this.say(visitor,gesture,text,choices,title),()=>this.activities.close());
    return true;
  }

  private offer(visitor: AnniversaryVisitor, action: Action) {
    const key = "dianziyang";
    const text = action === "give" ? "（芙芙把收到的信轻轻放进背包。）" : "咩。走累了就在路边歇一歇。我给你带了一封信。";
    this.say(visitor, action, text, [
      letterChoice(this.mail, handedLetters[key], () => this.offer(visitor, "give")),
    ]);
  }

  private say(visitor: AnniversaryVisitor, action: Action, text: string, options: {title: string; run: () => void}[], title?:string) {
    const spot = visitor.spot;
    this.activities.dialogue(title??spot.title, text, options, c => {
      const pose=frameFor(visitor,{visitor,action,start:0},.55);
      drawVisitor(c, visitor, pose, 24, 53, 50);
    }, spot, () => { this.active = null; });
    this.active = {visitor, action, start: this.world.ambientTime};
  }
}
