const sources = import.meta.glob<string>("./assets/bass-v20/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
});
export interface BassMix {
  enabled: boolean;
  volume: number;
}

/** Each user gesture plays a local take directly; the demo needs just one
 * gesture for the entire track, on browsers that restrict autoplay. */
export class BassAudio {
  private notes = new Map<number, HTMLAudioElement>();
  private demo?: HTMLAudioElement;
  private active?: HTMLAudioElement;
  private playId = 0;
  private mix: BassMix = { enabled: true, volume: 0.45 };
  constructor(
    private host: HTMLElement,
    private onEnd: () => void,
    private onFailure: () => void,
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
    const failed = () => {
      if (id === this.playId) {
        this.stop();
        this.onFailure();
      }
    };
    try {
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
    this.active?.pause();
    this.active = undefined;
  }
}
