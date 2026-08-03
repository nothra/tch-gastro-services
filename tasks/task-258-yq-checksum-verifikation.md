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
- [x] **AK7 (aus Review-Runde 1):** GIVEN ein Fixture, dessen veröffentlichter Hash vom im Repo
      gepinnten `YQ_SHA256` abweicht („Release-Asset unter demselben Tag ersetzt") WHEN die
      Verifikationslogik läuft THEN bricht sie mit einer eigenen, von „Checksum-Mismatch"
      unterscheidbaren Meldung ab (Exit ≠ 0).

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

**Rework nach Review-Runde 1 (Implement-Runde 2):**
- **Zwei Anker statt einem:** `YQ_SHA256` ist jetzt im Repo gepinnt und der eigentliche
  Supply-Chain-Anker; der aus `checksums` gelesene Wert wird dagegen geprüft (eigener
  Fehlerpfad „Pin-Abweichung"). Grund: `checksums`/`checksums_hashes_order` kommen aus
  demselben Kanal wie das Binary – wer das eine ersetzen kann, ersetzt das andere mit. Die
  mitgeladenen Release-Dateien liefern weiterhin Spaltenordnung + Korruptions-/Drift-Erkennung.
  Grenze der Zusage (im Header dokumentiert): Trust-on-First-Use-Anker, keine Prüfung der
  Publisher-Identität. Ein Bump ändert genau zwei Zeilen (`YQ_VERSION` + `YQ_SHA256`).
- **Pin-Wert im Volltext belegt:** die CI-Notiz unten zitiert den Hash gekürzt; der gepinnte
  Wert wurde per `gh run view 30805947583 --log` gegen das Log gegengeprüft, nicht aus der
  Kürzung rekonstruiert.
- **Plattform-Guard** `require_linux_amd64` vor dem ersten Download: der Pin gilt für genau ein
  Artefakt; ohne Guard hätte ein macOS-Aufruf erfolgreich verifiziert und `/usr/local/bin/yq`
  mit einem Linux-Binary überschrieben (auffällig erst nach dem Clobbern). Tests stellen `uname`
  per PATH-Shadowing, damit der Guard auf jeder Maschine deterministisch feuert.
- **Fail-closed Argument-Dispatch** (`case` statt einzelner `--verify`-Bedingung): `--help`
  installiert nicht mehr, ein Tippfehler wie `--verfiy` endet in Usage + Exit 2 statt im
  privilegierten Installationspfad (Muster aus #262).
- **`ci_job_block <job> <file>`** als einziger awk-Job-Block-Extraktor; die zwei
  Bestandsstellen sind mitgezogen (Lesson #240/#251 – keine dritte Kopie).
- **Regel in geladener Doku** (CLAUDE.md §Guardrails + OPERATING.md §5.4), nicht nur im
  Skript-Header – Header landen nicht im Agenten-Kontext. Zwei Doku-Checks in der Suite sichern
  das fail-closed ab.
- **Netzwerkfreiheit deterministisch belegt:** `wget`/`curl` werden im Test per PATH-Shadowing
  durch ein lautes, immer fehlschlagendes Stub ersetzt (statt Proxy-Variablen, die nur wirken,
  wenn das Werkzeug sie beachtet).
- Suite nach dem Rework: **861 grün / 0 rot** (vorher 837).

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
Runde 1: `NEEDS_REWORK` – Volltext in [review-258.md](review-258.md). Sechs wichtige Findings,
alle behoben (siehe §Rework dort und in den technischen Notizen oben); acht Nitpicks mit
erledigt, vier bewusst offen gelassen (mit Begründung dokumentiert). Erneutes `/review` steht
aus – die Status-Checkbox „Review bestanden" bleibt daher offen.

**Nachtest in CI nach dem Rework – bestätigt:** Der Download-Pfad hat sich geändert
(Plattform-Guard + Pin-Vergleich vor der Hash-Berechnung), der Nachweis unten (Run 30805947583)
belegt nur den Stand *davor*. Neuer Lauf **30809613876** (Commit 948d089) ist grün: der Schritt
„yq bereitstellen" meldet `install-yq: lade yq v4.53.3 …` und
`✓ SHA-256 von 'yq_linux_amd64' verifiziert (fa52a4e7…eded4)`, danach `yq … version v4.53.3`.
Damit ist auch der gepinnte `YQ_SHA256` empirisch als korrekt belegt – ein falscher Pin wäre
fail-closed rot mit „Pin-Abweichung" gewesen, nicht still grün.

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `chore/258-yq-checksum-verifikation`
Erstellt: 2026-08-03 07:40
