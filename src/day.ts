export const REAL_MINUTES_PER_DAY = 24;
export const DAY_SECONDS = REAL_MINUTES_PER_DAY * 60;
const MINUTES_PER_WORLD_DAY = 24 * 60;
const worldMinutesPerSecond = MINUTES_PER_WORLD_DAY / DAY_SECONDS;

function clockMinutes(elapsed: number) {
  const seconds = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return 8 * 60 + seconds * worldMinutesPerSecond;
}
export type Phase = "dawn" | "day" | "dusk" | "night";
export const phaseNames: Record<Phase, string> = {
  dawn: "清晨",
  day: "白昼",
  dusk: "黄昏",
  night: "星夜",
};
export function worldTime(elapsed: number) {
  const total = clockMinutes(elapsed);
  const minuteOfDay = total % MINUTES_PER_WORLD_DAY;
  const hours = minuteOfDay / 60;
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
    day: Math.floor(total / MINUTES_PER_WORLD_DAY) + 1,
    label: `${String(Math.floor(hours)).padStart(2, "0")}:${String(Math.floor(minuteOfDay) % 60).padStart(2, "0")}`,
  };
}
export function untilNextPhase(elapsed: number, displayedPhase = worldTime(elapsed).phase) {
  const nextHour = { dawn: 8, day: 17, dusk: 20, night: 5 }[displayedPhase];
  const ahead = nextHour * 60 - clockMinutes(elapsed) % MINUTES_PER_WORLD_DAY;
  return (ahead < 0 ? ahead + MINUTES_PER_WORLD_DAY : ahead) / worldMinutesPerSecond;
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
