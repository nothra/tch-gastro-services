// Liste der auf semantische Tokens umgestellten Dateien (ADR-052 D3).
//
// SO ERWEITERN: Stellt ein Folge-Issue (#369–#374) eine Seite auf die Bausteine um, kommt ihr
// Pfad hier in `UI_TOKEN_FILES` – sonst nichts. Ab da lehnt `pnpm lint` (pre-commit-Hook und
// required CI-Check `lint`) rohe Tailwind-Farbklassen in dieser Datei ab.
//
// Ein Eintrag ist entweder eine einzelne Datei oder ein Verzeichnis (mit `/` am Ende). Ein
// Verzeichnis deckt alle `*.ts`/`*.tsx` darunter ab, damit neue Dateien in einem bereits
// umgestellten Bereich automatisch mitgeprüft werden.

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

/** Pfade relativ zum Repo-Root. */
export const UI_TOKEN_FILES = ["app/components/ui/", "app/login/", "app/verwaltung/katalog/"];

/**
 * Übersetzt die Liste in ESLint-`files`-Muster und prüft dabei jeden Eintrag auf Existenz.
 *
 * Fail-closed (spec AK6.4): Bei leerer oder unlesbarer Liste und bei einem Eintrag, der auf
 * keine Datei zeigt, wirft die Funktion – ESLint bricht dann beim Laden der Config ab und
 * `pnpm lint` ist rot. Ohne diese Prüfung liefe die Regel nach einem Tippfehler still leer,
 * weil ESLint ein `files`-Muster ohne Treffer kommentarlos ignoriert.
 *
 * `repoRoot` ist die Basis, gegen die die Einträge aufgelöst werden. `eslint.config.mjs`
 * übergibt dafür die eigene Dateilage – dieselbe Basis, gegen die ESLint die `files`-Muster
 * auflöst, unabhängig davon, aus welchem Verzeichnis `eslint` gestartet wurde.
 */
export function uiTokenFilePatterns(entries = UI_TOKEN_FILES, repoRoot = process.cwd()) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(
      "eslint/ui-token-files.mjs: Liste der umgestellten Dateien ist leer oder unlesbar – " +
        "das Farb-Gate würde still leerlaufen (spec-368 AK6.4).",
    );
  }

  return entries.map((entry) => {
    const absolute = resolve(repoRoot, entry);
    if (!existsSync(absolute)) {
      throw new Error(
        `eslint/ui-token-files.mjs: Eintrag "${entry}" zeigt auf keinen existierenden Pfad ` +
          `(erwartet unter ${absolute}) – bitte Liste korrigieren (spec-368 AK6.4).`,
      );
    }
    return statSync(absolute).isDirectory() ? `${entry.replace(/\/+$/, "")}/**/*.{ts,tsx}` : entry;
  });
}
