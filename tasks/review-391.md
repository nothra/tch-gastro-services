# Review: Task 391

> **Iteration 4 – Nachprüfung nach dem Rebase auf #371 (`4a5d96f`).** Iteration 3 war APPROVED
> (Stand `99e3a64`); seitdem ist #371 auf `main` gelandet, und `fec663a` führt die Kopfaktionen
> mit der neuen `AbschlussAktion` zusammen. Geprüft: `git diff origin/main...HEAD` (nach
> `git fetch origin`), Schwerpunkt auf allem, was durch das Zusammenführen mit #371 entsteht.
> Das ist kein vierter Durchlauf über denselben Code, sondern ein Review des Rebase-Ergebnisses.
> Den Circuit Breaker greift das nicht an; die Funde unten sind mechanisch und eindeutig.
>
> Gates in dieser Runde selbst ausgeführt: `scripts/checks/pre-commit.sh` (inkl. `pnpm lint`)
> grün; `vitest run app/components/ui app/veranstaltung` 46 Dateien / **798** Tests grün; `tsc --noEmit`
> grün; `prettier --check` (app, e2e, docs/adr, docs/specs, docs/anleitung, tasks) grün;
> `routes-doc-check.sh` grün. E2E **nicht** ausgeführt.

## Kritische Findings (müssen behoben werden)

