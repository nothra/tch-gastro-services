# Security Review: Task 403

Scope: `git diff origin/main...HEAD` (30 Dateien), reiner UI-Umbau: zwei route-neutrale
Server-Component-Bausteine (`Aufklapper`, `ListenZeile`) und die Umstellung ihrer Konsumenten.
Keine Server Action, kein Route Handler, kein Data-Layer-Zugriff, keine Auth-/Rollenlogik und
keine Dependency (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`) geändert.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [x] [XSS] Alle angezeigten Werte (`bezeichnung`, `anzeigename`, Katalogname, Untertitel) gehen
      als React-Kinder bzw. Strings in JSX und werden escaped. Kein `dangerouslySetInnerHTML`,
      kein `innerHTML` im Produktionscode. Die Überschrift-Ebene des Aufklappers ist auf die
      Literal-Union `"h2" | "h3"` typisiert (`Aufklapper.tsx:15`), die Konsumenten übergeben
      feste Literale. Ein dynamisches Tag aus Fremdinhalt ist damit nicht möglich.
- [x] [Open Redirect / Link-Ziele] Die `href`s sind unverändert aus Server-IDs zusammengesetzte
      interne Pfade (`/veranstaltung/${v.id}`, `verzehrHref(…)`, Arbeitsschritt-Pfade). Es kommen
      keine nutzerkontrollierten absoluten URLs hinzu.
- [x] [Autorisierung] Das Schreib-Gate in `ZeileRow` (`editable && <ZeilenMenue/>`) bleibt
      gleich, nur jetzt im `aktion`-Slot. Die Lese-Ansicht wird nicht versteckt (Lesson #54).
      Die serverseitigen Prüfungen der Entfernen-Action liegen außerhalb dieses Diffs und sind
      unverändert.
- [x] [Info-Disclosure / Prefetch] `prefetch={false}` auf der Startseite (`OffeneVeranstaltungen`,
      ADR-031/#164) wird durchgereicht und ist per Test belegt. In `VeranstaltungListe` fehlte der
      Prop schon vorher, das Verhalten bleibt gleich.
- [x] [Secrets] Das E2E-Spec liest `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` aus der Umgebung.
      Nichts ist hartkodiert, ohne die Variablen wird das Spec übersprungen, und es läuft nur
      mit `E2E_BAUSTEINE_403=1`.
- [ ] [Hygiene, kein Sicherheitsrisiko] Diese gitignoreten Wegwerf-Dateien liegen noch im
      Worktree: `scripts/format403.tmp.sh`, `scripts/review403.tmp.sh`,
      `tasks/telemetry-raw-403-*.tmp.txt`. Sie werden nicht committet. Bitte vor dem Aufräumen
      des Worktrees von Hand löschen (siehe Task-Notizen). Ist schon in der Task-Datei vermerkt,
      daher kein Eintrag in `kleinfunde.md`.

## Ergebnis
PASSED
