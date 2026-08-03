# Security Review: Task 258

**Scope:** `git diff origin/main...HEAD` – `scripts/install-yq.sh` (neu),
`.github/workflows/factory-ci.yml`, `.github/workflows/factory-poll.yml`,
`scripts/checks/tests/run-tests.sh`, `CLAUDE.md`, `docs/factory/OPERATING.md`,
`docs/specs/spec-258-*.md`, Task-/Review-Notizen.

**Vorbemerkung:** Diese Task ist selbst eine Härtungsmaßnahme (OWASP A08 – Software and Data
Integrity Failures). Sie schließt das in `tasks/security-255.md` gemeldete Out-of-Scope-Finding
(unverifizierter `yq`-Download per `releases/latest`, dreifach kopiert). Die Review prüft
deshalb primär, ob die neue Verteidigung **selbst** tragfähig ist und ob sie neue Angriffsfläche
schafft.

## Kritische Findings (Blocker)

_Keine._

Der Downloadpfad ist fail-closed: `require_linux_amd64` → `mktemp -d` (Modus 0700) → drei
`fetch`-Aufrufe über HTTPS mit Abbruch bei Fehlschlag → `verify_sha256` (Pin-Vergleich +
Hash-Vergleich) → **erst dann** `chmod 0755` → `mv`. Jeder Fehlerpfad endet über `fail()` mit
Exit ≠ 0, bevor ein Ausführbar-Bit gesetzt oder `/usr/local/bin/yq` angefasst wird; die
Reihenfolge ist zusätzlich durch Struktur-Guards in `run-tests.sh` (`verify_sha256`-Zeile <
`chmod`-Zeile, `require_linux_amd64` < erster `fetch`) gegen Refactoring gesichert.

## Wichtige Findings

_Keine._

Geprüft und für tragfähig befunden:

