# Task 127: project-context-essen-katalog-modell

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Reiner Doku-Abgleich: `docs/factory/PROJECT-CONTEXT.md` (Sektion „Fachdomäne → Kernbegriffe")
beschreibt noch das alte Essen-Modell. Das Modell wurde am 2026-07-15 geändert (ADR-023 §D4/§D7,
umgesetzt in #116): Essen ist **kein** Veranstaltungs-Property mehr, sondern ein **Katalogartikel
der Kategorie `essen`** mit festem Preis. Zwei Stellen ziehen:
- Zeile 36: „Essenpreis" aus den Eigenschaften von Veranstaltung/Abend entfernen.
- Zeile 38–39: Katalog-Kernbegriff auf das neue Modell + Umbenennung „Getränke-Katalog" → „Katalog".

Spec: [spec-127](../docs/specs/spec-127-project-context-essen-katalog-modell.md).
Gefunden im `/review` von #116 (dort out-of-scope).

## Akzeptanzkriterien
- [ ] GIVEN der Kernbegriff „Veranstaltung/Abend" WHEN man seine Eigenschaftenliste liest
  THEN enthält sie **keinen** „Essenpreis" mehr (nur Datum, Bezeichnung, Kasse, Status).
- [ ] GIVEN der Katalog-Kernbegriff WHEN man ihn liest THEN wird Essen als **Katalogartikel mit
  festem Preis (Kategorie `essen`)** beschrieben, nicht „pro Abend festgelegt".
- [ ] GIVEN der Katalog-Kernbegriff WHEN man den Namen liest THEN heißt er **„Katalog"**
  (nicht „Getränke-Katalog"), konsistent mit #116/spec-116.
- [ ] GIVEN die geänderte Stelle WHEN man sie prüft THEN verweist sie auf die kanonische Quelle
  (**ADR-023 §D4/§D7**).

## Technische Notizen
- Rein `docs/`-Änderung, keine Code-/Schema-/Test-Änderung (Modell ist durch #116 bereits umgesetzt).
- Kein `/architecture` nötig (keine Architekturentscheidung); direkt `/implement`.
- CLAUDE.md-Regel beachten: „Kanonische Quellen immer referenzieren" – Verweis auf ADR-023 setzen.

## Offene Fragen
Keine – alle Entscheidungen sind durch die kanonischen Quellen (ADR-023, spec-49, spec-116)
determiniert.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `docs/127-project-context-essen-katalog-modell`
Erstellt: 2026-07-17 12:57
