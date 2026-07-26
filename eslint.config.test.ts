import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

// Regression-Guard für #172: `pnpm lint` brach nach jedem `pnpm test:e2e`-Lauf ab, weil ESLint
// die von Playwright GENERIERTEN Verzeichnisse `test-results/` und `playwright-report/`
// mitlintete (minifiziertes JS im HTML-Report + Trace-Ressourcen). `.gitignore` deckte beide ab,
// ESLint hat aber eine eigene Ignore-Liste (`globalIgnores`) – die die beiden Pfade nicht enthielt.
//
// Verhaltensbasiert statt String-Matching: geprüft wird, dass eine JS-Datei (die ESLint sonst
// linten WÜRDE) in beiden Artefakt-Verzeichnissen als ignoriert gilt. Beide Richtungen einzeln
// assertiert, damit ein Wegfall genau eines Ignore-Eintrags den zugehörigen Test rot färbt.
describe("eslint.config: Playwright-Artefakte ignorieren (#172)", () => {
  // Eine geteilte Instanz: isPathIgnored ist ein reiner Lesezugriff (kein mutierbarer State),
  // daher isolationssicher zwischen den Tests – und die teure Config-Resolution läuft nur einmal.
  const eslint = new ESLint();

  // Dieselbe, nicht ignorierte Quelldatei wie in der Positiv-Kontrolle unten – das Aufwärmen
  // muss denselben Cache befüllen, den der erste reguläre Testfall danach nutzt.
  const NORMALE_QUELLDATEI = "app/layout.tsx";

  // Stabilisierung (#238): Der ERSTE isPathIgnored-Aufruf löst die teure Flat-Config-Resolution
  // aus; unter Parallellast (volle Suite, viele Worker) überschreitet allein diese Resolution
  // gelegentlich das Vitest-Default-Timeout von 5000 ms des ersten Testfalls. Das Aufwärmen
  // vorab in beforeAll verschiebt die Kosten in ein eigenes, großzügigeres – aber weiterhin
  // endliches – Timeout, sodass ein echter Hänger in der Config-Resolution weiterhin nach
  // endlicher Frist fehlschlägt, statt unbegrenzt zu warten oder die Testkörper zu verlangsamen.
  beforeAll(async () => {
    await eslint.isPathIgnored(NORMALE_QUELLDATEI);
  }, 30_000);

  it("should_ignoreTestResultsDir_when_lintingAfterE2eRun", async () => {
    const ignored = await eslint.isPathIgnored("test-results/some-run/trace.js");

    expect(ignored).toBe(true);
  });

  it("should_ignorePlaywrightReportDir_when_lintingAfterE2eRun", async () => {
    const ignored = await eslint.isPathIgnored("playwright-report/trace/assets/bundle.js");

    expect(ignored).toBe(true);
  });

  // Positiv-Kontrolle: belegt, dass isPathIgnored diskriminiert. Ohne diese Assertion würden die
  // beiden true-Erwartungen auch bei einer versehentlich zu breiten Ignore-Regel (z. B. "**")
  // grün bleiben – dann als Fehlgrün. Eine normale Quelldatei MUSS gelintet (= nicht ignoriert) werden.
  it("should_notIgnoreNormalSourceFile_toProveIgnoreListDiscriminates", async () => {
    const ignored = await eslint.isPathIgnored(NORMALE_QUELLDATEI);

    expect(ignored).toBe(false);
  });
});
