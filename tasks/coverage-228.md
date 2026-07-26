# Coverage-Analyse: Task 228

## Ausgangslage

Task 228 ist ein reiner Dependency-Patch-Bump (`next-auth` `5.0.0-beta.31` → `5.0.0-beta.32`,
transitiv `@auth/core` `0.41.2` → `0.41.3`). Es wurde **kein neuer Produktionscode** eingeführt –
die Behebung der beiden Advisories (GHSA-8fpg-xm3f-6cx3, GHSA-7rqj-j65f-68wh) erfolgt vollständig
innerhalb der Bibliothek selbst. Das TDD-Gebot "kein Produktionscode ohne Test" greift hier nicht,
da es keinen neuen eigenen Code gibt, der Tests bräuchte.

## Coverage-Ergebnis

Gesamt-Coverage (`pnpm test:coverage`): **89.06 % Statements / 94.28 % Branch** – über der
Projekt-Schwelle von 80 % (`docs/factory/PROJECT-CONTEXT.md`). Unverändert gegenüber dem Stand
vor dem Bump, da keine Zeilen Produktionscode hinzukamen oder entfielen.

Gezielt geprüft (Akzeptanzkriterium: `auth.config.test.ts`, `lib/authz.test.ts` bleiben grün):

```
pnpm exec vitest run auth.config.test.ts lib/authz.test.ts --coverage
```

→ 25/25 Tests grün, **100 % Statements/Branches/Functions/Lines** für beide Dateien.

## Akzeptanzkriterien-Abdeckung (aus spec-228)

- [x] Happy Path (`authorized`-Callback: eingeloggt/nicht eingeloggt, `/login` vs. geschützte
      Route) – bereits vollständig durch `auth.config.test.ts` abgedeckt.
- [x] Edge Cases (`jwt`/`session`-Callback: fehlender User, fehlende Rollen, fehlender
      `token.sub`) – bereits abgedeckt.
- [x] E2E-Regression (`e2e/auth.spec.ts`: Login, Logout, gesperrte Route nach Logout, falsche
      Zugangsdaten) – 5/5 grün (siehe `/implement`-Notizen in `tasks/task-228-…md`).

## Warum keine neuen Tests geschrieben wurden

Das eigentliche Advisory-Verhalten (next-auth liefert bei Provider-Fehler `null` statt
Error-Objekt; `@auth/core` normalisiert E-Mails per NFKC vor der Validierung) ist **interne
Logik der Bibliothek selbst**, nicht Code dieses Repos. Laut `testing-standards.md` /
`docs/factory/guidelines/testing-standards.md` wird Framework-/Library-Code nicht dediziert
nachgetestet – das ist Aufgabe der Bibliothek (next-auth hat den Fix mit eigenen Tests
released). Unser Callback-Code (`auth.config.ts`) ruft lediglich `!!auth?.user` auf einem von
next-auth bereits normalisierten `auth`-Objekt auf; dieser Aufruf war schon vor dem Bump
vollständig getestet (`auth.config.test.ts`) und bleibt unverändert.

Ein Test, der versucht, das next-auth-interne Error-vs-null-Verhalten nachzustellen, würde
next-auth mocken müssen – das widerspricht der Mocking-Regel "keine internen Klassen/Domain-Logik
mocken" und würde nur die Bibliothek selbst testen, nicht unseren Code.

Die praktische Regressionsabsicherung für den Bump ist der **E2E-Test** (`e2e/auth.spec.ts`),
der den echten Login-/Logout-Flow gegen die reale next-auth-Version fährt – dieser lief bereits
in `/implement` grün (siehe Task-Datei).

## Ergebnis

Coverage-Schwelle erreicht, alle Akzeptanzkriterien der Spec durch bestehende Tests abgedeckt.
Keine neuen Tests erforderlich. Keine Produktionscode-Änderung in diesem Schritt.
