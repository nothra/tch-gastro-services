# Spec: Katalog je Veranstaltung auswählen

> Issue: [#346](https://github.com/nothra/tch-gastro-services/issues/346) · Setzt
> [#59](https://github.com/nothra/tch-gastro-services/issues/59) (Katalog als Entität,
> [ADR-050](../adr/050-katalog-als-template-entitaet.md)) und
> [#345](https://github.com/nothra/tch-gastro-services/issues/345) (mehrere Kataloge pflegbar)
> voraus. Story-Schnitt: #59 (Container) → #345 (mehrere Kataloge) → **#346 (hier)** – hier landet
> der fachliche Nutzen: ab jetzt gilt je Veranstaltung eine eigene Preisliste.
> Betroffene Wege: F4 (`/veranstaltung`, Anlage + Detail), F5 (`/veranstaltung/[id]/verzehr`).

## Kontext

#59 hat den Katalog-Container geschaffen, #345 macht ihn pflegbar – beide Slices sind bewusst
ohne fachlichen Nutzen für den laufenden Betrieb geblieben: jede Veranstaltung nutzt weiterhin
ausschließlich `STANDARD_CATALOG_ID` (ADR-050 D3), unabhängig davon, wie viele Kataloge existieren.

Diese Slice schließt die Kette: `veranstaltung` bekommt einen eigenen Katalogbezug. Ab jetzt kann
eine Veranstaltung mit einem beliebigen aktiven Katalog angelegt werden – z. B. „Dorfmeisterschaft"
mit eigenem Kaffeepreis statt dem Montagsrunden-Preis. Die Lesepfade (Verzehrerfassung,
Preis-Prüfung an der Verzehr-Action-Grenze) lösen ab jetzt über `veranstaltung.catalogId` auf statt
über die Konstante `STANDARD_CATALOG_ID` – genau die compilergeprüfte Umstellung, die ADR-050 D4
für diese Slice vorgesehen hat.

**Klärung zur Theke:** Die Dauer-Theke (`veranstaltungTyp = "theke"`, `app/theke/[token]`) bleibt
in dieser Slice **ohne** eigene Katalogauswahl. Es existiert aktuell keine Verwaltungsoberfläche
für die Theke überhaupt (sie entsteht lazy über `ensureThekeForKasse` bei erstem Zugriff je
Kasse) – eine Katalogauswahl dafür wäre eine komplett neue Pflegeseite und damit ein eigener,
größerer Schnitt. Falls dafür später Bedarf entsteht (z. B. eine Dorfmeisterschaft würde
tatsächlich über die Theke statt über eine datierte Veranstaltung laufen – heute nicht der Fall),
folgt das als eigenes Issue. `ensureThekeForKasse` setzt weiterhin keinen `catalogId` und nutzt
damit den Spalten-Default (`STANDARD_CATALOG_ID`) – verhaltensneutral.

**Klärung zum Abschlussbericht:** Die im Issue offen gelassene Frage „gruppiert der Bericht über
Artikel-ID oder Name/Größe?" ist durch Code-Lektüre bereits beantwortet und **nicht** durch diese
Slice betroffen: `app/_verzehr/positionen.ts` (`gruppierePositionenNachZeile`,
`verzehrPositionen`) aggregiert ausschließlich **je Teilnehmerzeile innerhalb einer
Veranstaltung** – es gibt keinen Code-Pfad, der Artikel **über mehrere Veranstaltungen/Kataloge
hinweg** nach Name/Größe zusammenfasst. Da eine Veranstaltung immer genau einen Katalog hat,
können innerhalb eines Berichts nie zwei gleichnamige Artikel aus verschiedenen Katalogen
kollidieren. Keine Änderung an `app/veranstaltung/berichtModell.ts`,
`berichtPdf.ts`/`berichtXlsx.ts` nötig.

**Katalogwechsel nach Anlage:** Es gibt aktuell für keine andere Veranstaltungs-Eigenschaft
(Bezeichnung, Kasse) einen Bearbeiten-Weg nach dem Anlegen. Für den Katalog entsteht in dieser
Slice trotzdem einer (Nutzer-Entscheidung), weil das Issue selbst ihn als Bedienweg voraussetzt
(„Wechsel des Katalogs nur solange Status offen und noch keine Verzehr-Position erfasst – sonst
wird das serverseitig abgelehnt").

## Scope

**Inbegriffen:**

- `veranstaltung.catalogId` (Pflicht-FK auf `catalog.id`, Default `STANDARD_CATALOG_ID` –
  analog zum Muster aus ADR-050 D2/D6 für `catalog_item.catalog_id`).
- Katalog-Auswahl im Anlage-Formular (`VeranstaltungForm.tsx`) durch `veranstalter`: Dropdown mit
  allen **aktiven** Kataloge, vorbelegt mit dem Standard-Katalog.
- Neuer Bearbeiten-Weg für den Katalog einer bereits offenen Veranstaltung (Detailseite
  `/veranstaltung/[id]`): eigene Server Action + eigenes UI-Element (analog `StatusToggle.tsx`),
  Auswahl ebenfalls beschränkt auf aktive Kataloge.
- Lesepfade nutzen ab jetzt `veranstaltung.catalogId` statt `STANDARD_CATALOG_ID`:
  `app/veranstaltung/[id]/verzehr/page.tsx` (`listActiveCatalog`),
  `app/veranstaltung/actions.ts` (`applyVerzehrAdjust` → `getCatalogItem`).
- Server-seitige Sperre des Katalogwechsels, sobald für die Veranstaltung mindestens eine
  Verzehr-Position mit `menge > 0` existiert – unabhängig vom UI-Zustand.
- Serverseitiges Rollen-Gate (`requireRole("veranstalter")`) für die neue Wechsel-Action.

**Nicht inbegriffen:**

- **Katalogauswahl für die Theke** – siehe Kontext. `ensureThekeForKasse` bleibt unverändert und
  nutzt den Spalten-Default.
- **Änderung am Abschlussbericht** (Gruppierung, Modell, Renderer) – siehe Kontext, nicht
  betroffen.
- **Neue Bearbeiten-Wege für Bezeichnung oder Kasse.** Diese Slice fügt ausschließlich einen
  Wechsel-Weg für den Katalog hinzu, keine allgemeine „Veranstaltung bearbeiten"-Funktion.
- **Katalog-Wechsel für abgeschlossene Veranstaltungen.** Abgeschlossene Veranstaltungen sind
  bereits heute vollständig schreibgeschützt (bis auf Wiederöffnen) – daran ändert sich nichts.
- **Preise/Artikel selbst ändern.** Das ist weiterhin `/verwaltung/katalog` (#345).
- **Migration bestehender Veranstaltungen auf einen anderen Katalog** als den Default – jede
  bestehende Zeile bekommt durch den Spalten-Default automatisch `STANDARD_CATALOG_ID`
  (verhaltensneutral, keine Datenmigration mit anderem Zielwert).

## Akzeptanzkriterien

- [ ] **AK1 – Katalog bei Anlage wählbar:** GIVEN Rolle `veranstalter` auf `/veranstaltung`
      WHEN eine neue Veranstaltung angelegt wird und dabei ein von der Vorbelegung abweichender,
      aktiver Katalog gewählt wird
      THEN wird die Veranstaltung mit genau diesem Katalog angelegt (`veranstaltung.catalogId`
      zeigt darauf).

- [ ] **AK2 – Gewählter Katalog bestimmt den Preis:** GIVEN zwei aktive Kataloge mit
      unterschiedlichem Kaffeepreis
      WHEN eine Veranstaltung mit Katalog B angelegt und in ihrer Verzehrerfassung ein Kaffee
      erfasst wird
      THEN gilt der Kaffeepreis aus Katalog B (nicht aus Katalog A oder dem Standard-Katalog),
      sowohl in der Live-Anzeige (offen) als auch nach dem Preis-Freeze beim Abschluss
      (ADR-033 D2, unverändert).

- [ ] **AK3 – Katalogwechsel ohne erfassten Verzehr:** GIVEN eine offene Veranstaltung ohne
      jede Verzehr-Position mit `menge > 0`
      WHEN der Veranstalter über den neuen Bearbeiten-Weg auf einen anderen aktiven Katalog
      wechselt
      THEN wird der Wechsel übernommen, und die Verzehrerfassung zeigt ab sofort die Artikel und
      Preise des neuen Katalogs.

- [ ] **AK4 – Katalogwechsel mit bereits erfasstem Verzehr wird abgelehnt:** GIVEN eine offene
      Veranstaltung mit mindestens einer Verzehr-Position mit `menge > 0`
      WHEN versucht wird, den Katalog zu wechseln (über die UI oder per direktem Request an die
      Action)
      THEN lehnt die Server Action das mit einer verständlichen Meldung ab – serverseitig, nicht
      nur durch UI-Ausblendung (Defense in Depth). Eine Position, die auf `menge = 0`
      zurückgesetzt wurde (Strich hoch, dann wieder runter), zählt **nicht** als „erfasst" – sie
      hat keinen tatsächlichen Verzehr zur Folge (konsistent mit der bestehenden
      `menge > 0`-Filterung in `verzehrPositionen`).

- [ ] **AK5 – Abgeschlossene Veranstaltung bleibt unveränderlich:** GIVEN eine abgeschlossene
      Veranstaltung
      WHEN Preise im zugeordneten Katalog nachträglich geändert werden
      THEN bleibt die Abrechnung unverändert (bestehender `einzelpreisCents`-Freeze, ADR-033 D2 –
      Regressions-AK, keine neue Mechanik).

- [ ] **AK6 – Deaktivierter Katalog nicht neu wählbar, bestehende Zuordnung bleibt gültig:**
      GIVEN ein deaktivierter Katalog
      WHEN eine neue Veranstaltung angelegt oder ein Katalogwechsel vorgenommen wird
      THEN erscheint er nicht in der Auswahl, und ein direkter Request mit seiner ID wird
      serverseitig abgelehnt;
      WHEN eine bestehende Veranstaltung bereits diesem (danach deaktivierten) Katalog
      zugeordnet ist
      THEN bleibt sie voll funktionsfähig (Verzehrerfassung, Preisauflösung, Abschluss) – die
      Deaktivierung wirkt nur auf die **Auswahl**, nicht auf bereits zugeordnete Veranstaltungen
      (konsistent mit ADR-050-Nachtrag zu D7).

- [ ] **AK7 – Theke bleibt unverändert:** GIVEN die Dauer-Theke
      WHEN sie (erstmalig oder wiederholt) über `ensureThekeForKasse` angesteuert wird
      THEN bleibt sie ohne Katalogauswahl am Standard-Katalog (Spalten-Default) – keine
      Verhaltensänderung gegenüber dem Stand vor dieser Slice.

- [ ] **AK8 – Rollen-Gate greift serverseitig:** GIVEN Rolle `veranstalter` ist erforderlich
      WHEN die neue Katalogwechsel-Action ohne diese Rolle aufgerufen wird
      THEN lehnt `requireRole("veranstalter")` das ab, unabhängig davon, ob die UI den
      Bearbeiten-Weg überhaupt anzeigt.

## Fehlerszenarien

- [ ] **FS1 – Unbekannter oder deaktivierter Katalog bei Anlage/Wechsel:** Eine Katalog-ID, die
      nicht existiert oder zu einem deaktivierten Katalog gehört, wird bei Anlage und Wechsel
      abgelehnt (verständliche Meldung, kein technischer Fehler) – Server-Grenze, nicht nur
      Formular-Optionsliste (analog FS2 in spec-345).
- [ ] **FS2 – Race beim Wechsel:** Wird zwischen dem Laden der Bearbeiten-Ansicht und dem
      Absenden des Wechsels die erste Verzehr-Position mit `menge > 0` erfasst, lehnt die Server
      Action den Wechsel dennoch ab (serverseitige Prüfung zum Zeitpunkt der Action, nicht nur
      beim Rendern der Ansicht).
- [ ] **FS3 – Artikel aus fremdem Katalog an der Verzehr-Grenze:** Wird an
      `adjustVerzehrAction` eine `catalogItemId` übergeben, die nicht im Katalog **dieser**
      Veranstaltung liegt, greift die bestehende `ITEM_NOT_FOUND`-Meldung (spec-59 FS2) – jetzt
      gebunden an `veranstaltung.catalogId` statt an `STANDARD_CATALOG_ID`.
- [ ] **FS4 – Unbekannte Veranstaltung beim Wechsel:** Die Wechsel-Action gegen eine nicht (mehr)
      existierende Veranstaltungs-ID meldet einen Fehler statt stillem Erfolg (Guarded-UPDATE-
      Rückgabewert auswerten, Kern-Kurzregel „guarded UPDATE").

## Offene Fragen

- [x] ~~Bekommt die Theke einen eigenen Katalog?~~ → Geklärt: nein, bleibt am Standard-Katalog
      (siehe Kontext).
- [x] ~~Gruppiert der Abschlussbericht über Artikel-ID oder Name/Größe – ist das durch #346
      betroffen?~~ → Geklärt: nicht betroffen, siehe Kontext.
- [x] ~~Braucht es in dieser Slice überhaupt einen Katalogwechsel-Weg nach der Anlage?~~ →
      Geklärt: ja, mit serverseitiger Sperre sobald Verzehr erfasst ist (AK3/AK4).
- [x] ~~**ADR-Bedarf für `/architecture`:**~~ → Geklärt: kein neuer ADR-Trigger (Spec-002-Kriterien:
      keine neue Technologie, kein neues Architekturmuster, kein Schnittstellen-Vertrag, keine
      irreversible Konsequenz über ADR-050 hinaus – die Persistenz-Strategie für einen
      Pflicht-FK mit stabilem Default ist mit D2/D3/D6 bereits entschieden). Stattdessen Nachtrag
      an [ADR-050](../adr/050-katalog-als-template-entitaet.md#nachtrag-2026-09-24-346-d3-realisiert--veranstaltungcatalogid-ersetzt-standard_catalog_id-in-den-aufrufpfaden)
      (2026-09-24, #346), der D3 als jetzt realisiert dokumentiert und die Schema-/Migrations-
      Entscheidung (echter DB-Default statt Expand-Migration) sowie die Wechsel-Action-Guards
      festhält. Implementierungs-Hinweise stehen in der Task-Datei.
