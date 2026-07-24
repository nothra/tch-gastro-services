import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Regression-Guard für #172: `pnpm lint` brach nach jedem `pnpm test:e2e`-Lauf ab, weil ESLint
// die von Playwright GENERIERTEN Verzeichnisse `test-results/` und `playwright-report/`
// mitlintete (minifiziertes JS im HTML-Report + Trace-Ressourcen). `.gitignore` deckte beide ab,
// ESLint hat aber eine eigene Ignore-Liste (`globalIgnores`) – die die beiden Pfade nicht enthielt.
//
// Verhaltensbasiert statt String-Matching: geprüft wird, dass eine JS-Datei (die ESLint sonst
// linten WÜRDE) in beiden Artefakt-Verzeichnissen als ignoriert gilt. Beide Richtungen einzeln
// assertiert, damit ein Wegfall genau eines Ignore-Eintrags den zugehörigen Test rot färbt.
describe("eslint.config: Playwright-Artefakte ignorieren (#172)", () => {
  it("should_ignoreTestResultsDir_when_lintingAfterE2eRun", async () => {
    const eslint = new ESLint();

    const ignored = await eslint.isPathIgnored("test-results/some-run/trace.js");

    expect(ignored).toBe(true);
  });

  it("should_ignorePlaywrightReportDir_when_lintingAfterE2eRun", async () => {
    const eslint = new ESLint();

    const ignored = await eslint.isPathIgnored("playwright-report/trace/assets/bundle.js");

    expect(ignored).toBe(true);
  });

  // Positiv-Kontrolle: belegt, dass isPathIgnored diskriminiert. Ohne diese Assertion würden die
  // beiden true-Erwartungen auch bei einer versehentlich zu breiten Ignore-Regel (z. B. "**")
  // grün bleiben – dann als Fehlgrün. Eine normale Quelldatei MUSS gelintet (= nicht ignoriert) werden.
  it("should_notIgnoreNormalSourceFile_toProveIgnoreListDiscriminates", async () => {
    const eslint = new ESLint();

    const ignored = await eslint.isPathIgnored("app/layout.tsx");

    expect(ignored).toBe(false);
  });
});
