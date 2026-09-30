import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import { fileURLToPath } from "node:url";
import noRawColorClasses from "./eslint/no-raw-color-classes.mjs";
import { UI_TOKEN_FILES, uiTokenFilePatterns } from "./eslint/ui-token-files.mjs";

// Basis der `files`-Muster ist bei ESLint das Verzeichnis dieser Config-Datei – die
// Existenzprüfung der Liste muss dieselbe Basis nutzen, sonst schlägt sie fehl, sobald
// `eslint` aus einem Unterverzeichnis gestartet wird.
const REPO_ROOT = fileURLToPath(new URL(".", import.meta.url));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Prettier zuletzt: deaktiviert formatierungsbezogene Regeln (kein Konflikt mit Prettier).
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Zusätzlich:
    "coverage/**",
    // Von Playwright generierte Artefakte (analog .gitignore) – sonst bricht `pnpm lint`
    // nach jedem `pnpm test:e2e`-Lauf am minifizierten Report-/Trace-JS ab (#172).
    "test-results/**",
    "playwright-report/**",
  ]),
  // Farb-Gate (ADR-052 D3): In den auf semantische Tokens umgestellten Dateien sind rohe
  // Tailwind-Farbklassen verboten. Die Liste steht in `eslint/ui-token-files.mjs` und wird
  // dort fail-closed geprüft. Test-Dateien sind ausgenommen – sie nennen rohe Klassen in
  // Negativ-Assertions.
  {
    files: uiTokenFilePatterns(UI_TOKEN_FILES, REPO_ROOT),
    ignores: ["**/*.test.*"],
    plugins: { tch: { rules: { "no-raw-color-classes": noRawColorClasses } } },
    rules: { "tch/no-raw-color-classes": "error" },
  },
]);

export default eslintConfig;
