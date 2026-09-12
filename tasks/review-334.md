# Review: Task 334

> Runde 2 (2026-09-12), nach der Rework-Runde auf Runde-1-Findings. Runde 1
> (2026-09-11, NEEDS_REWORK, zwei Kritisch-Findings – CSV-Leck in zwei Fail-Open-Zweigen
> von `telemetry_persist()` und Kosten-Unterzählung bei Retry-mit-Backoff) ist per
> Mutationstest **erneut verifiziert**, nicht nur als „laut Commit-Message erledigt"
> übernommen: beide Fixes einzeln zurückgenommen, je genau ein zuvor grüner Test kippt
> dabei rot (`#334 (Review-Finding 1): der Index-nicht-leer-Zweig hinterlässt KEINE CSV
> auf der Platte` bzw. `#334 (Review-Finding 2): Kosten BEIDER Versuche stehen in der
> Summe`) – Kausalität belegt, nicht nur Korrelation. Beide bleiben behoben.

## Kritische Findings (müssen behoben werden)

- [x] [scripts/run-pipeline.sh:200] `telemetry_persist()`s Commit (`git -C "$FACTORY_DIR"
  commit -q -m "..."`) läuft **ohne** explizite Identität und verlässt sich auf ambiente
  `user.email`/`user.name`-Konfiguration. Das lässt den GitHub-CI-Check
  `factory-self-test` auf diesem PR **aktuell fehlschlagen** – drei Tests rot
  (`https://github.com/nothra/tch-gastro-services/actions/runs/34590058288`):
  ```
  ✗ #334 AK1 (E2E): der Lauf legt tasks/telemetry-905-<zeitstempel>.csv an
  ✗ #334 AK1 (E2E): der Lauf meldet die Persistenz
  ✗ #334 (Review-Finding 2): der Lauf mit einem gescheiterten ersten Versuch persistiert dennoch eine CSV
  ```
  Root Cause empirisch bestätigt (frischer `ubuntu:24.04`-Container, passend zu
  `runs-on: ubuntu-latest` in `factory-ci.yml:83`, nicht nur lokal auf macOS vermutet – dort
  liefert `git` mangels Konfiguration eine synthetisierte Fallback-Identität aus
  Benutzername+Hostname und verschleiert das Problem):
  ```
  $ git -c user.email=t@t -c user.name=t commit -q -m init   # Scaffold-Init-Commit
  rc=0
  $ git commit -q -m "chore: telemetrie"                     # wie telemetry_persist()
  fatal: unable to auto-detect email address (got 'root@…(none)')
  rc=128
  ```
  Die Test-Scaffolds (`commit_310`/`commit_314_pushed`) committen NUR mit `-c
  user.email=… -c user.name=…` (Per-Aufruf-Override, nicht persistiert) – das reicht für
  ihren **eigenen** Init-Commit, aber `telemetry_persist()`s **eigener**, blanker
  `git commit` im selben Repo hat davon nichts und scheitert in einer Umgebung ohne
  ambiente Konfiguration.
  **Warum kritisch:** (1) `factory-self-test` ist ein required Check (ADR-029) – der PR
  ist damit aktuell nicht mergefähig, unabhängig von der Einordnung darunter. (2) Es ist
  **kein reiner Testartefakt**: `.github/workflows/factory-poll.yml` (der geplante
  CI-Auslöseweg für `run-pipeline.sh`, ADR-008, aktuell nur mangels `schedule`-Trigger
  ruhend, #284) läuft ebenfalls auf `ubuntu-latest` **ohne** einen `git config
  user.email/user.name`-Schritt – sobald dieser Weg reaktiviert wird, träfe genau dieselbe
  Ursache den echten Lauf: `telemetry_persist()` bekäme dort **nie** eine erfolgreiche
  Ernte hin, obwohl AK6 (fail-open) das nur verdeckt, nicht heilt – die Kernfunktion des
  gesamten Tasks (Kostenhistorie für ADR-009/ADR-038) bliebe in dieser Umgebung dauerhaft
  leer, ohne lauteres Signal als eine Warnzeile im Log.
  **Fix-Richtung:** `telemetry_persist()`s Commit mit einer **expliziten, umgebungs­-
  unabhängigen Identität** versehen (`git -C "$FACTORY_DIR" -c user.email=… -c
  user.name=… commit -q -m …`), statt sich auf ambiente Konfiguration zu verlassen –
  dieselbe Technik, die die Test-Scaffolds bereits für ihren eigenen Init-Commit nutzen.
  Das behebt den echten Funktionslücken-Fall **und** macht die drei roten Tests ohne
  Änderung an ihnen selbst wieder grün (ein reiner Test-Fix, der nur die Scaffolds
  anpasst, ließe die Produktionslücke unangetastet).

## Wichtige Findings (sollten behoben werden)

*(keine – die beiden Runde-1-Findings sind per Mutationstest verifiziert behoben, siehe
Kopfnotiz)*

## Nitpicks (optional)

- [x] [docs/adr/049-telemetrie-persistenz-je-pipeline-lauf.md:331] Nennt unter „Betroffene
  Stellen" noch den alten Funktionsnamen `persist_telemetry()` – die Rework-Runde hat sie
  zu `telemetry_persist()` umbenannt (Wichtig-Finding aus Runde 1). Kleine Doku-Drift,
  analog Lesson „ADR nach Review-Rework auf Drift prüfen" (#55).

## Positives

- Beide Runde-1-Findings sind nicht nur behoben, sondern per **Mutationstest** bestätigt:
  Fix einzeln zurückgenommen → genau der erwartete Test kippt, alle anderen bleiben grün.
  Das ist stärker als „Test ist jetzt grün", weil es Kausalität statt Korrelation zeigt.
- Die neuen E2E-Tests (Index nicht leer / Commit schlägt via ablehnendem `pre-commit`-Hook
  fehl / Retry-Summe) sind sauber gegen den echten Orchestrator konstruiert – der
  `pre-commit`-Hook-Ansatz für „Commit scheitert" ist deterministisch und umgebungs­-
  unabhängig, anders als ein Versuch, auf fehlende globale Git-Identität zu setzen
  (Lesson testing.md #265) – nur eben nicht für die anderen beiden neuen Szenarien
  angewendet, die sich stattdessen auf einen echten, umgebungsabhängigen Commit verlassen.
- `--dry-run`-Nitpick aus Runde 1 sauber behoben: Aktivierungsblock jetzt zusätzlich auf
  `DRY_RUN=false` bedingt, keine unnötige Datei mehr unter `tasks/`.
- Namenskonsistenz (`telemetry_persist` statt `persist_telemetry`) vollständig durchgezogen
  im Code; nur die eine ADR-Stelle oben ist noch nicht nachgezogen.

## Rework-Notiz Runde 2 (aus `/implement`, 2026-09-12)

Fix: `telemetry_persist()`s Commit trägt jetzt `-c user.email="factory-pipeline@localhost"
-c user.name="dm Development Factory"` statt sich auf ambiente Git-Konfiguration zu
verlassen. RED→GREEN empirisch in einem frischen `ubuntu:24.04`-Container gegen die exakte
Commit-Zeile aus `run-pipeline.sh` belegt (nicht nur lokal, da macOS-Git den Fehlerfall
mangels Domainanteil im Hostname nicht reproduziert): vorher `fatal: unable to
auto-detect email address`, exit 128 – nachher exit 0. Zusätzlich zwei strukturelle Guards
in `run-tests.sh` (prüfen `-c user.email=`/`-c user.name=` in `telemetry_persist()`) per
Mutationstest bestätigt (Fix zurückgenommen → genau diese zwei Tests kippen rot).

Der bestehende `git commit -q -m`-Struktur-Guard war durch die neue mehrzeilige
Commit-Aufrufform obsolet geworden (grep matcht zeilenweise) – auf
`commit -q -m "chore: telemetrie-messwerte lauf'` präzisiert, damit er weiterhin greift.

ADR-049-Nitpick (alter Funktionsname `persist_telemetry()`) ebenfalls behoben.

Bash-Suite: 1530/1530 grün.

## Empfehlung

NEEDS_REWORK

<!-- Verdict bleibt an der nächsten /review-Runde. ----->