- [ ] `docs/adr/055-detailseite-kopfaktionen-symbol-schaltflaechen.md` – **Doppelte ADR-Nummer.**
  #371 hat `docs/adr/055-kassieren-spende-live-abschluss-im-kopf.md` vor uns auf `main` gebracht.
  Nach dem Rebase gibt es zwei ADR-055, beide mit D1–D6. Damit ist jeder Verweis „ADR-055 Dn“
  mehrdeutig, und das schon in derselben Datei: `app/veranstaltung/[id]/page.tsx:73`
  („ADR-055 D3“ = Abschluss-Hinweis, #371) und `page.tsx:172` („ADR-055 D5“ = Aktionszone, #391).
  Ebenso stehen in `docs/adr/053-…:143` und `:153` zwei verschiedene ADR-055 direkt untereinander.
  Nach dem Merge ließe sich das nur noch über einen eigenen PR korrigieren.
  **Fix:** Die ADR dieses PRs wird zu `056-detailseite-kopfaktionen-symbol-schaltflaechen.md`
  (Titelzeile mitziehen). Alle Verweise **aus diesem PR** von `ADR-055` auf `ADR-056` umstellen –
  per `git grep -n "ADR-055\|adr/055"`, und dabei je Treffer entscheiden, welcher ADR er gehört.
  Zu #391 gehören: `Button.tsx:30`, `IconButton(.test).tsx`, `icons(.test).tsx`,
  `KatalogWechsel.test.tsx:94/117`, `KopfDialog(.test).tsx`, `VeranstaltungLoeschen(.test).tsx`,
  `VeranstaltungMetaForm.test.tsx:85/113`, `ZugangTeilen.tsx:6`, `page.tsx:27` (Kopfaktionen-Teil)
  und `:172`, `docs/adr/034-…:89`, `docs/adr/053-…:135/:143`, `spec-391:137/138/140`,
  `e2e/veranstaltung-bearbeiten-loeschen.spec.ts:121/209`, `eslint/ui-token-files.mjs:26` sowie
  die Task-Datei (`:43`).
  Zu #371 gehören und bleiben deshalb **unverändert**: `AbschlussAktion(.test).tsx`,
  `KassiereZeileForm*`, `kassierSummen*`, `KassierSummenKarte.tsx`, `kassieren/page.tsx`,
  `actions(.test).ts`, `page.tsx:73`, `page.test.tsx:290/308`, `e2e/kassieren-summe-abschluss.spec.ts`,
  `e2e/veranstaltung-detailseite.spec.ts:98`, `docs/adr/053-…:153` und `tasks/*-371*`.

## Wichtige Findings (sollten behoben werden)

- [ ] `docs/adr/055-detailseite-kopfaktionen-symbol-schaltflaechen.md:95-104` und
  `docs/specs/spec-391-…:53-55, :104-107, :115-117` – **Spec/ADR beschreiben den Kopf ohne die
  Abschluss-Aktion aus #371.** Nach `fec663a` ist die Aktionszone tatsächlich
  Badge · Abschluss-Aktion · Teilen · Einstellungen · Papierkorb. Bei abgeschlossener Veranstaltung
  steht dort Badge · „Wieder öffnen“ (`page.test.tsx` setzt beides bereits so durch). Die Dokumente
  sagen aber noch:
  - ADR D5: „`Badge` · Teilen · Einstellungen · Papierkorb“, „abgeschlossen → nur Badge“,
    „Badge + 3 × 44 px passen auch bei 375 px“.
  - spec-391 AK2: Reihenfolge ohne Abschluss-Aktion.
  - AK14 ist inhaltlich weiter erfüllt (weder Teilen, Zahnrad noch Papierkorb); ein Satz zu
    „Wieder öffnen bleibt (spec-371)“ fehlt aber.
  - AK16: Die Aufzählung nennt die Abschluss-Schaltfläche nicht.

  Das ist der Spec-Drift aus der Lesson #253 (frisch im PR geänderte Spec, Lesson
  factory-workflow) bzw. der ADR-Drift aus #211. **Fix:** ADR D5 und spec-391 AK2/AK14/AK16 auf
  den zusammengeführten Stand bringen, mit Verweis auf spec-371 AK18/AK22–AK24. Ein Q-Eintrag
  (z. B. Q5 „Zusammenführung mit #371“) hält fest, dass die Abschluss-Aktion zwischen Badge und
  Teilen steht.
- [ ] `app/veranstaltung/[id]/kassieren/page.tsx:252` – **Präsens-Kommentar wird durch diesen PR
  falsch:** „natives `<details>` wie ‚Einstellungen‘ auf der Detailseite“. Den `<details>`-Bereich
  „Einstellungen“ entfernt genau dieser PR (spec-391 AK1). Der Kommentar kommt aus #371, falsch
  wird er erst durch das Zusammenführen; das ist die Lesson „Löscht/ersetzt ein PR ein Modul, alle
  Doku-Treffer per Grep abräumen“ (#370). **Fix:** Den Vergleich streichen („natives `<details>` –
  aufgeklappt …“). Der ADR-Verweis daneben (`ADR-055 D4`) gehört zu #371 und bleibt.
- [ ] `e2e/veranstaltung-detailseite.spec.ts:271-301` und Task-Datei → „Nachweise“ – **Kein
  E2E-Nachweis für den zusammengeführten Kopf.** Die Angabe 12/12 grün stammt aus der Zeit vor
  dem Rebase. `fec663a` ändert im E2E nur die Formatierung. Der AK16-Test prüft bei 375 px weiter
  nur Badge + drei Symbole. Dass die zusätzliche Text-Schaltfläche „Veranstaltung abschließen“
  zusammen mit den drei Symbolen ohne horizontales Scrollen umbricht (spec-391 AK16 + spec-371
  AK24 zugleich), belegt kein Test. **Fix:** Im AK16-Test „Veranstaltung abschließen“ in die
  Sichtbarkeits-Schleife aufnehmen, ohne 44-px-Breitenprüfung, da das eine Text-Schaltfläche ist.
  Danach die drei Specs aus den Nachweisen erneut gegen einen Dev-Server aus diesem Worktree
  laufen lassen (Lesson testing #368) und die Task-Notiz mit Datum nachtragen.

## Nitpicks (optional)

- [ ] `app/veranstaltung/[id]/page.tsx:31-32` – „Abgeschlossene Veranstaltungen … keine
  Kopfaktionen“ ist technisch richtig (`kopfAktionen` fehlt, `aktion` bleibt). Der Leser sieht im
  Kopf aber „Wieder öffnen“. Besser: „keine Kopfaktionen außer ‚Wieder öffnen‘ (spec-371)“.
  Dasselbe gilt für den Kommentar an `AbgeschlosseneVeranstaltung` (`:151-152`).

## Positives

- **Runde 1 (Logik):** Die Zusammenführung selbst ist korrekt: `AbschlussAktion` nur bei
  `bearbeitbar` (spec-371 AK23, Theke ohne Abschluss), `kopfAktionen` nur im offenen Zweig. Im
  abgeschlossenen Zweig gibt es nur „Wieder öffnen“ (spec-391 AK14 unverletzt). `page.test.tsx`
  legt die neue Reihenfolge exakt fest (`toEqual` auf die volle Liste, Lesson #318/#322).
- **Runde 2 (Qualität):** Testnamen sind an das neue Verhalten angepasst
  (`…BadgeAbschlussTeilen…`, `…OnlyBadgeAndAbschlussAktion…`), mit Begründungskommentar zum
  spec-371-Bezug. Ansonsten gibt es keine neuen Duplikate oder Magic Strings.
- **Runde 3 (Architektur):** `DetailRahmen` trennt `aktion` (Statuswechsel, #371) und
  `kopfAktionen` (#391) sauber als zwei Props. Zustandsregeln bleiben beim Aufrufer (ADR D5).
  `PageHeader` ist unverändert, keine Routen-Änderung – `docs/routes.md` zu Recht unberührt.

## Empfehlung
NEEDS_REWORK
