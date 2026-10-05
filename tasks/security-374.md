# Security Review: Task 374

Geprüft: `git diff origin/main...HEAD` (Stand `6ead546`, 39 Dateien) – Kopfzeile mit Konto-Menü
(`AppNav`, `KontoMenue`, `headerStyles`), `PublicHeader` auf `/theke/[token]`, Startseite mit
offenen Veranstaltungen (`app/page.tsx`, `OffeneVeranstaltungen`, `listOffeneVeranstaltungen`),
`PageHeader` auf vier Seiten, E2E-Specs, Doku.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [x] [Logging] `app/page.tsx:61` schreibt das volle Fehlerobjekt von `listOffeneVeranstaltungen()`
  per `console.error` ins Server-Log. Das bleibt serverseitig (Vercel-Function-Log), der Nutzer
  sieht nur den festen Text „Veranstaltungen konnten nicht geladen werden." – kein Stack Trace
  nach außen. Gleiches Muster wie `app/api/health/route.ts:25`. Kein Handlungsbedarf.
- [x] [Autorisierung] Die Startseite lädt die offenen Veranstaltungen nur bei Rolle `veranstalter`
  (`hasRole` vor dem DB-Aufruf, AK2.4, per Unit-Test abgedeckt). Die Liste zeigt nur
  Bezeichnung, Datum und Kasse. Die verlinkten Detailseiten `/veranstaltung/[id]` setzen die Rolle
  weiterhin selbst durch (ADR-016). Die Seite ist also keine neue Lesefläche ohne Rollenprüfung.
- [x] [Öffentliche Route] `/theke/[token]` ruft jetzt `auth()` auf, aber nur um zu entscheiden,
  ob der `PublicHeader` erscheint (mit Session zeigt das Layout schon den `AppHeader`). Die Session
  steuert weder Daten noch Schreibrechte; das Token-Gate (`getVeranstaltungByToken` → `notFound()`)
  läuft unverändert **vor** dem Header. Bei ungültigem Token erscheint kein Name (AK3.3). Der
  Header zeigt die Bezeichnung, die bei gültigem Token ohnehin in der `h1` steht. Das ist also
  keine zusätzliche Offenlegung.
- [x] [XSS] `label` (E-Mail) im Konto-Menü und `bezeichnung` in Liste und Header werden als
  React-Textknoten gerendert (automatisches Escaping). Im Diff gibt es kein
  `dangerouslySetInnerHTML`, keine dynamischen `href`-Ziele außer `/veranstaltung/${v.id}`
  (UUID aus der DB) und keine Nutzereingabe in Klassen oder Attributen.
- [x] [Session/CSRF] „Abmelden" bleibt eine Server-Action-Form (`signOutAction`, unverändert) und
  sitzt jetzt nur im nativen Popover. Die Origin-Prüfung der Server Actions greift weiter.
  Wortmarke, „Anmelden"-Link und die Links der offenen Veranstaltungen tragen `prefetch={false}`,
  damit ist die #164-Absicherung (kein Auto-Prefetch geschützter Routen) eingehalten.
- [x] [Injection] `listOffeneVeranstaltungen` nutzt nur Drizzle-Query-Builder mit festen Literalen
  (`typ='veranstaltung'`, `status='offen'`), es gibt keinen Nutzereingang und kein rohes SQL.
- [x] [Secrets] Die E2E-Specs lesen Zugangsdaten aus `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`
  (wie `auth.spec.ts`). Im Diff sind keine Credentials hartkodiert.
- [x] [Dependencies] `package.json` und `pnpm-lock.yaml` sind unverändert, es kommen also keine
  neuen Abhängigkeiten hinzu.

Out-of-Scope-Funde: keine. Es war weder ein Issue noch ein `kleinfunde.md`-Eintrag nötig.

## Ergebnis
PASSED
