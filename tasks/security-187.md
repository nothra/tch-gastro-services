# Security Review: Task 187

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [ ] [AuthZ/Defense-in-Depth · positiv verifiziert] Der `editable`-Flag der `FokusListe`/`ZeileKarte`
  ist rein UI-seitig; die verbindliche Autorisierung liegt unverändert serverseitig in
  `adjustVerzehrAction` (`app/veranstaltung/actions.ts:290` `requireRole("veranstalter")`,
  Status-Gate `applyVerzehrAdjust:260` `if (ziel.status !== "offen")`, IDOR-Bindung
  `getZeile(zeileId, ziel.id):263`). `actions.ts` ist nicht Teil des Diffs. Ein aufgeweichter
  Client-Zustand (read-only manuell auf editable gezwungen) könnte daher weiterhin nichts
  schreiben. Kein Handlungsbedarf – als Beleg dokumentiert.

## Ergebnis
PASSED

---

## Prüfnotizen (Begründung des Ergebnisses)

Der Diff (`git diff main...HEAD`) ist – wie die Task es behauptet – tatsächlich rein
präsentationsseitig. Verifiziert:

- **Keine Action-/DB-/Summen-Änderung:** `app/veranstaltung/actions.ts`, `verzehr-props.ts`,
  `erfasser-ziel-storage.ts`, `db/**` sind nicht im Diff (`--name-only` geprüft). Der komplette
  serverseitige Schutzwall (Rollen-Guard, Status-Gate, IDOR-Bindung, Soft-Delete-Prüfung) bleibt
  unangetastet.
- **AuthZ/IDOR unverändert:** Die `veranstaltungId` wird auf F5 weiterhin serverseitig gebunden
  (`adjustVerzehrAction.bind(null, id)` in `page.tsx:45`), der Client liefert sie nicht. F7 leitet
  sie weiterhin aus dem Token ab. Beides route-gebunden, kein clientseitiges Vertrauen.
- **Schreib-Gate nicht aufgeweicht (Lesson #54 umgekehrt geprüft):** F5 rendert
  `editable={offen}` – identisch zur früheren `VerzehrErfassung`-Verdrahtung. Abgeschlossene
  Veranstaltung → `offen=false` → `editable=false`. Zusätzlich schützt das Status-Gate
  serverseitig (`applyVerzehrAdjust:260`). Read-only kann nicht editieren, weder in der UI noch
  am Server.
- **Callback-Entkopplung ohne Persistenz-Leck:** `onFokusWechsel` wird in `IdentityGate` NUR im
  editierbaren Zweig gesetzt (`writeZielId(token, id)`, Zeile 168); der read-only-Zweig (Zeile
  92 ff.) übergibt keinen Callback. F5 (`page.tsx`) übergibt bewusst keinen Callback. Die
  geräte-lokale Token-/Ziel-Merkung bleibt damit strikt F7-only und schreibt nie im read-only-
  oder Veranstalter-Weg. Kein Token landet an neuer Stelle (F5 importiert weder `token` noch
  `erfasser-ziel-storage`).
- **XSS/Output-Encoding:** Teilnehmer-/Artikelnamen (`zeile.anzeigename`) werden ausschließlich
  als React-Kinder gerendert (Chip-Button, Kartenkopf) – standardmäßig escaped. Kein
  `dangerouslySetInnerHTML`/`innerHTML`/`eval` in den geänderten Dateien.
- **Keine neue Dependency:** `package.json`/`pnpm-lock.yaml` nicht im Diff.
- **Information Disclosure:** Keine neuen Fehlerpfade/Meldungen mit sensiblen Daten; der
  Empty-State-Text ist eine neutrale UI-Meldung (als Konstante zentralisiert, kein Verhalten).
