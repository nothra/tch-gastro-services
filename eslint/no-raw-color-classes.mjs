// Lokale ESLint-Regel `tch/no-raw-color-classes` (ADR-052 D3).
//
// Sie lehnt rohe Tailwind-Farbklassen in den auf semantische Tokens umgestellten Dateien ab
// (Liste: `eslint/ui-token-files.mjs`). Rohe Farbklassen umgehen den Dunkelmodus und die
// zentrale Kontrast-Pflege in `app/globals.css`.
//
// Geprüft werden String-Literale und Template-Teile – damit greift die Regel auf
// `className="…"`, mehrzeilige `className={`…`}` und Hilfskonstanten gleichermaßen.
// Nicht erkennbar sind aus Variablen zusammengesetzte Klassennamen (`bg-${farbe}-600`); das
// ist bei Tailwind ohnehin ein Anti-Pattern, weil der Compiler solche Klassen nicht erzeugt.

// Stand Tailwind 4.3 (`node_modules/tailwindcss/theme.css`). Ein Drift-Test gleicht die Liste
// gegen das installierte Tailwind ab, damit ein Bump mit neuen Paletten sie nicht still veraltet.
const PALETTE_COLORS = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "mauve",
  "mist",
  "olive",
  "taupe",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

// Utilities, deren Wert eine Farbe ist.
const COLOR_UTILITY =
  "(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|inset-ring|outline|divide|fill|stroke|from|via|to|placeholder|decoration|accent|caret|shadow|inset-shadow|drop-shadow|text-shadow)";

// Beliebig viele Varianten-Präfixe. Ein Präfix ist alles bis zum nächsten `:`, wobei ein `:`
// innerhalb von `[…]` nicht zählt – so fallen `dark:hover:`, `data-[open]:`, `[&>*]:`,
// `supports-[display:grid]:`, `group-hover/item:` und `@sm:` gleichermaßen darunter. Eine
// Verschachtelungsebene (`[&_[data-x]]:`) ist erlaubt, damit die innere `]` das Präfix nicht
// vorzeitig beendet.
const BRACKET = "\\[(?:[^[\\]\\s]|\\[[^[\\]\\s]*\\])*\\]";
const VARIANT_PREFIX = `(?:(?:[^\\s:[\\]]|${BRACKET})+:)*`;

// `!` für `important` darf vor dem Utility stehen (v3-Schreibweise, in v4 weiter gültig).
const LEADING_IMPORTANT = "!?";

const SHADE = "(?:50|100|200|300|400|500|600|700|800|900|950)";

// Palettenfarbe mit Stufe, dazu `black`/`white` und Arbitrary-Farbwerte – beide umgehen den
// Dunkelmodus genauso (strenger als der Spec-Wortlaut, ADR-052 D3).
const COLOR_VALUE = [
  `(?:${PALETTE_COLORS.join("|")})-${SHADE}`,
  "black",
  "white",
  "\\[(?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\\([^)\\s]*\\))\\]",
].join("|");

// Optionale Opazität (`/50`, `/[0.35]`, v4-Kurzform `/(--a)`) und optionales nachgestelltes
// `!` für `important`.
const OPACITY = "(?:\\/(?:\\d{1,3}|\\[[^\\]\\s]+\\]|\\([^)\\s]+\\)))?";

const RAW_COLOR_CLASS = new RegExp(
  `^${VARIANT_PREFIX}${LEADING_IMPORTANT}${COLOR_UTILITY}-(?:${COLOR_VALUE})${OPACITY}!?$`,
);

/**
 * Meldet jede rohe Farbklasse in einem Klassen-String. Geprüft wird jedes durch Leerraum
 * getrennte Token als GANZES – damit löst eine Farbklasse innerhalb eines längeren
 * Bezeichners (`mein-bg-red-500-wrapper`) keinen Fehlalarm aus (spec AK6.3).
 */
function reportRawColorClasses(context, node, text) {
  for (const token of text.split(/\s+/)) {
    if (token && RAW_COLOR_CLASS.test(token)) {
      context.report({ node, messageId: "rawColorClass", data: { className: token } });
    }
  }
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Verbietet rohe Tailwind-Farbklassen in Dateien, die auf semantische Tokens umgestellt sind.",
    },
    schema: [],
    messages: {
      rawColorClass:
        "Rohe Tailwind-Farbklasse „{{className}}“ – stattdessen ein semantisches Token aus app/globals.css nutzen (z. B. bg-surface, text-muted, border-line). Siehe ADR-052.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === "string") {
          reportRawColorClasses(context, node, node.value);
        }
      },
      TemplateElement(node) {
        reportRawColorClasses(context, node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};

export default rule;
