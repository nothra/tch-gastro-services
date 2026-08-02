# Spec: Fail-closed Prüfung installierter Git-Hooks im Pre-Push-Gate

## Kontext

Aus dem Review zu #262 (Runde 2, Finding W7) und ADR-042 §Consequences: Mit #262 entstand
`scripts/install-hooks.sh` als kanonische Quelle für die Git-Hooks `pre-commit`, `pre-push`
und `commit-msg` (ADR-042). Für **bereits initialisierte** Repos (wie dieses, Init am
2026-07-08) ist die Installation ein **manueller** Schritt – `init-factory.sh` läuft dort
nie ein zweites Mal. ADR-042 benennt das offen als „potenziellen 'vergessen, auszuführen'-
Fehlerpunkt" und verweist auf dieses Issue.

**Punkt 1 des Issues ist bereits erledigt:** Ein erneuter, idempotenter Lauf von
`bash scripts/install-hooks.sh` während dieser Requirements-Phase zeigt, dass `pre-commit`,
`pre-push` und `commit-msg` im gemeinsamen Git-Verzeichnis (`git rev-parse --git-common-dir`)
bereits inhaltsgleich zum kanonischen Stand vorliegen (keine „wird ersetzt"-Warnung des
Installers). Vermutlich wurde der Retrofit bereits während der #262-Implementierung
durchgeführt. Für Punkt 1 besteht daher **kein weiterer Handlungsbedarf** in dieser Task.

**Scope dieser Task ist ausschließlich Punkt 2** (im Issue als „optional, härter statt
Erinnerung" vorgeschlagen): ein **fail-closed** Check im Pre-Push-Gate, der verifiziert,
dass die Factory-Hooks installiert sind – damit ein künftig vergessener Retrofit (z. B. in
einem neu geklonten Repo oder nach einem versehentlich gelöschten `.git/hooks`) den Push
blockiert, statt still unbemerkt zu bleiben.

## Scope

**Inbegriffen:**
- Neuer Check in `scripts/checks/pre-push.sh` (bzw. ein von dort aufgerufenes Check-Skript),
  der prüft, dass **alle drei** Factory-Hooks – `pre-commit`, `pre-push`, `commit-msg` –
  im gemeinsamen Git-Verzeichnis (`git rev-parse --git-common-dir`, NICHT ein
  worktree-lokales `.git`) als Datei existieren **und** ausführbar sind.
- Fail-closed: Fehlt einer der drei Hooks oder ist er nicht ausführbar, schlägt der Check
  fehl, der Push wird blockiert (Gesamt-Exit ≠ 0, analog zu den bestehenden Checks in
  `pre-push.sh`), und die Meldung nennt den/die betroffenen Hook-Namen sowie den
  Remediation-Befehl `bash scripts/install-hooks.sh`.
- Dokumentation von Punkt 1 als bereits erledigt (dieser Abschnitt + Task-Datei), inkl. Beleg
  (idempotenter Lauf ohne Ersetzungs-Warnung).

**Nicht inbegriffen:**
- Kein Inhaltsvergleich der Hook-Dateien gegen den kanonischen Stand aus
  `install-hooks.sh` (keine Drift-/Manipulations-Erkennung) – nur Präsenz + Ausführbarkeit.
  Grund: vermeidet eine zweite Stelle, die bei jeder künftigen Hook-Änderung synchron
  gehalten werden müsste (Kopplungsrisiko, siehe `lessons/code-style.md`).
- Keine Sonderbehandlung von `core.hooksPath` im neuen Check selbst – dieser Fall wird
  bereits von `install-hooks.sh` fail-closed behandelt (ADR-042); der neue Check würde in
  diesem Szenario die Hooks korrekt als „fehlend" im Standard-Pfad werten und auf den
  Remediation-Befehl verweisen, der dann seinerseits die passende Fehlermeldung liefert.
- Keine Automatisierung, die `install-hooks.sh` selbst aufruft (z. B. aus `start-work.sh`
  oder dem neuen Check heraus) – der Check meldet nur, er repariert nicht automatisch.

## Akzeptanzkriterien

- [ ] GIVEN alle drei Factory-Hooks (`pre-commit`, `pre-push`, `commit-msg`) sind im
      gemeinsamen `.git/hooks`-Verzeichnis vorhanden und ausführbar WHEN
      `scripts/checks/pre-push.sh` läuft THEN meldet der neue Check Erfolg und blockiert den
      Push nicht (aus diesem Grund).
- [ ] GIVEN mindestens einer der drei Hooks fehlt im gemeinsamen Git-Verzeichnis (z. B.
      `commit-msg` wurde nie installiert) WHEN `scripts/checks/pre-push.sh` läuft THEN
      schlägt der Check fehl, der Push wird blockiert (Exit ≠ 0), und die Fehlermeldung
      nennt den fehlenden Hook-Namen sowie `bash scripts/install-hooks.sh` als
      Remediation-Befehl.
- [ ] GIVEN einer der drei Hooks existiert als Datei, ist aber nicht ausführbar (z. B. nach
      `chmod -x`) WHEN der Check läuft THEN wird er wie ein fehlender Hook behandelt (gleiche
      Fehlerbehandlung wie oben) – reine Existenzprüfung ohne Ausführbarkeits-Check reicht
      nicht.
- [ ] GIVEN der Check läuft aus einem beliebigen Git-Worktree dieses Repos (nicht nur dem
      Haupt-Arbeitsbaum) WHEN er das Hook-Verzeichnis bestimmt THEN verwendet er das
      **gemeinsame** Git-Verzeichnis (`git rev-parse --git-common-dir`), konsistent mit
      `install-hooks.sh` (ADR-042) – nicht ein worktree-lokales `.git`.
- [ ] GIVEN mehrere Hooks fehlen gleichzeitig WHEN der Check läuft THEN werden alle
      betroffenen Hook-Namen in der Fehlermeldung genannt (nicht nur der erste gefundene).

## Fehlerszenarien

- [ ] Das `.git/hooks`-Verzeichnis existiert im gemeinsamen Git-Verzeichnis noch gar nicht
      (Retrofit nie durchgeführt) → alle drei Hooks gelten als fehlend, Push blockiert.
- [ ] `git rev-parse --git-common-dir` schlägt fehl (kein Git-Repository) → Check verhält
      sich fail-closed (kein stiller Erfolg), analog zum Fail-closed-Prinzip von
      `install-hooks.sh`.

## Offene Fragen

- [ ] Implementierungsdetail (kann in `/implement` entschieden werden, keine ADR nötig):
      neuer Check als zusätzlicher Block direkt in `pre-push.sh` oder als eigenes,
      isoliert testbares Skript `scripts/checks/hooks-installed-check.sh` (Muster wie
      `routes-doc-check.sh`), das `pre-push.sh` aufruft. Empfehlung: eigenes Skript –
      passt zum bestehenden Muster und ist ohne vollständigen `pre-push.sh`-Lauf testbar.
