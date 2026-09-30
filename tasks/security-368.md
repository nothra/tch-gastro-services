# Security Review: Task 368

Scope: `git diff origin/main...HEAD` (40 Dateien). Der PR ist eine reine UI-Umstellung: Tokens in
`app/globals.css`, sechs Bausteine unter `app/components/ui/`, Login und
`app/verwaltung/katalog/**` auf die Bausteine umgestellt, dazu eine lokale ESLint-Regel als
Farb-Gate (`eslint/`).

Angriffsfläche: Es gibt keine Änderungen an Server Actions (`actions.ts`), Route Handlern,
`proxy.ts`, `db/`, `lib/authz.ts`, `package.json` oder `pnpm-lock.yaml`. Neue Dependencies gibt
es nicht.

## Kritische Findings (Blocker)

Keine.

## Wichtige Findings

Keine.

## Hinweise

- [x] **[Autorisierung] Rollen-Gate im Katalog bleibt unverändert.** `app/verwaltung/katalog/[id]/page.tsx`
  prüft weiter `hasRole(…, "verwalter")` vor dem Rendern. Der Diff ändert nur Markup und Klassen.
  Die Server Actions (serverseitige Grenze) sind nicht Teil des Diffs.
- [x] **[Formular-Kontrakt / IDOR] Feldnamen und Hidden Inputs bleiben gleich.** Die Felder `name`,
  `size`, `priceCents`, `category` und `sortOrder` sind nur in `Field`/`SelectField` gewandert.
  Die Hidden Inputs `catalogId`, `id` und `sourceId` stehen weiter in ihren Formularen. Die
  Actions bekommen also dieselben Eingaben wie vorher, und deren Zod-/Parent-Key-Prüfungen gelten
  unverändert.
- [x] **[XSS] Kein neuer HTML-Senken-Pfad.** Fehlertexte aus den Actions (`state.error`,
  `errorMessage` beim Login) laufen über `Notice` als React-Kinder, also escaped. Im Diff gibt es
  kein `dangerouslySetInnerHTML` und keine dynamische `href` aus Nutzereingaben. `ButtonLink` und
  `PageHeader.back` bekommen `href` nur von Code-Konsumenten.
- [x] **[Login / Info-Leak] Verhalten unverändert.** `name`, `type` und `autoComplete` der Felder
  sind erhalten (`current-password` für den Passwortmanager). Die Fehlermeldung kommt unverändert
  aus `authenticate`. `Notice kind="fehler"` sagt sie als `role="alert"` an, ohne neue Details.
- [x] **[ReDoS] Die Gate-Regex läuft linear.** `RAW_COLOR_CLASS` in
  `eslint/no-raw-color-classes.mjs` ist verankert (`^…$`). Die Alternativen in `VARIANT_PREFIX`
  und `BRACKET` schließen sich gegenseitig aus (`[^\s:[\]]` und `\[`), und ein Präfix endet
  zwingend auf `:`. Damit gibt es kein katastrophales Backtracking. Zusätzlich läuft die Regel nur
  zur Lint-Zeit über Repo-Code, nicht zur Laufzeit gegen Nutzereingaben.
- [x] **[Konfiguration] Der Loader in der ESLint-Config ist fail-closed und hat keine externe
  Eingabe.** `uiTokenFilePatterns` löst nur die fest codierten Einträge aus `UI_TOKEN_FILES` gegen
  die Config-Lage auf und wirft bei leerer Liste oder fehlendem Pfad. Die Fehlermeldung nennt einen
  absoluten lokalen Pfad. Das passiert nur im Entwickler-/CI-Kontext, nicht in der App, und ist
  daher unkritisch.
- [x] **[Secrets] Keine Secrets oder Credentials im Diff.** Die Farbwerte in `globals.css` sind
  Design-Tokens. `test-results/ux368/` (Screenshots) ist gitignoret und wird nicht committet.
  Hinweis zu W2: Die Screenshots zeigen nur Login- und Katalog-Masken ohne Daten („es wurden keine
  Daten angelegt"). Vor dem Anhängen an PR #378 kurz prüfen, dass kein ausgefülltes Passwortfeld
  oder keine echte E-Mail darauf zu sehen ist.
- [x] **[Out of Scope, kein Sicherheitsbezug]** Die `.gitignore`-Lücke für `*.tmp.md` ist schon als
  Kleinfund aus Review-Runde 2 erfasst (`docs/factory/kleinfunde.md`). Nach ADR-018/043 braucht es
  kein weiteres Issue.

## Prüfkatalog

| Bereich | Ergebnis |
|---|---|
| Input-Validierung / Injection (SQL, Command, XSS, JSON) | Keine neuen Eingabepfade, Actions unverändert, Ausgabe über React escaped |
| Authentifizierung / Autorisierung (BOLA/IDOR) | Rollen-Gate und Hidden-ID-Felder unverändert, keine Actions geändert |
| Hartkodierte Credentials / sensible Logs | Keine |
| Secrets / Kryptographie / Zufall | Nicht berührt |
| Dependencies | Keine neuen, `package.json`/Lockfile unverändert |
| Error Handling / Information Disclosure | Keine Stack Traces nach außen, Meldungen unverändert |

## Ergebnis
PASSED
