export function resourceMeter(className: string, label: string) {
  return `<div class="resource-meter"><div class="resource-track" aria-hidden="true"><i class="resource-fill"></i><i class="resource-runner"></i></div><progress class="${className}" aria-label="${label}"></progress><span class="resource-count" aria-hidden="true"></span></div>`;
}

export function showResourceCount(meter: HTMLProgressElement, loaded: number, total: number) {
  meter.max = total;
  meter.value = loaded;
  const ratio = `${loaded}/${total}`;
  meter.setAttribute("aria-valuetext", ratio);
  meter.nextElementSibling!.textContent = ratio;
  meter.parentElement!.style.setProperty("--ready", total ? `${100 * loaded / total}%` : "0%");
}
