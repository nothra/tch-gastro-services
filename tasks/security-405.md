# Security Review: Task 405

Scope: `git diff origin/main...HEAD` (23 Dateien). Der Diff ist reine UI-Arbeit: `ListenZeile`
(Button-Betriebsart, Slot `anhang`), `Notice` (Art `warnung`), `useErsatzFokus`
(Fokus auf `<summary>` bei zugeklappter Gruppe), `TeilnehmerRow` (Dialog statt Inline-Formular),
`page.tsx` (Gruppen per `Aufklapper`), Farb-Gate-Eintrag, Opt-in-E2E-Spec, Doku.
Kein Server-Action-, Route-, Data-Layer-, Schema- oder Dependency-Code geändert.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

_Keine neuen. Geprüft und ohne Befund:_

- **Autorisierung:** `app/verwaltung/teilnehmer/actions.ts` ist unverändert; alle drei Actions
  (`createTeilnehmerAction`, `updateTeilnehmerAction`, `setTeilnehmerActiveAction`) rufen zuerst
  `requireRole("verwalter")` auf (Zeilen 31, 51, 69). Das Page-Gate (`hasRole`, `page.tsx:17`)
  bleibt erhalten. Die neue Dialog-UI ruft dieselben Actions mit denselben Formularfeldern
  (`id`, `active`, Stammdatenfelder) auf – keine neue Angriffsfläche.
- **Input-Validierung:** Zod-`safeParse` in den Actions unverändert; der Client sendet weiterhin
  nur `id`/`active` als Hidden-Felder, deren Manipulation durch Rolle + Schema serverseitig
  abgedeckt ist (Verwalter darf jeden Teilnehmer bearbeiten, kein Objekt-Owner-Modell → kein IDOR).
- **XSS:** Name, Untertitel und Duplikat-Warnung werden als React-Text gerendert (escaped); kein
  `dangerouslySetInnerHTML`. Die Warnung ist ein Server-Konstantentext
  (`TEILNEHMER_DUPLIKAT_WARNUNG`).
- **DOM-Zugriff in `useErsatzFokus`:** `getElementById` mit `teilnehmer-<DB-id>` und ein
  konstanter Selektor (`details:not([open])`, `summary`) – keine aus Nutzereingaben gebauten
  Selektoren, keine Injection.
- **Secrets:** Die neue E2E-Spec liest Zugangsdaten aus `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`
  (Env), nichts hartkodiert; sie ist per `E2E_405=1` opt-in und nutzt das `__test__`-Präfix.
- **Dependencies:** `package.json`/`pnpm-lock.yaml` unverändert.
- **Error Handling:** Fehlermeldungen kommen unverändert aus den Actions (`state.error`) und
  werden über `Notice kind="fehler"` angezeigt; keine Stack-Traces.

Out-of-Scope-Funde: keine (weder Issue noch `kleinfunde.md`-Eintrag).

## Ergebnis

PASSED
