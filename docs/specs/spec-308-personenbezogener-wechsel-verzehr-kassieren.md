# Spec: Direkter personenbezogener Wechsel zwischen Verzehrerfassung und Kassieren

> Issue: [#308](https://github.com/nothra/tch-gastro-services/issues/308) ·
> Betroffene Wege: F5 (`/veranstaltung/[id]/verzehr`) und F8 (`/veranstaltung/[id]/kassieren`)

## Kontext

Während einer laufenden Veranstaltung wechselt der Veranstalter für **dieselbe Person**
ständig zwischen Verzehrerfassung und Kassieren. Heute führt der einzige Weg über
`← Zur Veranstaltung` und von dort in die andere Unterroute – dabei geht der **Personenbezug**
verloren: auf der Zielseite muss die Person erneut gesucht, aufgeklappt bzw. angescrollt werden.
Bei einer Montagsrunde mit vielen Teilnehmern ist das der häufigste Handgriff am Abend und
entsprechend fehleranfällig (falsche Person kassiert oder erfasst).

Ziel ist ein **direkter, personenbezogener Wechsel** in beide Richtungen: von der Person, für die
gerade Verzehr erfasst wird, sofort in die Kassieransicht **dieser** Person – und von dort genauso
direkt zurück in die Verzehrerfassung derselben Person.

Erfolgsmaß: der Wechsel für eine Person kostet in jeder Richtung **einen** Handgriff (eine
Aktion), nicht drei (zurück → Unterroute → Person suchen).

## Scope

**Inbegriffen:**

- Aktion „Kassieren" in der **geöffneten (fokussierten)** Teilnehmer-Karte der Verzehrerfassung,
  die in die Kassieransicht dieser Person führt.
- Rückweg „Verzehr erfassen" in **jeder** Kassierzeile, der in die Verzehrerfassung dieser Person
  führt.
- Auf der Kassierseite: die Zielzeile wird **angescrollt**, **visuell hervorgehoben** und ihr
  **`Erhalten`-Eingabefeld erhält den Tastaturfokus** (sofern vorhanden, siehe F2).
- Auf der Verzehrseite: die Karte der Zielperson ist **initial geöffnet** und **im Sichtbereich**.
- Der Personenbezug ist Teil des Aufrufs und übersteht ein Neuladen der Zielseite.
- Beide Wechsel-Aktionen sind ausschließlich im `veranstalter`-Weg sichtbar.
- Verhalten unverändert bei **abgeschlossener** Veranstaltung (reine Lesesicht): die Wechsel-Links
  bleiben sichtbar, weil sie reine Navigation sind.

**Nicht inbegriffen:**

- Der öffentliche Selbstbedienungs-Weg `/theke/[token]` bekommt **keine** Wechsel-Aktion – dort
  gibt es weder Kassieren noch eine angemeldete Rolle.
- Kein neues Kassier- oder Erfassungsverhalten: keine Änderung an Summen, Zeilenstatus,
  Auslagen, Protokoll oder Abschluss-Gate.
- Kein geräteübergreifendes oder sitzungsübergreifendes Merken der zuletzt fokussierten Person.
- Keine Änderung der Reihenfolge der Kassierzeilen: der Reihenfolge-Freeze je Sitzung (#253) und
  die Sortierung „offene Vorgänge zuerst" (#223) bleiben unangetastet – der Wechsel **findet** die
  Zeile, er **verschiebt** sie nicht.
- Keine neue Auth-Mechanik: beide Seiten sind bereits `veranstalter`-gegated (`hasRole` in der
  `page.tsx`, `requireRole` in den Server Actions).
- Keine neuen Routen und keine Änderung an Pfad oder Zugriff bestehender Routen → `docs/routes.md`
  braucht in diesem Vorgang **keine** Änderung.

## Akzeptanzkriterien

- [ ] **AK1 – Hinweg (Verzehr → Kassieren):** GIVEN eine offene Veranstaltung mit mehreren
      Teilnehmern und die Karte von Person P ist in der Verzehrerfassung geöffnet
      WHEN der Veranstalter in dieser Karte die Aktion „Kassieren" auslöst
      THEN wird die Kassieransicht derselben Veranstaltung angezeigt, und zwar mit der Zeile von P
      als Ziel des Aufrufs (Personenbezug im Aufruf enthalten).

- [ ] **AK2 – Zielzeile sichtbar und hervorgehoben:** GIVEN die Kassieransicht wurde mit dem
      Personenbezug auf P aufgerufen
      WHEN die Seite gerendert ist
      THEN ist die Zeile von P visuell hervorgehoben (von den übrigen Zeilen unterscheidbar) und
      wird in den Sichtbereich geholt, ohne dass der sticky Seitenkopf sie verdeckt.

- [ ] **AK3 – Eingabefokus auf `Erhalten`:** GIVEN die Kassieransicht wurde mit dem Personenbezug
      auf P aufgerufen und die Veranstaltung ist offen
      WHEN die Seite gerendert ist
      THEN hat das `Erhalten`-Eingabefeld der Zeile von P den Tastaturfokus, sodass der Betrag ohne
      weiteren Tap eingegeben werden kann.

- [ ] **AK4 – Reihenfolge unberührt:** GIVEN die Kassieransicht wurde mit dem Personenbezug auf P
      aufgerufen, wobei P nicht die erste Zeile ist
      WHEN die Seite gerendert ist
      THEN steht P an derselben Listenposition wie beim Aufruf ohne Personenbezug – die Sortierung
      „offene zuerst" (#223) und der Positions-Freeze je Sitzung (#253) bleiben unverändert.

- [ ] **AK5 – Rückweg (Kassieren → Verzehr):** GIVEN die Kassieransicht einer Veranstaltung mit
      mehreren Teilnehmern
      WHEN der Veranstalter in der Zeile von Person P die Aktion „Verzehr erfassen" auslöst
      THEN wird die Verzehrerfassung derselben Veranstaltung angezeigt, und zwar mit dem
      Personenbezug auf P im Aufruf.

- [ ] **AK6 – Karte initial geöffnet und im Sichtbereich:** GIVEN die Verzehrerfassung wurde mit dem
      Personenbezug auf P aufgerufen
      WHEN die Seite gerendert ist
      THEN ist genau die Karte von P geöffnet (alle anderen eingeklappt) und sie wird in den
      Sichtbereich geholt, ohne dass die sticky Chip-Leiste den Kartenkopf verdeckt.

- [ ] **AK7 – Aktions-Ort in der Verzehrerfassung:** GIVEN die Verzehrerfassung mit mehreren
      Teilnehmern
      WHEN keine Karte geöffnet ist bzw. die Karte von P eingeklappt ist
      THEN ist für P **keine** „Kassieren"-Aktion sichtbar; sie erscheint erst in der geöffneten
      Karte.

- [ ] **AK8 – Beliebig oft in beide Richtungen:** GIVEN eine offene Veranstaltung
      WHEN der Veranstalter für dieselbe Person mehrfach hintereinander zwischen Verzehrerfassung
      und Kassieren wechselt
      THEN gelingt jeder Wechsel personenbezogen (AK2/AK3 bzw. AK6) und ohne Umweg über die
      Veranstaltungs-Detailseite.

- [ ] **AK9 – Nur `veranstalter`, nicht im öffentlichen Weg:** GIVEN der öffentliche
      Selbstbedienungs-Weg `/theke/[token]`
      WHEN dort die Verzehrerfassung (dieselbe route-neutrale Fokus-Liste) angezeigt wird
      THEN ist in keiner Karte eine „Kassieren"-Aktion vorhanden – auch nicht in der geöffneten.

- [ ] **AK10 – Abgeschlossene Veranstaltung (Lesesicht):** GIVEN eine abgeschlossene Veranstaltung
      WHEN der Veranstalter Verzehrerfassung bzw. Kassieransicht öffnet
      THEN sind beide Wechsel-Aktionen weiterhin vorhanden und führen personenbezogen zur anderen
      Ansicht; Schreibrechte, Zeilenstatus und Abschluss-Gate bleiben unverändert (Lesesicht bleibt
      Lesesicht).

- [ ] **AK11 – Personenbezug übersteht Neuladen:** GIVEN eine Zielseite wurde mit dem Personenbezug
      auf P aufgerufen
      WHEN die Seite neu geladen wird
      THEN gilt der Personenbezug weiterhin (Zeile hervorgehoben bzw. Karte geöffnet) – er hängt
      nicht an flüchtigem Komponentenzustand.

- [ ] **AK12 – Keine Änderung an Summen und Status:** GIVEN eine Veranstaltung mit erfasstem Verzehr
      und teils kassierten Zeilen
      WHEN ausschließlich personenbezogen zwischen den beiden Ansichten gewechselt wird (ohne
      Eingabe)
      THEN sind Verzehr-Gesamt, Erhalten, Spende, Zeilenstatus, Tagessummen und Gesamtabrechnung
      unverändert.

## Fehlerszenarien

- [ ] **F1 – Unbekannter Personenbezug (fail-soft):** GIVEN ein Aufruf einer der beiden Seiten mit
      einem Personenbezug, der in dieser Veranstaltung nicht existiert (getilgte Zeile, Zeile einer
      **anderen** Veranstaltung, Zufallswert)
      WHEN die Seite gerendert wird
      THEN lädt die Seite normal in ihrem Standardzustand (Kassieren: keine Zeile hervorgehoben,
      kein Fokus; Verzehr: keine Karte geöffnet), ohne Fehlermeldung, ohne 404 und ohne Aussage
      darüber, ob der Bezug woanders existiert.

- [ ] **F2 – Kein `Erhalten`-Feld vorhanden:** GIVEN eine **abgeschlossene** Veranstaltung (die
      Kassierzeilen zeigen `Erhalten` nur lesend)
      WHEN die Kassieransicht mit Personenbezug auf P aufgerufen wird
      THEN gelten Hervorhebung und Anscrollen (AK2) unverändert, und es wird **kein** Eingabefokus
      gesetzt – ohne Laufzeitfehler.

- [ ] **F3 – Veranstaltung ohne Teilnehmer:** GIVEN eine Veranstaltung ohne Teilnehmerzeilen
      WHEN eine der beiden Seiten mit Personenbezug aufgerufen wird
      THEN bleibt der jeweilige Leer-Hinweis der Seite unverändert sichtbar, ohne Fehler.

- [ ] **F4 – Fremde Rolle:** GIVEN ein angemeldeter Nutzer **ohne** Rolle `veranstalter`
      WHEN er eine der beiden Seiten (mit oder ohne Personenbezug) aufruft
      THEN bleibt es beim bestehenden „Kein Zugriff"-Verhalten der Seite – der Personenbezug
      verschafft keinen Zugang und keine Information.

## Offene Fragen

- Keine offenen fachlichen Fragen.
- **Bewusst hier entschieden, damit `/implement` es nicht selbst wählt:** Die Hervorhebung der
  Zielzeile (AK2) hat **keinen** Timer – sie bleibt sichtbar, solange die Seite mit diesem Aufruf
  angezeigt wird. Begründung: ein Verblassen nach n Sekunden wäre nur zeitabhängig testbar
  (Flaky-Risiko, `testing-standards.md` → „Flaky Tests: Zero Tolerance") und bringt fachlich
  nichts.
- Die **technische** Umsetzung (Trägermechanik des Personenbezugs, z. B. Query-Parameter; wo der
  Link in der route-neutralen Fokus-Liste hineingereicht wird) ist bewusst offen und gehört in
  `/architecture` bzw. `/implement`. Bindend aus dieser Spec ist nur: der Personenbezug übersteht
  ein Neuladen (AK11) und die route-neutrale Komponente erhält **keinen** Feature-/Routen-Import
  (ADR-039 D1, Codify-Lesson aus #52) – der öffentliche Weg darf die Aktion nicht bekommen (AK9).
