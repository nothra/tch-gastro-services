# Spec: Kassieren – Summe oben, Spende live, Abschluss auf der Detailseite (#371)

> Teil der UX-Überarbeitung (UX-4), Übersicht in `docs/ux/ux-issue-entwuerfe.md`.
> Baut auf den UI-Bausteinen aus #368 auf (`Card`, `Badge`, `Notice`, `PageHeader`, `Field`,
> `Button`, `ConfirmDialog`). Überschneidung: #305 (offener Betrag – wird hier abgelöst),
> #272 (Listen-Refactor), #372 (einheitliches Bestätigen/Rückmelden).

## Kontext

Die Kassieren-Seite (`/veranstaltung/[id]/kassieren`) zeigt Teilnehmerzeilen, danach Tagessummen,
Gesamtabrechnung und Protokoll als drei lange Tabellen hintereinander; „Abschließen" steht am
Ende. Wie viel Geld noch aussteht, muss der Thekenwart aus den Einzelzeilen zusammenrechnen
(#305). Beim Kassieren sieht er die Spende erst nach dem Speichern. Seit #369 sitzt der
`StatusToggle` nur noch auf der Kassieren-Seite; auf der Detailseite ist „Wieder öffnen" damit
nicht mehr auffindbar.

## Entscheidungen aus der Klärung

- **Schnellbeträge entfallen.** Keine Tasten „Passend", „Auf 5 € aufrunden", „Auf 10 €"; das freie
  Feld `Erhalten` bleibt die einzige Eingabe. (Abweichung vom Issue-AK2.)
- **Abschließen / Wieder öffnen sitzt im Seitenkopf der Detailseite**, neben dem Status-Badge,
  jeweils mit Bestätigung. Die Kassieren-Seite hat keinen Statuswechsel mehr.
- **#305 wird abgelöst:** Der offene Betrag steht in der Summenkarte (AK1); #305 wird mit dem PR
  dieses Issues geschlossen (`Closes #305` im PR-Body).
- **Spende live** wird clientseitig aus dem getippten Betrag angezeigt; maßgeblich bleibt die
  serverseitige Ableitung (ADR-033 D1).

## Scope

**Inbegriffen:**
- Summenkarte oben auf der Kassieren-Seite (offener Betrag, Erhalten, Spenden, Fortschritt).
- Live-Anzeige der Spende je Zeile vor dem Absenden.
- Rückmeldung nach dem Kassieren mit Betrag und Spende.
- Eingeklappter Bereich „Abrechnung im Detail" (Tagessummen, Gesamtabrechnung, Protokoll).
- Entfernen des `StatusToggle` von der Kassieren-Seite; Abschließen/Wieder öffnen im Kopf der
  Detailseite mit `ConfirmDialog`.

**Nicht inbegriffen:**
- Schnellbeträge (entfallen, s. o.).
- Umbau der Teilnehmerzeilen-Liste (#272) und der Verzehr-Aufschlüsselung.
- Geschäftsregeln: Abschluss-Ablehnung bei offener Zeile (ADR-033 D3), Theke nicht
  abschließbar, Protokollierung – bleiben unverändert.
- Einheitliche Rückmeldungen auf allen anderen Seiten und weitere Bestätigungen (#372).
- Änderung des Abschlussberichts (ADR-036).

## Begriffe

- **Offener Betrag** – Σ über alle Zeilen mit `bezahlt === false` von
  `verzehrGesamtCents − (erhaltenCents ?? 0)`. Bezahlte Zeilen tragen 0 bei; eine Überzahlung
  (Spende) mindert den offenen Betrag nicht.
- **Fortschritt** – „x von n bezahlt": x = Zeilen mit `bezahlt`, n = alle Zeilen.

## Akzeptanzkriterien

### Summenkarte

- [ ] **AK1** GIVEN die Kassieren-Seite WHEN sie gerendert wird THEN steht über der
  Teilnehmerliste eine Summenkarte mit offenem Betrag, Erhalten (Σ), Spenden (Σ) und dem
  Fortschritt „x von n bezahlt".
- [ ] **AK2** GIVEN Zeilen mit Teilzahlung, Überzahlung und unbezahlter Zeile WHEN die Karte
  berechnet wird THEN folgt der offene Betrag der Definition oben (Überzahlung ergibt keinen
  negativen Beitrag; bezahlte Zeilen 0).
- [ ] **AK3** GIVEN keine offene Zeile (oder keine Teilnehmer) WHEN die Karte gerendert wird THEN
  zeigt sie „0,00 €" bzw. „0 von 0 bezahlt" statt leerer Werte.
- [ ] **AK4** GIVEN die Berechnung WHEN Karte, Zeilenanzeige und Abschluss-Gate Zahlen brauchen
  THEN stammt der offene Betrag aus `kassierTagessummen` (`app/veranstaltung/kassierSummen.ts`)
  als SINGLE SOURCE (ADR-033 D5) – nicht in der Page oder im Client nachgerechnet.
- [ ] **AK5** GIVEN Beträge in der Karte WHEN sie angezeigt werden THEN über `formatCents`
  (de-DE, 2 Dezimalstellen) mit `tabular-nums`.
- [ ] **AK6** GIVEN noch offene Zeilen WHEN die Summenkarte gerendert wird THEN weist sie darauf
  hin („Noch n offen") und verlinkt zur Detailseite, wo abgeschlossen wird; sind keine Zeilen
  offen, erscheint ein Hinweis „Alles bezahlt" mit demselben Link.

### Teilnehmerzeile und Kassieren

- [ ] **AK7** GIVEN eine Teilnehmerzeile WHEN sie gerendert wird THEN zeigt sie den
  Verzehr-Gesamt und ein Status-Badge (bezahlt/offen, `Badge`-Baustein); die Aufschlüsselung
  Getränke/Essen/Kaffee bleibt erreichbar.
- [ ] **AK8** GIVEN eine offene Veranstaltung und das Feld `Erhalten` WHEN der Nutzer einen
  Betrag tippt THEN zeigt die Zeile die Spende `max(0, Betrag − Verzehr-Gesamt)` sofort an,
  ohne zu speichern.
- [ ] **AK9** GIVEN ein leeres oder nicht lesbares `Erhalten`-Feld WHEN die Live-Anzeige
  rechnet THEN zeigt sie „0,00 €" Spende und wirft keinen Fehler; der Betrag wird mit demselben
  Parser wie serverseitig gelesen (`lib/money`).
- [ ] **AK10** GIVEN eine abgeschlossene Veranstaltung WHEN die Kassieren-Seite geöffnet wird
  THEN ist sie schreibgeschützt (kein `Erhalten`-Feld, kein Statuswechsel); die Summenkarte und
  die Zeilen bleiben sichtbar.
- [ ] **AK11** GIVEN die Seite WHEN sie bei 375 px gerendert wird THEN gibt es keinen
  horizontalen Scroll; das Feld `Erhalten` und „Kassieren" sind mindestens 44 × 44 px groß.

### Rückmeldung

- [ ] **AK12** GIVEN ein erfolgreiches Kassieren WHEN die Action antwortet THEN erscheint an der
  Zeile ein `Notice` (statt „Gespeichert.") mit Betrag und Spende, z. B. „7,00 € erhalten,
  davon 1,50 € Spende"; ohne Spende nur der Betrag. Wurde das Feld geleert (Kassieren
  zurückgenommen), lautet die Meldung „Betrag entfernt".
- [ ] **AK13** GIVEN eine Ablehnung durch den Server WHEN die Action antwortet THEN erscheint die
  Fehlermeldung unverändert als `Notice` (Fehler-Ton) an der Zeile.

### Abrechnung im Detail

- [ ] **AK14** GIVEN die Kassieren-Seite WHEN sie geöffnet wird THEN sind Tagessummen,
  Kassen-Gesamtabrechnung und Protokoll in einem **standardmäßig eingeklappten** Bereich
  „Abrechnung im Detail" zusammengefasst; aufgeklappt zeigen sie dieselben Zeilen und Werte wie
  bisher.
- [ ] **AK15** GIVEN der Bereich WHEN er auf- und zugeklappt wird THEN ist er per Tastatur
  bedienbar und der Zustand für Screenreader erkennbar (natives `<details>`).

### Reihenfolge

- [ ] **AK16** GIVEN die Teilnehmerliste WHEN eine Zeile kassiert wird THEN bleibt die
  eingefrorene Reihenfolge innerhalb der Sitzung erhalten (#253); offene Zeilen stehen beim
  Seitenaufruf zuerst (#223). Die Summenkarte aktualisiert sich dennoch.

### Abschließen / Wieder öffnen (nur Detailseite)

- [ ] **AK17** GIVEN die Kassieren-Seite WHEN sie gerendert wird (offen oder abgeschlossen)
  THEN enthält sie weder „Veranstaltung abschließen" noch „Wieder öffnen"; `StatusToggle` wird
  dort nicht mehr verwendet.
- [ ] **AK18** GIVEN eine offene, nicht-stehende Veranstaltung WHEN die Detailseite geöffnet wird
  THEN steht im Seitenkopf neben dem Status-Badge „Veranstaltung abschließen".
- [ ] **AK19** GIVEN „Veranstaltung abschließen" WHEN es getippt wird THEN öffnet ein
  `ConfirmDialog`; erst die Bestätigung führt die Action aus, „Abbrechen"/Escape lässt alles
  unverändert.
- [ ] **AK20** GIVEN noch offene Zeilen WHEN der Abschluss-Dialog geöffnet wird THEN nennt er
  Anzahl und offenen Betrag (z. B. „2 Zeilen noch offen, zusammen 12,50 €"); die
  serverseitige Ablehnung bei offener Zeile bleibt unverändert und ihre Meldung erscheint im
  Dialog.
- [ ] **AK21** GIVEN keine offene Zeile WHEN der Abschluss-Dialog geöffnet wird THEN enthält er
  keinen Offen-Hinweis.
- [ ] **AK22** GIVEN eine abgeschlossene Veranstaltung WHEN die Detailseite geöffnet wird THEN
  zeigt der Kopf das Badge „abgeschlossen" und „Wieder öffnen"; nach Bestätigung im
  `ConfirmDialog` ist die Veranstaltung wieder offen und das Ereignis wird protokolliert wie
  bisher.
- [ ] **AK23** GIVEN die stehende Theke (`typ = theke`) WHEN die Detailseite geöffnet wird THEN
  erscheint kein „Veranstaltung abschließen" (Theke ist nicht abschließbar, spec-51).
- [ ] **AK24** GIVEN die Detailseite bei 375 px WHEN sie gerendert wird THEN bricht die Aktion im
  Kopf um, ohne horizontalen Scroll und ohne Überlappung mit Titel oder Badge.

## Fehlerszenarien

- [ ] **FS1** GIVEN zwischen Öffnen und Bestätigen des Abschluss-Dialogs wird eine Zeile
  bearbeitet WHEN bestätigt wird THEN entscheidet der Server (ADR-033 D3) und der Dialog zeigt
  dessen Ablehnung; die angezeigte Anzahl im Dialog gilt nur als Hinweis.
- [ ] **FS2** GIVEN der Server meldet „bereits abgeschlossen"/„bereits offen" (Doppel-Aufruf)
  WHEN der Dialog bestätigt wurde THEN erscheint diese Meldung im Dialog statt eines stillen
  Erfolgs.
- [ ] **FS3** GIVEN die Live-Spende WHEN der Nutzer einen unlesbaren Wert tippt THEN bleibt die
  Anzeige bei 0,00 € und das Absenden wird serverseitig wie bisher abgelehnt.
- [ ] **FS4** GIVEN ein Nutzer ohne Rolle `veranstalter` WHEN er Kassieren-Seite oder
  Statuswechsel aufruft THEN bleibt der Zugriff verweigert (unverändert, serverseitig).

## Offene Fragen

- [ ] Soll das **Protokoll** (Abschluss/Wiederöffnen) langfristig zur Detailseite wandern, wo
  jetzt der Statuswechsel sitzt? Hier bewusst nicht: es bleibt in „Abrechnung im Detail" auf der
  Kassieren-Seite (kleinster Eingriff). Bei Bedarf eigenes Issue.

## Hinweise für die Architektur (kein Lösungsvorschlag)

- Keine Routen-Änderung → `docs/routes.md` unberührt.
- Voraussichtlich keine ADR nötig; falls das Live-Spenden-Verhalten eine Client/Server-Aufteilung
  der Geldlogik verlangt, an ADR-033 D5 (Single Source) prüfen.
