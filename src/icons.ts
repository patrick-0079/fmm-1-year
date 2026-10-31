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
  mute: '<path d="M7 3h2v12H7v-2H5v-2H1V7h4V5h2zm4 3h2v2h2V6h2v2h-2v2h2v2h-2v-2h-2v2h-2v-2h2V8h-2Z"/>',
  arrow: '<path d="M2 8h10V6h-2V4h2v2h2v2h2v2h-2v2h-2v2h-2v-2h2v-2H2Z"/>',
  moon: '<path d="M8 1h3v2H9v2H7v5h2v2h6v-2h2v4h-2v2H5v-2H3V4h2V2h3Z"/>',
  book: '<path d="M2 2h6v2h2V2h6v14h-6v1H8v-1H2zm2 2v10h4V6H6V4zm6 2v8h4V4h-2v2Z"/>',
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
