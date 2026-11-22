import type { GardenPerformer } from "./garden-residents";
import { drawPartyProp } from "./party-art";
import { drawResidentWalk, prepareResidentWalk, residentWalkFrame } from "./resident-walk";
import { drawIdlePose, sceneArt } from "./scene-art";

// Fingertip offsets from the feet, measured on the respective drawings.
// The walking sheet uses 80 art pixels for a 42 map-pixel figure.
const idleHands = [[-8.2, -14.8], [-13.3, -21.4], [-7.2, -21.4]] as const;
const walkHands = {
  front: [[-12, -33], [-12, -32], [-14, -27], [-11, -33]],
  side: [[19, -35], [-3, -26], [-13, -28], [15, -38]],
  back: [[-14, -30], [-14, -28], [-14, -29], [-14, -27]],
} as const;
const origin = { x: 0, y: 0 };

export function drawBalloonGuest(c: CanvasRenderingContext2D, actor: GardenPerformer, time: number, settled: boolean) {
  const walking = actor.moving && !settled && !!prepareResidentWalk("balloon-friend");
  const age = settled || walking ? 3 : (time + 9.7) % 12.3;
  const frame = age >= .42 && age < 1.24 ? 1 : age >= 1.24 && age < 1.99 ? 2 : 0;
  let handX: number = idleHands[frame][0], handY: number = idleHands[frame][1];
  let side = -1;
  if (walking) {
    const row = actor.facing === 0 ? "front" : actor.facing === 3 ? "back" : "side";
    const [x, y] = walkHands[row][residentWalkFrame("balloon-friend", actor.step)];
    handX = x * 42 / 80 * (actor.facing === 1 ? -1 : 1);
    handY = y * 42 / 80;
    if (actor.facing === 2) side = 1;
  }

  const blow = age < 1.22 ? (1 - Math.cos(Math.PI * age / 1.22)) / 2 :
    age < 2.55 ? (1 + Math.cos(Math.PI * (age - 1.22) / 1.33)) / 2 : 0;
  const settle = age > 1.45 && age < 2.6 ? Math.sin((age - 1.45) / 1.15 * Math.PI) * 2.1 : 0;
  const ballX = side * (19 + blow * 7.8 - settle);
  const ballY = -47 - blow * 4.6 + settle * .6;
  c.save();
  c.translate(actor.foot.x, actor.foot.y);
  c.strokeStyle = "#78546a";
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(ballX + 1.9, ballY + 10.5);
  c.quadraticCurveTo((ballX + handX) / 2 - side * (1 - blow) * 4, (ballY + handY) / 2 + 8, handX, handY);
  c.stroke();
  drawPartyProp(c, 0, ballX - 7.5, ballY - 15, 15, 26.5);
  if (walking) drawResidentWalk(c, "balloon-friend", origin, actor.facing, actor.step, 42);
  else drawIdlePose(c, sceneArt.balloonGuest, frame, 0, 0, 48);

  if (!settled && age >= 2.15 && age < 3.4 && !walking) {
    const loop = Math.sin((age - 2.15) * Math.PI / 1.25);
    c.beginPath();
    c.ellipse(handX - .4, handY - .8, 1.6 * loop, .82, -.4, 0, Math.PI * 2);
    c.strokeStyle = "#a07c77";
    c.lineWidth = .55;
    c.stroke();
  }
  c.restore();
}
