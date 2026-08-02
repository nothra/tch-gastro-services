# Security Review: Task 253

**Scope:** `git diff origin/main...HEAD` (9 Dateien, +996/−83).
Produktionscode im Diff: `app/veranstaltung/EingefroreneZeilenListe.tsx` (neu, 53 Zeilen) und
`app/veranstaltung/[id]/kassieren/page.tsx` (Umbau des Listen-Renderings). Alles Übrige sind
Tests (`*.test.tsx`, `actions.test.ts`), Specs und Task-/Review-Dateien.

**Threat Surface der Änderung:** rein clientseitige Darstellungs-Reihenfolge auf einer
rollen-geschützten Seite (`veranstalter`). Keine neue Route, kein neuer Data-Layer-Zugriff,
keine neue Server Action, keine Änderung an Auth-, Zod- oder DB-Code, keine neue Dependency.

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise

- [ ] **[Information Exposure]** `zeile.id` wird jetzt in **jedem** Fall als Prop
  (`EingefroreneZeile.id`) über die Server→Client-Grenze in die RSC-Payload serialisiert –
  bisher gelangte sie nur im `offen`-Zweig (als `zeileId` in `KassiereZeileForm`) zum Browser,
  im abgeschlossenen (schreibgeschützten) Zweig gar nicht. **Kein Handlungsbedarf:** Die ID ist
  ein internes DB-Identifier ohne Capability-Charakter; die Seite ist rollen-gegated
  (`hasRole(…, "veranstalter")`, `page.tsx:38`) und liegt unter dem `proxy.ts`-Schutzbereich.
  Der maßgebliche Schutz sitzt serverseitig in `kassiereZeileAction`
  (`actions.ts:221` `requireRole`, `:234` IDOR-Bindung `getZeile(zeileId, veranstaltungId)`) und
  ist von diesem PR unberührt. Kenntnis der ID verschafft einem Angreifer ohne
  `veranstalter`-Rolle nichts.
- [ ] **[Injection/XSS]** Kein Risiko: `inhalt` ist ein `ReactNode` aus server-gerendertem JSX,
  kein `dangerouslySetInnerHTML`, kein `innerHTML`, kein `eval` im gesamten Diff (verifiziert per
  Grep). Teilnehmernamen (`zeile.anzeigename`) werden weiterhin als React-Textkind gerendert und
  damit escaped.
- [ ] **[Prototype Pollution]** Die Umsortierung nutzt `Map`/`Set`
  (`EingefroreneZeilenListe.tsx:44-45`) statt eines Plain-Object-Lookups – ein Datensatz mit der
  ID `__proto__`/`constructor` kann den Lookup damit nicht vergiften. Bewusst richtige Wahl.
- [ ] **[Stale-Data / Fail-open]** Eingefroren wird ausschließlich die **Position**; jeder
  gerenderte Wert (Badge `bezahlt`/`offen`, Beträge, `initialErhalten`) kommt unverändert vom
  Server. Eine zwischenzeitlich gelöschte Zeile wird nicht „festgehalten", sondern übersprungen
  (`.filter((zeile) => zeile !== undefined)`), eine neue Zeile wird angehängt statt ausgeblendet.
  Es gibt also keinen Pfad, auf dem der Freeze einem Nutzer veraltete oder fremde
  Abrechnungsdaten anzeigt – die Anzeige kann nur in der *Reihenfolge*, nie im *Inhalt* abweichen.
- [ ] **[DoS/Komplexität]** `ordneNachEingefrorenerReihenfolge` ist O(n) über Map/Set, ohne
  Rekursion oder unbeschränkte Schleife. Die Zeilenzahl je Veranstaltung ist fachlich klein
  (Teilnehmer einer Montagsrunde). Kein Ressourcen-Risiko.
- [ ] **[Dependencies]** `package.json`, `pnpm-lock.yaml` und `pnpm-workspace.yaml` sind im Diff
  **unverändert** – keine neue oder aktualisierte Abhängigkeit, damit keine neue
  Supply-Chain-Angriffsfläche. Ein erneuter Advisory-Scan ist für diesen PR nicht einschlägig.
- [ ] **[Error Handling / Logging]** Der Diff führt weder `console.*`-Ausgaben noch neue
  Fehlermeldungen ein. Die in `actions.test.ts` ergänzten
  `expect(revalidatePathMock).not.toHaveBeenCalled()`-Assertions sind reine Testverschärfung –
  sie belegen zusätzlich, dass keiner der sechs Fehlerpfade von `kassiereZeileAction`
  (Rollen-Guard, fehlende `zeileId`, ungültiger Betrag, Veranstaltung nicht gefunden/nicht offen,
  Zeile nicht in Veranstaltung) einen Cache-Revalidate auslöst. Das härtet die Fail-closed-Kette
  gegen künftige Regressionen und ist ein Plus, kein Finding.

## Ergebnis

PASSED

Keine kritischen und keine wichtigen Findings – der Merge ist aus Security-Sicht nicht blockiert.
Kein Out-of-Scope-Finding, das ein eigenes Issue rechtfertigt (ADR-018): die Hinweise oben sind
Belege für geprüfte, unauffällige Punkte, kein Backlog-Bedarf.
