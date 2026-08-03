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
- `scripts/install-yq.sh` als einziger Bereitstellungsweg. Drei Modi: ohne Argumente
  „laden + verifizieren + installieren"; `--verify <binary> <checksums> <order> <sha256>`
  prüft nur eine vorliegende Datei – **netzwerkfrei**, das ist der im Self-Test getestete
  Kern; `--help` gibt die Verwendung aus. Jedes andere Argument endet fail-closed in Usage +
  Exit 2 (kein Durchfallen in den Installationspfad). Der vierte `--verify`-Parameter ist
  beim Rework aus Runde 1 dazugekommen (gepinnter Erwartungswert, siehe unten).
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

**Rework nach Review-Runde 2 (Implement-Runde 3):**
- **Kopplungs-Guard für den Repo-Pin:** Runde 2 zeigte per Mutation, dass `YQ_SHA256` auf
  `000…0` gesetzt werden konnte, ohne dass ein Test rot wurde – geprüft war nur die *Existenz*
  der Konstante, nicht ihre **Verdrahtung** an `verify_sha256`. Gefährlich ist dabei nicht das
  Löschen des Arguments (`set -u` fängt das), sondern ein Refactor, der stattdessen den aus
  `checksums` gelesenen Wert übergibt: dann ist `published = pinned` trivial wahr, der
  Supply-Chain-Anker ist lautlos weg, und **beide** Signale bleiben grün (Self-Test wie CI,
  weil ein ehrlicher Download zu seinem eigenen Hash passt). Neuer Guard ankert an der echten
  Aufruf-Zeile (`^verify_sha256 "`) und verlangt `"$YQ_SHA256"` als letztes Argument
  (Lessons #212/#214/#114).
- **Diskriminierung der drei neuen Guards per Mutation belegt**, nicht behauptet: Aufruf auf
  `published_sha256`-Wert umgestellt / Tag in `BASE_URL` hartkodiert / Meldungs-`echo`
  entfernt → **genau** die drei zugehörigen Assertions rot (861 grün / 3 rot), kein
  Kollateral-Rot; nach dem Rückbau 864 grün / 0 rot.
- **URL ↔ Versionskonstante gekoppelt** (Nitpick aus Runde 2): ein hartkodiertes Tag in
  `BASE_URL` hätte beide AK1-Guards passiert, während `YQ_VERSION` etwas anderes behauptet
  (in CI fail-closed über die Pin-Abweichung, lokal aber unentdeckt).
- **Letzter Fehlerpfad ohne eigene Meldung geschlossen:** `--verify` mit falscher
  Argumentzahl benennt jetzt, *was* fehlt (statt nackter Usage), und der Test assertiert die
  Meldung statt nur den Exit-Code – damit gilt die Designregel „jeder Fehlerpfad trägt eine
  pfadspezifische Meldung" ausnahmslos (10 von 10).
- **Veraltete CLI-Beschreibung nachgezogen** (§Umsetzung oben): „Zwei Modi" → drei Modi, und
  `--verify` nimmt seit Runde 1 **vier** Argumente. Wer der alten Notiz folgte, landete bei
  Usage + Exit 2 (Lesson #211/#176 – Präsens-Doku im selben PR mitpflegen); dieselbe Drift in
  der Spec-Frage „genaue CLI-Signatur" ist mitabgehakt.
- Bewusst **nicht** geändert (Nitpicks aus Runde 2): der Kommentar-Hinweis zu `YQ_HASH_ALGO`
  ist jetzt ehrlich formuliert statt die Asymmetrie zu beseitigen (der Algorithmusname ist
  konstant; variiert wird nur seine *Position*, und die kommt aus der Fixture) – und die
  Platzierung von `hex64` bei den generischen Helfern bleibt dem `/refactor`-Schritt
  überlassen, statt sie im Review-Rework mit zu verschieben.
- Suite nach dem Rework: **864 grün / 0 rot** (vorher 861).

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
erledigt, vier bewusst offen gelassen (mit Begründung dokumentiert).

Runde 2: `NEEDS_REWORK` – keine kritischen Findings, alle sechs Runde-1-Findings verifiziert
behoben, alle sieben AK erfüllt. Zwei wichtige Findings, **beide behoben** (Implement-Runde 3
oben): (1) fehlender Kopplungs-Guard zwischen `YQ_SHA256` und dem Produktionsaufruf,
(2) veraltete CLI-Signatur in der technischen Notiz. Zusätzlich drei der fünf Nitpicks mit
erledigt (Spec-Checkbox-Drift, URL↔Versions-Kopplung, Meldung im Argumentzahl-Fehlerpfad);
zwei bewusst offen (Begründung oben). Die Runde-2-Empfehlung hält eine dritte Review-Runde
für unnötig, wenn beide Punkte umgesetzt sind – die Status-Checkbox „Review bestanden" bleibt
trotzdem offen, bis der Pipeline-Schritt sie setzt.

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
