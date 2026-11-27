const key = "fufu-debug-open-v1";
export function debugIsOpen() {
  try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
}
export function rememberDebugOpen(open: boolean) {
  try { if (open) sessionStorage.setItem(key, "1"); else sessionStorage.removeItem(key); } catch { /* Optional storage. */ }
}
