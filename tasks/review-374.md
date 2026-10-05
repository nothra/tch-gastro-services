# Review: Task 374

> **Runde 2 (2026-10-05).** Diff-Basis: `git diff origin/main...HEAD` (39 Dateien, bis `5abaa76`)
> plus der uncommittete Arbeitsstand (ADR-056 D4 ergänzt, `e2e/anleitung-veranstalter.spec.ts`
> um die AK5.4-Aufnahmen erweitert, Wegwerf-Datei `playwright.capture.tmp.config.ts`). Seit Runde 1
> neu: Refactor `5abaa76` (`app/components/headerStyles.ts`) und der AK5.4-Anfang. Drei Perspektiven
> (Logik, Code-Qualität, Architektur). Ihre Kritisch-/Wichtig-Behauptungen sind am Code
> nachgeprüft. In dieser Runde liefen keine Gates.
>
> **Stand Runde 1:**
> - W1 (ADR-056 D4 um `auth()`/Session-Bedingung ergänzen): inhaltlich erledigt, der Text passt zu
>   `app/theke/[token]/page.tsx:21-47`. Er ist aber **noch nicht committet**.
> - W2 (E2E-Verweis in `KontoMenue.test.tsx:6`): in `5abaa76` erledigt.
> - Von den Nitpicks sind `AppNav.test.tsx:167` und `personenbezug.ts` erledigt. Offen sind:
>   Popover-Abstand 3.75rem ohne WHY, Light-Dismiss-Fokus in AK1.3, `Kassieren →`-Fixtures,
>   Browser-Mindestversion in der Anleitung.

## Kritische Findings (müssen behoben werden)

_Keine._

## Wichtige Findings (sollten behoben werden)

- [ ] [app/components/headerStyles.ts / eslint/ui-token-files.mjs:37-43] **Der Refactor hat die Header-Klassen aus dem Farb-Gate herausgezogen.** `focusClass`, `headerClass` und `iconButtonClass` standen vorher in den gegateten Dateien `AppNav.tsx`, `KontoMenue.tsx` und `PublicHeader.tsx`. Jetzt liegen sie in `app/components/headerStyles.ts`, und diese Datei fehlt in `UI_TOKEN_FILES`. Die Regel `tch/no-raw-color-classes` prüft jedes String-Literal und Template-Element (`eslint/no-raw-color-classes.mjs:106-111`). Sie würde also greifen, wird aber auf diese Datei nicht angewendet. Eine rohe Farbe in `headerStyles.ts` käme damit unbemerkt in alle drei gegateten Kopfzeilen. **Fix:** `"app/components/headerStyles.ts"` in den #374-Block der Liste aufnehmen. Vorher die „nicht enthalten"-Tests greppen (Lesson #371).
- [ ] [app/components/PublicHeader.tsx:23] **Das Bündeln im Refactor ist unvollständig.** Der „Anmelden"-Link schreibt die Fokus-Klassen (`focus-visible:outline-2 … outline-accent`) weiter von Hand aus. `PublicHeader` importiert nur `headerClass`. Das widerspricht dem eigenen Modul-Kommentar von `headerStyles.ts` („eine Quelle, damit … nicht auseinanderdriften"). **Fix:** `${focusClass}` verwenden.
- [ ] [docs/adr/056-header-konto-menue-startseite-oeffentlicher-header.md:91-94] **Die ADR-Ergänzung aus Runde 1 W1 liegt nur im Arbeitsbaum.** Committen, und mit ihr in `tasks/task-374-…md` die Notiz „bewusst offen: ADR-056 D4" sowie die Technische Notiz zu `PublicHeader` (Session-Bedingung) nachziehen.

## Nitpicks (optional)

