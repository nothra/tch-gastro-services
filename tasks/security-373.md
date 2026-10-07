# Security Review: Task 373

Geprüft: `git diff origin/main...HEAD` (62 Dateien, Stand `0215f32`), 2026-10-07.
Schwerpunkt: Server Actions (`app/verwaltung/katalog/actions.ts`), neue Seite
`/verwaltung/theke`, Navigation, Listen-/Dialog-Komponenten. Der Rest des Diffs ist UI-Umbau,
Tests, E2E-Helfer und Doku.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [x] [Autorisierung] `/verwaltung/theke` lässt nur `verwalter` auf die Seite
  (`app/verwaltung/theke/page.tsx`), `ensureThekeAction` erlaubt weiter `verwalter` **und**
  `veranstalter` (`app/veranstaltung/actions.ts:642`). Das ist keine Rechteausweitung: die Action
  ist die maßgebliche Grenze und bleibt unverändert, die Seite ist nur strenger. Folge: ein reiner
  `veranstalter` sieht die Theken-Einrichtung nicht mehr in der Oberfläche, darf sie aber per
  Action weiterhin ausführen. So gewollt und im Seitenkommentar dokumentiert (spec-373 AK3). Kein
  Handlungsbedarf; ob die Action später auf `verwalter` eingeengt wird, ist eine fachliche Frage
  (passt zu #181).
- [x] [IDOR] `setCatalogItemActiveAction` meldet jetzt „Artikel nicht gefunden.“ statt stumm zu
  bleiben. Das guarded UPDATE führt `catalogId` im `WHERE` (`db/catalog.ts:105`), die Action
  verlangt `requireRole("verwalter")` vor jeder Eingabeprüfung. Die neue Meldung verrät nur einem
  Verwalter, ob eine (UUID-)Artikel-Id im angegebenen Katalog existiert, und das sieht er ohnehin
  in der Liste. Keine Enumerationsfläche.
- [x] [Auth-Gate] Die neue Route `/verwaltung/theke` liegt im Matcher des Auth-Proxys
  (`proxy.ts:102`, nur `theke/` ohne Präfix ist ausgenommen). `proxy.ts` ist unverändert.
- [x] [XSS] Nutzerdaten (Bezeichnung, Artikelname, Katalogname) werden nur als React-Text
  gerendert; kein `dangerouslySetInnerHTML`, keine dynamischen `href` aus Nutzereingaben (Links
  bauen nur aus der Veranstaltungs-Id).
- [x] [Eingaben] Keine neue Eingabe an einer Server-Grenze. Die Dialoge rufen die bestehenden,
  Zod-validierten Actions auf; die Katalogwahl bleibt serverseitig auf aktive Kataloge geprüft.
- [x] [Dependencies] Keine Änderung an `package.json`, `pnpm-lock.yaml` oder
  `pnpm-workspace.yaml`.
- [x] [Secrets/Fehler] Keine Secrets, keine neuen Logs, keine Stack-Traces nach außen; die
  Fehlermeldungen sind feste deutsche Texte.
- [x] [Out-of-Scope] Der im selben PR angelegte `kleinfunde.md`-Eintrag (Escape schließt den
  Dialog evtl. trotz `schliessbar={false}`) betrifft UX/Doppel-Absenden, nicht die Sicherheit: die
  Actions sind idempotent bzw. durch das Duplikat-Gate geschützt. Schwelle B ist richtig, kein
  Issue nötig.

## Ergebnis
PASSED
