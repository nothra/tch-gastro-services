# Spec: Kassieren – Position der Zeile bis zum nächsten Seitenaufruf stabil halten

## Kontext

Auf der Kassierseite (`/veranstaltung/[id]/kassieren`) sind offene Teilnehmerzeilen oberhalb
bereits bezahlter Zeilen einsortiert (abgeleiteter Status `bezahlt`, seit
[spec-223](spec-223-kassieren-gesamtsumme-sortierung.md)). Der Server-Action-Aufruf
`kassiereZeileAction` (`app/veranstaltung/actions.ts`) ruft nach dem Speichern
`revalidatePath(kassierenPath(veranstaltungId))` auf; die Server-Komponente
`app/veranstaltung/[id]/kassieren/page.tsx` rendert daraufhin sofort neu und sortiert die
gerade kassierte Zeile in die untere ("bezahlt") Gruppe ein.

Für den Thekenwart ist dieser sofortige Sprung intransparent: Die gerade kassierte Zeile
verschwindet aus dem Bereich, in dem er typischerweise weiterarbeitet. Ziel ist, dass die
Zeile innerhalb der aktuellen Seiten-Session an ihrer bisherigen Position stehen bleibt; die
tatsächliche Neueinsortierung passiert erst beim nächsten Aufruf/Reload der Seite.

Quelle: Issue #253. Verwandt: [spec-223](spec-223-kassieren-gesamtsumme-sortierung.md)
(Sortierlogik `!kassier.bezahlt`), `app/veranstaltung/[id]/kassieren/page.tsx`,
`app/veranstaltung/KassiereZeileForm.tsx`.

**Klärung aus Requirements-Gespräch:**
- Das Kassieren-Formular einer bereits kassierten, aber noch oben stehenden Zeile bleibt
  **editierbar** (Korrektur des Erhalten-Betrags weiterhin möglich) – keine zusätzliche
  Umschaltung auf eine reine Anzeige. Es ändert sich nur die Sortierung, nicht die Form.
- Die Reihenfolge wird beim ersten Rendern der Seite eingefroren und gilt für die gesamte
  Seiten-Session; jede Neuladung ohne Remount (Kassieren **und** Abschluss/Wiederöffnen über
  den `StatusToggle`) behält sie bei. Das Sortierverhalten des `StatusToggle` selbst wird
  dadurch **nicht** zusätzlich verändert – deren aktuelles Sortierverhalten bleibt unverändert
  (dort ändert sich `kassier.bezahlt` durch diese Aktion ohnehin nicht), er ist **nicht** Teil
  dieser Task.

## Scope

**Inbegriffen:**
- Nach Klick auf "Kassieren" für eine Zeile bleibt diese Zeile innerhalb der aktuellen
  Seiten-Session (ohne Reload/erneuten Aufruf) an ihrer bisherigen Position im "offenen"
  Bereich der Teilnehmerliste, auch wenn ihr abgeleiteter Status auf `bezahlt` wechselt.
- Der Bezahlt-Status wird weiterhin sofort optisch sichtbar (bestehendes Badge
  "bezahlt"/"offen" wechselt unmittelbar mit der Server-Antwort – das ändert sich nicht).
- Erst bei einem neuen Aufruf der Kassierseite (Reload, erneute Navigation dorthin) wird die
  Liste gemäß der bestehenden Sortierung (offen → oben, bezahlt → unten) neu einsortiert.
- Gilt für **jede** in der aktuellen Sitzung kassierte Zeile: Werden mehrere Zeilen
  nacheinander kassiert, bleibt jede an ihrer ursprünglichen Position stehen.
- Erneutes Kassieren/Korrigieren einer bereits (in dieser Sitzung) kassierten Zeile ändert
  ihre eingefrorene Position nicht erneut (sie ist bereits eingefroren).

**Nicht inbegriffen:**
- Keine Änderung der Sortierlogik selbst (`!kassier.bezahlt`, stabil, alphabetisch je Gruppe
  – spec-223 bleibt unverändert für den Zustand nach einem Seitenaufruf).
- Keine Änderung an `kassierSummen.ts` (Berechnung von `bezahlt`, Spende, Tagessummen bleibt
  unverändert).
- Keine Änderung am Formular-Verhalten (`KassiereZeileForm` bleibt editierbar, auch für
  bereits kassierte, aber noch oben stehende Zeilen – keine Umschaltung auf reine Anzeige).
- Keine Änderung am Sortierverhalten selbst bei anderen seitenweiten Neuladungen (z. B.
  Abschluss/Wiederöffnen via `StatusToggle`) – die Reihenfolge ist ab dem ersten Rendern der
  Seite eingefroren, unabhängig davon, welche Aktion die Neuladung auslöst.
- Keine Änderung an der Verzehr-Aufschlüsselung (`VerzehrAufschluesselung`), den
  Tagessummen oder der Gesamtabrechnung.

