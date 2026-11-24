import { gustAge } from "./breeze.ts";

/** Each pennant is sewn to the cord. The passing gust only lifts its loose tip. */
export function pennantLift(time: number, index: number) {
  const local = gustAge(time) - index * .15;
  if (local <= 0 || local >= 1.65) return 0;
  const crest = Math.sin(Math.PI * local / 1.65);
  return crest * crest * (.86 + .14 * Math.sin(local * 7));
}

/** From a flat recto to the turned verso, then a rest with both leaves flat. */
export function pageTurn(time: number) {
  const local = (time + 10.5) % 12;
  if (local >= 1.6) return 0;
  const phase = local / 1.6;
  return phase * phase * (3 - 2 * phase);
}
