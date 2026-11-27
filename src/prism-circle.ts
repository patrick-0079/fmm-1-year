import { rainbowFlowers } from "./rainbow-flowers";

const turn = Math.PI * 2;
const sector = turn / rainbowFlowers.length;

/** A garden mosaic seen at the same angle as the moonstone circle at the other end. */
export function drawPrismCircle(c: CanvasRenderingContext2D, x: number, y: number, time: number, near: number) {
  c.save();
  c.translate(x, y);
  c.scale(1, .52);

  // Let the lawn show through the spaces between the inlaid stones.
  c.beginPath();
  c.arc(0, 1, 24, 0, turn);
  c.fillStyle = "#344f5940";
  c.fill();

  for (let i = 0; i < rainbowFlowers.length; i++) {
    c.save();
    c.rotate(i * sector);
    const start = -Math.PI / 2 + .15, end = start + sector - .30;
    c.beginPath();
    c.arc(0, 0, 24, start, end);
    c.strokeStyle = "#6c6250";
    c.lineWidth = 3.1;
    c.stroke();
    c.strokeStyle = "#daba8f";
    c.lineWidth = 1.8;
    c.stroke();
    c.beginPath();
    c.arc(0, 0, 24.6, start + .04, end - .18);
    c.strokeStyle = "#fae2b5";
    c.lineWidth = .65;
    c.stroke();
    // Each coloured stone points along one petal of the flower in the centre.
    c.beginPath();
    c.arc(0, 0, 18.4, -Math.PI / 2 + .10, -Math.PI / 2 + sector - .10);
    c.strokeStyle = "#ffebbf";
    c.lineWidth = 1.2;
    c.stroke();
    c.beginPath();
    c.moveTo(0, -27);
    c.lineTo(3.3, -23.3);
    c.lineTo(0, -19.4);
    c.lineTo(-3.3, -23.3);
    c.closePath();
    c.fillStyle = rainbowFlowers[i].color;
    c.fill();
    c.strokeStyle = "#71604c";
    c.lineWidth = 1;
    c.stroke();
    c.beginPath();
    c.moveTo(-2.4, -23.3);
    c.lineTo(0, -26);
    c.lineTo(0, -22.3);
    c.closePath();
    c.fillStyle = "#fff4d9cd";
    c.fill();

    c.beginPath();
    c.moveTo(0, -2);
    c.quadraticCurveTo(-5.5, -7.5, 0, -14);
    c.quadraticCurveTo(4.8, -7, 0, -2);
    c.fillStyle = "#fbdcbe5e";
    c.fill();
    c.strokeStyle = "#ffe6b6";
    c.lineWidth = 1;
    c.stroke();
    c.restore();
  }
  const light = .40 + near * .32 + Math.sin(time * 1.55) * .10;
  const glow = c.createRadialGradient(0, 0, 1, 0, 0, 16);
  glow.addColorStop(0, "#fff4c9b0");
  glow.addColorStop(1, "#fff4c900");
  c.globalAlpha = light;
  c.fillStyle = glow;
  c.fillRect(-16, -16, 32, 32);
  c.beginPath();
  c.arc(0, 0, 2.3, 0, turn);
  c.fillStyle = "#fff8dc";
  c.fill();
  c.restore();
}
