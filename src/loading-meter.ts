export function showResourceCount(meter: HTMLProgressElement, loaded: number, total: number) {
  meter.max = total;
  meter.value = loaded;
  const ratio = `${loaded}/${total}`;
  meter.setAttribute("aria-valuetext", ratio);
  meter.nextElementSibling!.textContent = ratio;
}
