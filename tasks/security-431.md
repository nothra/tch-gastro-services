# Security Review: Task 431

Umfang: Gesamt-Diff `origin/main...HEAD` (Etappen D–I). Die Änderung berührt keinen App-Code, keine
Auth-/RBAC-Logik, keine DB und keine Dependencies (`package.json`/Lockfile unverändert). Schwerpunkt:
neue Ausführungs-/Vertrauensflächen in Shell-Gates, Config-Validierung, CI und zusammengesetzte
Berechtigungsdatei.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [ ] [Command Execution / Vertrauensgrenze] `commands.*` aus `factory.config.yml` und die Skripte in
  `scripts/project/checks/*.d/` werden von den Git-Hooks, der Pipeline und der Self-Test-Suite per
  `eval` bzw. direkt ausgeführt. Das ist **keine neue Fähigkeit**: bisher führte `pnpm lint|test`
  ohnehin beliebige Skripte aus `package.json` des ausgecheckten Branches aus, und die Pipeline-/CI-Läufe
  verarbeiten schon heute Branch-Inhalt. Neu ist nur der Ort der Kommando-Zeichenkette (Config statt
  Skript). Aufrufer setzen Schlüssel/Pfade als feste Literale; es fließt kein Fremdinhalt in den
  `yq`-Ausdruck (`factory_cfg "commands.$key"` mit Literal-Keys). CI (`ci.yml`) nutzt weiter die
  Repo-Variablen, `pull_request` (nicht `pull_request_target`), `permissions: contents: read`.
  Kein Handlungsbedarf; bei Review eines fremden Branches gilt wie bisher: vor dem ersten `pre-push`
  `factory.config.yml` und `scripts/project/` ansehen.
- [ ] [Datei-Rechte, kein Sicherheitsrisiko] `factory-sync.sh --compose` schreibt `.claude/settings.json`
  und `.gitignore` mit Modus 0600 (mktemp + mv; per Standalone-Lauf belegt). Strenger als vorher, keine
  Lücke, aber funktionale Reibung für andere lokale Benutzer/Container-Mounts. Als Kleinfund in
  `docs/factory/kleinfunde.md` festgehalten („factory-sync --compose schreibt die Zieldateien mit Modus 0600").
- [ ] [Policy-Integrität] Die neuen Config-Knöpfe (`commands.*`, `labels.*`, `start_work.hint`) sind nicht
  durch Gate-Floors gesperrt; sie berühren die Mindest-Tier-/Turn-Policy (`MAX_TURNS_CEILING`,
  `MIN_TIER_*`, `model_tiers.heavy`) nicht. Die Listen-Normalisierung in `leaf_paths` (Index → `*`) kann
  den gesperrten Pfad `model_tiers.heavy` nicht verdecken (Skalarpfad, Regel 6 prüft ihn unverändert);
  Regel 8 lehnt Nicht-Strings sowie Einträge mit Komma/Leerraum ab (Schutz vor CSV-Aufspaltung im Seam).
- [ ] [Prompt-Injection-Fläche] `start_work.hint` wird von `start-work.sh` ausgegeben und kann damit im
  Agentenkontext landen. Es ist ein committeter Repo-Text wie `CLAUDE.md`/Config-Kommentare, kein neuer
  Freitext-Kanal von außen; Vertrauensniveau identisch. Kein Handlungsbedarf.
- [ ] [Berechtigungen] `.claude/settings.json` = Vereinigung aus Factory- und Projekt-Fragment; ein
  Projekt-Fragment kann Factory-Deny/Hooks weder entfernen noch überschreiben (Arrays werden vereinigt,
  Hooks angehängt; skalare Werte in `permissions` brächen den jq-Merge fail-closed). Gleichheit zur
  Baseline `bcba043` (Hooks, Allow/Deny-Menge) per Test belegt.
- [ ] [Secrets/Ignore] Die zusammengesetzte `.gitignore` ist byte-identisch zur alten; die Probenliste
  (`.env.local`, `*.pem`, `.vercel/` …) bleibt ignoriert. Keine Secrets im Diff (`pre-commit`-Check grün).
- [ ] [Error Handling] Gate-Meldungen nennen Schlüssel und Skriptnamen, geben aber keine Konfigurations-
  werte oder Pfade außerhalb des Repos preis. Fehlt `yq` oder ist es defekt, blockieren die Gates
  fail-closed (Test).

## Ergebnis
PASSED
