# Task 258: yq-checksum-verifikation

## Status
- [x] In Bearbeitung
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
- [x] GIVEN einer der drei betroffenen CI-Jobs WHEN der Bereitstellungs-Schritt läuft THEN wird
      eine fest gepinnte yq-Version geladen (kein `.../releases/latest/...`-URL mehr).
- [x] GIVEN Binary + `checksums` + `checksums_hashes_order` derselben Version WHEN
      `scripts/install-yq.sh` läuft THEN wird der SHA-256-Hash vor `chmod +x` verifiziert.
- [x] GIVEN ein Checksum-Mismatch WHEN das Skript läuft THEN schlägt es fail-closed fehl
      (Exit ≠ 0), ohne `chmod +x` zu setzen.
- [x] GIVEN die drei betroffenen Jobs WHEN man sie inspiziert THEN rufen alle denselben
      `scripts/install-yq.sh` auf (kein dreifach kopierter Block mehr).
- [x] GIVEN die Verifikationslogik WHEN sie im Self-Test gegen ein Fixture mit korrektem Hash
      läuft THEN meldet sie Erfolg ohne Netzwerkzugriff.
- [x] GIVEN dieselbe Logik WHEN sie gegen ein Fixture mit manipuliertem Hash läuft THEN
      meldet sie einen Fehler (eigener Negativ-Testfall).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->
Kein ADR-Trigger – reine Anwendung eines bekannten Security-Best-Practice-Musters
(Checksum-Verifikation gegen Publisher-Hashes), keine architektonische Alternative zu
diskutieren. `/architecture` wird für diese Task übersprungen, direkt weiter zu `/implement`.

**Umsetzung (Implement):**
- `scripts/install-yq.sh` als einziger Bereitstellungsweg. Zwei Modi: ohne Argumente
  „laden + verifizieren + installieren"; `--verify <binary> <checksums> <order>` prüft nur
  eine vorliegende Datei – **netzwerkfrei**, das ist der im Self-Test getestete Kern.
- Spaltenermittlung wie in yqs eigenem `extract-checksum.sh`: Zeile N in
  `checksums_hashes_order` (Algorithmus-Name) entspricht Feld N+1 der `checksums`-Zeile
  (Feld 1 = Dateiname). Zeilenauswahl per **exaktem** Feldvergleich, damit `…​.tar.gz`-Zeilen
  nicht fälschlich greifen.
- Fehlerpfade tragen je eine eigene, pfadspezifische Meldung (fehlende `SHA-256`-Zeile /
  fehlender `checksums`-Eintrag / Format-Drift der Spalte / nicht lesbare Datei /
  Checksum-Mismatch) – der Self-Test prüft je Negativfall genau diese Meldung, nicht nur
  „Exit ≠ 0" (sonst wäre ein Test schon durch ein fehlendes Skript grün, Lesson #214).
- Positiv-Fixture ist eine **leere** Datei: SHA-256 der leeren Eingabe ist ein öffentlich
  bekannter Testvektor, dadurch bleibt der Erwartungswert im Test ein Literal statt aus dem
  Objekt-under-Test abgeleitet zu werden (testing-standards).
- `chmod 0755` liegt im Download-Pfad strikt nach dem `verify_sha256`-Aufruf; da dieser Pfad
  ohne Netzwerk nicht testbar ist, sichert ihn zusätzlich ein Reihenfolge-Guard im Self-Test
  (Anker: die echten Aufruf-Zeilen, nicht eine Prosa-Erwähnung, Lesson #114).
- Prettier ignoriert `.github/` und `scripts/` (`.prettierignore`) – das Format-Gate ist von
  dieser Änderung nicht betroffen.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [x] Scope: `factory-poll.yml` mitgehärtet? → Ja (Nutzer-Entscheidung, siehe Spec-Kontext).
- [x] Implementierungsdetail (keine ADR nötig): Versionskonstante fest im Skript verankern
      (Empfehlung, analog `install-hooks.sh`) statt als externer Parameter. → Umgesetzt:
      `YQ_VERSION="v4.53.3"` als Konstante in `scripts/install-yq.sh`; Versions-Bump ändert
      genau diese Zeile.
- [x] **Nachtest in CI (Umgebung, kein offener Scope):** Diese Session hatte keinen
      Netzwerkzugriff (`curl`/WebFetch nicht freigegeben), der echte Download war lokal also
      nicht ausführbar – Versions-Pin, Verifikationslogik und Wiring sind per Fixture-/
      Struktur-Tests belegt (837 Self-Tests grün), das Release-Asset-Format aber nur per
      yq-Doku angenommen. → **In CI bestätigt** (PR #277, Run 30805947583): der Schritt
      „yq bereitstellen" meldet `install-yq: lade yq v4.53.3 (yq_linux_amd64) …` und
      `✓ SHA-256 von 'yq_linux_amd64' verifiziert (fa52a4e7…eded4)`, danach
      `yq … version v4.53.3`; `config-validation` und `factory-self-test` grün.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/258-yq-checksum-verifikation`
Erstellt: 2026-08-03 07:40
