# Spec: Wechsel-Link (#308) direkt unter den Teilnehmernamen positionieren

> Issue: [#318](https://github.com/nothra/tch-gastro-services/issues/318) ·
> Betroffener Weg: F5 (`/veranstaltung/[id]/verzehr`)
> Baut auf: [spec-308](spec-308-personenbezogener-wechsel-verzehr-kassieren.md)

## Kontext

Mit #308 (PR #309) wurden die personenbezogenen Wechsel-Links zwischen Verzehrerfassung und
Kassieren eingeführt. In der Verzehr-Karte steht `Kassieren →` heute **am Fuß** der Karte –
letztes Element des Körpers (`ZeileKarte` in `app/_verzehr/VerzehrErfassung.tsx`, Prop `aktion`,
gerendert über `{koerperSichtbar && aktion}`). Bei vielen Positionen bzw. langer
Verzehr-Aufschlüsselung liegt der Link damit weit unten – man muss erst scrollen, um zur gemeinten
Person zu wechseln, obwohl der Wechsel eine **Kopf-Aktion** der Karte ist (er gehört zur Person,
nicht zum Betragsblock).

Issue #318 hatte ursprünglich auch die Kassier-Karte (`← Verzehr erfassen`) einbezogen. Der
Entwickler hat diesen Teil im Requirements-Gespräch **explizit gestrichen**: die Position dort
bleibt wie sie ist, keine Änderung an `app/veranstaltung/[id]/kassieren/page.tsx` bzw.
`KassierZeilenListe`. Ziel dieser Spec ist damit **ausschließlich die Position** des einen
bestehenden Links `Kassieren →` in der Verzehr-Karte. Zielsemantik, Sichtbarkeitsregeln,
Pfeilrichtung und Text aus #308 ändern sich nicht.

## Scope

**Inbegriffen:**

- Verschieben von `Kassieren →` in der Verzehr-Karte: von „letztes Element des Körpers" nach
  „unmittelbar unter dem Kartenkopf (Anzeigename + Summenzeile), oberhalb der ersten
  Artikel-Kategorie-Sektion".
- Anpassung der zugehörigen Tests (#308) auf die neue Position, inkl. expliziter
  Reihenfolge-Assertion (Name/Kopf → Link → Körper), nicht nur Anwesenheits-Prüfung.

**Nicht inbegriffen:**

- **Die Kassier-Karte (`← Verzehr erfassen`) bleibt unverändert** – bewusste Entscheidung des
  Entwicklers, entgegen dem ursprünglichen Issue-Text. Kein Eingriff in
  `app/veranstaltung/[id]/kassieren/page.tsx` oder `KassierZeilenListe`, keine Test-Anpassung dort.
- Pfeilrichtung oder Link-Text (`Kassieren →` bleibt rechts/Hinweg) – ausdrücklich unverändert.
- Zielsemantik des Links (`kassierenHref`, Personenbezug via `personenbezogeneZeileId`) –
  unverändert, siehe spec-308.
- Sichtbarkeitsregeln aus spec-308 (AK7 Körper-sichtbar-Gate, AK9 kein Link im
  Selbstbedienungsweg F7, AK10 Link bleibt in der Lesesicht sichtbar) – bleiben exakt erhalten,
  nur an neuer Position.
- Hervorhebung/`scrollIntoView`/Eingabefokus der Zielzeile (spec-308 AK2/AK3) – unverändert.
- Fokus-/Freeze-Logik von `FokusListe` (Reihenfolge-Freeze #253, Sortierung „offene zuerst" #223)
  – unangetastet.
- Neue Wechsel-Wege oder ein Wechsel-Link im Selbstbedienungsweg (F7).
- Keine neuen Routen, keine Änderung an Pfad/Zugriff bestehender Routen → `docs/routes.md`
  braucht in diesem Vorgang keine Änderung.

## Akzeptanzkriterien

- [ ] **AK1 – Position in der Verzehr-Karte:** GIVEN die Verzehrerfassung (F5) mit mehreren
      Teilnehmern und die Karte von Person P ist geöffnet (fokussiert)
      WHEN die Karte gerendert wird
      THEN erscheint `Kassieren →` unmittelbar unterhalb des Kartenkopfs (Anzeigename +
      Summenzeile Getränke/Essen/Kaffee/Gesamt) und oberhalb der ersten sichtbaren
      Erfassungs-Sektion (erste Artikel-Kategorie bzw. „Nicht mehr im Katalog", falls die Karte
      keine aktiven Kategorien hat).

- [ ] **AK2 – Sichtbarkeitsregeln unverändert:** GIVEN dieselben Bedingungen wie spec-308
      AK7/AK9/AK10
      WHEN die Karte eingeklappt ist, der Aufruf über den Selbstbedienungsweg F7 erfolgt, bzw. die
      Veranstaltung abgeschlossen ist
      THEN gilt unverändert: kein Link bei eingeklappter Karte (AK7), kein Link im
      Selbstbedienungsweg (AK9), Link bleibt in der Lesesicht sichtbar (AK10) – jeweils an der
      neuen Kopf-Position statt der alten Fuß-Position.

- [ ] **AK3 – Zielsemantik unverändert:** GIVEN der Link an neuer Position
      WHEN sein `href` bzw. sein Auslöseverhalten geprüft wird
      THEN ist es identisch zum bisherigen Verhalten (`kassierenHref(id, zeileId)`), inklusive
      Hervorhebung/`scrollIntoView`/Eingabefokus der Zielzeile auf der Kassier-Seite (spec-308
      AK2/AK3) – nur die Position innerhalb der Verzehr-Karte hat sich geändert.

- [ ] **AK4 – Route-Neutralität erhalten:** GIVEN `app/_verzehr/VerzehrErfassung.tsx`
      (`ZeileKarte`)
      WHEN die neue Position des `aktion`-Slots umgesetzt wird
      THEN bleibt die Komponente route-neutral (ADR-039 D1): kein Feature-/Routen-Import, keine
      „Kassieren"-spezifische Benennung der Prop – der Konsument liefert weiterhin den fertigen
      Baustein.

- [ ] **AK5 – Tests auf neue Position umgestellt:** GIVEN die bestehenden #308-Tests zum Link
      (`VerzehrErfassung.test.tsx`/`FokusListe.test.tsx`/`verzehr/page.test.tsx`)
      WHEN sie auf die Kopf-Position umgestellt werden
      THEN prüfen sie explizit die Reihenfolge (Name/Kopf-Block → Link → nachfolgender
      Erfassungskörper) über die DOM-Reihenfolge der Elemente, nicht nur die Anwesenheit des Links
      (Lesson `testing.md`: Reihenfolge-/Präsenz-Guards). Tests der Kassier-Karte
      (`KassierZeilenListe.test.tsx`/`kassieren/page.test.tsx`) bleiben unverändert – dort ändert
      sich nichts.

## Fehlerszenarien

- [ ] **F1 – Keine neuen Fehlerszenarien:** Diese Änderung verschiebt ausschließlich die Position
      eines bestehenden, rein navigatorischen Links in der Verzehr-Karte. Die Fehlerszenarien
      F1–F4 aus spec-308 (unbekannter Personenbezug, fehlendes `Erhalten`-Feld bei abgeschlossener
      Veranstaltung, Veranstaltung ohne Teilnehmer, fremde Rolle) bleiben inhaltlich unverändert
      und sind durch diese Positionsänderung nicht erneut zu verifizieren – lediglich die
      bestehenden Tests dazu dürfen durch die Positionsänderung nicht brechen.

## Offene Fragen

- Keine offenen fachlichen Fragen.
- **Bewusst hier entschieden, damit `/implement` es nicht selbst wählt:** Die Verzehr-Karte hat
  laut Code-Kommentar einen Kopf, der bereits **Name UND Summenzeile** vereint
  (`ZeileKarte`: „Kopf = Name + Summen, Körper = Erfassung"). Issue #318 verlangt für die
  Verzehr-Karte nur „oberhalb der Artikel-/Positions-Eingabe" (nicht „oberhalb der Summenzeile")
  – die Summenzeile bleibt daher Teil des Kopfs, der Link rückt zwischen den kompletten Kopf und
  den Erfassungskörper (Artikel-Kategorien), **nicht** zwischen Name und Summenzeile. Das
  vermeidet eine Aufspaltung des bestehenden Kopf-`div` und deckt sich mit dem engeren Wortlaut
  des AK1 des Issues.
- Die **technische** Umsetzung (ob der `aktion`-Slot in `ZeileKarte` weiterhin ein einzelner Slot
  bleibt, der jetzt an anderer Stelle gerendert wird, oder ob eine zusätzliche Slot-Prop nötig
  wird) ist bewusst offen und gehört in `/implement`. Bindend ist nur: die Komponente bleibt
  route-neutral (AK4) und der Slot trägt keinen Kassieren-spezifischen Namen.
