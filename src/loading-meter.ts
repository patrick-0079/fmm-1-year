export function resourceMeter(className: string, label: string) {
  return `<div class="resource-meter"><div class="resource-track" aria-hidden="true"><i class="resource-fill"></i><i class="resource-runner"></i></div><progress class="${className}" aria-label="${label}"></progress><span class="resource-count" aria-hidden="true"></span></div>`;
}

export function showResourceCount(meter: HTMLProgressElement, loaded: number, total: number, fallback = false) {
  meter.max = total || 1;
  meter.value = loaded;
  const percent = total > 0 && loaded >= total ? 100 : Math.min(99.9, total > 0 ? 100 * loaded / total : 0);
  const ratio = (fallback ? "站内补载 " : "") + percent.toFixed(1) + "%";
  meter.setAttribute("aria-valuetext", ratio);
  meter.nextElementSibling!.textContent = ratio;
  meter.parentElement!.style.setProperty("--ready", percent + "%");
}
