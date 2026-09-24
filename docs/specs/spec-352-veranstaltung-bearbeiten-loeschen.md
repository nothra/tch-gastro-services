# Spec: Veranstaltungsmeta-Daten bearbeiten und Veranstaltung löschen

> Issue [#352](https://github.com/nothra/tch-gastro-services/issues/352) · Epic
> [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md) · Erweiterung von
> [spec-51](spec-51-abend-anlegen.md)

## Kontext

Der Veranstalter kann eine Veranstaltung aktuell nur anlegen, führen und abrechnen –
Metadaten lassen sich nach dem Anlegen nicht mehr ändern (mit Ausnahme des Katalogs, #346),
und eine fälschlich angelegte Veranstaltung lässt sich nicht wieder entfernen.

## Scope

**Inbegriffen:**

- **Metadaten bearbeiten** einer **datierten** Veranstaltung (Typ `veranstaltung`) im Status
  `offen`: Bezeichnung, Kasse, Datum.
- **Löschen** einer datierten Veranstaltung (Typ `veranstaltung`) – nur wenn weder Verzehr
  noch Auslagenerstattung erfasst wurde (siehe Fehlerszenarien für die genaue
  Erfassungs-Definition).
- **Hard-Delete**: Die Veranstaltung wird endgültig aus der DB entfernt (kein Soft-Delete/
  Papierkorb), analog zum bestehenden Cascade-Verhalten von `veranstaltung_zeile`.
- **Bestätigungsdialog** vor dem Löschen (Sicherheitsnetz gegen Versehen, analog dem
  bestehenden Muster beim Entfernen eines Teilnehmers, spec-51).
- Serverseitige Durchsetzung aller Regeln (nicht nur UI-Ausblendung).

**Nicht inbegriffen:**

- **Stehende Theke** (Typ `theke`): weder bearbeitbar noch löschbar über dieses Feature – sie
  ist ein dauerhafter Sondervorgang je Kasse ohne Datum (spec-51) und nicht Teil dieses Issues.
- **Katalog-Wechsel** einer Veranstaltung – bereits über #346/spec-346 (`setVeranstaltungCatalog`)
  gelöst, hier nicht erneut angefasst.
- **Löschen einer Veranstaltung mit bereits erfasstem Verzehr/Auslage** – bewusst nicht
  möglich (kein Force-Delete, keine Kaskaden-Bereinigung von Fachdaten).
- **Bearbeiten/Löschen einer `abgeschlossenen` Veranstaltung** – bleibt schreibgeschützt; ein
  Wiederöffnen (spec-51/F8) ist Voraussetzung, bevor Metadaten geändert werden können.
- Teilnehmer-Zeilen (`veranstaltung_zeile`) ohne Verzehr sperren das Löschen **nicht** – das
  Löschen einer Veranstaltung mit bereits zugeordneten, aber noch "leeren" Teilnehmern ist
  erlaubt (Zeilen werden per Cascade mitgelöscht).

## Akzeptanzkriterien

- [ ] GIVEN eine Veranstaltung im Status `offen` WHEN der Veranstalter Bezeichnung, Kasse
      und/oder Datum ändert und speichert THEN werden die neuen Werte übernommen.
- [ ] GIVEN eine Veranstaltung im Status `offen` WHEN Bezeichnung leer oder Datum ungültig/leer
      ist THEN wird das Speichern serverseitig abgelehnt (dieselben Pflichtfeld-Regeln wie beim
      Anlegen, spec-51).
- [ ] GIVEN eine Veranstaltung im Status `abgeschlossen` WHEN ein Bearbeiten-Request (UI oder
      direkter Server-Aufruf) für Bezeichnung/Kasse/Datum eintrifft THEN wird er abgelehnt
      (serverseitig erzwungen, nicht nur UI-Ausblendung) – analog dem bestehenden Guard bei
      `setVeranstaltungCatalog`.
- [ ] GIVEN eine Veranstaltung ohne jede erfasste Verzehr-Position mit `menge > 0` und ohne
      jede `auslage`-Zeile WHEN der Veranstalter sie löscht THEN wird die Veranstaltung
      inklusive ihrer Zeilen endgültig entfernt (Hard-Delete, Cascade).
- [ ] GIVEN eine Veranstaltung, für die mindestens eine Verzehr-Position mit `menge > 0`
      existiert (unabhängig vom aktuellen Status `offen`/`abgeschlossen`) WHEN ein
      Lösch-Request eintrifft THEN wird er abgelehnt (serverseitig erzwungen).
- [ ] GIVEN eine Veranstaltung, für die mindestens eine `auslage`-Zeile existiert (unabhängig
      von deren Status `offen`/`erstattet`) WHEN ein Lösch-Request eintrifft THEN wird er
      abgelehnt (serverseitig erzwungen).
- [ ] GIVEN eine Veranstaltung mit Teilnehmer-Zeilen, aber ohne jede Verzehr-Position mit
      `menge > 0` und ohne `auslage` WHEN der Veranstalter sie löscht THEN ist das Löschen
      erlaubt (Zeilen ohne Fachdaten sperren nicht).
- [ ] GIVEN der Veranstalter klickt "Löschen" WHEN der Bestätigungsdialog erscheint THEN wird
      erst nach expliziter Bestätigung gelöscht (Abbrechen löscht nichts).
- [ ] GIVEN eine erfolgreich gelöschte Veranstaltung WHEN der Löschvorgang abgeschlossen ist
      THEN wird der Veranstalter zur Veranstaltungs-Übersicht weitergeleitet.
- [ ] GIVEN eine Veranstaltung vom Typ `theke` WHEN ein Bearbeiten- oder Lösch-Request dafür
      eintrifft (UI zeigt die Aktionen ohnehin nicht an) THEN wird er serverseitig abgelehnt.
- [ ] GIVEN eine andere Rolle als Veranstalter (z. B. `verwalter` ohne `veranstalter`-Rolle)
      WHEN sie Bearbeiten/Löschen versucht THEN wird das serverseitig abgelehnt (RBAC-Guard
      analog den übrigen Veranstaltungs-Actions).
- [ ] GIVEN eine Veranstaltung, für die mindestens eine Zeile mit gesetztem `erhaltenCents`
      existiert (bar kassiert, `null` = nicht kassiert) WHEN ein Lösch-Request eintrifft THEN
      wird er abgelehnt (serverseitig erzwungen) – auch dann, wenn weder Verzehr noch Auslage
      erfasst ist. Nachgetragen im Review zu #352: `kassiereZeile` verlangt keinen Verzehr, eine
      reine Spende ist ein erstklassiger Fall (`kassierSummen.ts`). Ohne diese Sperre fiele ein
      `Σ Erhalten`-Datensatz – die eine Hälfte der Kassenveränderung (PROJECT-CONTEXT) – beim
      Hard-Delete lautlos aus der Kasse. Ein kassierter Betrag ist Fachdaten im Sinne des
      Scope-Satzes „Zeilen ohne Fachdaten sperren nicht".

## Fehlerszenarien

- [ ] Veranstaltung mit `verzehr_position`-Zeile, deren `menge` auf `0` zurückgeführt wurde
      (Netto-Null nach Hinzufügen+Entfernen) → Löschen **weiterhin erlaubt**, da kein
      tatsächlicher Verzehr vorliegt. Wichtig: `verzehr_position` löscht seine Zeile bei
      `menge = 0` **nicht** (Upsert mit `GREATEST(0, ...)`, `db/verzehr.ts`) – die Prüfung muss
      daher auf `menge > 0` filtern, nicht auf reine Zeilen-Existenz (sonst False-Positive-Block).
- [ ] Auslage wurde erfasst und später wieder entfernt (`removeAuslage`, echtes DELETE) →
      Löschen der Veranstaltung wieder erlaubt, da die `auslage`-Tabelle dann keine Zeile mehr
      für diese Veranstaltung enthält (kein Soft-Delete bei Auslagen, anders als bei Verzehr).
- [ ] Nebenläufigkeit: Zwischen Laden der Lösch-Bestätigung und dem tatsächlichen Löschen
      erfasst jemand Verzehr/Auslage → der Lösch-Request muss die Bedingung **zum
      Ausführungszeitpunkt** serverseitig neu prüfen (kein rein clientseitiger Snapshot-Check).
- [ ] Ungültige/fremde Veranstaltungs-ID beim Bearbeiten/Löschen → neutraler Fehler
      (`notFound()`/kein stiller Erfolg), kein IDOR über eine andere Veranstaltung.
- [ ] Kassierter Betrag wurde wieder zurückgenommen (`setErhalten(null)`, `erhaltenCents` steht
      wieder auf `null`) → Löschen der Veranstaltung wieder erlaubt, analog zur zurückgenommenen
      Auslage. Abzugrenzen von `erhaltenCents = 0`: das heißt „kassiert, und zwar nichts" und
      sperrt weiterhin – die Prüfung ist `!== null`, keine Truthiness-Prüfung.
- [ ] Bearbeiten einer `abgeschlossenen` Veranstaltung direkt per Server-Request (UI umgangen)
      → serverseitig abgelehnt, `undefined`-Rückgabe der Data-Layer auswerten (Kern-Kurzregel
      „guarded UPDATE", nicht `{ok:true}` annehmen).

## Offene Fragen

- [ ] Exakte UI-Platzierung (z. B. Edit-Formular + Lösch-Button auf `/veranstaltung/[id]`,
      analog zum bestehenden Katalog-Wechsel-UI aus #346) → `/architecture`/`/implement`.
- [ ] Löschen als eigener Server Action oder Erweiterung der bestehenden Data-Layer
      (`db/veranstaltung.ts`, guarded DELETE nach demselben Muster wie
      `setVeranstaltungCatalog`) → `/architecture`.
- [ ] Ob für die Verzehr/Auslage-Prüfung vor dem Löschen eine transaktionale Bedingung
      (guarded `DELETE ... WHERE NOT EXISTS (...)`) oder ein vorgelagerter Check + danach
      `DELETE` genutzt wird (Race-Condition-Sicherheit) → `/architecture`.

## Gesetzte Entscheidungen (aus Requirements-Session 2026-09-24)

- **Hard-Delete**, kein Soft-Delete – da Löschen ohnehin nur ohne Fachdaten (Verzehr/Auslage)
  möglich ist, gibt es nichts, was ein „Papierkorb" bewahren müsste.
- **Nur datierte Veranstaltungen** (Typ `veranstaltung`) sind bearbeitbar/löschbar; die
  stehende Theke (Typ `theke`) bleibt unangetastet.
- **Bestätigungsdialog vor dem Löschen** ist Pflicht (UI-Sicherheitsnetz).
