// A breeze crosses a patch of scenery in three seconds. Between the four
// differently spaced passes there are 15, 19, 17 and 22 seconds of still air.
const starts = [2.5, 20.5, 42.5, 62.5];
export function gustAge(time: number) {
  if (time < 0) return -1;
  const clock = time % 85;
  for (const start of starts) {
    if (clock >= start && clock < start + 4) return clock - start;
  }
  return -1;
}

export function breezePulse(time: number, delay = 0, duration = 2.65) {
  const age = gustAge(time) - delay;
  if (age <= 0 || age >= duration) return 0;
  const envelope = Math.sin((age / duration) * Math.PI);
  return envelope * envelope * (0.92 + 0.08 * Math.cos(6.2 * age));
}

export function chimneyPhase(phase: "dawn" | "day" | "dusk" | "night") {
  return phase === "dawn" || phase === "day" ? "bakery" : "books";
}
