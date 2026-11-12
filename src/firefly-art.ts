/** A small, winged light: muted wings stay visible between the soft abdomen pulses. */
export function drawFirefly(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  phase: number,
  scale = 1,
  opacity = 1,
) {
  // Each insect has its own long breath; the whole patch never flashes at once.
  const breath = Math.pow((1 + Math.sin(time * (.76 + (phase % 3) * .065) + phase * 2.17)) / 2, 2);
  const brightness = .24 + breath * .76;
  const wing = .7 + Math.sin(time * 12 + phase) * .22;
  c.save();
  c.translate(Math.round(x * 2) / 2, Math.round(y * 2) / 2);
  c.scale(scale, scale);
  c.rotate(Math.sin(time * .37 + phase) * .2);

  c.globalCompositeOperation = "screen";
  c.globalAlpha *= opacity;
  const halo = c.createRadialGradient(0, 1, .4, 0, 1, 8.5);
  halo.addColorStop(0, `rgba(224,237,154,${.15 + brightness * .2})`);
  halo.addColorStop(.28, `rgba(216,229,141,${.045 + brightness * .08})`);
  halo.addColorStop(1, "rgba(216,229,141,0)");
  c.fillStyle = halo;
  c.fillRect(-8.5, -7.5, 17, 17);

  // A pair of translucent wings and a moss-brown thorax distinguish a firefly
  // from a floating confetti square, even before its abdomen lights up.
  c.globalCompositeOperation = "source-over";
  c.fillStyle = "#b9caa977";
  c.beginPath();
  c.moveTo(-.35, -.4); c.lineTo(-2.1, -1.1 * wing);
  c.lineTo(-2.8, .2); c.lineTo(-1, .5); c.closePath();
  c.moveTo(.35, -.4); c.lineTo(2, -1.2 * wing);
  c.lineTo(2.7, .1); c.lineTo(.9, .5); c.closePath();
  c.fill();
  c.fillStyle = "#536349b8";
  c.fillRect(-.5, -1.4, 1, 1.6);
  c.fillStyle = `rgba(230,232,155,${.55 + brightness * .35})`;
  c.beginPath(); c.ellipse(0, .9, .85, 1.35, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = `rgba(255,251,205,${.36 + brightness * .56})`;
  c.fillRect(-.35, .6, .7, .9);
  c.restore();
}

/** Lazy, unequal loops around a home patch, never the same rigid circular orbit. */
export function fireflyDrift(time: number, phase: number, spread = 1) {
  return {
    x: (Math.sin(time * .31 + phase * 1.9) * 4 + Math.sin(time * .63 + phase) * 1.5) * spread,
    y: (Math.sin(time * .43 + phase * 2.3) * 2.4 + Math.cos(time * .19 + phase) * 1.7) * spread,
  };
}
