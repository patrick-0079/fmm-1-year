// Original, locally synthesized music and effects. No downloads or audio service.
import type { SceneId } from "./maps";
let context: AudioContext | undefined;
let master: GainNode | undefined;
let music: GainNode | undefined;
let effects: GainNode | undefined;
let enabled = true,
  bgm = true,
  volume = 0.45,
  ducked = false;
let scene: SceneId = "room",
  nextNote = 0,
  step = 0;
let scheduler: ReturnType<typeof setInterval> | undefined;
const melody = [
  72, 76, 79, 76, 74, 76, 79, 83, 81, 79, 76, 74, 72, 76, 74, 67, 69, 72, 76,
  79, 77, 76, 74, 72, 71, 74, 79, 77, 76, 74, 72, -1,
];
const midi = (note: number) => 440 * 2 ** ((note - 69) / 12);
function tone(
  note: number,
  time: number,
  duration: number,
  level: number,
  bus: GainNode,
  type: OscillatorType = "sine",
) {
  if (!context) return;
  const oscillator = context.createOscillator(),
    gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = midi(note);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(level, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(gain).connect(bus);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.03);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}
function levels() {
  if (!context || !master || !music || !effects) return;
  master.gain.setTargetAtTime(volume, context.currentTime, 0.06);
  music.gain.setTargetAtTime(
    bgm && !document.hidden ? (ducked ? 0.04 : 0.28) : 0,
    context.currentTime,
    0.15,
  );
  effects.gain.setTargetAtTime(enabled ? 0.42 : 0, context.currentTime, 0.03);
}
export function unlockAudio() {
  context ??= new AudioContext();
  if (!master) {
    master = context.createGain();
    music = context.createGain();
    effects = context.createGain();
    music.connect(master);
    effects.connect(master);
    master.connect(context.destination);
    nextNote = context.currentTime + 0.05;
    scheduler = setInterval(() => {
      if (
        !context ||
        !music ||
        document.hidden ||
        context.state !== "running" ||
        !bgm
      ) {
        nextNote = (context?.currentTime ?? 0) + 0.05;
        return;
      }
      if (nextNote < context.currentTime) nextNote = context.currentTime + 0.02;
      const beat =
        scene === "challenge" ? 0.3 : scene === "garden" ? 0.34 : 0.39;
      while (nextNote < context.currentTime + 0.15) {
        const note = melody[step % melody.length];
        if (note > 0) {
          tone(note, nextNote, beat * 2.4, 0.13, music);
          tone(note + 12, nextNote, beat * 1.6, 0.018, music, "triangle");
        }
        if (step % 4 === 0) {
          const root = [48, 45, 53, 55][Math.floor(step / 8) % 4];
          tone(root, nextNote, beat * 4, 0.12, music);
          tone(root + 7, nextNote + beat, beat * 2.5, 0.055, music);
        }
        step++;
        nextNote += beat;
      }
    }, 60);
  }
  levels();
  void context.resume().catch(() => {});
}
export function setSound(value: boolean) {
  enabled = value;
  levels();
}
export function setMusic(value: boolean) {
  bgm = value;
  levels();
}
export function setVolume(value: number) {
  volume = Math.max(0, Math.min(1, value));
  levels();
}
export function setMusicScene(value: SceneId) {
  scene = value;
}
export function duckMusic(value: boolean) {
  ducked = value;
  levels();
}
export function sfx(name: string) {
  if (!enabled || !context || !effects || document.hidden) return;
  const notes: Record<string, number[]> = {
    step: [41],
    interact: [79],
    complete: [72, 76, 79, 84],
    checkpoint: [76, 79, 84],
    stumble: [62, 58, 53],
    revive: [67, 72, 76],
    portal: [72, 79],
    blow: [83, 79, 74],
    slice: [88, 81],
    flip: [76],
    match: [76, 83],
    inflate: [72, 74],
    release: [76, 81, 88],
    launch: [60, 72, 84],
    burst: [84, 79, 88, 91],
  };
  (notes[name] ?? notes.interact).forEach((note, i) =>
    tone(
      note,
      context!.currentTime + i * 0.065,
      name === "step" ? 0.045 : 0.28,
      name === "step" ? 0.04 : 0.12,
      effects!,
      "triangle",
    ),
  );
  if (["burst", "blow", "slice"].includes(name)) {
    const buffer = context.createBuffer(
      1,
      context.sampleRate * 0.3,
      context.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
    const source = context.createBufferSource(),
      gain = context.createGain(),
      filter = context.createBiquadFilter();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = name === "blow" ? 700 : 1800;
    gain.gain.value = 0.07;
    source.connect(filter).connect(gain).connect(effects);
    source.start();
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }
}
export function chime(success = false) {
  sfx(success ? "complete" : "interact");
}
document.addEventListener("visibilitychange", () => {
  levels();
  if (document.hidden) void context?.suspend();
  else if (context) {
    nextNote = context.currentTime + 0.05;
    void context.resume().catch(() => {});
  }
});
window.addEventListener("pagehide", (event) => {
  if (event.persisted) {
    void context?.suspend();
    return;
  }
  clearInterval(scheduler);
  void context?.close();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted && context && !document.hidden) {
    nextNote = context.currentTime + 0.05;
    void context.resume().catch(() => {});
  }
});
