const paths: Record<string, string> = {
  heart:
    '<path d="M4 3h4v2h2V3h4v2h2v5h-2v2h-2v2h-2v2H8v-2H6v-2H4v-2H2V5h2Z"/>',
  star: '<path d="M8 1h2v5h5v2h-2v2h1v5h-3v-2H7v2H4v-5h1V8H3V6h5Z"/>',
  gift: '<path d="M8 5H3v4h5v7H3V9H1V5h4V3h3v2Zm2 0V3h3v2h4v4h-2v7h-5V9h5V7h-5v9H8V7H3v2h5V5Zm0-2H8V1h2Z"/>',
  cake: '<path d="M8 1h2v2H8zm0 3h2v3H8zM4 7h10v2H4zM2 9h14v6H2zm-1 6h16v2H1z"/>',
  balloon: '<path d="M5 1h8v2h2v8h-2v2h-2v2H9v2H7v-2h2v-2H5v-2H3V3h2Z"/>',
  tv: '<path d="M4 1h2v2h2v2h2V3h2V1h2v2h-2v2h4v12H2V5h4V3H4zm0 6v8h10V7Zm2 3h2v2H6zm4 0h2v2h-2Z"/>',
  mail: '<path d="M1 4h16v12H1zm2 2v2h2v2h2v2h4v-2h2V8h2V6h-2v2h-2v2H7V8H5V6Z"/>',
  sound: '<path d="M7 3h2v12H7v-2H5v-2H1V7h4V5h2zm4 3h2v6h-2zm3-3h2v12h-2Z"/>',
  effects: '<path d="M1 8h2v3H1zm4-4h2v10H5zm4-3h2v16H9zm4 5h2v7h-2zm3 2h2v3h-2z"/>',
  effectsOff: '<path d="M1 8h2v3H1zm4-4h2v10H5zm4-3h2v16H9z"/><path d="m12 6 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  backpack: '<g stroke="currentColor" stroke-width="1.45" stroke-linejoin="round"><path d="M6.7 5V3.9a2.3 2.3 0 0 1 4.6 0V5" fill="none"/><rect x="3.2" y="4.5" width="11.6" height="11.2" rx="3" fill="#e8b8bd"/><path d="M3.3 7.1c2.6 2.4 8.8 2.4 11.4 0" fill="none"/><rect x="7.45" y="8" width="3.1" height="3.4" rx=".9" fill="#fff3de"/></g>',
  mute: '<path d="M7 3h2v12H7v-2H5v-2H1V7h4V5h2zm4 3h2v2h2V6h2v2h-2v2h2v2h-2v-2h-2v2h-2v-2h2V8h-2Z"/>',
  arrow: '<path d="M2 8h10V6h-2V4h2v2h2v2h2v2h-2v2h-2v2h-2v-2h2v-2H2Z"/>',
  moon: '<path d="M8 1h3v2H9v2H7v5h2v2h6v-2h2v4h-2v2H5v-2H3V4h2V2h3Z"/>',
  book: '<path d="M2 2h6v2h2V2h6v14h-6v1H8v-1H2zm2 2v10h4V6H6V4zm6 2v8h4V4h-2v2Z"/>',
  journal: '<g stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path fill="#ecd1d9" d="M3 3.5q3-1.5 6 .5 3-2 6-.5v11q-3-1-6 .8-3-1.8-6-.8z"/><path d="M9 4v11" fill="none"/><path d="M11 3.5h2v5l-1-.8-1 .8z" fill="#d5a765"/></g>',
  foldedMap: '<g stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="m2 4 4.5-1.5 5 1.8L16 3v11l-4.5 1.4-5-1.8L2 15z" fill="#eee4cb"/><path d="M6.5 2.5v11M11.5 4.3v11" fill="none"/></g>',
  music: '<path d="M7 3.5 15 2v9.5c0 3.3-5.5 4.3-5.5 1.2 0-1.8 2-2.8 3.8-2.4V5L8.7 6v7c0 3.4-5.7 4.1-5.7 1.1 0-1.8 2.2-2.8 4-2.4z"/>',
  interact: '<g stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M2 3h14v9H8l-4 3v-3H2z" fill="#f6e0d5"/><path d="M5 7.5h1m2.5 0h1m2.5 0h1" fill="none" stroke-linecap="round"/></g>',
  close: '<path d="m4 2 5 5 5-5 2 2-5 5 5 5-2 2-5-5-5 5-2-2 5-5-5-5Z"/>',
};
export function icon(name: string, className = "") {
  return `<svg class="icon ${className}" viewBox="0 0 18 18" aria-hidden="true">${paths[name] ?? paths.star}</svg>`;
}
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        s
      ]!,
  );
}
