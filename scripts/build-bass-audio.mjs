// Render our score into local PCM takes. The bright initial harmonics give
// small speakers something to reproduce while the fundamental stays in tune.
import { mkdir, writeFile } from "node:fs/promises";
import {
  bassScore,
  beatSeconds,
  notePitch,
  openPitches,
} from "../src/bass-score.ts";

const directory = new URL("../src/assets/bass-v20/", import.meta.url);
const rate = 24000;
function pluck(pitch, duration) {
  const wave = new Float32Array(Math.ceil(rate * duration));
  const hz = 440 * 2 ** ((pitch - 69) / 12);
  const partials = [1, 0.83, 0.62, 0.37, 0.29, 0.16, 0.105, 0.065];
  for (let i = 0; i < wave.length; i++) {
    const t = i / rate;
    const attack = 1 - Math.exp(-t * 220);
    const release = Math.min(1, (duration - t) / 0.08);
    let sample = 0;
    for (let h = 1; h <= partials.length; h++) {
      const decay = Math.exp(-t * (2.0 + h * 0.6));
      sample += partials[h - 1] * decay * Math.sin(2 * Math.PI * hz * h * t);
    }
    wave[i] = 0.78 * Math.tanh(sample * 0.83) * attack * release;
  }
  return wave;
}
function wav(samples) {
  const output = Buffer.alloc(44 + samples.length * 2);
  output.write("RIFF");
  output.writeUInt32LE(output.length - 8, 4);
  output.write("WAVEfmt ", 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(rate, 24);
  output.writeUInt32LE(rate * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36);
  output.writeUInt32LE(output.length - 44, 40);
  for (let i = 0; i < samples.length; i++)
    output.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767),
      44 + 2 * i,
    );
  return output;
}
await mkdir(directory, { recursive: true });
for (const pitch of new Set([...openPitches, ...bassScore.map(notePitch)]))
  await writeFile(
    new URL("note-" + pitch + ".wav", directory),
    wav(pluck(pitch, 1.36)),
  );
const seconds = bassScore.reduce((sum, n) => sum + n.beats * beatSeconds, 0);
const demo = new Float32Array(Math.ceil(rate * (seconds + 0.22)));
let beat = 0;
for (const note of bassScore) {
  const offset = Math.round(beat * beatSeconds * rate);
  const take = pluck(
    notePitch(note),
    Math.min(1.58, note.beats * beatSeconds + 0.14),
  );
  for (let i = 0; i < take.length; i++) demo[offset + i] += take[i];
  beat += note.beats;
}
await writeFile(new URL("anniversary-demo.wav", directory), wav(demo));
