# Task 369: veranstaltung-detailseite-neu-ordnen

## Status
- [x] In Bearbeitung
- [x] Review bestanden
- [x] Tests vollständig
- [ ] Security-Review bestanden
- [x] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Detailseite `/veranstaltung/[id]` neu ordnen: Kopf → drei Arbeitsschritt-Kacheln → Teilnehmerliste → eingeklappte Einstellungen; ein gemeinsamer „+ Teilnehmer"-Dialog; Zeilenmenü mit bestätigtem Entfernen; Abschließen wandert minimal ans Ende von Kassieren. Spec: `docs/specs/spec-369-veranstaltung-detailseite-neu-ordnen.md`.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [x] Siehe `docs/specs/spec-369-veranstaltung-detailseite-neu-ordnen.md` (AK1–AK31, FS1–FS6); kurz:
- [x] AK1: GIVEN eine offene Veranstaltung WHEN die Detailseite geöffnet wird THEN erscheinen
- [x] AK2: GIVEN die Detailseite WHEN sie gerendert wird THEN zeigt der Kopf Titel, Datum und
- [x] AK3: GIVEN eine offene Veranstaltung WHEN die Kacheln angezeigt werden THEN gibt es
- [x] AK4: GIVEN eine offene Veranstaltung mit erfasstem Verzehr WHEN die Kacheln angezeigt
- [x] AK5: GIVEN eine offene Veranstaltung ohne Teilnehmer, ohne Verzehr oder ohne Auslagen
- [x] AK6: GIVEN eine abgeschlossene Veranstaltung WHEN die Detailseite geöffnet wird THEN
- [x] AK7: GIVEN eine abgeschlossene Veranstaltung WHEN die Detailseite geöffnet wird THEN
- [x] AK8: GIVEN eine offene Veranstaltung WHEN die Teilnehmerliste angezeigt wird THEN steht
- [x] AK9: GIVEN die Liste einer abgeschlossenen Veranstaltung WHEN sie angezeigt wird THEN
- [x] AK10: GIVEN eine offene Veranstaltung WHEN „+ Teilnehmer" getippt wird THEN öffnet sich
- [x] AK11: GIVEN der Dialog WHEN ein Suchbegriff eingegeben wird THEN zeigt die Auswahl nur
- [x] AK12: GIVEN der Dialog WHEN mehrere Stammteilnehmer angehakt und „Hinzufügen" getippt
- [x] AK13: GIVEN der Dialog WHEN bei „Neuer Gast" ein Name eingegeben und bestätigt wird THEN
- [x] AK14: GIVEN der Dialog WHEN „Hinzufügen" ohne Auswahl getippt wird THEN bleibt der
- [x] AK15: GIVEN der Dialog WHEN Escape gedrückt oder „Abbrechen" getippt wird THEN schließt
- [x] AK16: GIVEN alle aktiven Stammteilnehmer sind bereits erfasst WHEN der Dialog geöffnet
- [x] AK17: GIVEN eine Teilnehmerzeile einer offenen Veranstaltung WHEN auf den Namen
- [x] AK18: GIVEN eine Teilnehmerzeile einer offenen Veranstaltung WHEN das Zeilenmenü
- [x] AK19: GIVEN das Zeilenmenü WHEN „Entfernen" gewählt wird THEN öffnet ein
- [x] AK20: GIVEN die Bestätigung WHEN der Server das Entfernen ablehnt (z. B. weil die
- [x] AK21: GIVEN die Detailseite WHEN sie geöffnet wird THEN ist „Einstellungen" standardmäßig
- [x] AK22: GIVEN der Bereich „Einstellungen" WHEN „Link & QR teilen" getippt wird THEN öffnet
- [x] AK23: GIVEN die bestehende Löschen-Funktion WHEN sie unter „Einstellungen" bedient wird
- [x] AK24: GIVEN die Detailseite WHEN sie gerendert wird THEN enthält sie weder „Abschließen"
- [x] AK25: GIVEN die Kassieren-Seite einer offenen Veranstaltung WHEN sie geöffnet wird THEN
- [x] AK26: GIVEN die Kassieren-Seite einer abgeschlossenen Veranstaltung WHEN sie geöffnet
- [x] AK27: GIVEN ein Viewport von 375 × 812 px und eine offene Veranstaltung mit mindestens
- [x] AK28: GIVEN die Detailseite bei 375 px WHEN sie gerendert wird THEN gibt es keinen
- [x] AK29: GIVEN der `ConfirmDialog` WHEN er geöffnet wird THEN ist er ein natives
- [x] AK30: GIVEN die Dialoge „+ Teilnehmer" und „Link & QR teilen" WHEN sie geöffnet werden
- [x] AK31: GIVEN die neu gebauten Oberflächen WHEN sie gestylt sind THEN verwenden sie nur die
- [x] FS1: Zwei Geräte: Während ein Dialog offen ist, wird die Veranstaltung abgeschlossen →
- [x] FS2: Ein Stammteilnehmer wird im Dialog gewählt, ist aber inzwischen deaktiviert oder
- [x] FS3: Gast-Name leer, nur Leerzeichen oder zu lang → Feldfehler im Dialog, wie beim
- [x] FS4: Kein Zugriff (nicht `veranstalter`) → unveränderte Meldung „Kein Zugriff"; die
- [x] FS5: Stehende Theke: Einstellungen zeigen weder Bearbeiten noch Löschen (#352); die
- [x] FS6: Sehr lange Teilnehmernamen und Veranstaltungsbezeichnungen brechen um und

## Technische Notizen
ADR: [ADR-053](../docs/adr/053-detailseite-dialog-baustein-mehrfach-anlage-kennzahlen.md) (Accepted).
- D1 `Dialog`/`ConfirmDialog` auf nativem `<dialog>` in `app/components/ui/` (Kinder nur bei offenem Dialog gemountet; jsdom-Stub in `vitest.setup.ts`).
- D2 `ZeilenMenue` feature-lokal; Tipp auf Namen = Link auf `…/verzehr?zeile=<id>` (#308 existiert).
- D3 `addZeilen` = ein Multi-Row-INSERT (atomar, kein `runAtomic`), `addZeilenAction` ersetzt `addZeileAction`; Zod min 1/max 200; `23505` ⇒ nichts angelegt.
- D4 `kachelKennzahlen.ts` als reiner Adapter über `kassierZeilen`/`kassierTagessummen`/`auslagenSummen`.
- D5 `ZugangTeilen` bleibt Server Component, Client-Hülle `ZugangDialog` öffnet sie (kein `qrcode` im Client).
- D6 `StatusToggle` unverändert ans Ende von Kassieren; Bericht bei `abgeschlossen` über den Kacheln, Kacheln bleiben als Links ohne Kennzahl (Spec AK6/AK7 dazu korrigiert).
- Reihenfolge und Fallen: siehe ADR-053 → „Implementierungs-Hinweise". Branch vor /implement auf `origin/main` bringen (#368).

### Implementierungs-Notizen (/implement, 2026-10-01)
- Gates: `pre-commit.sh` + `pre-push.sh` grün (1264 Tests, Typecheck, Format, Routen-Doku). DB-Integrationstests
  mit `.env.local` separat: 684/684 grün (`db/`, `app/veranstaltung/`). Routen unverändert → `docs/routes.md` bleibt.
- Oberflächentests gegen eigenen Dev-Server (`next dev -p 3369`, Lesson #368): `veranstaltung-detailseite.spec.ts`
  (neu, AK8–AK28), `veranstaltung-bearbeiten-loeschen.spec.ts` (#352) und `wechsel-verzehr-kassieren.spec.ts` (#308)
  – 9/9 grün. Stolperstein: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:…` scheitert komplett, weil `next dev` `/_next`-
  Ressourcen fremder Origins blockt (`allowedDevOrigins`) – die Seite hydriert nicht, kein Dialog öffnet sich.
  `localhost:<port>` + Config ohne `webServer` benutzen.
- Kachel „x von n bezahlt": Zeilen mit 0,00 € Verzehr zählen als bezahlt – identisch mit „Offene Zeilen" der
  Kassieren-Seite (gleiche Quelle `kassierTagessummen`, AK4), keine eigene Regel.
- **Offen (menschlicher Schritt vor dem Merge):**
  - AK27-Screenshot (`test-results/369-detailseite-375.png`, gitignoret) von Hand an den PR hängen (Lesson #368).
  - Anleitungs-Bilder `05`/`06`/`07` passen noch zum alten Layout; der Text in `docs/anleitung/veranstalter/anleitung.md`
    ist schon aktualisiert. Die Capture-Spec (`CAPTURE_ANLEITUNG=1`) braucht eine frisch geseedete DB und wurde deshalb
    nicht gegen die geteilte Dev-DB gefahren. Vorbestehender Bruch dort (#345: „+ Katalog anlegen" machte
    `name: "Anlegen"` mehrdeutig) per `exact: true` behoben. Seit dem Review-Rework kanonisch in
    `docs/factory/kleinfunde.md` („Anleitungs-Screenshots `05`–`07`").

### Review-Rework (/implement, 2026-10-01)
- Alle Kritisch-/Wichtig-Findings und Nitpicks aus `tasks/review-369.md` erledigt (Code in `c4f2ae5`,
  ADR-Drift + E2E-Helfer im Folge-Commit). Bewusst offen: Auslagen-Kachel-Hinweis (durch ADR-053 D4 gedeckt).
- Die E2E-Helfer der Detailseite liegen jetzt in `e2e/helpers/detailseite.ts` (vorher vier Kopien).

### Review-Rework Iteration 2 (/implement, manuell, 2026-10-01)
- Die Pipeline brach nach dem dritten `/review`-Versuch ab (Verdict unverändert `NEEDS_REWORK`); der Rework
  lief manuell in einer Session. **Die OTEL-Telemetrie (ADR-049) fehlt für diesen Teil** – sie hängt am
  `run-pipeline.sh`-Wrapper, eine rückwirkende Erhebung gibt es nicht.
- Wichtig-Finding behoben: Escape-Sperre liegt jetzt im `Dialog` selbst (Prop `schliessbar`); `ConfirmDialog`
  und `TeilnehmerHinzufuegenDialog` folgen derselben Regel. Stolperstein: ein `setState` am Anfang einer
  Form-Action gehört zur Transition und wird erst mit deren Ende sichtbar – der Start wird deshalb aus dem
  `onSubmit` gemeldet, das Ende aus `useSchliessendeAction`.
- Nitpicks erledigt: ADR-053 (Drift zu D1/D3, Kopfsatz), `TEILNEHMER_NICHT_GEFUNDEN`, Kommentar-Position,
  Nicht-`HTMLElement`-Test, `try/finally` im ConfirmDialog-Test, exakte Walk-in-Meldungstexte inkl. „zu lang",
  `setzeEinstellungen`, `groesse()` statt `boundingBox()!`, Anleitungs-Wortlaut.
- Bewusst nicht umgesetzt: Fokus-Ersatzziel nach „Entfernen" (Gestaltungsfrage, AK19/AK29 nicht verletzt) und
  die CloseWatcher-Härtung (laut Review nur „plausibel" – vorher im Browser prüfen). Das E2E-Kopiermuster für
  `login`/`createVeranstaltung` über drei Specs steht kanonisch in `docs/factory/kleinfunde.md`.
- Gates: Lint, Format, Typecheck grün; E2E der drei Specs 9/9 grün; Vitest 717 + `actions.test.ts` grün.

### /test (2026-10-01)
- Vollständiger Lauf mit `.env.local` (DB-Tests laufen, keine übersprungen): 102 Dateien, 1389 Tests grün;
  Coverage gesamt 98,2 % Statements / 98 % Branches (Schwelle 80 %).
- Drei Verhaltenslücken im neuen Code geschlossen: Abwählen einer angehakten Person im Dialog
  (`umschalten`-Zweig), andere Taste im Zeilenmenü schließt nicht, `createWalkInAction` mit unbekannter
  Veranstaltung (Guard-Branch, Codify #51).
- Bewusst nicht angefasst (kein Produktionscode in `/test`): `Dialog.tsx:59` – `if (!dialog) return;` ist
  im Effekt nicht erreichbar, weil die Ref nach dem Mount gesetzt ist (toter Guard, Kandidat für `/refactor`).
  `actions.ts:636` (`ensureThekeAction`, Kasse-Guard) und `db/veranstaltung.ts` `getZeile` sind Altbestand
  ohne Änderung durch #369.

### /refactor (2026-10-01)
- `useSchliessendeAction` liefert `meldeStart` als viertes Tupel-Element; beide Bereiche des
  „+ Teilnehmer"-Dialogs nutzen es als `onSubmit` statt je einer eigenen Lambda. Start- und Ende-Meldung
  sind damit an einer Stelle erklärt (Review-Iteration-3-Nitpick). Kein neues Verhalten, Lock-Tests unverändert grün.
- Test für das Nicht-`HTMLElement`-Rücksprungziel diskriminiert jetzt: Stellvertreter mit `focus`-Spion statt
  SVG (in jsdom hat `SVGElement` ein wirkungsloses `focus()`). Mutationsbeleg: ohne die `instanceof`-Prüfung rot,
  mit ihr grün.
- `kleinfunde.md`: falsche Aussage zum E2E-Kopiermuster berichtigt (die neue Spec fügt die dritte Kopie hinzu).
- Bewusst nicht geändert: `if (!dialog) return;` in `Dialog.tsx`. Der Guard wirkt im Laufzeitverhalten tot, ist
  aber für die Typverengung (`useRef<HTMLDialogElement>(null)` → `HTMLDialogElement | null`) nötig; ein `!`
  würde nichts verbessern.

## Offene Fragen
Q1–Q5 siehe Spec (Dialog-Baustein/Zeilenmenü, atomare Mehrfach-Anlage, Kennzahl „x von n bezahlt", Abgrenzung #307, Nachschlage-Ansicht bei abgeschlossenen Veranstaltungen). Hinweis: Branch liegt vor dem Merge von #368 – vor /implement auf origin/main bringen (`gh pr update-branch`/pr-shepherd).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/369-veranstaltung-detailseite-neu-ordnen`
Erstellt: 2026-09-30 23:30
