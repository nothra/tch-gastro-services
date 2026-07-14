# Task 105: firstissuemessage-helfer-zentralisieren

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Die Hilfsfunktion `firstIssueMessage(error)` (Extraktion der ersten Zod-Fehlermeldung
an der Formulargrenze) war wortgleich in zwei Server-Actions dupliziert:
`app/verwaltung/katalog/actions.ts` und `app/verwaltung/teilnehmer/actions.ts`
(je Z. 26–28). Gefunden in Review #50. Ziel: in `lib/` zentralisieren, beide
Kopien durch den Import ersetzen. Kein neues Verhalten (tech-debt).

## Akzeptanzkriterien
- [x] GIVEN ein fehlgeschlagenes `safeParse` mit Issues WHEN `firstIssueMessage`
      aufgerufen wird THEN wird die Meldung des ersten Issues zurückgegeben.
- [x] GIVEN ein Fehler ohne Issues WHEN `firstIssueMessage` aufgerufen wird THEN
      wird die Fallback-Meldung „Ungültige Eingabe." zurückgegeben.
- [x] Beide Server-Actions nutzen den zentralen Helfer; keine lokale Kopie mehr.
- [x] Verhalten der beiden Actions unverändert (bestehende Action-Tests bleiben grün).

## Technische Notizen
- Neuer Seam: `lib/form-errors.ts` mit `export function firstIssueMessage(...)`.
  (Issue schlug `form-utils.ts` vor; im Review auf den domänenspezifischen Namen
  `form-errors.ts` umbenannt – konsistent mit `authz`/`money`/`credentials`, kein
  generisches „utils".)
- Parametertyp bleibt strukturell minimal (`{ issues: { message: string }[] }`)
  statt an `ZodError` gebunden – so ist der Helfer ohne Zod-Aufbau testbar und deckt
  jede `safeParse`-Fehlerform ab. Verhalten 1:1 aus den Originalkopien übernommen.
- Import-Pfad `@/lib/form-errors` (Alias-Konvention wie `@/lib/authz`, `@/lib/money`).

## Offene Fragen
Keine.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `refactor/105-firstissuemessage-helfer-zentralisieren`
Erstellt: 2026-07-14 22:15
