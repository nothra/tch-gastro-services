# Security Review: Task 371

Diff-Basis: `git diff origin/main...HEAD` (30 Dateien). Sicherheitsrelevant sind
`app/veranstaltung/actions.ts`, `kassierSummen.ts`, `KassiereZeileForm.tsx`,
`[id]/AbschlussAktion.tsx`, `[id]/page.tsx`, `[id]/kassieren/page.tsx` + `KassierSummenKarte.tsx`
sowie das Löschen von `StatusToggle.tsx`. Der Rest sind Tests, Doku, ESLint-Liste und E2E-Specs.

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [x] [Autorisierung] `setStatusAction` ist **unverändert**: `requireRole("veranstalter")`, Status
  per Enum-Whitelist geprüft, Theke wird beim Abschließen abgelehnt, offene Zeilen werden
  serverseitig neu gezählt (`offeneZeilenCount`), guarded UPDATE gegen TOCTOU. Die neue
  `AbschlussAktion` ist nur eine andere Oberfläche für dieselbe Action; Anzahl und Betrag offener
  Zeilen im Dialog sind reiner Hinweis (FS1). Dass der Button bei der Theke fehlt, ist nur UI –
  der Server lehnt die Theke trotzdem ab (`THEKE_NICHT_ABSCHLIESSBAR`). Kein Handlungsbedarf.
- [x] [Autorisierung/IDOR] `kassiereZeileAction` ändert nur den Rückgabewert (`erhaltenCents`).
  Das ist der normalisierte Wert, den der Nutzer selbst eingegeben hat (Zod-geparst), also nichts
  Neues für ihn. Rollenprüfung, Status `offen` und die IDOR-Bindung `getZeile(zeileId,
  veranstaltungId)` mit serverseitig gebundener `veranstaltungId` bleiben. Kein Handlungsbedarf.
- [x] [Input-Validierung] Die Live-Spende im Client (`lesbarerBetragCents`) nutzt dieselbe Regex
  und denselben Parser wie die Zod-Grenze (`lib/money`). Sie ist nur Vorschau, gespeichert und
  abgelehnt wird allein serverseitig (FS3). Wer den Client manipuliert, ändert nur die eigene
  Anzeige.
- [x] [Datenzugriff] Die Detailseite lädt die zusätzlichen Summen (`kassierTagessummen`) erst
  nach dem bestehenden Rollen-Gate (`hasRole(…, "veranstalter")`) und nur aus Daten, die die Seite
  ohnehin lädt. Keine neue Datenfläche.
- [x] [XSS] Alle neuen Ausgaben (Betrag, Spende, Notice, Dialogtext, Anzeigenamen) laufen über
  React-Text-Rendering; kein `dangerouslySetInnerHTML`, keine dynamischen `href` außer
  `/veranstaltung/${id}` mit der serverseitigen Id aus der DB.
- [x] [Secrets] `e2e/kassieren-summe-abschluss.spec.ts` liest Zugangsdaten nur aus
  `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` und überspringt sich ohne sie; nichts ist fest im Code.
  Der Lauf ist opt-in (`E2E_KASSIEREN_371=1`).
- [x] [Dependencies] `package.json`/Lockfile unverändert – keine neuen Abhängigkeiten.
- [x] [Error Handling] Fehler erscheinen als feste deutsche Meldungen (`state.error`), keine
  Stack-Traces oder internen Details.

Keine Funde außerhalb des Scopes – kein Issue, kein `kleinfunde.md`-Eintrag.

## Ergebnis
PASSED
