/** Cropped from the 2× town artwork in the same map-space rectangle. */
export const pondArtBounds = { x: 642, y: 834, w: 124, h: 76 };

// Closed, tangent-continuous routes; each fish bends through real lily pads.
const routes = [
  [[668,890], [690,880], [708,863], [710,851], [694,854], [674,863], [657,879]],
  [[748,862], [736,856], [718,858], [712,871], [728,885], [746,880], [753,871]],
] as const;

function spline(a: number, b: number, c: number, d: number, t: number) {
  return b + .5 * t * ((c - a) + t * (2*a - 5*b + 4*c - d + t * (3*b - a - 3*c + d)));
}

export function pondFishAt(index: 0 | 1, time: number) {
  const route = routes[index];
  const cycle = index === 0 ? 19 : 23;
  // A tail stroke adds a little forward speed without restarting the route.
  const phase = (time / cycle + (index ? .35 : .12)) * Math.PI * 2;
  const routeTime = (phase + Math.sin(phase * 3) * .085) / (Math.PI * 2);
  const part = ((routeTime % 1 + 1) % 1) * route.length;
  const step = Math.floor(part), u = part - step;
  const a = route[(step + route.length - 1) % route.length];
  const b = route[step], c = route[(step + 1) % route.length], d = route[(step + 2) % route.length];
  const x = spline(a[0], b[0], c[0], d[0], u), y = spline(a[1], b[1], c[1], d[1], u);
  const angle = Math.atan2(spline(a[1], b[1], c[1], d[1], u + .001) - y,
    spline(a[0], b[0], c[0], d[0], u + .001) - x);
  return { x, y, angle };
}
