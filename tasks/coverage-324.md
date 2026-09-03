# Coverage-Report: Task 324

## Statement-/Branch-Coverage (`pnpm test:coverage`, Vitest v8)

Projektweit: 90 % Statements / 94,61 % Branches / 80,64 % Funktionen / 90,03 % Zeilen –
über der 80 %-Schwelle aus `docs/factory/PROJECT-CONTEXT.md`.

Alle in diesem PR geänderten/neuen Dateien sind **100 % gedeckt** (per Istanbul-HTML-Report
gegen `cstat-no`/`fstat-no`/`cbranch-no` geprüft, keine Treffer):

- `app/veranstaltung/berichtModell.ts` (neue Funktionen `berichtModellGetraenke`,
  `getraenkeErgebnisZeilen`)
- `app/veranstaltung/berichtXlsx.ts` (neuer Renderer `berichtXlsxGetraenke`)
- `app/veranstaltung/berichtPdf.ts` (neuer Renderer `berichtPdfGetraenke`; die einzige
  Lücke der Datei liegt auf Zeile 46, vorbestehender Code außerhalb des Diffs)
- `app/veranstaltung/berichtDateiname.ts` (Parameter-Objekt `BerichtDateinameInput`)
- `app/api/veranstaltung/[id]/bericht/route.ts` (`parseUmfang`, `rendere`)
- `app/veranstaltung/[id]/page.tsx` (`BerichtGruppe`, `berichtHref`; die einzige Lücke der
  Datei liegt auf Zeile 82, vorbestehender Code außerhalb des Diffs)

## AK-Vollständigkeit (spec-324, AC1–AC15)

| AC | Beschreibung | Test | Positiv/Negativ | Status |
|----|--------------|------|------------------|--------|
| AC1 | Beide Formate für Getränke-Variante | `route.test.ts` (xlsx+pdf×umfang), zusätzlich E2E gegen echten Dev-Server | Positiv | ✅ |
| AC2 | Nur Getränke-Positionen in Teilnehmerzeilen | `berichtModell.test.ts`, `berichtXlsx.test.ts`, `berichtPdf.test.ts` | Positiv (Getränke da) + Negativ (Essen/Kaffee fehlen) | ✅ |
| AC3 | Nur Auslagen Kategorie `getraenke`, einzeln mit Status | `berichtModell.test.ts` (Filter), Renderer-Tests (Einzelnachweis) | Positiv + Negativ (andere Kategorien fehlen) | ✅ |
| AC4 | Genau zwei Ergebnis-Summen | `getraenkeErgebnisZeilen`-Test, Renderer-Tests | Positiv | ✅ |
| AC5 | Kein Spende/Kassenveränderung/Erhalten – in Veranstaltung mit allen drei | `berichtXlsx.test.ts`/`berichtPdf.test.ts` ("kategorieübergreifende Begriffe" fehlen) | Negativ, strukturell (Typ hat die Felder nicht) | ✅ |
| AC6 | Gegenprobe: vollständiger Bericht behält die drei Werte | dieselben Testdateien, Gegenprobe-Assertion | Positiv (Gegenprobe zu AC5) | ✅ |
| AC7 | Getränke-Werte in beiden Berichten identisch | Konstruktion (`berichtModellGetraenke` liest unverändert aus vollem Modell) + E2E-Doppelabruf | Positiv (Konsistenz) | ✅ |
| AC8 | Xlsx/Pdf inhaltsgleich | `berichtPdf.test.ts` ("Excel und PDF inhaltsgleich"-Test, unabhängig hergeleitete Werte) | Positiv | ✅ |
| AC9 | Umfang im Kopf + Dateiname erkennbar | `berichtDateiname.test.ts` (Segment), Renderer-Tests (Kopf-Text) | Positiv | ✅ |
| AC10 | Offene Veranstaltung / fehlende Rolle → fail-closed | `route.test.ts` (403/409-Fälle) | Negativ | ✅ |
| AC11 | Leere Getränke-Daten → gültiger Bericht ohne Fehler | `berichtModell.test.ts`/Renderer-Tests (Leerfall) | Boundary | ✅ |
| AC12 | Teilnehmer ohne Getränke-Position entfällt | `berichtModell.test.ts` (Essen-only-Teilnehmer) | Negativ (Person fehlt in Liste) | ✅ |
| AC13 | Unbekannter `umfang` → 400 | `route.test.ts` (`should_return400_when_umfangUnknown`) | Negativ (fail-closed) | ✅ |
| AC14 | Gruppierte UI-Sektion, vier Downloads | `page.test.tsx` (zwei Gruppen, vier Links) | Positiv | ✅ |
| AC15 | `docs/routes.md` aktualisiert | Routen-Doku-Drift-Gate (`scripts/checks/routes-doc-check.sh`) | Gate | ✅ |

