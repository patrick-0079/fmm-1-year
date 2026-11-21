import config from "../ref/来信/信笺/config.json";

type Stationery = typeof config.default & { motif?: string; neutralStock?: boolean };
const themes: Readonly<Record<string, Partial<Stationery>>> = config.themes;
const images = import.meta.glob<string>("../ref/来信/信笺/**/*.{webp,png,jpg,jpeg,avif}", {
  eager: true, import: "default", query: "?url",
});

const layers = ["flap", "pocket", "lining", "paper", "seal", "motif"] as const;
const colors = {
  flapTint: "flap-tint", pocketTint: "pocket-tint", liningTint: "lining-tint",
  paperTint: "paper-tint", ink: "ink", accent: "accent",
} as const;

export function applyStationeryTheme(element: HTMLElement, letterId?: string) {
  const custom = letterId && Object.hasOwn(themes, letterId) ? themes[letterId] : undefined;
  const theme: Stationery = { ...config.default, ...custom };
  element.dataset.stationeryTheme = custom ? letterId : "default";
  element.toggleAttribute("data-neutral-stock", theme.neutralStock === true);
  for (const layer of layers) {
    const file = theme[layer];
    const url = file && images["../ref/来信/信笺/" + file];
    element.style.setProperty(`--mail-${layer}-image`, url ? `url(${JSON.stringify(url)})` : "none");
  }
  for (const key of Object.keys(colors) as (keyof typeof colors)[]) {
    element.style.setProperty("--mail-" + colors[key], theme[key]);
  }
}
