/** An original four-bar miniature in G major for the cottage's four-string bass. */
export const bassStrings = ["E", "A", "D", "G"] as const;
export type BassString = 0 | 1 | 2 | 3;
export const openPitches = [28, 33, 38, 43] as const;
export const beatSeconds = 60 / 82;
export const bassSongTitle = "把晚安弹给你";
export interface BassNote {
  string: BassString;
  fret: number;
  beats: number;
  word: string;
}
const note = (
  string: BassString,
  fret: number,
  beats: number,
  word: string,
): BassNote => ({ string, fret, beats, word });
export const bassScore: readonly BassNote[] = [
  note(0, 3, 1, "窗"),
  note(1, 2, 0.5, "边"),
  note(2, 0, 0.5, "星"),
  note(3, 0, 2, "光"),
  note(3, 2, 0.5, "落"),
  note(3, 4, 0.5, "在"),
  note(3, 2, 1, "琴"),
  note(2, 5, 2, "弦"),
  note(2, 2, 1, "周"),
  note(2, 0, 1, "年"),
  note(1, 2, 1, "快"),
  note(1, 0, 1, "乐"),
  note(1, 2, 1, "芙"),
  note(2, 0, 0.5, "芙"),
  note(1, 0, 0.5, "晚"),
  note(0, 3, 2, "安"),
];
export const notePitch = (n: BassNote) => openPitches[n.string] + n.fret;

/** Practice waits for the player. Listening is a separate playhead and never earns progress. */
export class BassLesson {
  played = 0;
  preview: number | null = null;
  private started = 0;
  get complete() {
    return this.played === bassScore.length;
  }
  get shown() {
    return this.preview ?? Math.min(this.played, bassScore.length - 1);
  }
  pluck(string: BassString) {
    if (this.preview !== null) return null;
    const next = bassScore[this.played];
    if (!next || next.string !== string)
      return { pitch: openPitches[string], matched: false, finished: false };
    this.played++;
    return { pitch: notePitch(next), matched: true, finished: this.complete };
  }
  listen(now: number) {
    this.preview = 0;
    this.started = now;
    return bassScore[0];
  }
  stopListening() {
    this.preview = null;
  }
  // The demo is one recorded take. Show the note at its real media playhead,
  // even when buffering or after a slow frame; never replay skipped notes.
  advance(now: number) {
    if (this.preview === null) return undefined;
    const elapsed = now - this.started;
    let end = 0;
    for (const [index, n] of bassScore.entries()) {
      end += n.beats * beatSeconds;
      if (elapsed + 1e-8 < end) {
        if (index === this.preview) return undefined;
        this.preview = index;
        return n;
      }
    }
    this.stopListening();
    return null;
  }
}