- [ ] [docs/adr/056-…md:157-161] Die Konsequenzen nennen die neue gemeinsame Quelle `app/components/headerStyles.ts` nicht (Lesson #211). Ein Halbsatz reicht.
- [ ] [playwright.capture.tmp.config.ts] Die Wegwerf-Config ist **nicht** gitignoret (`git status`: `??`). Vor dem AK5.4-Commit löschen oder bewusst ausschließen, damit sie nicht mit `git add -A` in den PR rutscht (Lesson #324).
- [ ] [e2e/anleitung-veranstalter.spec.ts:154] `viewport?.width ?? 414` ist ein toter Fallback, weil `test.use` den Viewport auf 414 festlegt. Die 414 steht damit doppelt. `height: 240` ist eine Magic Number ohne Herleitung, und eine lange E-Mail (`break-all`) würde abgeschnitten. Vorschlag: eine benannte Konstante mit WHY. Robuster wäre ein Clip bis zur Unterkante von `#konto-menue`.
- [ ] [e2e/anleitung-veranstalter.spec.ts:151-155] `shotKontoMenue` baut den Screenshot-Aufruf neben `shot`/`shotVerzehr` ein drittes Mal nach. Ein optionaler `clip`-Parameter an `shot` würde das auflösen.
- [ ] [e2e/anleitung-veranstalter.spec.ts:279-280] Die Assertion „Keine offene Veranstaltung." braucht eine Dev-DB ohne offene Veranstaltung. Ein abgebrochener DB-Integrationstest hinterlässt aber offene `__test__`-Veranstaltungen (Lesson #346). Dann scheitert die Aufnahme gleich am ersten Bild. Im Dateikopf das tatsächliche Reset-Kommando nennen.
- [ ] [e2e/anleitung-veranstalter.spec.ts:144-145] Der zweite Kommentarsatz („Escape schließt es wieder …") beschreibt nur das WHAT und kann weg.
- [ ] [app/components/AppHeader.tsx:14] `email ?? "Angemeldet"` greift nicht bei `""`. Das war schon vorher so und ist durch diesen PR unverändert. Die Spec nennt es „bestehender Fallback", daher nur als Hinweis.
- [ ] [docs/routes.md:27] Optional könnte die Funktionsbeschreibung von `/theke/[token]` den Gäste-Kopf nennen, analog zur Zeile `/`. Das ist keine Pflicht, der Zugriff hat sich nicht geändert.

## Positives

- `headerStyles.ts` ist klein, sprechend benannt und mit einem WHY-Kommentar versehen. `AppNav` und `KontoMenue` nutzen es durchgängig, und das Verhalten bleibt gleich.
- Die neuen Capture-Helper finden die Startseiten-Zeile über das exakte `a[href=…]` in der Region, nicht über einen Teilstring (Lesson #388). Jeder Schritt hat eine Verhaltens-Assertion: Menü sichtbar, nach Escape verborgen, Leer-Hinweis. Die Aufnahme ist damit zugleich ein Smoke-Test.
- Der Wortlaut der ADR-Ergänzung D4 stimmt mit dem Code überein: `auth()` läuft parallel zu den Daten-Loads, aber erst nach `notFound()`. Gerendert wird nur bei `!session?.user`, und die Autorisierung bleibt am Token (ADR-034).
- Aus Runde 1 bestätigt:
  - Rollen-Gate vor dem Laden, Catch-Scope nur um den einen DB-Aufruf.
  - Die Schichtung ist sauber: DB nur über `db/`, die route-neutralen Komponenten haben keine Feature-Imports.
  - Das Farb-Gate deckt genau die fünf D5-Dateien ab, ADR-056 steht auf Accepted.
  - AK4.6 ist unverändert erfüllt.

## Empfehlung

APPROVED

Es gibt keine kritischen Findings. Die drei wichtigen Findings sind kleine Nacharbeiten: einen Pfad ins Farb-Gate aufnehmen, `focusClass` in `PublicHeader` verwenden, die ADR-Ergänzung committen. Sie brauchen keine weitere Review↔Implement-Runde und können zusammen mit dem AK5.4-Schritt vor dem Merge erledigt werden.
