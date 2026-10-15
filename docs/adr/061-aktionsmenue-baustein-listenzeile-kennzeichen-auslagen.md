# ADR 061: Baustein „AktionsMenue", `ListenZeile`-Slot „kennzeichen" und Auslagen-Umbau

## Status

Accepted

> Nachtrag zu **ADR-053** D2 (Zeilenmenü feature-lokal), **ADR-059** D1 und **ADR-060** D1
> (API von `ListenZeile`). Alle übrigen Regeln aus ADR-052/053/058/059/060 gelten unverändert.

## Datum

2026-10-15

## Kontext

[spec-406](../specs/spec-406-auslagen-ui-grundlage-angleichen.md) (#406) stellt die
Auslagen-Seite auf die UI-Grundlage um. Drei Punkte passen nicht zum Ist-Stand der Bausteine:

1. **Zweites Zeilenmenü.** `ZeilenMenue` (Detailseite, ADR-053 D2) ist feature-lokal, weil „ein
   projektweites Menü-Muster noch nicht belegt" war. Die Auslagenzeile braucht ein ⋯-Menü mit
   anderen Einträgen (Erstatten, Bearbeiten, Löschen). Das Menü-Verhalten – Öffnen/Schließen,
   Außenklick, Escape, Fokus auf ersten Eintrag und zurück zum Auslöser, `role="menu"` – ist dabei
   identisch und steht heute in `ZeilenMenue` fest verdrahtet.
2. **Betrag und Status in der Zeile.** `ListenZeile` kennt nur Titel/Untertitel, das neutrale
   `zustand`-Badge (mit Verblassen, ADR-059 D3) und `aktion`/Pfeil. Die Auslagenzeile zeigt
   zusätzlich den Betrag und ein Badge „offen" (`warnung`) / „erstattet" (`erfolg`) – das ist
   **kein** Verblassen: eine offene Auslage ist aktiv, nicht abgeblendet.
3. **Fehler der Erstattungs-Aktion.** Sie läuft ohne Bestätigungsdialog aus dem Menü. Fehler
   bleiben `Notice` am Ort der Aktion (spec-372 AK16, es gibt bewusst kein `meldeFehler`); der
   Ort ist hier das geöffnete Menü.

## Entscheidung

### D1 · `AktionsMenue` als route-neutraler Baustein

`app/components/ui/AktionsMenue.tsx` übernimmt das Verhalten von `ZeilenMenue` unverändert:
Auslöser „⋯" (`aria-haspopup="menu"`, `aria-expanded`, Tippfläche ≥ 44 px), Popup mit
`role="menu"`, Schließen per Escape und Außenklick, Fokus beim Öffnen auf den ersten Eintrag,
beim Schließen zurück auf den Auslöser. Der Baustein kennt weder Server Actions noch
Bestätigungsdialoge.

API: `label` (zugänglicher Name, z. B. „Aktionen für Anna"), optional `ausloeserRef`,
`children` als **Render-Funktion** `({ schliessen, meldeLauf }) => ReactNode`, dazu der exportierte
Eintrag **`MenueEintrag`** (`gefahr?`, `type?: "button" | "submit"`, sonst Button-Props wie
`onClick`/`disabled`). Den
ersten Eintrag sucht der Baustein selbst im Popup (`[role="menuitem"]`), der Konsument verdrahtet
keine Fokus-Ref. Solange eine per `meldeLauf(true)` gemeldete Action läuft, schließen Außenklick,
Escape und Auslöser nicht – sonst hinge das Formular aus und eine Ablehnung verpuffte (spec-406
AK3.4; Sperr-Vertrag im Baustein, Lesson #369). Render-Funktion statt
Eintragsliste, weil die Erstatten-Aktion ein Formular mit `Notice` im Popup ist (D3) – eine
starre `{label, onWaehlen}`-Liste könnte das nicht tragen.

`ZeilenMenue` wird auf `AktionsMenue` umgestellt (Verhalten und Tests unverändert, nur das
Gerüst wandert). Das ist Teil dieser Task, damit die Verhaltensregeln an **einer** Stelle stehen
(Lesson #369: Verhaltensvertrag in den Baustein legen, alle Konsumenten prüfen).

### D2 · `ListenZeile`: Slot `kennzeichen`

Neuer optionaler Slot **`kennzeichen?: ReactNode`** in `GemeinsameProps` (beide Betriebsarten):
Inhalt **im Tipp-Ziel**, rechts vom Textblock, vor dem Pfeil, **nicht verblasst**, `shrink-0`.
Die Auslagenzeile legt dort Betrag und `Badge` ab. `zustand` bleibt unverändert (neutrales Badge
+ Verblassen); beide Slots lassen sich kombinieren, die Auslagenzeile nutzt nur `kennzeichen`.
Kein Betrag-Spezialprop: der Baustein bleibt inhaltsneutral (ADR-052 D1), der Konsument formatiert
(`formatCents`) und wählt das `Badge`.

### D3 · Erstattung im Menü: Formular mit Notice im Popup

Der Eintrag „Als erstattet markieren"/„Erstattung zurücknehmen" ist ein `<form>` im Popup
(Hidden-Felder wie bisher, `useSchliessendeAction`, Toast bei Erfolg). Bei **Erfolg** schließt das
Menü; bei **Ablehnung** bleibt es offen und zeigt die Meldung als `Notice kind="fehler"` unter dem
Eintrag. „Bearbeiten" öffnet denselben Dialog wie der Tipp auf die Zeile; „Löschen" öffnet das
bestehende `ConfirmDialog` (spec-372, ADR-058 D4) mit dem Menü-Auslöser als Fokus-Rückgabe.

### D4 · Auslagen-Struktur

- `auslagen/page.tsx` (Server Component): `PageHeader` mit `action` = Anlege-Dialog
  (`AnlegeDialog`, ADR-053/spec-373-Muster), danach `AuslagenSummary`, danach die Liste bzw. der
  `Leerzustand`. Nur lesbar bei abgeschlossener Veranstaltung: kein Anlege-Auslöser, Zeilen im
  **Link-/Button-losen** Modus (siehe unten).
- `AuslageRow` (Client): `ListenZeile` im Auslöser-Betrieb (`onOeffnen`, ADR-060 D1) mit
  `kennzeichen` (Betrag + Badge), `aktion` = `AktionsMenue`, `anhang` = Bearbeiten-`Dialog`.
  Stabile Zeilen-`id` (`auslage-<id>`) als Ersatz-Fokusziel (Statuswechsel mountet nicht neu, aber
  Löschen entfernt die Zeile – bestehendes Ziel `AUSLAGEN_LISTE_ID` bleibt).
- `AuslageForm.tsx` enthält das Dialog-Formular `AuslageFormular` (Erfassen und Bearbeiten) mit
  dem Feld-Block (Muster `CatalogFields`); die Absende-/Dialoglogik liefert
  `useDialogFormular`/`DialogAktionen`, Felder über `Field`/`SelectField`. Der Anlege-Dialog
  „+ Neu" liegt als Client-Hülle in `AuslageErfassen.tsx`, weil die Seite ein Server Component
  ist und der `AnlegeDialog` eine Render-Funktion braucht.
- **Nur-lesen-Fall (F2):** `ListenZeile` hat keinen „weder Link noch Button"-Modus. Statt die
  API zu erweitern, rendert `AuslageRow` bei `editable === false` eine eigene, **reine
  Anzeigekarte** mit der von `ListenZeile` exportierten Kartenoptik (`KARTEN_CLASS`), ohne
  Tipp-Ziel und Menü. Das ist ein
  Kompromiss, der keine dritte Betriebsart am geteilten Baustein einführt; die zwei Darstellungen
  teilen sich Untertitel (`untertitel()`) und Kennzeichen (`AuslageKennzeichen`: Betrag, Badge).

## Alternativen

### D1 – Option A: Zweite feature-lokale Variante des Menüs
**Vorteile:** kein Eingriff in `ZeilenMenue`.
**Nachteile:** zwei Kopien der Fokus-/Außenklick-/Escape-Regeln, die auseinanderlaufen
(Lesson #369: „ein Fix im auffälligen Konsumenten ließ den Geschwister-Defekt stehen").

### D1 – Option B: Route-neutrales `AktionsMenue` mit Eintragsliste (`{label, onWaehlen}[]`)
**Nachteile:** trägt die Erstatten-Aktion samt `Notice` im Popup nicht.

### D1 – Option C: Route-neutrales `AktionsMenue` mit Render-Funktion + `MenueEintrag` (gewählt)

### D2 – Option A: Betrag/Badge in den Untertitel
**Nachteile:** Status nicht mehr als eigenständiges Badge erkennbar (AK2.2), Betrag nicht rechts
ausgerichtet; Kategorie und Notiz wären zwischen Betrag und Badge eingeklemmt.

### D2 – Option B: Neuer Slot `kennzeichen` (gewählt)
Ein Slot, inhaltsneutral, nutzt vorhandene `Badge`-Töne; `zustand` bleibt reserviert für
„deaktiviert/abgeschlossen" mit Verblassen.

### D2 – Option C: `zustand` um einen `tone`-Prop erweitern
**Nachteile:** vermischt „Zeile ist inaktiv" (Verblassen) mit „Zeile hat einen Status".

### D3 – Option A: Erstattungs-Fehler als Toast
Widerspricht spec-372 AK16 (Fehler bleiben `Notice` am Ort der Aktion).

### D3 – Option B: Notice im geöffneten Menü (gewählt)

## Begründung

Ein zweiter Konsument belegt das Muster, das ADR-053 D2 noch ausgeschlossen hat; das Gerüst an
einer Stelle zu halten ist billiger als zwei Kopien zu pflegen. `kennzeichen` ist die kleinste
Erweiterung, die Betrag und Badge trägt, ohne das Verblassen (ADR-059 D3) zu verwässern. Der
Nur-lesen-Fall ist ein Randfall einer einzigen Seite und rechtfertigt keine dritte Betriebsart
am geteilten Baustein.

## Konsequenzen

**Positiv:**
- Alle Zeilenmenüs der App teilen Tastatur-/Fokusverhalten und Optik.
- Auslagen laufen vollständig über Bausteine; `AuslageRow`/`AuslageForm`/`AuslagenSummary`
  kommen ins Farb-Gate.

**Negativ / Trade-offs:**
- Eingriff in zwei geteilte Dateien (`ListenZeile` +Slot, `ZeilenMenue` Umbau) – deren Tests
  müssen unverändert grün bleiben, dazu neue Tests für `AktionsMenue` und `kennzeichen`.
- Die Nur-lesen-Karte ist eine zweite Darstellung neben `ListenZeile`. Rahmen, Hintergrund und
  Schrift teilen beide über die exportierte Konstante `KARTEN_CLASS` (keine Kopie); Abstand und
  Innenrand (`gap-3 p-3`, wie das Tipp-Ziel) stehen als Literal in `AuslageRow` und können
  driften.

## Bezug zu anderen ADRs

- **ADR-053 D2:** Menü ist nicht mehr feature-lokal (abgelöst durch D1).
- **ADR-059 D1/D3, ADR-060 D1:** API-Erweiterung um `kennzeichen`; Verblassen unverändert.
- **ADR-058 D4, spec-372:** Löschbestätigung und Fehler-`Notice` am Ort der Aktion unverändert.
- **ADR-052 D3:** Farb-Gate – neue/umgebaute Dateien eintragen.
- **ADR-028:** Erstattungslogik und Summen unverändert.

## Implementierungs-Hinweise

1. TDD-Reihenfolge: `AktionsMenue` (+ `MenueEintrag`) mit Tests aus `ZeilenMenue.test.tsx`
   abgeleitet → `ZeilenMenue` darauf umstellen (Tests unverändert grün) → `ListenZeile`
   `kennzeichen` → `AuslageForm` als Feldblock + Dialoge → `AuslageRow` → Seite → Farb-Gate.
2. `eslint/ui-token-files.mjs`: `AuslageRow.tsx` besteht; ergänzen `AuslageForm.tsx`,
   `AuslagenSummary.tsx`, `[id]/auslagen/page.tsx` und jede neue Datei. `AktionsMenue.tsx`
   (über `app/components/ui/`) und `ZeilenMenue.tsx` (seit #369) sind bereits gedeckt.
3. Fokus: Dialog „Bearbeiten" über `useFormularDialog` (Rückgabe auf Zeile); Löschen über
   `useBestaetigung` wie heute, Rückgabe auf den ⋯-Auslöser bzw. `AUSLAGEN_LISTE_ID` nach
   Erfolg. Fokus-/Rezidiv-Lessons #371/#372/#373/#404 vor dem Bauen lesen.
4. E2E-Specs und Capture-Specs zu Auslagen per Grep nachziehen (Lesson #391: verschobener
   UI-Einstieg); `docs/ux/glossar.md`-Abweichungszeilen für Auslagen erledigen (AK6.6);
   `docs/routes.md` bleibt (keine Routenänderung).
5. Playwright-Locatoren: `exact: true` (Lesson #372), Server auf eigenem Port.