- [x] **Zwei-Anker-Design ist die richtige Wahl.** Eine Verifikation nur gegen die mitgeladenen
      `checksums` wäre wirkungslos gegen einen kompromittierten Publisher (Binary und
      Hash-Datei kommen aus demselben Kanal, Trust-Domain-Problem). Der im Repo gepinnte
      `YQ_SHA256` ist der eigentliche Anker, der veröffentlichte Wert wird dagegen geprüft
      (eigener Fehlerpfad „Pin-Abweichung"). Genau das ist die sicherheitsrelevante Zusage –
      und sie ist im Header ehrlich als Trust-on-First-Use begrenzt.
- [x] **Der Pin ist am Produktionsaufruf verdrahtet, nicht nur vorhanden.** Der Guard in
      `run-tests.sh` ankert an `^verify_sha256 "` und verlangt `"$YQ_SHA256"` als letztes
      Argument. Ohne ihn wäre der Angriff „Refactor übergibt den *gelesenen* Wert" lautlos
      (published = pinned wird trivial wahr, Self-Test **und** CI blieben grün).
- [x] **Keine Command Injection.** Keine `eval`, keine ungequoteten Expansionen in
      Kommandopositionen; alle variablen Dateiargumente laufen über `--` (`sha256sum --`,
      `shasum -a 256 --`, `basename --`, `mv --`, `wget … --`). Externe Daten
      (`checksums`-Inhalt) werden über `awk -v` als **Daten** übergeben, nie als Muster oder
      Code interpoliert.
- [x] **Kein leerer Erwartungswert.** Der aus `checksums` gelesene Wert muss
      `^[0-9a-f]{64}$` erfüllen, sonst „Format-Drift"-Abbruch. Eine verkürzte Zeile, ein
      fehlender Eintrag oder eine fehlende `SHA-256`-Zeile in `checksums_hashes_order` führen
      je zu einem eigenen Abbruch statt zu einer Verifikation gegen `""` – alle sechs
      Fehlerpfade sind mit pfadspezifischer Meldung getestet.
- [x] **Zeilenauswahl per exaktem Feldvergleich** (`$1 == t`), nicht per Präfix – die
      `…​.tar.gz`-Zeile desselben Namens kann nicht fälschlich greifen. Die Fixtures enthalten
      genau diesen Köder als Kontrolle.
- [x] **Bash-`set -e`-Fallstrick vermieden:** `published=` und `actual=` sind eigene
      Anweisungen (nicht `local x="$(…)"`), der Exit-Code der Substitution wird also nicht
      maskiert. Ein `fail()` in einer Sub-Shell bricht den Lauf wirklich ab.
- [x] **Fail-closed Argument-Dispatch** (`case`): `--help` installiert nicht mehr, ein
      Tippfehler endet in Exit 2 statt im privilegierten Installationspfad. Belegt mit
      PATH-geshadowtem, laut fehlschlagendem `wget`/`curl`-Stub – kein Aufruf fällt
      unbemerkt in den Download-Pfad.
- [x] **Plattform-Guard vor dem ersten Download:** verhindert, dass ein passender Hash auf
      einer Fremdplattform ein funktionierendes `yq` mit einem Linux-Binary überschreibt.
- [x] **Least Privilege der Workflows unverändert:** `factory-ci.yml` bleibt bei
      `contents: read` / `issues: read`; `factory-poll.yml` bei `contents: write` /
      `issues: write`. Kein Scope wurde erweitert.
- [x] **Keine Secrets, keine Credentials, keine sensiblen Daten** im neuen Code oder in den
      Ausgaben. Die Fehlermeldungen nennen URL, Dateiname und Hashwerte – alles öffentliche
      Information, kein Information Disclosure.
- [x] **Temp-Handling sicher:** `mktemp -d` (privates Verzeichnis, kein vorhersagbarer Pfad,
      keine Symlink-Race), `trap … EXIT` räumt auf. `chmod 0755` explizit statt `chmod +x`
      (umask-unabhängig, deterministische Rechte).
- [x] **Keine neue Dependency** – das Skript nutzt ausschließlich Basiswerkzeuge
      (`wget`, `awk`, `grep`, `sha256sum`/`shasum`, `basename`, `mktemp`, `uname`).

## Hinweise

- [ ] **[Supply Chain, dokumentierte Grenze]** Der Pin ist ein **Trust-on-First-Use**-Anker:
      übernommen aus dem verifizierten CI-Lauf 30805947583. Er belegt Unveränderlichkeit ab
      diesem Zeitpunkt, **nicht** die Identität des Publishers – wäre `v4.53.3` bereits vor
      der Übernahme manipuliert gewesen, würde der Pin die Manipulation zementieren statt
      erkennen. Das ist im Skript-Header explizit als Grenze der Zusage benannt und in
      `spec-258` §Nicht inbegriffen bewusst ausgeklammert (Signaturkette cosign/GPG). Für die
      hier gegebene Threat Surface (CI eines privaten Repos, Hilfswerkzeug zum YAML-Lesen)
      angemessen; kein Handlungsbedarf in diesem PR.
- [ ] **[Supply Chain, angrenzend, out of scope → Issue
      [#284](https://github.com/nothra/tch-gastro-services/issues/284))]** Im **selben Schritt**
      von `factory-poll.yml` steht weiterhin `npm install -g @anthropic-ai/claude-code` – ohne
      Versions-Pin und ohne Integritätsprüfung. Dieser Job hält `ANTHROPIC_API_KEY` und ein
      `contents: write`-Token; ein kompromittiertes Paket-Release liefe dort mit Secret-Zugriff.
      Dieselbe Risikoklasse wie der behobene yq-Fund, mit höherem Schadenspotenzial. Von
      `spec-258` §Nicht inbegriffen ausdrücklich ausgeschlossen, deshalb autonom als eigenes
      Issue angelegt (Label `enhancement` + `security`) statt hier eingeschleust.
- [ ] **[CI-Trust-Boundary, unverändert]** `factory-ci.yml` läuft auf `pull_request` und
      checkt den PR-Stand aus – `scripts/install-yq.sh` ist dort also PR-kontrollierter Inhalt,
      genau wie es der vorherige Inline-`run:`-Block war. Ein PR kann `YQ_VERSION`+`YQ_SHA256`
      konsistent auf ein eigenes Artefakt umbiegen; die Self-Test-Guards prüfen Form und
      Verdrahtung, nicht die Vertrauenswürdigkeit des Werts. Die Auslagerung ins Skript
      **verschlechtert** die Lage nicht (identische Trust-Domain), verbessert sie aber auch
      nicht für diesen Vektor. Wirksame Kontrolle bleibt Review + Branch-Protection
      (`protect-main`, ADR-029) – für `factory-poll.yml` (Secret-haltend) greift der Schutz
      voll, weil dieser Workflow nur per `schedule`/`workflow_dispatch` vom Default-Branch läuft.
- [ ] **[Verfügbarkeit, kein Sicherheitsrisiko]** `fetch` nutzt ausschließlich `wget`; fehlt
      es (schlanke Container-Images), bricht der Schritt mit einem generischen
      `wget: command not found` ab statt mit einer eigenen Meldung – asymmetrisch zu
      `sha256_of`, das beide Werkzeug-Kandidaten prüft. Verhalten bleibt fail-closed
      (keine Installation), es ist reine Diagnose-Qualität. Bereits als Review-Nitpick
      (Runde 3) notiert und bewusst offen.
- [ ] **[Betriebsrisiko, kein Finding]** Der Pin altert: ohne Bump-Automatisierung bleibt yq
      auf `v4.53.3` stehen, künftige yq-Sicherheitsfixes kommen nicht automatisch an.
      `spec-258` schließt einen Auto-Update-Mechanismus bewusst aus. Bei einem künftigen
      Bump ist der neue Hash aus einem verifizierten Lauf zu übernehmen, nicht aus einer
      gekürzten Log-Darstellung zu rekonstruieren – die Task-Notiz hält dieses Vorgehen für
      den aktuellen Pin bereits fest.

## Ergebnis

**PASSED**

Keine kritischen und keine wichtigen Findings. Der PR beseitigt ein reales
Supply-Chain-Risiko (unverifizierte Ausführung eines `latest`-Downloads als root in drei
CI-Jobs, einer davon secret-haltend) und ersetzt es durch einen fail-closed verifizierten,
zentralen Seam. Merge aus Security-Sicht freigegeben. Ein angrenzendes, außerhalb des
Scopes liegendes Risiko ist als Issue
[#284](https://github.com/nothra/tch-gastro-services/issues/284) dokumentiert.
