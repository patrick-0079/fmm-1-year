import { creekRowAt, creeks, type CreekScene } from "./creek-layout.ts";
export interface Drift {
  kind: "rose" | "pearl" | "leaf";
  x: number;
  y: number;
  angle: number;
  turn: number;
  opacity: number;
}

// Keep the lane continuous under the bridge, using the same bends as the banks.
const lanes = {
  garden: [...creeks.garden.head, ...creeks.garden.tail],
  challenge: [...creeks.challenge.head, ...creeks.challenge.tail],
};

function floating(scene: CreekScene, kind: Drift["kind"], age: number, duration: number): Drift | undefined {
  if (age < 0 || age > duration) return;
  const lane = lanes[scene], progress = age / duration;
  // Faster in the narrow middle channel, easier at either end.
  const eased = progress - .075 * Math.sin(progress * 2 * Math.PI);
  const y = lane[0].y + (lane[lane.length - 1].y - lane[0].y) * eased;
  const before = creekRowAt(lane, y - 2), after = creekRowAt(lane, y + 2);
  const spine = creekRowAt(lane, y);
  const wave = Math.sin(age * .7 + (kind === "pearl" ? 1.4 : 0));
  const offset = kind === "rose" ? -3.2 : kind === "pearl" ? 3.4 : 0;
  return {
    kind, y, x: spine.x + (offset + wave * 1.7) * Math.min(1, spine.halfWidth / 8),
    angle: Math.atan2(4, after.x - before.x) - (kind === "leaf" ? .08 : .75) + wave * .34,
    turn: kind === "rose" ? Math.cos((progress - .19) * Math.PI * 3) : 1,
    opacity: Math.min(1, age * 2, (duration - age) * 2),
  };
}

export function creekDrift(scene: CreekScene, time: number): Drift[] {
  if (scene === "challenge") {
    const leaf = floating(scene, "leaf", (time + 3.5) % 19, 15);
    return leaf ? [leaf] : [];
  }
  const age = (time + 2.4) % 20;
  return [floating(scene, "rose", age, 14.8), floating(scene, "pearl", age - 1, 11.3)]
    .filter((value): value is Drift => !!value);
}

export function drawDrift(c: CanvasRenderingContext2D, obj: Drift) {
  c.save();
  c.translate(Math.round(obj.x), Math.round(obj.y));
  c.globalAlpha *= obj.opacity;
  c.fillStyle = "#30768866";
  c.fillRect(-2, 2, 5, 1);
  c.rotate(obj.angle);
  if (obj.kind === "leaf") {
    c.fillStyle = "#6b7742";
    c.beginPath();
    c.moveTo(-5,0); c.lineTo(-2,-2.5); c.lineTo(2,-2.5); c.lineTo(5,-.5);
    c.lineTo(2,2); c.lineTo(-2,2.5); c.closePath(); c.fill();
    c.fillStyle = "#b9ba62"; c.fillRect(-2,-1.8,4,2);
    c.strokeStyle = "#e0d090"; c.lineWidth = .8;
    c.beginPath(); c.moveTo(-6,1); c.lineTo(3,-.65);
    c.moveTo(-1,.2); c.lineTo(0,-1.6); c.stroke();
  } else {
    const pale = obj.kind === "pearl" || obj.turn < 0;
    c.scale(1, .36 + .64 * Math.abs(obj.turn));
    c.fillStyle = pale ? "#d29da4" : "#c27e91";
    c.beginPath(); c.moveTo(-3,0); c.quadraticCurveTo(-2,-3.7,.6,-2.9);
    c.lineTo(1.4,-2); c.quadraticCurveTo(4,-2.9,3,0);
    c.quadraticCurveTo(2,2.1,-2.4,2); c.closePath(); c.fill();
    c.fillStyle = pale ? "#ffe4df" : "#f8afba";
    c.fillRect(-1.8,-1.9,2.4,2); c.fillRect(-.2,-.7,2.3,1.5);
  }
  c.restore();
}
