# Task 258: yq-checksum-verifikation

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
yq-Download in CI-Jobs ohne Checksum-Verifikation härten: `.github/workflows/factory-ci.yml`
(Jobs `config-validation`, `factory-self-test`) und `.github/workflows/factory-poll.yml`
(Job `factory-poll`, dritter Fund aus der Requirements-Phase, nicht im Issue genannt) laden das
`yq`-Binary per `latest`-URL ohne Checksum-Verifikation. Ein zentrales Skript
`scripts/install-yq.sh` pinnt die Version und verifiziert den SHA-256-Hash gegen die von
mikefarah/yq veröffentlichten Release-Checksums, bevor `chmod +x` gesetzt wird. Details:
[spec-258-yq-checksum-verifikation.md](../docs/specs/spec-258-yq-checksum-verifikation.md).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] GIVEN einer der drei betroffenen CI-Jobs WHEN der Bereitstellungs-Schritt läuft THEN wird
      eine fest gepinnte yq-Version geladen (kein `.../releases/latest/...`-URL mehr).
- [ ] GIVEN Binary + `checksums` + `checksums_hashes_order` derselben Version WHEN
      `scripts/install-yq.sh` läuft THEN wird der SHA-256-Hash vor `chmod +x` verifiziert.
- [ ] GIVEN ein Checksum-Mismatch WHEN das Skript läuft THEN schlägt es fail-closed fehl
      (Exit ≠ 0), ohne `chmod +x` zu setzen.
- [ ] GIVEN die drei betroffenen Jobs WHEN man sie inspiziert THEN rufen alle denselben
      `scripts/install-yq.sh` auf (kein dreifach kopierter Block mehr).
- [ ] GIVEN die Verifikationslogik WHEN sie im Self-Test gegen ein Fixture mit korrektem Hash
      läuft THEN meldet sie Erfolg ohne Netzwerkzugriff.
- [ ] GIVEN dieselbe Logik WHEN sie gegen ein Fixture mit manipuliertem Hash läuft THEN
      meldet sie einen Fehler (eigener Negativ-Testfall).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger – reine Anwendung eines bekannten Security-Best-Practice-Musters
(Checksum-Verifikation gegen Publisher-Hashes), keine architektonische Alternative zu
diskutieren. `/architecture` wird für diese Task übersprungen, direkt weiter zu `/implement`.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] Scope: `factory-poll.yml` mitgehärtet? → Ja (Nutzer-Entscheidung, siehe Spec-Kontext).
- [ ] Implementierungsdetail (keine ADR nötig): Versionskonstante fest im Skript verankern
      (Empfehlung, analog `install-hooks.sh`) statt als externer Parameter.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/258-yq-checksum-verifikation`
Erstellt: 2026-08-03 07:40
