import type { SceneId } from "./maps";

// 《把晚安留给你》. Six eighth notes to a bar: two gentle sways.
// Each chord is voiced from its bass up. The melody breathes between phrases.
const harmony = [
  [41, 53, 57, 60, 64], [40, 52, 55, 60, 62], [38, 53, 57, 60, 64], [36, 52, 55, 60, 64],
  [34, 53, 57, 62, 65], [33, 52, 57, 60, 64], [43, 53, 58, 62, 65], [36, 52, 55, 58, 62],
];
type Note = readonly [pulse: number, pitch: number, duration: number];
const melody: readonly (readonly Note[])[] = [
  [[1,69,2],[3,72,2],[5,74,1]], [[0,72,3],[4,67,2]],
  [[0,69,2],[2,65,1],[3,64,2]], [[0,67,4]],
  [[1,65,2],[3,69,2],[5,72,1]], [[0,71,1],[1,69,2],[3,64,2]],
  [[0,65,2],[2,67,1],[3,70,2]], [[0,67,4]],
  [[0,72,2],[2,74,1],[3,76,2]], [[0,74,3],[4,72,2]],
  [[0,77,2],[2,76,1],[3,74,2]], [[0,72,4]],
  [[1,74,1],[2,77,1],[3,81,2]], [[0,79,2],[2,76,1],[3,72,2]],
  [[0,74,2],[3,70,2]], [[0,67,3],[4,64,1]],
  [[1,69,2],[3,72,2],[5,74,1]], [[0,72,3],[4,67,2]],
  [[0,69,2],[2,65,1],[3,64,2]], [[0,67,4]],
  [[0,70,2],[2,69,1],[3,65,2]], [[0,64,2],[3,69,2]],
  [[0,67,2],[3,64,2]], [[0,65,5]],
];
const orchestration = {
  room:      { tempo: 48, harp: 0.65, pad: 0.81, bell: 0.48 },
  garden:    { tempo: 52, harp: 1.00, pad: 0.68, bell: 0.75 },
  challenge: { tempo: 50, harp: 0.75, pad: 0.96, bell: 0.54 },
  town:      { tempo: 54, harp: 0.90, pad: 0.74, bell: 0.88 },
  meadow:    { tempo: 47, harp: 0.93, pad: 0.88, bell: 0.82 },
} as const;
export const eighthLength = (scene: SceneId) => 60 / orchestration[scene].tempo / 3;
export const lullabyPulses = melody.length * 6;
type Voice = "keys" | "harp" | "bass" | "pad" | "bell";
const timbres: Record<Voice, { harmonics: number[]; pan: number; cutoff: number; attack: number }> = {
  keys: { harmonics: [1,.40,.16,.09,.035], pan: -.12, cutoff: 2650, attack: .021 },
  harp: { harmonics: [1,.40,.12,.09,.04,.02], pan: .35, cutoff: 2400, attack: .014 },
  bass: { harmonics: [1,.36,.12,.04], pan: -.03, cutoff: 630, attack: .095 },
  pad:  { harmonics: [1,.43,.18,.10,.05], pan: -.37, cutoff: 1180, attack: .38 },
  bell: { harmonics: [1,.05,.31,0,.10,.024], pan: .18, cutoff: 3650, attack: .025 },
};

export function createLullaby(context: BaseAudioContext, output: AudioNode) {
  const mix = context.createGain();
  mix.connect(output);
  // Short, quiet early reflections give the parts a shared room without a
  // downloaded impulse response or a long wash over the ASMR soundtrack.
  for (const [seconds, pan, level] of [[.113, -.56, .12], [.229, .65, .075], [.331, -.2, .04]]) {
    const delay = context.createDelay(.5), filter = context.createBiquadFilter();
    const gain = context.createGain(), stereo = context.createStereoPanner();
    delay.delayTime.value = seconds;
    filter.frequency.value = 1650;
    gain.gain.value = level;
    stereo.pan.value = pan;
    mix.connect(delay).connect(filter).connect(gain).connect(stereo).connect(output);
  }
  function makeVoice(name: Voice) {
    const t = timbres[name], filter = context.createBiquadFilter(), stereo = context.createStereoPanner();
    filter.frequency.value = t.cutoff;
    filter.Q.value = .35;
    stereo.pan.value = t.pan;
    filter.connect(stereo).connect(mix);
    const coefficients = new Float32Array([0, ...t.harmonics]);
    const wave = context.createPeriodicWave(new Float32Array(coefficients.length), coefficients);
    return (pitch: number, start: number, duration: number, level: number) => {
      const osc = context.createOscillator(), envelope = context.createGain();
      osc.setPeriodicWave(wave);
      osc.frequency.value = 440 * 2 ** ((pitch - 69) / 12);
      const end = start + duration, attack = Math.min(t.attack, duration / 3);
      const sustain = name === "pad" || name === "bass";
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(level, start + attack);
      envelope.gain.exponentialRampToValueAtTime(level * (sustain ? .70 : .33), start + duration * .52);
      envelope.gain.exponentialRampToValueAtTime(.00008, end);
      envelope.gain.linearRampToValueAtTime(0, end + .015);
      osc.connect(envelope).connect(filter);
      osc.start(start);
      osc.stop(end + .02);
      osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
    };
  }
  const keys = makeVoice("keys"), harp = makeVoice("harp"), bass = makeVoice("bass");
  const pad = makeVoice("pad"), bell = makeVoice("bell");
  return (step: number, time: number, scene: SceneId) => {
    const bar = Math.floor(step / 6) % melody.length, pulse = step % 6;
    const part = orchestration[scene], beat = eighthLength(scene);
    const closing = bar >= 22;
    const chord = closing ? harmony[bar === 22 ? 7 : 0] : harmony[bar % harmony.length];
    // Lower the intensity in the last two bars and resolve to F before looping.
    const swell = closing ? .78 : bar >= 8 && bar < 16 ? 1.08 : .91;
    if (pulse === 0) {
      bass(chord[0], time, beat * 5.4, .21 * swell);
      for (let i = 1; i <= 3; i++) pad(chord[i], time + i * .014, beat * 6.6, .047 * part.pad * swell);
    }
    if (pulse === 0 || pulse === 2 || pulse === 3 || (pulse === 5 && !closing)) {
      const string = pulse === 0 ? 1 : pulse === 2 ? 2 : pulse === 3 ? 3 : 4;
      harp(chord[string], time + (pulse % 3) * .009, beat * 2.6, (pulse % 3 ? .089 : .12) * part.harp * swell);
    }
    for (const [on, pitch, length] of melody[bar]) {
      if (on === pulse) keys(pitch, time + .01, beat * length + .40, .26 * swell);
    }
    if (bar % 4 === 3 && pulse === 4 && !closing)
      bell(chord[4] + 12, time + .028, beat * 3.8, .072 * part.bell);
    if (bar >= 8 && bar < 16 && pulse === 1 && bar % 2 === 0)
      bell(chord[2] + 12, time + .05, beat * 4, .052 * part.bell);
  };
}
