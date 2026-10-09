import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { VERBLASST_CLASS } from "./ListenZeile";

// Prüft die Farb-Tokens aus `app/globals.css` gegen die Zusagen von spec-368 AK1/AK3/AK4.
// Die Werte werden aus der CSS-Datei GELESEN und nachgerechnet (WCAG-2-Formel), nicht im Test
// dupliziert – so bleibt der Kontrastnachweis (AK1.3) auch bei künftigen Farbänderungen
// belegt, statt einmalig in ADR-052 D2 festgehalten zu sein.

const CSS = readFileSync(resolve(__dirname, "../../globals.css"), "utf8");

/** Alle `--name: wert;`-Deklarationen eines CSS-Blocks als Map. */
function parseDeclarations(block: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    declarations[name] = value.trim();
  }
  return declarations;
}

/** Der erste `:root { … }`-Block: die Hell-Werte. */
function lightTokens(): Record<string, string> {
  const match = CSS.match(/:root\s*\{([^}]*)\}/);
  if (!match) throw new Error("Kein :root-Block in globals.css gefunden");
  return parseDeclarations(match[1]);
}

/** Der `:root`-Block innerhalb von `@media (prefers-color-scheme: dark)`: die Dunkel-Werte. */
function darkTokens(): Record<string, string> {
  const match = CSS.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/);
  if (!match) throw new Error("Kein Dunkelmodus-:root-Block in globals.css gefunden");
  return parseDeclarations(match[1]);
}

/** Relative Luminanz eines 6-stelligen Hex-Farbwerts nach WCAG 2.1. */
function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Kein 6-stelliger Hex-Farbwert: ${hex}`);
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(match[1].slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Kontrastverhältnis zweier Hex-Farbwerte nach WCAG 2.1 (1:1 bis 21:1). */
function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// Die Paare aus spec AK1.3: Vordergrund-Token auf Hintergrund-Token.
const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["foreground", "surface"],
  ["foreground", "background"],
  ["muted", "surface"],
  ["muted", "background"],
  ["on-accent", "accent"],
  ["on-accent", "accent-hover"],
  ["on-danger", "danger"],
  ["on-danger", "danger-hover"],
  ["accent", "surface"],
  ["accent", "background"],
  ["accent", "accent-subtle"],
  ["danger", "surface"],
  ["danger", "danger-subtle"],
  ["success", "surface"],
  ["success", "success-subtle"],
  ["warning", "surface"],
  ["warning", "warning-subtle"],
];

// Rahmen von Bedienelementen: 3:1 genügt (WCAG 1.4.11). Den Fokus-Rahmen in `accent` deckt
// bereits das strengere Text-Paar `accent` auf `surface`/`background` oben ab.
const NON_TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["line", "surface"],
  ["line", "background"],
];

/** Hex-Farbe, die `opacity` über `hintergrund` ergibt (Alpha-Überblendung je Kanal). */
function blend(vordergrund: string, hintergrund: string, opacity: number): string {
  const kanal = (hex: string, offset: number) => parseInt(hex.slice(1 + offset, 3 + offset), 16);
  const kanaele = [0, 2, 4].map((offset) =>
    Math.round(opacity * kanal(vordergrund, offset) + (1 - opacity) * kanal(hintergrund, offset)),
  );
  return `#${kanaele.map((wert) => wert.toString(16).padStart(2, "0")).join("")}`;
}

/** Tailwind-Klasse `opacity-<prozent>` → Anteil 0…1; andere Formen sind ein Testfehler. */
function opacityFromClass(klasse: string): number {
  const treffer = klasse.match(/^opacity-(\d+)$/);
  if (!treffer) throw new Error(`Unerwartete Opazitäts-Klasse: ${klasse}`);
  return Number(treffer[1]) / 100;
}

// Verblasste ListenZeile (spec-403 AK2.5/F3, ADR-059 D3): Titel und Untertitel tragen beide
// `text-foreground` unter `opacity-60` – auf der Kartenfläche und auf der Hover-/Fokus-Fläche.
// Die Opazität wird aus der Klasse des Bausteins gelesen, damit eine Änderung dort (z. B.
// `opacity-50`) den Nachweis neu rechnet statt ihn still grün zu lassen.
const VERBLASST_OPACITY = opacityFromClass(VERBLASST_CLASS);
const VERBLASST_HINTERGRUENDE = ["surface", "accent-subtle"] as const;

// Getrennte Testfälle je Theme, damit ein Rot das betroffene Theme im Testnamen nennt.
const THEME_TOKENS = { Light: lightTokens, Dark: darkTokens } as const;
const THEMES = Object.keys(THEME_TOKENS) as ReadonlyArray<keyof typeof THEME_TOKENS>;

// Die semantischen Token, die spec AK1.1 namentlich verlangt.
const REQUIRED_TOKENS = [
  "accent",
  "surface",
  "line",
  "foreground",
  "muted",
  "danger",
  "success",
  "warning",
] as const;

