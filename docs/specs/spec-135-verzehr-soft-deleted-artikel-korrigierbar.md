# Spec: Verzehr auf soft-gelöschtem Artikel bleibt sichtbar und korrigierbar

> Bug-Fix #135 · Folge-Finding aus Task 52 (`tasks/review-52.md`, Wichtiges Finding 1).
> Kanonische Fachdomäne: [README-montagsrunde](README-montagsrunde.md), [spec-52](spec-52-verzehr-erfassen.md).

## Kontext

Bei der Verzehr-Erfassung (F5, spec-52) werden je Teilnehmerzeile Getränke/Essen/Kaffee als
Positionen auf **Katalogartikeln** erfasst; die Summen entstehen read-time aus `Menge × aktuellem
Katalogpreis` (ADR-025 D2, Live-Katalog solange die Veranstaltung `offen` ist).

Katalogartikel werden nie hart gelöscht, sondern **soft-gelöscht** (`active = false`, spec-49).
Wird ein Artikel deaktiviert, **nachdem** ein Teilnehmer ihn in einer noch **offenen**
Veranstaltung bereits konsumiert hat, entsteht heute eine Inkonsistenz:

1. Der Betrag der bestehenden Position **zählt weiter** in die Zeilensumme (Header), …
2. … es wird aber **keine Bedienzeile** mehr dafür angezeigt (die Steuerelemente stammen nur aus
   dem **aktiven** Katalog), …
3. … und jede Anpassung wird **abgelehnt** (Soft-Delete-Guard der Erfassungs-Action).

Ergebnis: Der Veranstalter sieht eine Summe, die er weder einer Zeile zuordnen noch korrigieren
kann – ein **unsichtbarer, eingefrorener Betrag**. Ohne Produktivdaten heute nicht akut, aber eine
echte Anzeige- und Korrektur-Inkonsistenz in einer Abrechnungs-App.

**Warum nicht einfach aus der Summe entfernen?** Der Verzehr **hat stattgefunden** – ihn lautlos
aus der Abrechnung fallen zu lassen wäre Under-Billing (der Teilnehmer würde zu wenig zahlen). Die
gewählte Richtung ist deshalb **sichtbar machen + korrigierbar machen**, nicht verstecken (mit dem
Menschen abgestimmt; Details zum Lösungsweg in der Architektur-Phase / ADR).

## Scope

**Inbegriffen:**
- Anzeige einer bestehenden Position auf einem soft-gelöschten Artikel als eigene, sichtbare Zeile.
- Korrigierbarkeit (Menge erhöhen **und** verringern) einer solchen Position, solange die
  Veranstaltung `offen` ist.
- Der Betrag zählt unverändert in die Zeilensumme (kein Under-Billing).

**Nicht inbegriffen:**
- **Neu-Erfassung** von Verzehr auf einem soft-gelöschten Artikel (kein neues Anlegen einer
  Position) – der Soft-Delete soll weiterhin verhindern, dass ein deaktivierter Artikel neu
  konsumiert werden kann.
- Preis-Einfrieren beim Abschluss (bleibt F8/#55, ADR-025 D2).
- Reaktivieren von Artikeln, Verwaltungs-UI des Katalogs (spec-49 unverändert).
- Echtzeit-Sichtbarkeit auf anderen Geräten (bleibt ADR-025 D4).

## Akzeptanzkriterien

- [ ] **AC1 – Sichtbarkeit:** GIVEN eine offene Veranstaltung mit einer Position (Menge > 0) auf
      einem inzwischen soft-gelöschten Artikel WHEN der Veranstalter die Verzehr-Seite öffnet THEN
      wird diese Position als eigene, sichtbare Zeile dargestellt (Artikelname, Preis, Menge),
      erkennbar als „nicht mehr im Katalog".

- [ ] **AC2 – Betrag zählt weiter:** GIVEN dieselbe Position WHEN die Zeilensumme gebildet wird
      THEN ist der Betrag der Position (`Menge × Preis`) weiterhin in der Summe enthalten
      (kein Under-Billing, keine stille Reduktion).

- [ ] **AC3 – Verringern möglich:** GIVEN dieselbe Position bei offener Veranstaltung WHEN der
      Veranstalter die Menge um 1 verringert THEN wird die neue (verringerte) Menge persistiert und
      angezeigt; bei 0 greift die bestehende Klemmung (Minimum 0).

- [ ] **AC4 – Erhöhen möglich:** GIVEN dieselbe Position bei offener Veranstaltung WHEN der
      Veranstalter die Menge um 1 erhöht THEN wird die neue (erhöhte) Menge persistiert und
      angezeigt.

- [ ] **AC5 – Keine Neu-Erfassung:** GIVEN ein soft-gelöschter Artikel, für den auf der Zeile
      **noch keine** Position existiert WHEN eine Mengenänderung darauf versucht wird THEN wird sie
      abgelehnt und nichts wird gespeichert (Soft-Delete behält seinen Zweck).

- [ ] **AC6 – Aktive Artikel unverändert:** GIVEN ein aktiver Katalogartikel WHEN der Veranstalter
      die Menge ändert THEN verhält sich die Erfassung exakt wie bisher (spec-52 AC1–AC7).

- [ ] **AC7 – Abgeschlossene Veranstaltung nur lesend:** GIVEN eine abgeschlossene Veranstaltung
      mit einer Position auf einem soft-gelöschten Artikel WHEN die Seite geöffnet wird THEN ist die
      Position sichtbar, aber ohne Bedienelemente (nur Lesesicht, konsistent mit spec-52 FS2).

## Fehlerszenarien

- [ ] **FS1:** Mengenänderung auf soft-gelöschtem Artikel **ohne** bestehende Position →
      Ablehnung mit Fehlermeldung, kein Schreibvorgang (= AC5).
- [ ] **FS2:** Mengenänderung auf soft-gelöschtem Artikel bei **abgeschlossener** Veranstaltung →
      Ablehnung (bestehende „abgeschlossen"-Regel, spec-52), unabhängig vom Artikel-Status.

## Offene Fragen

_Keine._ Die Fix-Richtung (sichtbar + korrigierbar, Betrag zählt weiter) ist mit dem Menschen
abgestimmt; der konkrete Lösungsweg wird in `/architecture` (ADR-025-Ergänzung) festgelegt.
