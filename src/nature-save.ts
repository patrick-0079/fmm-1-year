import { DAY_SECONDS } from "./day.ts";

export const WORLD_CLOCK_KEY = "fufu-world-clock-v2";
const legacyClockKey = "fufu-world-clock-v1";
const legacyDaySeconds = 10 * 60;
type WorldClock = { origin: number; shift: number };

function parseClock(raw: string | null, now: number): WorldClock | null {
  if (!raw) return null;
  try {
    const clock = JSON.parse(raw);
    if (clock && Number.isFinite(clock.origin) && clock.origin > 0 && clock.origin <= now &&
        Number.isFinite(clock.shift) && clock.shift >= 0) {
      return { origin: clock.origin, shift: clock.shift };
    }
  } catch { /* A damaged clock can start again independently of the garden bag. */ }
  return null;
}

export function loadWorldClock(storage: Pick<Storage, "getItem" | "setItem">, now: number): WorldClock {
  const raw = storage.getItem(WORLD_CLOCK_KEY);
  const current = parseClock(raw, now);
  if (current) return current;
  const clock = { origin: now, shift: 0 };
  if (raw === null) {
    const old = parseClock(storage.getItem(legacyClockKey), now);
    if (old) {
      // Include bench jumps and offline time at the old rate up to this first visit.
      const elapsed = (now - old.origin) / 1000 + old.shift;
      const shift = elapsed * (DAY_SECONDS / legacyDaySeconds);
      if (Number.isFinite(shift)) clock.shift = shift;
    }
  }
  try { storage.setItem(WORLD_CLOCK_KEY, JSON.stringify(clock)); } catch { /* Continue with the recovered in-memory clock. */ }
  return clock;
}

interface NatureSave {
  picked: Record<string, number>;
  apple: number;
  flower: number;
  star: number;
  wearing: boolean;
  wreath: boolean;
}
export const NATURE_KEY = "fufu-garden-bag-v1";
export function readGardenBag(raw: string | null = null): NatureSave {
  const state: NatureSave = {
    picked: {}, apple: 0, flower: 0, star: 0, wearing: false, wreath: false,
  };
  if (!raw) return state;
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      for (const field of ["apple", "flower", "star"] as const)
        if (Number.isInteger(data[field]) && data[field] >= 0)
          state[field] = Math.min(data[field], 9999);
      state.wearing = data.wearing === true;
      state.wreath =
        data.wreath === true ||
        data.wearing === true ||
        (Number.isInteger(data.flower) && data.flower > 0);
      if (
        data.picked &&
        typeof data.picked === "object" &&
        !Array.isArray(data.picked)
      ) {
        for (const [key, count] of Object.entries(data.picked))
          if (
            /^\d+:(garden|challenge):[a-z]+$/.test(key) &&
            typeof count === "number" &&
            count >= 0 &&
            count <= 3
          )
            state.picked[key] = Math.floor(count);
      }
    }
  } catch {
    /* Keep the initial values for a damaged save. */
  }
  return state;
}

export function pickedGardenEggs(bag: NatureSave) {
  const recorded = new Set(Object.entries(bag.picked)
    .filter(([, count]) => count > 0)
    .map(([key]) => key.split(":").at(-1)));
  return (["dew", "sunset", "firefly"] as const).filter(id => recorded.has(id));
}
