export const OPEN_AT = Date.parse("2026-12-01T22:10:00+08:00");
const previewKey = "fufu-launch-preview-v1";
const latestPreview = Date.parse("9999-12-31T23:59:59.999+08:00");

function validPreview(value: number) {
  return Number.isSafeInteger(value) && value >= 0 && value <= latestPreview;
}

export function getDeadline(debug: boolean): number {
  if (!debug) return OPEN_AT;
  try {
    const stored = sessionStorage.getItem(previewKey);
    if (stored && /^\d+$/.test(stored)) {
      const time = Number(stored);
      if (validPreview(time)) return time;
    }
  } catch { /* Storage can be disabled on otherwise playable browsers. */ }
  return OPEN_AT;
}

export function setDebugDeadline(value: number | null): void {
  if (value === null) sessionStorage.removeItem(previewKey);
  else {
    if (!validPreview(value))
      throw new RangeError("开放时间无效");
    sessionStorage.setItem(previewKey, String(value));
  }
}

export function countdownParts(deadline: number, now: number) {
  const total = Math.max(0, Math.ceil((deadline - now) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor(total / 3600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
}
