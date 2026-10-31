let context: AudioContext | undefined;
let enabled = false;
export function setSound(value: boolean) {
  enabled = value;
  if (enabled) {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
  }
}
export function chime(success = false) {
  if (!enabled || !context || document.hidden) return;
  const now = context.currentTime;
  (success ? [523.25, 659.25, 783.99] : [659.25]).forEach((frequency, i) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now + i * 0.09);
    gain.gain.linearRampToValueAtTime(0.055, now + i * 0.09 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.3);
    oscillator.connect(gain).connect(context!.destination);
    oscillator.start(now + i * 0.09);
    oscillator.stop(now + i * 0.09 + 0.32);
  });
}
