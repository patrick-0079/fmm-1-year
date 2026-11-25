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
