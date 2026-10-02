# Task 371: kassieren-summe-schnellbetraege-abschluss

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Kassieren-Seite aufräumen (Spec: `docs/specs/spec-371-kassieren-summe-abschluss.md`): Summenkarte oben
(offener Betrag löst #305 ab), Spende live vor dem Absenden, Rückmeldung mit Betrag/Spende,
Tagessummen + Gesamtabrechnung + Protokoll eingeklappt unter „Abrechnung im Detail".
Abschließen/Wieder öffnen nur noch im Kopf der Detailseite, mit Bestätigung.
**Schnellbeträge entfallen** (Entscheidung in /requirements).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] AK1 Summenkarte oben: offener Betrag, Erhalten, Spenden, „x von n bezahlt"
- [x] AK2 Offener Betrag: Teilzahlung/Überzahlung/unbezahlt korrekt
- [x] AK3 Leerzustand „0,00 €" / „0 von 0 bezahlt"
- [x] AK4 Offener Betrag aus `kassierTagessummen` (Single Source)
- [x] AK5 Formatierung `formatCents` + `tabular-nums`
- [x] AK6 Hinweis „Noch n offen"/„Alles bezahlt" mit Link zur Detailseite
- [x] AK7 Zeile: Verzehr-Gesamt + Status-Badge
- [x] AK8 Spende live aus getipptem Betrag
- [x] AK9 Leere/unlesbare Eingabe → 0,00 €, kein Fehler
- [x] AK10 Abgeschlossen: Kassieren-Seite schreibgeschützt
- [x] AK11 375 px ohne Horizontal-Scroll, Touch-Ziele ≥ 44 px
- [x] AK12 Rückmeldung (Notice) mit Betrag und Spende
- [x] AK13 Server-Fehler als Notice
- [x] AK14 „Abrechnung im Detail" eingeklappt (Tagessummen, Gesamtabrechnung, Protokoll)
- [x] AK15 Einklappbereich tastaturbedienbar (`<details>`)
- [x] AK16 Eingefrorene Reihenfolge (#253) bleibt
- [x] AK17 Kassieren-Seite ohne Abschließen/Wieder öffnen
- [x] AK18 Detailseite: „Veranstaltung abschließen" im Kopf neben dem Badge
- [x] AK19 Abschließen mit ConfirmDialog
- [x] AK20 Dialog nennt bei offenen Zeilen Anzahl und Betrag; Server-Ablehnung bleibt
- [x] AK21 Kein Offen-Hinweis ohne offene Zeile
- [x] AK22 Wieder öffnen im Kopf, mit Bestätigung, protokolliert
- [x] AK23 Theke: kein Abschließen
- [x] AK24 Kopf bei 375 px umbrechend
- [x] FS1–FS4 Fehlerszenarien laut Spec

## Technische Notizen
[ADR-055](../docs/adr/055-kassieren-spende-live-abschluss-im-kopf.md) (beim Implementieren auf Accepted gesetzt):
- D1: `spendeCents()` + `offenerBetragCents` in `kassierSummen.ts` (Single Source, auch für Client)
- D2: `kassiereZeileAction` liefert `erhaltenCents` zurück; Spende rechnet der Client; Notice statt „Gespeichert."
- D3: `AbschlussAktion` (Client, `ConfirmDialog`) im `PageHeader`-Slot der Detailseite; `StatusToggle` + Test löschen
- D4: „Abrechnung im Detail" als natives `<details>`
- ADR-053 D6 trägt einen Überholt-Hinweis; nach dem Löschen von `StatusToggle` Doku-Treffer per Grep prüfen
- Reihenfolge: reine Summen → Action → Formular → `AbschlussAktion` → Seiten; `eslint/ui-token-files.mjs` pflegen

### Umsetzungsnotizen (/implement, 2026-10-03)
- **Summenkarte** als eigene Server-Komponente `kassieren/KassierSummenKarte.tsx` (rein darstellend,
  alle Zahlen aus `kassierTagessummen`); getestet über `kassieren/page.test.tsx` (AK1–AK6, AK16).
- **Farb-Gate:** `app/veranstaltung/[id]/kassieren/`, `AbschlussAktion.tsx`, `KassiereZeileForm.tsx`
  in `eslint/ui-token-files.mjs`. Der Gegenrichtungs-Test in `eslint/color-gate-wiring.test.ts`
  nutzte bisher die Kassieren-Seite als „nicht gelisteten Nachbarn" – jetzt `auslagen/page.tsx`,
  plus ein Positivfall für das gelistete Kassieren-Verzeichnis.
- **`StatusToggle`-Doku-Treffer** (Grep): Präsens-Verweise in `KatalogWechsel.tsx`/`.test.tsx` und
  `docs/ux/ux-issue-entwuerfe.md` (UX-5) nachgezogen; ADR-033/ADR-053, Specs und Task-/Review-
  Dateien älterer Tasks sind historische Beschreibungen und bleiben.
- **Veranstalter-Anleitung** (`docs/anleitung/veranstalter/anleitung.md`, Schritt 6 + „Wenn etwas
  nicht klappt") auf Summenkarte, Live-Spende, „Abrechnung im Detail" und Abschluss im Kopf
  umgeschrieben; die Capture-Spec `e2e/anleitung-veranstalter.spec.ts` entsprechend angepasst.
- **Oberflächentests** gegen eigenen Dev-Server dieses Worktrees (Port 3000 vorher frei geprüft,
  Lesson #368): neue Spec `e2e/kassieren-summe-abschluss.spec.ts` (AK1/6/8–12/14/15/17–22/24, FS1)
  plus die angepassten `veranstaltung-detailseite.spec.ts` (#369: AK24–AK26 durch ADR-055 D3
  überholt) und `veranstaltung-bearbeiten-loeschen.spec.ts` (Rückmeldung statt „Gespeichert.") –
  9/9 grün. 375-px-Nachweise: `test-results/371-kassieren-375.png`,
  `test-results/371-detailseite-kopf-375.png` (gitignoret, von Hand an den PR hängen, Lesson #368).
- **Nachtest offen (menschlicher Schritt):** Die Anleitungsbilder `10-kassieren.png` und
  `11-abrechnung.png` zeigen noch die alte Kassieren-Seite. Die Capture-Spec braucht eine frisch
  geseedete DB (`pnpm db:seed` setzt die geteilte Dev-DB zurück) und wurde deshalb nicht
  gefahren: `CAPTURE_ANLEITUNG=1 pnpm exec dotenv -e .env.local -- playwright test e2e/anleitung-veranstalter.spec.ts`.

### Test-Notizen (/test, 2026-10-03)
- Gesamtsuite ohne `.env.local`: 108 Dateien / 1475 Tests grün (DB-Integrationstests dabei übersprungen).
  Teilmenge `app/veranstaltung`: 711 Tests grün.
- Coverage der von #371 berührten Dateien (`kassierSummen.ts`, `KassiereZeileForm.tsx`,
  `AbschlussAktion.tsx`, `KassierSummenKarte.tsx`, `kassieren/page.tsx`, `[id]/page.tsx`): je 100 %.
  Einziger Rest im Verzeichnis: `actions.ts:643` (`?? ""` in `ensureThekeAction`, nicht Teil von #371).
- AK1–AK24 und FS1–FS4 sind jeweils in mindestens einem Unit- oder E2E-Test referenziert; keine
  neuen Tests nötig, kein Produktionscode geändert.
- Hinweis: Ein erster Lauf nutzte `dotenv -e .env.local` und löste den dmTECH-Guardrail
  (`cmd.secretfile.read`) aus. Es wurden keine Werte gelesen; weitere Läufe erfolgten ohne die Datei.

### Refactoring-Notizen (/refactor, 2026-10-03)
- Clean-Code-Pass über den Diff (`kassierSummen.ts`, `KassiereZeileForm.tsx`, `AbschlussAktion.tsx`,
  `KassierSummenKarte.tsx`, `kassieren/page.tsx`, `[id]/page.tsx`): Naming, Funktionslänge,
  Duplikation, Magic Strings, Kommentare (WHY) geprüft – kein Befund, der eine Änderung rechtfertigt
  (Spenden-Formel ist bereits als `spendeCents` extrahiert; kein Link-Klassen-Duplikat im Projekt).
  Kein Code geändert. `app/veranstaltung` + `eslint`: 711 Tests grün, `pnpm lint` und
  `tsc --noEmit` sauber.

## Offene Fragen
- [ ] Protokoll langfristig auf die Detailseite? (Hier: bleibt in „Abrechnung im Detail"; ggf. eigenes Issue)

## Review-Findings
<!-- Wird durch /review befüllt -->
- Runde 1 (2026-10-03): **APPROVED**, 0 kritisch / 0 wichtig / 3 Nitpicks
  (Details: [`review-371.md`](review-371.md)). Nitpicks: Fokus nach erfolgreichem
  Statuswechsel (Kandidat für #372), stehende Erfolgs-Notice nach erneutem Tippen,
  Abschluss-Link in der Summenkarte auch bei abgeschlossener Veranstaltung.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/371-kassieren-summe-schnellbetraege-abschluss`
Erstellt: 2026-10-02 23:22
