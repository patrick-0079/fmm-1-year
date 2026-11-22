type Garden = "garden" | "challenge";
export interface Drift {
  kind: "rose" | "pearl" | "leaf";
  x: number;
  y: number;
  angle: number;
  turn: number;
  opacity: number;
}

// Centreline samples run continuously under each of the two wooden bridges.
const banks: Record<Garden, readonly (readonly [number, number])[]> = {
  garden: [[586,160],[593,196],[583,230],[587,247],[587,273],[599,302],[595,329],[586,353]],
  challenge: [[232,115],[232,169],[218,210],[224,258],[242,297],[242,334],[238,370],[218,408],[224,449],[212,502]],
};

function floating(scene: Garden, kind: Drift["kind"], age: number, duration: number): Drift | undefined {
  if (age < 0 || age > duration) return;
  const lane = banks[scene], progress = age / duration;
  // Faster in the narrow middle channel, easier at either end.
  const eased = progress - .075 * Math.sin(progress * 2 * Math.PI);
  const y = lane[0][1] + (lane[lane.length - 1][1] - lane[0][1]) * eased;
  const index = lane.findIndex(([, cy]) => cy >= y);
  const [ax, ay] = lane[Math.max(0, index - 1)];
  const [bx, by] = lane[Math.max(1, index)];
  const mix = (y - ay) / (by - ay);
  const wave = Math.sin(age * .7 + (kind === "pearl" ? 1.4 : 0));
  const offset = kind === "rose" ? -3.2 : kind === "pearl" ? 3.4 : 0;
  return {
    kind, y, x: ax + (bx - ax) * mix * mix * (3 - 2 * mix) + offset + wave * 1.7,
    angle: Math.atan2(by - ay, bx - ax) - (kind === "leaf" ? .08 : .75) + wave * .34,
    turn: kind === "rose" ? Math.cos((progress - .19) * Math.PI * 3) : 1,
    opacity: Math.min(1, age * 2, (duration - age) * 2),
  };
}

export function creekDrift(scene: Garden, time: number): Drift[] {
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