describe("Farb-Tokens in globals.css (AK1)", () => {
  it("should_defineAllSemanticTokens_when_themeIsRead", () => {
    const light = lightTokens();

    for (const token of REQUIRED_TOKENS) {
      expect(light, `Token --${token} fehlt in :root`).toHaveProperty(token);
    }
  });

  it("should_publishEveryTokenAsTailwindColor_when_themeInlineIsRead", () => {
    const light = lightTokens();
    const themeBlock = CSS.match(/@theme inline\s*\{([^}]*)\}/);
    expect(themeBlock).not.toBeNull();

    for (const token of Object.keys(light)) {
      expect(themeBlock![1]).toContain(`--color-${token}: var(--${token});`);
    }
  });

  // AK1.2: Jedes Token bekommt im Dunkelmodus einen eigenen Wert – deshalb braucht keine Seite
  // eine `dark:`-Variante. Auch bewusst gleiche Werte stehen explizit im Dunkel-Block.
  it("should_overrideEveryTokenInDarkMode_when_deviceIsDark", () => {
    const light = lightTokens();
    const dark = darkTokens();

    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it.each(TEXT_PAIRS)("should_reachWcagAaForText_when_%sOn%sInLightMode", (fg, bg) => {
    const light = lightTokens();

    expect(contrastRatio(light[fg], light[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(TEXT_PAIRS)("should_reachWcagAaForText_when_%sOn%sInDarkMode", (fg, bg) => {
    const dark = darkTokens();

    expect(contrastRatio(dark[fg], dark[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT_PAIRS)("should_reachThreeToOne_when_%sOn%sInLightMode", (fg, bg) => {
    const light = lightTokens();

    expect(contrastRatio(light[fg], light[bg])).toBeGreaterThanOrEqual(3);
  });

  it.each(NON_TEXT_PAIRS)("should_reachThreeToOne_when_%sOn%sInDarkMode", (fg, bg) => {
    const dark = darkTokens();

    expect(contrastRatio(dark[fg], dark[bg])).toBeGreaterThanOrEqual(3);
  });

  const VERBLASST_FAELLE = THEMES.flatMap((theme) =>
    VERBLASST_HINTERGRUENDE.map((hintergrund) => [hintergrund, theme] as const),
  );

  it.each(VERBLASST_FAELLE)(
    "should_keepWcagAaForDimmedForeground_when_on%sIn%sMode",
    (hintergrund, theme) => {
      const tokens = THEME_TOKENS[theme]();
      const sichtbar = blend(tokens["foreground"], tokens[hintergrund], VERBLASST_OPACITY);

      expect(contrastRatio(sichtbar, tokens[hintergrund])).toBeGreaterThanOrEqual(4.5);
    },
  );

  // Gegenprobe zu D3: `muted` unter `opacity-60` reicht in keinem Theme – deshalb wechselt der
  // Untertitel im verblassten Zustand auf `foreground`. Wird dieser Test rot, ist die Abweichung
  // unnötig.
  it.each(THEMES)("should_failWcagAaForDimmedMuted_when_onSurfaceIn%sMode", (theme) => {
    const tokens = THEME_TOKENS[theme]();
    const sichtbar = blend(tokens["muted"], tokens["surface"], VERBLASST_OPACITY);

    expect(contrastRatio(sichtbar, tokens["surface"])).toBeLessThan(4.5);
  });

  it("should_blendChannelsLinearly_when_opacityApplied", () => {
    // Fester Stützwert für die Überblendung: 60 % Schwarz auf Weiß = 0x66 je Kanal.
    expect(blend("#000000", "#ffffff", 0.6)).toBe("#666666");
  });

  it("should_readOpacityShare_when_classIsTailwindOpacity", () => {
    expect(opacityFromClass("opacity-60")).toBe(0.6);
    expect(() => opacityFromClass("opacity-[.6]")).toThrow("Unerwartete Opazitäts-Klasse");
  });

  // Ohne `color-scheme` blieben native Teile (Auswahl-Popup, Zahlen-Spinner, Scrollbalken)
  // im Dunkelmodus hell, obwohl die Tokens umschalten.
  it("should_declareLightAndDarkColorScheme_when_rootIsRead", () => {
    expect(CSS).toMatch(/:root\s*\{[^}]*color-scheme:\s*light dark;/);
  });

  // AK1.4: Der Akzent bleibt der bisher genutzte Vereins-Cyan (`cyan-700` = #0e7490).
  it("should_keepClubCyanAsAccent_when_lightModeIsRead", () => {
    expect(lightTokens()["accent"]).toBe("#0e7490");
  });
});

describe("Schrift und Typo-Skala in globals.css (AK3, AK4.1)", () => {
  // AK3: Der Arial-Override in `body` hat die geladene Schrift Geist bisher verdeckt.
  it("should_notOverrideFontFamilyWithArial_when_bodyIsStyled", () => {
    expect(CSS).not.toMatch(/Arial/i);
  });

  it("should_scaleHeadingsDownwards_when_baseLayerIsRead", () => {
    const fontSize = (selector: string) => {
      const match = CSS.match(new RegExp(`\\b${selector}\\s*\\{[^}]*font-size:\\s*([0-9.]+)rem`));
      if (!match) throw new Error(`Keine font-size für ${selector} in globals.css gefunden`);
      return Number(match[1]);
    };
    const BASE_FONT_SIZE_REM = 1;

    expect(fontSize("h1")).toBeGreaterThan(fontSize("h2"));
    expect(fontSize("h2")).toBeGreaterThan(fontSize("h3"));
    expect(fontSize("h3")).toBeGreaterThan(BASE_FONT_SIZE_REM);
  });
});
