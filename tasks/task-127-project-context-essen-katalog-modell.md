# Task 127: project-context-essen-katalog-modell

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig — n. z.: reine Doku-Änderung, kein Produktionscode (nichts zu testen)
- [x] Security-Review bestanden — n. z.: keine Angriffsfläche (docs-only, kein Code/Input/Secret)
- [x] Refactoring abgeschlossen — n. z.: kein Code zu refactoren
- [x] Codify ausgeführt — siehe [codify-127.md](codify-127.md); Prozess-Learning als #131 erfasst
- [x] Fertig / PR erstellt

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
- [x] GIVEN der Kernbegriff „Veranstaltung/Abend" WHEN man seine Eigenschaftenliste liest
  THEN enthält sie **keinen** „Essenpreis" mehr (nur Datum, Bezeichnung, Kasse, Status).
- [x] GIVEN der Katalog-Kernbegriff WHEN man ihn liest THEN wird Essen als **Katalogartikel mit
  festem Preis (Kategorie `essen`)** beschrieben, nicht „pro Abend festgelegt".
- [x] GIVEN der Katalog-Kernbegriff WHEN man den Namen liest THEN heißt er **„Katalog"**
  (nicht „Getränke-Katalog"), konsistent mit #116/spec-116.
- [x] GIVEN die geänderte Stelle WHEN man sie prüft THEN verweist sie auf die kanonische Quelle
  (**ADR-023 §D4/§D7**).

## Implementierungs-Notizen
- Reine `docs/`-Änderung an `PROJECT-CONTEXT.md` (Zeile 35–41), keine Code-/Test-Änderung –
  das Essen-Katalog-Modell ist bereits durch #116 umgesetzt. TDD/„Test zuerst" greift mangels
  Produktionscode nicht mechanisch; Verifikation = Konsistenz-Abgleich gegen ADR-023 §D4/§D7 +
  spec-49/116.
- **Bewusst kein Prosa-Grep-Guard** in `scripts/checks/tests/run-tests.sh`: PROJECT-CONTEXT.md ist
  ein lebendes Dokument; ein Content-Grep darauf wäre brüchig und Gold-Plating (YAGNI). Es gibt
  auch kein bestehendes Muster dafür (die run-tests.sh-Treffer sind bloße Temp-Fixtures).
- ADR-Trigger-Check (Schritt 0): keine der vier Kategorien trifft zu → kein ADR nötig.

## Technische Notizen
- Rein `docs/`-Änderung, keine Code-/Schema-/Test-Änderung (Modell ist durch #116 bereits umgesetzt).
- Kein `/architecture` nötig (keine Architekturentscheidung); direkt `/implement`.
- CLAUDE.md-Regel beachten: „Kanonische Quellen immer referenzieren" – Verweis auf ADR-023 setzen.

## Offene Fragen
Keine – alle Entscheidungen sind durch die kanonischen Quellen (ADR-023, spec-49, spec-116)
determiniert.

## Review-Findings
Review: [review-127.md](review-127.md) → **APPROVED**. Keine kritischen/wichtigen Findings;
1 Nitpick (belassen, begründet). Out-of-Scope-Fund als **Issue #130** angelegt (veraltetes
„F4 Essenpreis je Abend"-Beispiel in ADR-021).

## Codify-Notizen
Report: [codify-127.md](codify-127.md). Review war sauber (keine Fehlerklasse). Prozess-Learning
(start-work.sh `--help`-Footgun) als **Issue #131** erfasst; out-of-scope Review-Fund (ADR-021)
als **Issue #130**. Keine neue Regel auf diesem Branch (Scope-Disziplin).

PR-Shepherd 2026-07-17: Auto-Merge freigegeben – alle Gates grün (CI: lint/test/factory-self-test/
issue-sync/pr-closes-issue/Vercel), keine Pflicht-Approvals, Draft→ready. Tests/Security/Refactoring
n. z. (reine Doku), Codify ausgeführt.

---
Branch: `docs/127-project-context-essen-katalog-modell`
Erstellt: 2026-07-17 12:57
