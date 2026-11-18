const beijingOffsetMs = 8 * 60 * 60 * 1000;

/** A datetime-local input has no time zone. Treat its fields as UTC+8 regardless
 * of the browser's locale, including when the player's local clock uses DST. */
export function formatBeijingInput(timestamp: number): string {
  return new Date(timestamp + beijingOffsetMs).toISOString().slice(0, 19);
}

export function parseBeijingInput(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const exact = value.length === 16 ? value + ":00" : value;
  const timestamp = Date.parse(exact + "+08:00");
  // Some engines normalize invalid dates (e.g. Feb 30) to a different day.
  return Number.isFinite(timestamp) && timestamp >= 0 && formatBeijingInput(timestamp) === exact ? timestamp : null;
}
