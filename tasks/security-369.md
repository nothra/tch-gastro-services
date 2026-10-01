# Security Review: Task 369

Stand `e31d739` (nach `/review` Iteration 3, `/test` und `/refactor`; Reihenfolge laut CLAUDE.md
eingehalten, der Bericht ist damit nicht durch spätere Skill-Commits stale). Geprüft wurde
`git diff origin/main...HEAD` (54 Dateien). Sicherheitsrelevant sind `app/veranstaltung/actions.ts`,
`app/veranstaltung/schema.ts`, `db/veranstaltung.ts`, `db/teilnehmer.ts`, `app/veranstaltung/[id]/`
(`page.tsx`, `ZugangTeilen.tsx`, `ZugangDialog.tsx`, `LinkKopieren.tsx`) und die Dialog-Bausteine.
Der Rest ist Test-, Doku- und Stil-Code. Der Reviewer hat die Änderungen mit entwickelt; die
tragenden Aussagen unten sind deshalb im Code nachgelesen (Zeilen angegeben), nicht aus dem Gedächtnis.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] [Integrität, vorbestehend] Status-Prüfung und Schreibzugriff sind in `addZeilenAction`,
  `createWalkInAction` und `removeZeileAction` zwei getrennte Statements (`actions.ts`, je `ziel.status`
  gefolgt von `addZeilen`/`addZeile`/`removeZeile`). Schließt ein zweites Gerät die Veranstaltung genau
  dazwischen ab, landet die Änderung in einer schreibgeschützten Veranstaltung. Nur für angemeldete
  Veranstalter auslösbar, kein Zugriff für Außenstehende. Das Muster ist älter als #369 und wurde nicht
  verschlimmert. Nach der Zweifelsregel (ADR-043) als Issue angelegt: **#387** (`enhancement`,
  `tech-debt`; ohne `security`-Label, weil es kein Auth-/Secret-Pfad ist).
- [ ] [Fehlerbehandlung] `createWalkInAction` legt erst den Stammteilnehmer an (`createTeilnehmer`), dann
  die Zeile (`addZeile`), ohne Klammer. Scheitert der zweite Schritt, bleibt ein verwaister Gast in den
  Stammdaten. Vorbestehend (der frühere Walk-in-Weg war gleich gebaut), nur für die Rolle `veranstalter`
  und ohne Datenabfluss. Fällt unter denselben Fix wie #387; nicht separat angelegt.

## Prüfkatalog

**Input-Validierung und Injection**
- Alle Eingaben der neuen/geänderten Actions laufen durch Zod oder feste Prüfungen:
  `zeilenAnlageSchema` (`schema.ts:148-160`) trimmt, verwirft leere Werte, dedupliziert und begrenzt auf
  1–200 Ids mit je höchstens 100 Zeichen (Kern-Kurzregel „Zod-Obergrenze" eingehalten, beide Ränder
  getestet); Walk-in nutzt unverändert `teilnehmerSchema` mit `TEILNEHMER_NAME_MAX`.
- SQL-Injection nicht möglich: nur Drizzle-Builder (`inArray`, `eq`, `and`, `values`); keine rohen
  SQL-Strings (`db/teilnehmer.ts`, `db/veranstaltung.ts`). Die `id`-Spalten sind `text`, eine
  manipulierte Id löst also keinen Cast-Fehler aus, sondern führt zu „nicht gefunden".
- XSS: Namen und Fehlertexte werden ausschließlich als React-Kinder gerendert (kein
  `dangerouslySetInnerHTML` mit Nutzerdaten). Das einzige Vorkommen ist der QR-Code in
  `ZugangTeilen.tsx`: sein SVG erzeugt die Bibliothek `qrcode` aus einer serverseitig gebauten URL
  (`absoluteUrl` + zufälliges Token); vorbestehend und unverändert.
- Command-/XML-Injection: nicht berührt.

**Authentifizierung und Autorisierung**
- Jede Action beginnt mit `await requireRole("veranstalter")` (`addZeilenAction`, `createWalkInAction`,
  `removeZeileAction`), fail-closed vor jeder Eingabeverarbeitung; die Detailseite prüft die Rolle
  zusätzlich serverseitig (`page.tsx:36`). Kein Rollen-Check nur im Client.
- Objektebene (IDOR): `removeZeile(zeileId, veranstaltungId)` bindet den DELETE an die Veranstaltung
  (`db/veranstaltung.ts`, Kern-Kurzregel 2); ein Treffer ohne Zeile ist ein Fehler, kein stiller Erfolg.
  `addZeilen` schreibt Namen-Snapshots **serverseitig aus den Stammdaten** (nicht aus dem Request) und
  lehnt inaktive Teilnehmer ab (`waehlbareTeilnehmer`, Kern-Kurzregel 3).
- Der Selbstbedienungs-Token wird unverändert nur in der offenen Veranstaltung und nur für die Rolle
  `veranstalter` ausgeliefert (`page.tsx`, gleiche Bedingung wie auf `main`). Neu ist, dass die URL als
  Prop an die Client-Komponente `LinkKopieren` geht; der Empfänger ist derselbe angemeldete Veranstalter,
  der sie vorher als Text im HTML bekam. Kein neuer Adressatenkreis.
- Keine hartkodierten Zugangsdaten: E2E-Specs lesen `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` aus der
  Umgebung (`e2e/veranstaltung-detailseite.spec.ts:25-26`); ein Muster-Scan über den Diff fand keine
  Literale für `password`/`secret`/`token`.
- Keine sensiblen Daten in Logs: der Diff enthält kein `console.*`.

**Daten und Kryptographie**
- Keine neuen Secrets, Schlüssel oder Verschlüsselungs-Pfade. Kein `Math.random()` in
  sicherheitsrelevantem Code; der Token wird unverändert an seiner bestehenden Stelle erzeugt.
- Die Zwischenablage (`LinkKopieren.tsx`) bekommt nur den Link, den der Nutzer ohnehin sehen darf; bei
  fehlender Clipboard-API bleibt das markierte Nur-Lese-Feld, es gibt keinen Fallback über Dritte.

**Dependencies**
- `package.json`, `pnpm-lock.yaml` und `pnpm-workspace.yaml` sind im Diff **unverändert** – keine neuen
  Abhängigkeiten. Das native `<dialog>` ersetzt bewusst eine Bibliothek (ADR-053 D1, ADR-052).

**Error Handling**
- Die Actions geben feste deutsche Meldungen zurück, keine Stack Traces, SQL- oder Treiberdetails.
  Unbekannte DB-Fehler werden erneut geworfen (`addZeilenAction`: nur `23505` wird übersetzt), Next.js
  maskiert sie in Produktion. `isUniqueViolation` prüft `error` und `error.cause`, damit die echte
  Drizzle-Fehlerform greift (Unit- und DB-Integrationstest).
- Meldungen nennen bei „Nicht mehr wählbar"/„Bereits erfasst" Namen von Stammteilnehmern. Der Empfänger
  ist der angemeldete Veranstalter, der diese Stammdaten ohnehin in der Auswahl sieht; kein Datenleck.

## Ergebnis

PASSED
