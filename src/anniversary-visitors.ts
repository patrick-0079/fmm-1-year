import type { Activities } from "./activities";
import { facingFromMovement } from "./core";
import { anniversaryVisitors, type AnniversaryVisitor } from "./anniversary-visitor-spots";
import { handedLetters, letterChoice, type LetterHandoff } from "./resident-story";
import { sceneArt } from "./scene-art";
import type { World } from "./world";
import { southGatePlanting } from "./courage-south-gate";
import { gardenChatTopics, introduceSender, senderIntroductions, showGardenChat } from "./garden-chat-topics";

const greetings = {
  rabe: "晚安，芙芙。小药箱里有绷带，也有一封想交给你的信。",
  dianziyang: "咩。走累了就在路边歇一歇。我给你带了一封信。",
  pigeon: "（鸽子歪了歪头，把信推到芙芙脚边。）",
};
type Action = "hello" | "pet" | "give";
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
  if (active.action === "give")
    return reduced.matches ? 5 : age < .24 ? 2 : age < 1.05 ? 5 : 4;
  if (active.action === "pet")
    return reduced.matches ? 3 : age < .2 ? 2 : age < 1.15 ? 3 : age < 1.62 ? 4 : 0;
  if (reduced.matches) return visitor.key === "zhenghao" ? 1 : 3;
  return age < .32 ? 1 : visitor.key === "zhenghao" ? 1 : age < .68 ? 2 : 3;
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
        const pet = encounter?.action === "pet";
        const age = encounter ? world.ambientTime - encounter.start : 0;
        const direction = world.player.x > foot.x ? 1 : -1;
        // The cat leans its whole weight into the stroke, then settles back on
        // the fish. The poses already include the bending paws and swinging bell.
        const near = Math.hypot(world.player.x - foot.x, world.player.y - foot.y) < 27;
        const lean = pet && near && !reduced.matches && age < 1.62
          ? Math.sin(Math.PI * age / 1.62) : 0;
        const x = foot.x + lean * direction * 3, y = foot.y + lean;
        layers.push({y, draw: c => {
          c.save();
          c.fillStyle = "#4a424134";
          c.beginPath(); c.ellipse(x, y, visitor.footWidth * .75, 2.3, 0, 0, Math.PI * 2); c.fill();
          drawVisitor(c, visitor, frameFor(visitor, this.active, world.ambientTime), x, y,
            visitor.size, pet && near && direction > 0);
          c.restore();
        }});
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
      const stroke = {title: "摸摸正号", run: () => {
        this.say(visitor, "pet", "（正号眯起眼睛，贴着你的手心蹭了蹭。小铃铛轻轻晃了两下，它又坐回小鱼旁边。）", []);
        this.world.chats.introduce(id);
      }};
      if (!this.world.chats.introduced(id)) {
        this.say(visitor, "hello", "（正号蹲得端端正正，前爪底下露出一条小鱼。）", [stroke]);
      } else {
        const topic = this.world.chats.next(id, gardenChatTopics["visitor-zhenghao"], this.world.currentPhase);
        showGardenChat(topic, (text, choices) => this.say(visitor, text === topic.text ? "hello" : "pet", text, choices), [stroke]);
      }
    } else {
      const key = `visitor-${visitor.key}` as const;
      const speak = (text: string, choices: {title: string; run: () => void}[]) => this.say(visitor, "hello", text, choices);
      if (this.mail.received(handedLetters[visitor.key])) {
        showGardenChat(this.world.chats.next(id, gardenChatTopics[key], this.world.currentPhase), speak);
      } else introduceSender(senderIntroductions[key], speak, () => this.offer(visitor, "hello"));
    }
    return true;
  }

  private offer(visitor: AnniversaryVisitor, action: Action) {
    const key = visitor.key;
    if (key === "zhenghao") return;
    const text = action === "give" ? "（芙芙把收到的信轻轻放进背包。）" : greetings[key];
    this.say(visitor, action, text, [
      letterChoice(this.mail, handedLetters[key], () => this.offer(visitor, "give")),
    ]);
  }

  private say(visitor: AnniversaryVisitor, action: Action, text: string, options: {title: string; run: () => void}[]) {
    const spot = visitor.spot;
    this.activities.dialogue(spot.title, text, options, c => {
      drawVisitor(c, visitor, action === "give" ? 5 : action === "pet" ? 3 : 1, 24, 53, 50);
    }, spot, () => { this.active = null; });
    this.active = {visitor, action, start: this.world.ambientTime};
  }
}
