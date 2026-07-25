# Security Review: Task 189

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

- [x] [dependency-security] `pnpm audit` meldet 20 Verwundbarkeiten (3 kritisch, 10 high, 7
      moderate), ausschließlich in `next-auth`/`@auth/core` (u. a. zwei kritische
      Auth.js-Findings: existence-based Auth-Checks können fail-open laufen, sowie ein
      E-Mail-Homoglyph-`@`-Bypass). **Out-of-Scope für #189** (betrifft nicht `uuid`/`exceljs`,
      vorbestehend, nicht durch diesen PR verursacht oder verschlimmert). Als eigenes Issue
      angelegt: [#228](https://github.com/nothra/tch-gastro-services/issues/228)
      (`enhancement`, `security`).

## Hinweise

- [ ] [dependency-security] Der `uuid`-Override (`"uuid@<11.1.1": ">=11.1.1"`) ist konditional
      korrekt formuliert, greift wie erwartet (`pnpm why uuid` → `14.0.1`, `pnpm audit` zeigt
      `uuid` nicht mehr). Ohne Obergrenze sprang die Version 6 Major-Stufen (8→14) – analog zum
      bestehenden `postcss`/`esbuild`-Muster in `pnpm-workspace.yaml`, kein neues Risiko. Durch
      Tests + Typecheck verifiziert (kein Breaking Change im Renderer).
- [ ] [injection] Formel-Präfix-Liste (`= + - @ \t \r`) deckt den OWASP-CSV-Cheatsheet-Standard
      vollständig ab, angewendet an allen drei spezifizierten Stellen (`bezeichnung`,
      `teilnehmer.anzeigename`, `auslage.anzeigename`). Keine praktikable Umgehung gefunden:
      führende Leerzeichen sind ausgeschlossen (`anzeigename`/`name` werden serverseitig
      `.trim()`-t und längenbegrenzt validiert), Unicode-Homoglyphe der Präfixzeichen lösen
      keine Formel-Interpretation in Excel/LibreOffice aus (nur literales ASCII zählt).
- [ ] [correctness] Ausschluss von `auslage.kategorie`/`modell.kopf.kasse`/`status` verifiziert:
      alle drei stammen aus festen Enum-Label-Maps, keine Nutzereingabe – Ausnahme korrekt
      begründet.
- [ ] [test-coverage] Alle Akzeptanzkriterien der Spec sind durch dedizierte Tests abgedeckt
      (alle sechs Präfixe, Negativfälle, Round-Trip-Verifikation via `workbook.xlsx.load()`).
      16/16 Tests grün, Typecheck sauber.
- [ ] [error-handling] Kein neuer Fehlerpfad, keine neue Informationspreisgabe.
- [ ] [auth] Keine Berührung von Auth-/RBAC-Code – bestätigt.

## Ergebnis
PASSED
