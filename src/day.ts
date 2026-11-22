export const DAY_SECONDS = 600;
export type Phase = "dawn" | "day" | "dusk" | "night";
export const phaseNames: Record<Phase, string> = {
  dawn: "清晨",
  day: "白昼",
  dusk: "黄昏",
  night: "星夜",
};
export function worldTime(elapsed: number) {
  const safe = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const hours = ((((safe / DAY_SECONDS) * 24 + 8) % 24) + 24) % 24;
  const phase: Phase =
    hours >= 5 && hours < 8
      ? "dawn"
      : hours >= 8 && hours < 17
        ? "day"
        : hours >= 17 && hours < 20
          ? "dusk"
          : "night";
  return {
    hours,
    phase,
    day: Math.floor(((safe / DAY_SECONDS) * 24 + 8) / 24) + 1,
    label: `${String(Math.floor(hours)).padStart(2, "0")}:${String(Math.floor((hours % 1) * 60)).padStart(2, "0")}`,
  };
}
export function untilNextPhase(elapsed: number, displayedPhase = worldTime(elapsed).phase) {
  const nextHour = { dawn: 8, day: 17, dusk: 20, night: 5 }[displayedPhase];
  const hoursAhead = (nextHour - worldTime(elapsed).hours + 24) % 24;
  return hoursAhead / 24 * DAY_SECONDS + 0.01;
}
export function eggAvailable(id: string, phase: Phase) {
  return id === "dew"
    ? phase === "dawn"
    : id === "sunset"
      ? phase === "dusk"
      : id === "firefly"
        ? phase === "night"
        : true;
}
