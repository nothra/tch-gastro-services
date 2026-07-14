# Review: Task 50

Multi-Persona-Review der Teilnehmer-Stammdaten (F3, #50). Geprüft: `db/schema.ts`
(teilnehmer + Enum), `db/teilnehmer.ts` (+ Test), `app/verwaltung/teilnehmer/*`
(schema, actions, page, TeilnehmerForm/Fields/Row + Tests). Referenz: Getränke-Katalog
(#49), Spec-50, ADR-022.

## Kritische Findings (müssen behoben werden)
- Keine.

## Wichtige Findings (sollten behoben werden)
- [ ] [db/teilnehmer.ts:34-41] `updateTeilnehmer` gibt `Promise<Teilnehmer>` zurück, kann
      aber `undefined` liefern, wenn die `id` nicht (mehr) existiert (`returning()` → leeres
      Array → `updated === undefined`). Aktuell folgenlos, weil `updateTeilnehmerAction` den
      Rückgabewert ignoriert. **Risiko:** ADR-022 macht diese Data-Layer-Funktion bewusst
      rollen-neutral für **F4-Wiederverwendung** – ein künftiger Konsument, der auf den
      `Teilnehmer` zugreift, dereferenziert dann `undefined` ohne Compiler-Warnung. Entweder
      Rückgabetyp ehrlich als `Teilnehmer | undefined` typisieren oder bei leerem Ergebnis
      werfen. (Gleiches Muster existiert im Katalog – falls dort ebenfalls ungeprüft, als
      eigenes tech-debt-Issue führen, nicht in diesem PR.)

## Nitpicks (optional)
- [ ] [app/verwaltung/teilnehmer/actions.ts:50-64] Rename-auf-Duplikat umgeht die
      Duplikat-Warnung: `updateTeilnehmerAction` prüft `findActiveByName` nicht, ein
      bestehender Teilnehmer kann also auf einen bereits vergebenen aktiven Namen umbenannt
      werden, ohne Hinweis. **Bewusst konsistent mit ADR-022** („die Server-Action prüft vor
      dem *Insert*") – kein Handlungsbedarf, nur festgehalten, falls das Produkt die Warnung
      später auch beim Bearbeiten wünscht.
- [ ] [app/verwaltung/teilnehmer/TeilnehmerForm.tsx:21] Nach einer Duplikat-Warnung bleibt
      `confirmDuplicate="true"` „klebrig": Ändert der Nutzer danach den Namen auf einen
      *anderen* bereits existierenden Namen und sendet erneut, wird ohne neue Warnung angelegt
      (der zweite Submit überstimmt generisch). Randfall, die Warnung ist ohnehin
      nicht-blockierend – reine UX-Feinheit.
- [ ] [app/verwaltung/teilnehmer/schema.ts:13-16] `mitglied` als
      `z.literal("on").optional()`: Ein manipulierter Request mit `mitglied=false` (statt
      Weglassen) lässt das Schema fehlschlagen statt „false" zu ergeben. Für die echte Checkbox
      (sendet nur `"on"` oder gar nichts) irrelevant; nur bei gefälschten Payloads relevant.
- [ ] [app/verwaltung/teilnehmer/actions.ts:26-28] `firstIssueMessage` ist wortgleich im
      Katalog (`app/verwaltung/katalog/actions.ts:26-28`) vorhanden. Kleine Duplikation über
      zwei Features – Kandidat für einen gemeinsamen Helfer (z. B. `lib/`), aber eigenes
      Refactoring-Issue, nicht Teil dieses Scopes.

## Positives
- ADR-022 exakt umgesetzt: **eine** Tabelle + `typ`-Enum, **kein** `UNIQUE(name)`,
  rollen-neutraler Data-Layer, nicht-blockierende `confirmDuplicate`-Duplikatwarnung,
  Soft-Delete über `active`. Die eine bewusste Katalog-Abweichung (kein Unique) ist im
  Schema-Kommentar begründet.
- Schicht-Trennung sauber: Drizzle-Queries ausschließlich in `db/teilnehmer.ts`; RBAC
  `requireRole("verwalter")` als **erste Zeile** jeder Action (fail-closed), zusätzlich
  Anzeige-Gate in `page.tsx` (Defense in Depth).
- Inline-Edit-Erfolgsfall über `useCallback`-Wrapper geschlossen – vermeidet korrekt die
  bekannte `react-hooks/set-state-in-effect`-Falle (CLAUDE.md).
- Alle **in-Scope**-Akzeptanzkriterien abgedeckt und getestet (AK1 anlegen/listen, AK3
  deaktivieren, AK4 leerer Name Zod-abgelehnt, AK5 Abrechner serverseitig abgelehnt,
  Fehler-1 Duplikate erlaubt+Warnung). AK2/AK6 (Historie/Walk-in) korrekt an F4 delegiert
  und dokumentiert.
- Tests testen Verhalten, nicht Implementierung; Mock-Grenze richtig gezogen (auth/DB/cache
  gemockt, `lib/authz`-Guard läuft echt). Integrationstests `skipIf(!DATABASE_URL)`,
  nicht-destruktives Cleanup per `id`.

## Empfehlung
APPROVED

> Hinweis (kein Blocker für das Review): Die in der Task-Datei protokollierten Blocker
> bleiben offen – `pnpm db:generate` (Migration), `pnpm lint`, `pnpm test` und der
> UI-/Oberflächentest sind noch auszuführen, bevor die Akzeptanzkriterien final abgehakt
> und committet werden.