## Akzeptanzkriterien

- [ ] GIVEN eine offene Veranstaltung mit mehreren offenen Teilnehmerzeilen WHEN der Nutzer
  für eine Zeile in der Mitte der offenen Gruppe auf "Kassieren" klickt THEN bleibt diese
  Zeile unmittelbar danach an derselben Position innerhalb der Liste (kein Sprung nach unten).
- [ ] GIVEN dieselbe gerade kassierte Zeile WHEN die Server-Antwort eintrifft THEN wechselt
  ihr Badge unmittelbar auf "bezahlt" (Status-Anzeige aktualisiert sich sofort, unabhängig von
  der eingefrorenen Position).
- [ ] GIVEN eine gerade kassierte Zeile, die an ihrer bisherigen Position stehen bleibt WHEN
  der Nutzer die Seite neu lädt (bzw. erneut aufruft) THEN erscheint die Liste gemäß
  bestehender Sortierung neu einsortiert (offene Zeilen oben, bezahlte unten, je Gruppe
  alphabetisch).
- [ ] GIVEN mehrere Zeilen werden nacheinander in derselben Sitzung kassiert WHEN jede
  einzelne kassiert wird THEN bleibt jede an ihrer ursprünglichen Position stehen (kein
  kumulatives Nachrutschen der noch offenen Zeilen).
- [ ] GIVEN eine in dieser Sitzung bereits kassierte, aber noch oben stehende Zeile WHEN der
  Nutzer den Erhalten-Betrag erneut über dasselbe Formular korrigiert THEN bleibt das
  Formular weiterhin editierbar und die Position ändert sich nicht erneut.
- [ ] GIVEN dieselbe Seite WHEN eine Zeile abgeschlossen/wiedereröffnet wird (StatusToggle,
  außerhalb des Kassierens) THEN bleibt der Freeze erhalten und das Sortierverhalten des
  `StatusToggle` selbst wird dadurch nicht zusätzlich verändert (nicht Teil dieser Task).

## Fehlerszenarien

- [ ] GIVEN das Kassieren einer Zeile schlägt fehl (z. B. Validierungsfehler, Veranstaltung
  inzwischen abgeschlossen) WHEN die Server-Action eine Fehlermeldung zurückgibt THEN bleibt
  die Zeile unverändert an ihrer aktuellen Position (keine Positionsänderung ohne
  tatsächliche Statusänderung).
- [ ] GIVEN eine frisch geladene Kassierseite (erster Aufruf, keine Zeile in dieser Sitzung
  kassiert) WHEN sie gerendert wird THEN entspricht die Sortierung weiterhin unverändert dem
  bestehenden Verhalten aus spec-223 (keine Regression für den unveränderten Fall).

## Technische Notizen

- **Ursache:** `revalidatePath(kassierenPath(veranstaltungId))` in `kassiereZeileAction`
  (`app/veranstaltung/actions.ts:238`) lässt die Server-Komponente
  `app/veranstaltung/[id]/kassieren/page.tsx` neu rendern; die dortige stabile Sortierung
  (Z. 69–75, `.sort((a, b) => Number(a.kassier.bezahlt) - Number(b.kassier.bezahlt))`) läuft
  bei jedem Rendern neu über die aktuellen Daten – dadurch der sofortige Sprung.
- **Möglicher Ansatz (für `/implement`):** Die Positions-Reihenfolge (Reihenfolge der
  `zeile.id`s) beim ersten Rendern der Seite in einer Client-Komponente einmalig festhalten
  (z. B. `useState`-Initializer aus den Server-Props) und bei jedem weiteren Rendern
  (ausgelöst durch `revalidatePath`) die vom Server gelieferten, aktuellen
  Kassier-/Positions-Daten je `zeile.id` in diese eingefrorene Reihenfolge einsetzen, statt
  die vom Server neu sortierte Reihenfolge zu übernehmen. Neue, in der Sitzung neu erfasste
  Zeilen gibt es auf dieser Seite nicht (Teilnehmer werden hier nicht angelegt) – ein
  Sonderfall "neue Zeile taucht während der Sitzung auf" ist daher nicht relevant.
  Konkrete Umsetzung (State in einer neuen oder bestehenden Client-Komponente, Datenstruktur)
  ist Sache von `/implement`; kein ADR-Trigger (keine neue Technologie, kein architektonischer
  Bruch).
- Das Badge (`kassier.bezahlt` → "bezahlt"/"offen") und die Formularanzeige
  (`initialErhalten`) müssen weiterhin die **aktuellen** Server-Daten je Zeile widerspiegeln –
  eingefroren wird nur die **Reihenfolge**, nicht der angezeigte Inhalt.

## Offene Fragen

- [ ] Keine offen (siehe Klärungen oben aus dem Requirements-Gespräch).
