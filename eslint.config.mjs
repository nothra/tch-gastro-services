import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

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
]);

export default eslintConfig;
