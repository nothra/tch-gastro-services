import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { UI_TOKEN_FILES, uiTokenFilePatterns } from "./ui-token-files.mjs";

const REPO_ROOT = resolve(__dirname, "..");

// AK6.4 (fail-closed): Ein Tippfehler in der Liste darf die Prüfung nicht still leerlaufen
// lassen – ESLint ignoriert ein `files`-Muster ohne Treffer kommentarlos. Deshalb prüft der
// Loader jeden Eintrag beim Laden der Config auf Existenz und wirft.

describe("uiTokenFilePatterns – Liste der umgestellten Dateien (AK6.6)", () => {
  it("should_expandDirectoryToTsGlob_when_entryIsDirectory", () => {
    const patterns = uiTokenFilePatterns(["app/components/ui/"]);

    expect(patterns).toEqual(["app/components/ui/**/*.{ts,tsx}"]);
  });

  it("should_keepEntryAsIs_when_entryIsFile", () => {
    const patterns = uiTokenFilePatterns(["package.json"]);

    expect(patterns).toEqual(["package.json"]);
  });

  // App-Router-Segmente wie `[id]` sind im Glob eine Zeichenklasse – unmaskiert träfe das Muster
  // `app/veranstaltung/i/page.tsx`, aber nie die echte Datei (#369).
  it("should_escapeBracketsOfDynamicSegment_when_entryIsFileInDynamicRoute", () => {
    const patterns = uiTokenFilePatterns(["app/veranstaltung/[id]/page.tsx"]);

    expect(patterns).toEqual(["app/veranstaltung/[[]id[]]/page.tsx"]);
  });

  it("should_escapeBracketsOfDynamicSegment_when_entryIsDirectoryInDynamicRoute", () => {
    const patterns = uiTokenFilePatterns(["app/veranstaltung/[id]/"]);

    expect(patterns).toEqual(["app/veranstaltung/[[]id[]]/**/*.{ts,tsx}"]);
  });

  it("should_coverEveryConfiguredPath_when_defaultListIsUsed", () => {
    const patterns = uiTokenFilePatterns();

    expect(patterns).toHaveLength(UI_TOKEN_FILES.length);
    expect(patterns).toContain("app/components/ui/**/*.{ts,tsx}");
    expect(patterns).toContain("app/login/**/*.{ts,tsx}");
    expect(patterns).toContain("app/verwaltung/katalog/**/*.{ts,tsx}");
  });

  // `eslint.config.mjs` übergibt den Repo-Root explizit (eigene Dateilage), damit die
  // Existenzprüfung auch bei einem `eslint`-Start aus einem Unterverzeichnis greift.
  it("should_resolveEntriesAgainstGivenRoot_when_repoRootPassedExplicitly", () => {
    const patterns = uiTokenFilePatterns(["app/login/"], REPO_ROOT);

    expect(patterns).toEqual(["app/login/**/*.{ts,tsx}"]);
  });

  it("should_throw_when_entryDoesNotExistUnderGivenRoot", () => {
    expect(() => uiTokenFilePatterns(["app/login/"], resolve(REPO_ROOT, "app"))).toThrow(
      /app\/login\//,
    );
  });
});

describe("uiTokenFilePatterns – fail-closed (AK6.4)", () => {
  it("should_throwNamingTheEntry_when_pathDoesNotExist", () => {
    expect(() => uiTokenFilePatterns(["app/gibt-es-nicht/"])).toThrow(/app\/gibt-es-nicht\//);
  });

  it("should_throw_when_listIsEmpty", () => {
    expect(() => uiTokenFilePatterns([])).toThrow();
  });

  it("should_throw_when_listIsNotReadableAsArray", () => {
    expect(() => uiTokenFilePatterns("app/login/" as unknown as string[])).toThrow();
  });
});
