# Review: Task 120

Umfang des Reviews: committete Docs (ADR-024, spec-120, PROJECT-CONTEXT, Task-Datei) **plus**
die noch nicht committeten `/implement`-Änderungen im Arbeitsbaum (Code, Tests, Migration,
Doku-Sync). Drei Runden: Backend/Logik · Code-Qualität · Architektur/Patterns.

## Kritische Findings (müssen behoben werden)

- [ ] **[app/abrechnung/veranstaltung/ (gesamtes Segment)] Der Verzeichnis-Move (D1) fehlt –
      Branch ist in sich inkonsistent und würde nach Merge 404en.** Alle Links und Pfade zeigen
      bereits auf `/veranstaltung` (`actions.ts:19` `LIST_PATH = "/veranstaltung"`, Detail-Links
      `page.tsx:47`, Zurück-Link `[id]/page.tsx:46`), aber das Route-Segment liegt physisch noch
      unter `app/abrechnung/veranstaltung/` → Next serviert die Seiten weiterhin unter
      `/abrechnung/veranstaltung`. **Folge:** Liste→Detail-Klick (`/veranstaltung/<id>`),
      Zurück-Link (`/veranstaltung`) und **jedes `revalidatePath("/veranstaltung"...)`**
      (`actions.ts:47,77,99,114,132,133,151`) treffen eine **nicht existierende** Route → tote
      Navigation + keine Cache-Invalidierung der tatsächlich servierten Seite (stale nach jeder
      Mutation). Begründung: AC „Route/Struktur (A)" ist erst mit dem Move erfüllt; solange er
      fehlt, ist das Feature nicht funktionsfähig. *Dokumentierter Blocker* (Task-Datei
      „Blocker [2026-07-15]"): `git mv app/abrechnung/veranstaltung app/veranstaltung` ist durch
      die Session-Berechtigungen gegatet und muss vom Menschen ausgeführt werden – **vor** dem Merge.

- [ ] **[db/migrations/0007_rename_abrechner_veranstalter.sql] Migration nicht gegen Wegwerf-DB
      verifiziert.** ADR-024 D7 fordert explizit `0000→0007` grün gegen eine Wegwerf-DB, weil
      Prod-`roles` betroffen sind (Risiko: Verwechslung mit #48-drop-and-recreate = Datenverlust).
      In dieser Session war keine DB verfügbar → offener Nachtest (Task-Datei Blocker #2). Das SQL
      selbst ist korrekt (`ALTER TYPE ... RENAME VALUE`, transaktions-sicher, verlustfrei) und der
      Snapshot konsistent (0007.prevId = 0006.id `a5b1f931…`, Enum-Werte `verwalter`/`veranstalter`),
      aber die von der AC/ADR geforderte **Verifikation** muss vor dem Merge nachgeholt werden
      (`pnpm db:up`).

## Wichtige Findings (sollten behoben werden)

- [ ] **[Branch/Label] `docs/…`-Branch + Label `documentation` passen nicht mehr.** #120 enthält
      jetzt Produktionscode + pgEnum-Migration. Branch-Konvention (`git-workflow.md`) und Label
      erwarten `enhancement`. Vor dem Merge mit dem Menschen klären/anpassen (in Task-Datei und
      Task-Beschreibung bereits vermerkt) – sonst verzerrt es Klassifizierung/Metriken.

## Nitpicks (optional)

- [ ] **[docs/adr/024-…lifecycle.md:196-198]** Der Konsequenzen-Abschnitt verortet die
      Rollen-Guards in `_fuehren/actions.ts`. Diesen Ordner gibt es weder heute noch im Zielbild
      (die Guards liegen in `app/veranstaltung/actions.ts`). Kleine, forward-referenzierende
      Ungenauigkeit im ADR-Text – Pfad korrigieren.
- [ ] **[db/migrations/meta/_journal.json]** Datei verliert den abschließenden Newline
      (`\ No newline at end of file`). Rein kosmetisch; ggf. angleichen.

## Positives

- **Enum-Migration lehrbuchhaft:** `ALTER TYPE "user_role" RENAME VALUE 'abrechner' TO
  'veranstalter'` ist der korrekte, verlustfreie In-Place-Weg – bewusst **nicht** das
  #48-drop-and-recreate, mit klarer Begründung im SQL-Kommentar. Snapshot-Kette lückenlos
  konsistent (prevId/Enum-Werte).
- **Rename vollständig:** Repo-weiter Grep nach `abrechner` = 0 in lebendem Code; verbliebene
  Treffer sind ausschließlich legitim (historische Migrationen 0002–0006, die Rename-Migration
  selbst, ein erklärender Schema-Kommentar). Das im ADR geforderte Gegenmittel greift.
- **Doku-Sync vorbildlich (Codify W-02/W-03):** kanonische Quelle zuerst (spec-48 Titel + Rollen +
  Rechte-Tabelle + AC), ADR-016 als Amendment mit Rückverweis, PROJECT-CONTEXT (Rollen-Zeile +
  „Offene Frage" als erledigt), Phasen-Specs 52–55 alle mit Zielbild-Verweis auf ADR-024. Keine
  widersprüchlichen Alt-Formulierungen stehen geblieben.
- **Tests konsequent mitgezogen:** Rollen-Literale und Test-Namen in allen betroffenen Suites
  (`veranstaltung`, `katalog`, `teilnehmer`, `authz`) angepasst; Guard-Branch-Tests
  (`should_reject…when_userLacks…Role`) erhalten – Codify-Regel zu Guard-Tests respektiert.
- **ADR-024 deckt alle AC ab:** Optionen A/B, R0/R1 abgewogen, verworfene begründet; F7-Zugang +
  `proxy.ts`-Konsequenz (Default-Schutz, `theke/`-Ausnahme, fail-closed #63) explizit; YAGNI-
  Scope-Grenze (D2–D4 nur Vorzeichnung, keine Stubs) klar gezogen.

## Empfehlung

NEEDS_REWORK

**Begründung:** Die inhaltliche Arbeit (Rollen-Rename, Migration, Doku-Sync, ADR) ist von hoher
Qualität und in sich stimmig. Der Branch ist aber **im aktuellen Zustand nicht mergebar**: ohne
den Verzeichnis-Move (Kritisch #1) navigiert das Feature ins Leere (404) und invalidiert den
Cache falsch. Das „Rework" ist hier **kein Agenten-Iterationsschritt**, sondern die zwei in der
Task-Datei dokumentierten, berechtigungs-gegateten Blocker durch den Menschen:
1. `git mv app/abrechnung/veranstaltung app/veranstaltung` (+ Gates `pre-push.sh`, `pnpm lint`
   erneut),
2. Migration lokal gegen Wegwerf-DB verifizieren (`pnpm db:up`, 0000→0007 grün),
3. Branch/Label auf `enhancement` anpassen.

Danach (Grep `abrechner` = 0 bleibt, Move erfolgt, Migration grün) ist der Stand aus Review-Sicht
APPROVED-reif. Kein erneutes `/implement` nötig – die offenen Punkte sind manuell/organisatorisch.
