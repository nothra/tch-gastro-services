# Security Review: Task 51

Reviewt: Diff `main...HEAD` (Schema/Migration, Data-Layer `db/veranstaltung.ts`, Actions
`app/abrechnung/veranstaltung/`, `proxy.ts`-Seam, Seed, UI). Threat Surface: Injection, RBAC/IDOR,
proxy-Seam, Token-Sicherheit, Input-Validierung, Information Disclosure, Secrets, Dependencies.

## Kritische Findings (Blocker)
- [ ] Keine.

## Wichtige Findings
- [ ] Keine offenen.
      Die beiden Findings aus Review-51 wurden verifiziert und **halten**:
      1. **IDOR removeZeile** – `removeZeile(zeileId, veranstaltungId)` löscht via
         `and(eq(id, …), eq(veranstaltungId, …))` (`db/veranstaltung.ts:91-102`); die Action
         übergibt beide Werte (`actions.ts:104-115`). Eine fremde Zeile (andere Veranstaltung /
         Theke) lässt sich über eine offene Veranstaltung nicht mehr löschen.
      2. **Inaktiver Teilnehmer in addZeileAction** – `if (!person || !person.active)`
         (`actions.ts:68-69`) verhindert das Erfassen soft-gelöschter Teilnehmer.
      Analoge Actions geprüft, keine weitere Lücke: `addZeile`/`setStatus`/`ensureThekeForKasse`
      sind serverseitig gegated und lesen nur explizite Felder (kein Mass-Assignment).

## Hinweise
- [ ] [AuthZ] Alle Actions sind serverseitig fail-closed gegated:
      `createVeranstaltungAction`/`addZeileAction`/`createWalkInAction`/`removeZeileAction`/
      `setStatusAction` mit `requireRole("abrechner")`, `ensureThekeAction` mit
      `requireAnyRole(["verwalter","abrechner"])`. Die UI-Sperren (`hasRole` in den Pages) sind
      nur Anzeige-Komfort – Durchsetzung liegt korrekt in den Actions. `setStatusAction`
      validiert den Status gegen das Enum und lehnt `abgeschlossen` für `typ='theke'` ab.
- [ ] [Injection] Kein SQL-Injection-Risiko: alle Queries laufen über den Drizzle-Query-Builder
      (`eq`/`and`); die `sql``-Literale in `db/schema.ts` (CHECK/Partial-Index) enthalten nur
      feste Werte, keine Nutzereingaben. Kein `db.execute`/Raw-SQL im Diff.
- [ ] [XSS] Kein `dangerouslySetInnerHTML`; `bezeichnung`/`anzeigename` werden per JSX gerendert
      (React-Auto-Escaping). Nutzergesteuerte Strings sind sauber.
- [ ] [Mass-Assignment] `createVeranstaltungAction` parst über `veranstaltungSchema` (z.object
      stripped unbekannte Keys) → ein untergeschobenes `typ=theke`/`status=…`/`token=…` in der
      FormData wird verworfen. `typ` kann über die Action nicht gesetzt werden (Default
      `veranstaltung`); die Theke entsteht nur über `ensureThekeForKasse`. Kein Privilege-Confusion.
- [ ] [Input-Validierung] Zod an der Server-Grenze: `bezeichnung` `.max(200)` (text-Bound,
      Codify #50), `kasse` gegen `KASSEN` (fail-closed), `datum` Pflicht + Parse-Refine. Die
      Datum-/Kasse-Pflicht ist doppelt abgesichert (Zod **und** DB-CHECK), Idempotenz der Theke
      DB-seitig (Partial-Unique) + `23505`-Behandlung.
- [ ] [Token] `unguessableToken()` nutzt `globalThis.crypto.randomUUID()` (CSPRNG), 2× UUID-Hex
      (~244 Bit Entropie) – kein `Math.random`. Der Token wird **nicht** an Client-Komponenten
      übergeben oder geloggt (Server-Components lesen nur `id`/`bezeichnung`/`datum`/`kasse`/
      `status`). Länge/Rotation/Rate-Limit sind bewusst an **F7/#54** delegiert – für #51 als
      Fundament ausreichend, kein Blocker.
- [ ] [proxy-Seam] Der Negativ-Lookahead (`proxy.ts:19`) nimmt `theke/` eng gefasst aus
      (mit Slash → `/theke` ohne Token bleibt geschützt); geschützte Routen bleiben fail-closed.
      Die öffentliche Theken-Seite existiert in #51 noch nicht (nur Seam), daher aktuell kein
      erreichbarer Datenpfad. **Delegiert an F5/#52 + F7/#54:** Wenn die öffentliche Seite gebaut
      wird, muss die Token-Prüfung serverseitig erfolgen und bei ungültigem Token einen neutralen
      Fehler liefern (keine Enumeration, kein Timing-Leak) – das ist bereits als Akzeptanzkriterium
      dieser Folge-Features notiert.
- [ ] [Information Disclosure] `23505` wird auf neutrale Nutzertexte gemappt
      („bereits erfasst" / „existiert bereits"); andere DB-Fehler werden re-geworfen und von
      Next in Produktion ohne Stack Trace behandelt. `requireAnyRole` protokolliert Ablehnungen
      ohne Detail-Preisgabe. Keine internen Details nach außen.
- [ ] [Secrets] Keine hartkodierten Credentials/Keys im Diff; `db/seed.ts` liest
      `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` aus der Env (bcrypt-Hash).
- [ ] [Dependencies] Keine neuen Runtime-Dependencies eingeführt (nur `crypto`/`drizzle`/`zod`
      aus dem Bestand).
- [ ] [Robustheit, low] `datum` hat keine explizite Ober-/Untergrenze (`Date.parse` +
      `.transform`). Nur ein authentifizierter Abrechner erreichbar, und plausible JS-Dates
      liegen im Postgres-`date`-Bereich → kein DB-Overflow. Optionale Härtung (Datums-Range),
      **kein** Sicherheitsproblem.

## Ergebnis
PASSED
