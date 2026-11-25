const windowMs = 5000;

export class DownloadRate {
  private samples: { start: number; end: number; bytes: number; source?: string }[] = [];
  bytes = 0;
  add(bytes: number, end: number, duration = 0, source?: string) {
    if (!(bytes > 0) || !Number.isFinite(bytes)) return;
    if (!source) this.bytes += bytes;
    this.trim(end);
    const last = this.samples.at(-1);
    if (!duration && last && last.source === source && last.start === last.end && end - last.end < 100) last.bytes += bytes;
    else this.samples.push({ start: end - Math.max(0, duration), end, bytes, source });
  }
  forget(source: string) { this.samples = this.samples.filter(sample => sample.source !== source); }
  private trim(now: number) {
    while (this.samples.length && this.samples[0].end <= now - windowMs) this.samples.shift();
  }
  perSecond(now: number) {
    this.trim(now);
    let bytes = 0;
    for (const sample of this.samples) {
      const duration = sample.end - sample.start;
      bytes += sample.bytes * (duration ? Math.min(1, (sample.end - now + windowMs) / duration) : 1);
    }
    return Math.max(0, bytes * 1000 / windowMs);
  }
}

export function rateLabel(bytes: number) {
  return bytes >= 1048576 ? (bytes / 1048576).toFixed(2) + " MiB/s" :
    bytes >= 1024 ? (bytes / 1024).toFixed(1) + " KiB/s" : Math.round(bytes) + " B/s";
}