Alle 15 Akzeptanzkriterien sind 1:1 auf benannte Testfälle abgebildet und zusätzlich durch
eine reale Browser-/Server-Verifikation (echter Login, echte Route, echte Datei-Downloads,
Playwright gegen `pnpm dev`) bestätigt worden.

## Fehlerszenarien (spec-324)

- Offene Veranstaltung → abgelehnt: ✅ (`route.test.ts`)
- Fehlende Veranstalter-Rolle → abgelehnt: ✅ (`route.test.ts`)
- Unbekannte/gelöschte Veranstaltungs-ID → 404: ✅ (unverändert vom vollständigen Bericht,
  gemeinsamer Codepfad)
- Unbekannter `umfang` → 400: ✅ (`route.test.ts`, AC13)
- Auslage mit gelöschter Teilnehmerzeile → Fallback-Anzeigename bleibt sichtbar: ✅ – dies ist
  ausschließlich Data-Layer-Verhalten von `listAuslagen` (LEFT JOIN + COALESCE, bereits durch
  bestehende Tests der Data-Layer abgedeckt, Codify #53); `berichtModellGetraenke` filtert nur
  die bereits aufgelöste Liste weiter, führt keinen neuen Codepfad ein → kein zusätzlicher Test
  in diesem PR nötig (kein neuer Zweig, nur ein weiterer Konsument eines bereits getesteten
  Verhaltens).

## Test-Qualität (Checkliste `/test`)

- **Happy Path:** AC1–AC4, AC7–AC9, AC14.
- **Fehlerfälle:** AC10, AC13, plus die Fehlerszenarien-Liste oben.
- **Boundary-Werte:** AC11 (komplett leere Getränke-Daten) und AC12 (gemischte Teilnehmer,
  einer davon ohne Getränke-Position) sind die relevanten Grenzfälle und beide einzeln
  getestet.
- **Verhalten statt Implementierung:** Renderer-Tests lesen die erzeugten Xlsx-/PDF-Buffer
  über die öffentliche Ausgabe (Zellen-/Text-Extraktion), nicht über interne Aufrufe.
- **Unabhängigkeit/Determinismus:** keine geteilten Fixtures zwischen Testfällen, keine
  Zeit-/Zufalls-Abhängigkeit.
- **Nicht-tautologische Assertions:** erwartete Beträge/Labels sind unabhängig aus den
  Eingabedaten hergeleitet (mit Herleitungskommentar), nicht aus dem Objekt unter Test
  zurückgelesen (bereits in Review-Runde 2 verifiziert).

## Finale Ausführung

```
pnpm test        → 773 grün, 59 skipped, 0 rot (68 Dateien)
pnpm test:coverage → 90 % Statements (Schwelle 80 %)
pnpm exec tsc --noEmit → keine Fehler
pnpm build        → erfolgreich
```

## Fazit

Keine Test-Lücken gefunden. Die TDD-Implementierung hat die Test-Suite bereits vollständig
mitgeliefert (inkl. Gegenproben und Boundary-Fällen); die Review-Runde 2 hat keine
Test-Qualitäts-Findings über die bereits behobene Parameter-Signatur hinaus gefunden. Keine
neuen Tests in diesem Schritt nötig.
