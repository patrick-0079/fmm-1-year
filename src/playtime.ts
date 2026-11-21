/** The scenery clock can skip to dusk. The stamp book counts only real, visible play. */
export const PLAYTIME_KEY = "fufu-foreground-play-v1";
const STEP = 2000;
const MAX_GAP = 15000;

interface ClockRecord {
  milliseconds: number;
  through: number;
  epoch: string;
}
function readClock(raw: string | null): ClockRecord {
  try {
    const record = JSON.parse(raw ?? "null") as ClockRecord | null;
    if (record && Number.isSafeInteger(record.milliseconds) && record.milliseconds >= 0 &&
        Number.isSafeInteger(record.through) && record.through >= 0 && typeof record.epoch === "string") return record;
  } catch { /* Missing or damaged clock starts at zero. */ }
  return { milliseconds: 0, through: 0, epoch: "" };
}

export function addForegroundTime(record: ClockRecord, from: number, until: number): ClockRecord {
  if (until <= from || until - from > MAX_GAP) return record;
  const duration = until - Math.max(from, record.through);
  return duration > 0 ? { ...record, milliseconds: record.milliseconds + duration, through: until } : record;
}

export class ForegroundPlayClock {
  private storage: Storage | null = null;
  private record: ClockRecord;
  private started = false;
  private away = false;
  private previous = 0;
  private timer?: ReturnType<typeof setInterval>;
  private pending?: AbortController;
  private release?: () => void;

  private readonly onChange: () => void;
  private readonly onSharedReset: () => void;

  constructor(onChange: () => void, onSharedReset: () => void = () => {}) {
    this.onChange = onChange;
    this.onSharedReset = onSharedReset;
    try { this.storage = window.localStorage; } catch { /* Play in memory. */ }
    this.record = this.read();
    document.addEventListener("visibilitychange", () => this.sync());
    window.addEventListener("offline", () => this.sync());
    window.addEventListener("online", () => this.sync());
    window.addEventListener("pagehide", () => { this.away = true; this.sync(); });
    window.addEventListener("pageshow", () => { this.away = false; this.sync(); });
    window.addEventListener("storage", e => {
      if (e.key !== PLAYTIME_KEY && e.key !== null) return;
      const next = this.read();
      if (next.epoch !== this.record.epoch) {
        this.acceptReset(next);
        return;
      }
      this.record = next;
      this.onChange();
    });
  }
  get seconds() { return Math.floor(this.record.milliseconds / 1000); }
  start() { this.started = true; this.sync(); }
  reset(started: boolean) {
    this.started = false;
    this.sync();
    this.write({ milliseconds: 0, through: 0, epoch: crypto.randomUUID?.() ?? String(Date.now()) });
    if (started) this.start();
  }
  private now() { return Math.floor(performance.timeOrigin + performance.now()); }
  private read(): ClockRecord {
    try { if (this.storage) return readClock(this.storage.getItem(PLAYTIME_KEY)); } catch { this.storage = null; }
    return this.record ?? readClock(null);
  }
  private write(next: ClockRecord) {
    this.record = next;
    try { this.storage?.setItem(PLAYTIME_KEY, JSON.stringify(next)); } catch { this.storage = null; }
  }
  private acceptReset(next: ClockRecord) {
    clearInterval(this.timer);
    this.timer = undefined;
    this.record = next;
    this.started = false;
    this.sync();
    this.onSharedReset();
  }
  private sample() {
    const now = this.now(), shared = this.read();
    // Another tab may have reset the game before its storage event gets delivered.
    if (shared.epoch !== this.record.epoch) { this.acceptReset(shared); return; }
    const next = addForegroundTime(shared, this.previous, now);
    this.previous = now;
    if (next !== shared) this.write(next);
    else this.record = shared;
    this.onChange();
  }
  private beginSampling() {
    this.record = this.read();
    this.previous = this.now();
    this.timer = setInterval(() => this.sample(), STEP);
  }
  private sync() {
    if (!this.started || this.away || document.hidden || !navigator.onLine) {
      if (this.timer !== undefined) { clearInterval(this.timer); this.timer = undefined; this.sample(); }
      this.pending?.abort();
      this.pending = undefined;
      this.release?.();
      this.release = undefined;
      return;
    }
    if (this.timer !== undefined || this.pending) return;
    if (!navigator.locks) { this.beginSampling(); return; }
    // Two visible windows share one stopwatch. Queued tabs take over on hide or exit.
    const request = new AbortController();
    this.pending = request;
    void navigator.locks.request(PLAYTIME_KEY, { signal: request.signal }, async () => {
      if (request.signal.aborted) return;
      this.beginSampling();
      await new Promise<void>(done => { this.release = done; });
    }).catch(() => {
      if (request.signal.aborted) return;
      this.pending = undefined;
      this.beginSampling();
    });
  }
}
