# Security Review: Task 375

Diff-Scope: `git diff origin/main...HEAD` (2026-10-08) – sechs Dateien, nur Markdown:
`docs/ux/glossar.md` (neu), `docs/specs/spec-375-wording-glossar-ui-texte.md` (neu),
`docs/factory/PROJECT-CONTEXT.md` (+1 Zeile), `docs/ux/ux-issue-entwuerfe.md` (+3 Zeilen),
`tasks/review-375.md`, `tasks/task-375-wording-glossar-ui-texte.md`. Kein Produktionscode, keine
Config, keine Dependencies, keine Skripte, keine Routen.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [x] [Secrets] Diff auf Secret-Muster gegrept (`passw|secret|token|api.?key|https?://|DATABASE_URL|bearer`,
  case-insensitive). Treffer sind ausschließlich Routen-Pfade (`app/theke/[token]/…`) und das
  Login-Label „Passwort" (AK3.1) – keine Zugangsdaten, URLs oder Personendaten.
- [x] [Agenten-Kontext] `PROJECT-CONTEXT.md` lässt `/implement` und `/review` das Glossar lesen. Das
  Glossar ist eine von Menschen gepflegte, per PR geprüfte Repo-Datei mit demselben Vertrauensniveau
  wie die übrigen Guidelines. Es ist kein neuer Kanal für Agenten-Freitext (Lesson #286 trifft nicht zu)
  und enthält keine ausführbaren Anweisungen außerhalb der Wortregeln.
- [x] [Error Handling / Informationspreisgabe] Die Meldungsmuster legen nur den Wortlaut fest. Ob eine
  Meldung angezeigt wird und an wen, regeln sie nicht. „Kein Zugriff – nur <Rolle> dürfen …" ist ein
  Hinweis auf Seitenebene je Rolle und gibt keine Objekt-Existenz preis. „<Objekt> nicht gefunden."
  wird schon heute so verwendet. Die Soll-Texte aus der Abweichungsliste mit `<Namen>` (`actions.ts:353/:357`)
  übernehmen die heute angezeigten Namen unverändert. Die Meldung sieht nur der angemeldete Veranstalter,
  sie zeigt also keinen zusätzlichen Inhalt. Für #372/#401 gilt weiter: Prüfungen auf Objekt-Ebene
  (IDOR) dürfen ihre Ablehnung nicht über ein unterschiedliches Muster („nicht gefunden" vs. „Kein
  Zugriff") verraten. Das ist schon heute die Regel im Code und kein Defekt dieses PRs, deshalb wurde
  kein Issue und kein `kleinfunde.md`-Eintrag angelegt.
- [x] [Dependencies] Keine Änderung an `package.json`, `pnpm-lock.yaml` oder `pnpm-workspace.yaml`.
- [x] [Input-Validierung / Injection / AuthN / AuthZ / Krypto] Nicht berührt, weil der Diff keinen Code enthält.

## Ergebnis
PASSED
