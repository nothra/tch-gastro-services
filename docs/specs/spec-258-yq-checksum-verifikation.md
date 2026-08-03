# Spec: yq-Download in CI-Jobs gegen Checksum verifizieren

## Kontext

`.github/workflows/factory-ci.yml` lädt in zwei Jobs (`config-validation`, `factory-self-test`)
das `yq`-Binary (mikefarah/yq) per `wget -qO /usr/local/bin/yq
https://…/releases/latest/download/yq_linux_amd64` und führt es danach aus (`chmod +x` +
Aufruf) – ohne Checksum- oder Signatur-Verifikation und ohne Versions-Pin (`latest`). Aufgefallen
in der Security-Review zu Task 255 (dort als vorbestehendes, unverändertes Muster eingeordnet,
kein Blocker, weil nur dupliziert, nicht neu eingeführt).

**Dritter Fund während dieser Requirements-Phase:** `.github/workflows/factory-poll.yml`
(Job `factory-poll`, Schritt „Runtime bereitstellen") enthält denselben Download+Ausführen-Block
(`latest`, kein Checksum) – im Issue-Text nicht erwähnt, aber identisches Muster und identisches
Risiko. Nutzer-Entscheidung (Requirements-Phase): **mitgehärtet**, damit nicht sofort ein neues
Issue für dieselbe Fund-Klasse nötig ist.

**Warum jetzt härten:** `latest` + kein Checksum bedeutet, ein kompromittiertes oder
manipuliertes Release-Asset (Supply-Chain-Angriff auf mikefarah/yq, oder ein
Man-in-the-Middle auf der Download-URL ohne TLS-Pinning-Ausfall) würde unbemerkt in jedem
CI-Lauf ausgeführt – mit Zugriff auf `GITHUB_TOKEN` (issue-sync, config-validation) bzw.
`ANTHROPIC_API_KEY` (factory-poll).

## Scope

**Inbegriffen:**
- Ein zentrales Skript `scripts/install-yq.sh` (Muster analog `scripts/install-hooks.sh`):
  lädt eine **fest gepinnte** yq-Version (kein `latest`) plus die zur selben Release gehörenden
  Dateien `checksums` und `checksums_hashes_order` (offizielle mikefarah/yq-Release-Assets),
  verifiziert den SHA-256-Hash des heruntergeladenen `yq_linux_amd64`-Binaries dagegen, **bevor**
  `chmod +x` gesetzt wird, und installiert erst danach nach `/usr/local/bin/yq`.
- Die Verifikationslogik (Hash aus `checksums` + `checksums_hashes_order` extrahieren, gegen
  die Binary prüfen) liegt in einer eigenen, ohne Netzwerk aufrufbaren Funktion/Skript-Sektion,
  damit sie per Fixture testbar ist (Mocking-Regel: kein Netzwerk in Unit-/Self-Tests).
- Alle drei betroffenen Stellen – `factory-ci.yml` Jobs `config-validation` und
  `factory-self-test`, sowie `factory-poll.yml` Job `factory-poll` – rufen denselben
  `scripts/install-yq.sh` auf statt den Download+chmod-Block zu duplizieren („kein
  Doppel-Pflegen", analog zum bestehenden `FACTORY_LINT_COMMAND`-Muster).
- Ein Self-Test in `scripts/checks/tests/run-tests.sh` (analog den dortigen Fixture-Tests),
  der die Verifikationslogik gegen ein lokales Fixture mit **passendem** und mit
  **manipuliertem** Hash fährt – ohne echten Netzwerk-Download.
- Fail-closed: jeder Fehlerfall (Mismatch, fehlender Eintrag, Format-Drift) bricht den Schritt
  mit non-zero Exit ab, `chmod +x` wird in keinem Fehlerfall erreicht.

**Nicht inbegriffen:**
- Keine zusätzliche Signatur-Verifikation (cosign/GPG) – Checksum-Verifikation gegen die vom
  Release-Publisher selbst veröffentlichten Hashes deckt das im Issue benannte Risiko
  (unverifizierter Download) ab; eine Signaturkette wäre eine weitere, im Issue nicht
  geforderte Härtungsstufe (YAGNI für diese Task).
- Kein Automatismus, der die gepinnte yq-Version künftig selbstständig aktualisiert
  (z. B. Dependabot-Watch auf ein GitHub-Release) – Versions-Bumps bleiben ein manueller
  Schritt (einzige Änderungsstelle: die Versions-Konstante in `scripts/install-yq.sh`).
- Keine Änderung an anderen `wget`/`curl`-Downloads im Repo (z. B. `claude-code`-Installation
  in `factory-poll.yml`) – Issue #258 und der Fund in dieser Phase betreffen ausschließlich
  yq-Downloads.
- Keine Migration auf eine andere yq-Bereitstellung (z. B. `mikefarah/yq`-eigene GitHub Action,
  Paketmanager) – reine Härtung des bestehenden Download-Wegs.

## Akzeptanzkriterien

- [ ] GIVEN einer der drei betroffenen CI-Jobs (`config-validation`, `factory-self-test`,
      `factory-poll`) WHEN der Bereitstellungs-Schritt läuft THEN wird eine fest gepinnte
      yq-Versionsnummer heruntergeladen (kein `.../releases/latest/...`-URL mehr in einer der
      drei Workflow-Dateien).
- [ ] GIVEN die heruntergeladene `yq_linux_amd64`-Binary und die zur selben gepinnten Version
      gehörenden Dateien `checksums` + `checksums_hashes_order` WHEN `scripts/install-yq.sh`
      läuft THEN wird der SHA-256-Hash der Binary gegen den dort veröffentlichten Wert
      verifiziert, bevor `chmod +x` gesetzt wird.
- [ ] GIVEN ein Checksum-Mismatch (z. B. manipulierte/korrupte Binary) WHEN
      `scripts/install-yq.sh` läuft THEN schlägt der Schritt fail-closed fehl (Exit ≠ 0), OHNE
      `chmod +x` zu setzen, und der CI-Job wird rot.
- [ ] GIVEN die drei betroffenen Workflow-Jobs WHEN man den Download+Verifikations-Block
      inspiziert THEN rufen alle drei denselben `scripts/install-yq.sh` auf – kein
      dreifach kopierter `wget`+`chmod`-Block mehr in den YAML-Dateien.
- [ ] GIVEN die Verifikationslogik in `scripts/install-yq.sh` WHEN sie im Self-Test
      (`scripts/checks/tests/run-tests.sh`) gegen ein lokales Fixture mit korrektem Hash
      geprüft wird THEN meldet sie Erfolg, OHNE einen Netzwerkzugriff auszuführen.
- [ ] GIVEN dieselbe Verifikationslogik WHEN sie im Self-Test gegen ein Fixture mit
      **manipuliertem** Hash geprüft wird THEN meldet sie einen Fehler (Exit ≠ 0) – die
      Negativ-Probe ist ein eigener Testfall, nicht nur die Abwesenheit des Positiv-Tests.

## Fehlerszenarien

- [ ] Download von Binary/`checksums`/`checksums_hashes_order` schlägt netzwerkseitig fehl
      (curl/wget-Fehler) → Schritt bricht ab (fail-closed über `set -e`), keine partielle
      Installation.
- [ ] `checksums`-Datei enthält keinen Eintrag für `yq_linux_amd64` (z. B. Format-Drift in
      einem künftigen yq-Release) → Skript erkennt den fehlenden Eintrag explizit und bricht
      mit klarer Fehlermeldung ab, statt mit einem leeren/falschen Erwartungswert leise
      "erfolgreich" zu verifizieren.
- [ ] `checksums_hashes_order` enthält keine `SHA-256`-Zeile (Format-Drift bei der
      Hash-Algorithmus-Reihenfolge, die mikefarah/yq laut eigener Dokumentation bewusst pro
      Release rotiert) → Skript bricht ab, statt eine falsche Spalte als SHA-256 zu
      interpretieren.

## Offene Fragen

- [x] Scope-Frage aus der Requirements-Phase: Soll der dritte, im Issue nicht genannte Fund
      (`factory-poll.yml`) mitgehärtet werden? → Ja (Nutzer-Entscheidung, siehe Kontext).
- [ ] Implementierungsdetail (kann in `/implement` entschieden werden, keine ADR nötig):
      genaue CLI-Signatur von `scripts/install-yq.sh` (z. B. Versionskonstante fest im Skript
      vs. als Parameter) – Empfehlung: Versionskonstante fest im Skript (eine Änderungsstelle
      für Versions-Bumps, analog `install-hooks.sh`-Stil, kein zusätzlicher Konfigurationspfad
      nötig).
