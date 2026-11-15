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

/** Each user gesture plays a local take directly; the demo needs just one
 * gesture for the entire track, on browsers that restrict autoplay. */
export class BassAudio {
  private notes = new Map<number, HTMLAudioElement>();
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
        this.notes.set(Number(note[1]), audio);
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
      audio.volume = mix.volume;
      audio.muted = !mix.enabled || mix.volume === 0;
    }
  }
  private play(audio: HTMLAudioElement) {
    this.stop();
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
      audio.currentTime = 0;
      void audio.play().catch(failed);
    } catch {
      failed();
    }
  }
  note(pitch: number) {
    const take = this.notes.get(pitch);
    if (take && this.mix.enabled && this.mix.volume > 0) this.play(take);
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
  }
}
