const sources = import.meta.glob<string>("./assets/bass-v20/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
});
export interface BassMix {
  enabled: boolean;
  volume: number;
}
export type BassFailure = "resource" | "permission" | "playback";
const releaseSteps = 16;

/** Each user gesture plays a local take directly; the demo needs just one
 * gesture for the entire track, on browsers that restrict autoplay. */
export class BassAudio {
  private notes = new Map<number, HTMLAudioElement[]>();
  private releasing = new Map<HTMLAudioElement, number>();
  private releaseTimer?: number;
  private demo?: HTMLAudioElement;
  private active?: HTMLAudioElement;
  private playId = 0;
  private releaseErrorListener?: () => void;
  private mix: BassMix = { enabled: true, volume: 0.45 };
  constructor(
    private host: HTMLElement,
    private onEnd: () => void,
    private onFailure: (reason: BassFailure) => void,
  ) {}
  prepare() {
    if (this.demo) return;
    for (const [filename, src] of Object.entries(sources)) {
      const audio = document.createElement("audio");
      audio.hidden = true;
      audio.preload = "auto";
      audio.src = src;
      audio.setAttribute("aria-hidden", "true");
      const note = /note-(\d+)\.wav$/.exec(filename);
      if (note) {
        audio.dataset.bassNote = note[1];
        this.notes.set(Number(note[1]), [audio]);
      } else {
        audio.dataset.bassDemo = "";
        this.demo = audio;
        audio.addEventListener("ended", () => {
          if (this.active === audio) this.onEnd();
        });
      }
      this.host.append(audio);
    }
    this.setMix(this.mix);
  }
  setMix(mix: BassMix) {
    this.mix = mix;
    for (const audio of this.host.querySelectorAll<HTMLAudioElement>("audio")) {
      audio.volume = mix.volume * ((this.releasing.get(audio) ?? releaseSteps) / releaseSteps);
      audio.muted = !mix.enabled || mix.volume === 0;
    }
  }
  // Let a replaced string decay briefly instead of cutting its waveform at an
  // arbitrary sample. Keep play() itself inside the original user gesture.
  private release(audio: HTMLAudioElement) {
    this.releasing.set(audio, releaseSteps);
    this.releaseTimer ??= window.setInterval(() => {
      for (const [take, steps] of this.releasing) {
        const remaining = Math.max(0, steps - 1);
        take.volume = this.mix.volume * remaining / releaseSteps;
        if (take.paused || take.ended || (remaining === 0 && take.volume === 0)) {
          take.pause();
          this.releasing.delete(take);
        } else {
          // Some mobile browsers keep media volume under device control. In
          // that case let the short sample reach the end of its own release.
          this.releasing.set(take, remaining);
        }
      }
      if (!this.releasing.size) {
        clearInterval(this.releaseTimer);
        this.releaseTimer = undefined;
      }
    }, 4);
  }
  private play(audio: HTMLAudioElement) {
    this.releaseErrorListener?.();
    this.releasing.delete(audio);
    if (this.active && this.active !== audio && !this.active.paused && this.active.currentTime > 0) {
      this.release(this.active);
    } else {
      this.active?.pause();
    }
    this.playId++;
    this.active = audio;
    const id = this.playId;
    const failed = (error?: unknown) => {
      if (id === this.playId && this.active === audio) {
        const name = error instanceof DOMException ? error.name : "";
        const reason: BassFailure = name === "NotAllowedError" ? "permission"
          : audio.error || name === "NotSupportedError" ? "resource" : "playback";
        this.stop();
        this.onFailure(reason);
      }
    };
    // play() only reports startup failures. A download or decode can also fail
    // later, after that promise has resolved (especially during the demo).
    const mediaError = () => failed();
    audio.addEventListener("error", mediaError);
    this.releaseErrorListener = () => audio.removeEventListener("error", mediaError);
    try {
      // An errored media element will reject every further play() until its
      // resource selection is restarted. Retry inside this fresh user gesture.
      if (audio.error || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) audio.load();
      audio.volume = this.mix.volume;
      audio.muted = !this.mix.enabled || this.mix.volume === 0;
      audio.currentTime = 0;
      void audio.play().catch(failed);
    } catch {
      failed();
    }
  }
  note(pitch: number) {
    const takes = this.notes.get(pitch);
    if (!takes || !this.mix.enabled || this.mix.volume === 0) return;
    let take = takes.find(audio => !this.releasing.has(audio) &&
      (audio !== this.active || audio.paused || audio.currentTime === 0));
    if (!take) {
      // Rewind only an idle take. The previous pluck can finish its release
      // while the next one begins immediately, even for the same pitch.
      take = takes[0].cloneNode() as HTMLAudioElement;
      this.host.append(take);
      takes.push(take);
    }
    this.play(take);
  }
  listen() {
    if (this.demo) this.play(this.demo);
  }
  get demoTime() {
    return this.demo?.currentTime ?? 0;
  }
  stop() {
    this.playId++;
    this.releaseErrorListener?.();
    this.releaseErrorListener = undefined;
    this.active?.pause();
    this.active = undefined;
    clearInterval(this.releaseTimer);
    this.releaseTimer = undefined;
    for (const take of this.releasing.keys()) take.pause();
    this.releasing.clear();
  }
}
