# Security Review: Task 427

> 2026-10-23 · Scope `git diff origin/main...HEAD` · Security-Sub-Agent (Persona
> `docs/factory/agents/security-agent.md`) mit Probelauf `run` + `scan` und Repros in
> Wegwerf-Repos (gelöscht). W1 und der reale Befund aus W2 im Orchestrator per eigenem Repro
> nachgeprüft. Werkzeuge: gitleaks 8.30.1, git-filter-repo a40bce548d2c, bash 3.2.57.
>
> **Kontext:** `scan` ist das einzige Sicherheits-Gate vor dem öffentlichen, nicht rückholbaren
> Bootstrap-Push in T1b-2 (Spec B1/B2/B4, FS1, ADR-063 D5). Heute leakt nichts Neues; die
> Findings sind Fail-open-Pfade bzw. Lücken des Gates, die vor T1b-2 zu sein müssen.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

- [x] [Fail-open / Gate-Wirksamkeit] `scripts/project/factory-extract.sh` `cmd_scan` (gitleaks-Aufruf): gitleaks liest `.gitleaks.toml` und `.gitleaksignore` automatisch aus der Wurzel des gescannten Arbeitsbaums (`<ziel>`), dazu `GITLEAKS_CONFIG` aus der Umgebung – beide können B1 still abschalten, ohne Begründungspflicht und ohne Spur im Bericht. Repro (Orchestrator): Commit mit `ghp_…`-Token → gitleaks Exit 1; dieselbe Historie mit ungetrackter `.gitleaks.toml` (`[allowlist] paths=[".*"]`) im Ziel → Exit 0. Laut Sub-Agent unterdrückt eine `.gitleaksignore` im Ziel-Root den Fund auch mit `--config`/`--gitleaks-ignore-path`. Auslöser: Factory-Commit, der eine solche Datei hinzufügt; Rest im Ziel; Umgebung. **Lösung:** gitleaks gegen einen Klon ohne Arbeitsbaum laufen lassen (`git clone --bare <ziel> <tmp>`) **oder** fail-closed abbrechen, wenn `<ziel>/.gitleaks.toml`, `<ziel>/.gitleaksignore` (Arbeitsbaum **oder** Historie) oder `GITLEAKS_CONFIG` existiert; zusätzlich `--config` auf eine gepinnte Datei in `scripts/project/` (`[extend] useDefault = true`); Negativtest je Datei. _Im Scope._ — **Behoben:** Klon ohne Arbeitsbaum, `--config` auf `factory-extract.gitleaks.toml`, `env -u GITLEAKS_CONFIG`; Tests + Mutation, Gegenprobe mit echtem gitleaks (Token + `.gitleaks.toml`/`.gitleaksignore` im Ziel + `GITLEAKS_CONFIG` → B1 ✗).
- [x] [Gate-Lücke / PII + Secrets] `scan_emails` (nur Blobs) und gitleaks `git`-Modus (nur Diffs): **Commit- und Tag-Messages prüft keine der beiden Prüfungen.** Repro (Sub-Agent): Token nur in der Message bzw. `Co-authored-by: Echte Person <echte.person@dm.de>` → B1 ✓, B2 ✓. **Realer Befund (Orchestrator bestätigt):** `origin/main` trägt `Co-authored-by`-Trailer mit der dm-Firmenadresse des Entwicklers samt Personalnummer (11×, davon 4 in der herausgelösten Historie) und einmal mit einer privaten Adresse. Das steht bereits im öffentlichen TCH-Repo (kein neuer Leak), wird aber vom Bericht nicht sichtbar gemacht; ADR-063 D5 nimmt nur „Commit-Autoren-Metadaten" aus, Spec B2 „Autoren-Metadaten" – ob Trailer darunterfallen, ist nicht entschieden, und die Freigabe nach B4 erfolgte ohne diese Information. **Lösung:** E-Mail-Scan zusätzlich über `git log --all --format=%B` (und Tag-Messages) mit eigener Berichtszeile „Messages/Trailer"; Secret-Scan über die Messages (z. B. `gitleaks stdin`); Entscheidung des Entwicklers zu den Trailern im ADR-Nachtrag festhalten (behalten wie Autoren-Metadaten **oder** beim Herauslösen umschreiben). _Im Scope (Werkzeug); Trailer-Entscheidung beim Entwickler._ — **Behoben:** `scan` prüft Commit-/Tag-Messages per `gitleaks stdin` (B1 Messages) und E-Mail-Muster (B2 Messages); Entscheidung des Entwicklers: Trailer mit persönlicher Adresse entfernt `run` (`factory-extract.trailers`), noreply-Trailer bleiben; ADR-Nachtrag und Spec B1/B2 nachgezogen. Probelauf: B1/B2 Messages ✓, keine persönliche Adresse mehr in den Messages.
- [x] [Transparenz / Spec B2] `print_scan_report`: Die Erlaubt-Liste steht weder als Inhalt noch als Pfad im Bericht (Spec B2: „im Scan-Bericht aufgeführte Erlaubt-Liste"); per `FACTORY_EXTRACT_ALLOW` lässt sie sich unsichtbar ersetzen. Repro (Sub-Agent): Liste `*` → `| B2 | ✓ | 8 Adressen, alle in der Erlaubt-Liste`. **Lösung:** geltende Muster samt Pfad im Bericht ausgeben (analog Falsch-Positiv-Liste); Muster ohne literalen Domain-Teil (`*`, `*@*`) fail-closed ablehnen; abweichende `FACTORY_EXTRACT_*`-Overrides im Bericht nennen. _Im Scope._ — **Behoben:** Bericht nennt Pfad und Muster der Erlaubt-Liste sowie per Umgebung überschriebene Listen; Muster ohne feste Top-Level-Domain brechen mit Exit 2 ab.

## Hinweise

- [x] [Gate-Wirksamkeit] `ignored_with_reasons`: Fingerprint-Format wird nicht geprüft; gitleaks akzeptiert auch den globalen Fingerprint `<datei>:<regel>:<zeile>` (gilt für alle Commits). Lösung: je Eintrag `^[0-9a-f]{40}:[^:]+:[^:]+:[0-9]+$` fail-closed verlangen. Inline-`gitleaks:allow` unterdrückt ebenfalls ohne Begründung (im Probelauf 0×) – Zählzeile im Bericht wäre billig. _Im Scope._ — **Behoben:** Fingerprint ohne Commit-Bezug → Exit 2. `gitleaks:allow`-Zählzeile bewusst nicht umgesetzt (0 Vorkommen, gitleaks läuft mit gepinnter Konfiguration).
- [x] [E-Mail-Regex] IDN-/Umlaut-Domains und obfuskierte Formen (`(at)`, `%40`) entgehen dem Muster; komprimierte Blobs prüft `grep -a` nicht. Im Probelauf 0 solche Formen. Lösung: Zeichenklasse erweitern bzw. als Restrisiko im Bericht nennen. _Im Scope._ — **Behoben als Transparenz:** Restrisiko steht im Bericht; Muster bewusst nicht erweitert.
- [x] [Option-Injection] `cmd_run`: `git clone … "$source_git" "$target"` ohne `--`; ein Ziel mit führendem `-` wird als Option gelesen. Nur vom Bediener gesetzt, Risiko gering. Lösung: `-- "$source_git" "$target"`. _Im Scope._ — **Behoben:** `git clone … --`, `cd --`; Test mit Ziel `-strich`.
- [x] [filter-repo `--paths-from-file`] Zeilen mit `regex:`/`glob:`-Präfix oder `==>` deutet filter-repo als Sonderform. A2 fängt jede Überinklusion exakt ab; optional in `list_paths` solche Zeilen fail-closed ablehnen. _Im Scope._ — **Bewusst offen:** A2 fängt jede Überinklusion exakt ab.
- [x] [Abhängigkeiten] gitleaks/filter-repo ungepinnt per Homebrew, lokal und einmalig, nicht in CI; Versionen stehen im Bericht (B3) – ausreichend. Für T1b-2: Regelsatz über `--config` mit `useDefault` an die Version im Bericht binden. _Hinweis für T1b-2._ — **Teilweise:** Regelsatz per gepinnter `--config` an die Version im Bericht gebunden; Werkzeuge bleiben lokal/ungepinnt (Einmal-Werkzeug).
- [x] [Dateisystem] `qualify`: Symlink-Prüfung nur auf der letzten Pfadkomponente, nicht TOCTOU-fest; lokales Einzelnutzer-Werkzeug auf eigenem Klon, kein realistischer Angreifer. Optional `os.open(…, O_NOFOLLOW)`. _Im Scope, optional._ — **Bewusst offen:** optional, kein realistischer Angreifer.
- [x] [Allow-Liste] `t@t.com`/`test@test.com` sind registrierte Fremd-Domains, aber begründete Fixture-Identitäten; `*@*.example`/`*@*.invalid` auf RFC-reservierte TLDs beschränkt – vertretbar. _Kein Handlungsbedarf._ — Kein Handlungsbedarf.

**Secrets/PII im Diff selbst:** keine Secrets (gitleaks über `origin/main..HEAD`: „no leaks found"); Adressen im Diff sind nur Test-/Doku-Adressen und das Platzhalter-Beispiel `max.muster@firma.de` als FS1-Negativ-Fixture. Der Fingerprint in `.gitleaksignore` verweist auf eine bewusst angelegte Credential-Fixture – unbedenklich.

**Positives:** fail-closed durchgängig (Exit 2 bei Umgebungs-/Lesefehlern, gitleaks-Exit ≠ 0 nie „sauber", Begründungspflicht, leere commit-map, `ls-files`-Fehler); A2 als exakte Teilmengen-Prüfung auch in `scan` ist ein harter Backstop gegen App-Code; saubere Quoting-/Injection-Hygiene (`--` bei `git log`, `python3 -I`, Regeln als Bytes, `--redact`); `run` auf frischem `--no-local --single-branch`-Klon, im Ziel nur `refs/heads/main`, keine Replace-Refs/Notes/Remotes – `--log-opts=--all` deckt alle Refs ab.

## Rework (2026-10-23)

W1–W3 und H1–H3 im selben PR behoben (Tests zuerst rot: 30 rot → 257 grün; sieben Mutationen je mindestens ein Test rot). Probelauf mit echten Werkzeugen wiederholt, siehe Task-Datei „Nachlauf nach dem Security-Review“. Re-Review des Reworks: siehe unten.

## Ergebnis
NEEDS_FIXES
