# Spec: Bausteine „ListenZeile" und „Aufklapper", Veranstaltungsliste angleichen

> Issue #403 · Teil des UI-Feinschliffs nach #368–#375. Basis-Issue: Teilnehmer-Verwaltung,
> Auslagen und Katalog-Seite bauen später auf diesen Bausteinen auf (eigene Issues, **nicht** hier).

## Kontext

Nach der UX-Überarbeitung gibt es zwei sichtbare Inkonsistenzen:

1. **Aufklappbereiche sind nicht als solche erkennbar.** Das `<summary>` trägt `flex`, wodurch
   Chrome und Firefox das native Dreieck entfernen; ein eigener Pfeil fehlt. „Abgeschlossen (3)"
   sieht aus wie eine Überschrift. Betroffen: Veranstaltungsliste, „Abrechnung im Detail"
   (Kassieren). `VerzehrAufschluesselung` zeigt ein Dreieck, aber in rohen Farben.
2. **Listenzeilen sehen je Seite anders aus** (Rahmenfarbe, Hintergrund, Hover) und
   „inaktiv/abgeschlossen" wird je Seite anders dargestellt.

Ziel: zwei route-neutrale Bausteine unter `app/components/ui/` (ADR-052), die dieses Aussehen
und Verhalten einmal festlegen, plus die Umstellung der in #403 genannten Konsumenten.

Primärer Nutzer: Rollen `veranstalter`/`verwalter`, überwiegend am Smartphone.

## Scope

**Inbegriffen:**
- Baustein **Aufklapper** und Baustein **ListenZeile** (`app/components/ui/`).
- Umstellung: Veranstaltungsliste (`/veranstaltung`), offene Veranstaltungen auf der Startseite,
  Arbeitsschritt-Kacheln und Detail-Teilnehmerzeile (`ZeileRow`) auf ListenZeile.
- Umstellung: „Abrechnung im Detail" (Kassieren) und `VerzehrAufschluesselung` auf Aufklapper.
- `VerzehrAufschluesselung.tsx` und `KassierZeilenListe.tsx` kommen ins Farb-Gate
  (`eslint/ui-token-files.mjs`) – dafür verlieren sie ihre rohen Farbklassen.

**Nicht inbegriffen:**
- Teilnehmer-Verwaltung (`TeilnehmerRow`), Auslagen (`AuslageRow`), Katalog-Seite – eigene Issues.
- Umbau der Kassier-Zeilen auf ListenZeile (die Zeilen in `KassierZeilenListe` behalten ihre
  Struktur; nur ihre Farben werden tokenisiert).
- Änderung von Routen, Daten, Berechtigungen oder Sortierung der Listen.

## Akzeptanzkriterien

### Baustein Aufklapper (Issue-AK1)

- [ ] **AK1.1** GIVEN ein Aufklapper WHEN er gerendert wird THEN ist er ein natives
  `<details>`/`<summary>` und zeigt vor dem Titel einen eigenen Pfeil (kein natives Dreieck).
- [ ] **AK1.2** GIVEN ein zugeklappter Aufklapper WHEN er geöffnet wird THEN dreht sich der Pfeil
  in die „offen"-Stellung; beim Schließen zurück.
- [ ] **AK1.3** GIVEN ein Aufklapper mit Titel und Zähler WHEN er gerendert wird THEN zeigt er den
  Titel samt Zähler (z. B. „Abgeschlossen (3)") und rechts den Hinweis „Anzeigen" (zu) bzw.
  „Ausblenden" (offen).
- [ ] **AK1.4** GIVEN der Aufklapper WHEN er ohne Angabe gerendert wird THEN ist er zugeklappt;
  mit „initial offen" ist er beim Laden aufgeklappt.
- [ ] **AK1.5** GIVEN Tastaturbedienung WHEN `Tab` den Aufklapper fokussiert und `Enter`/`Leertaste`
  gedrückt wird THEN wechselt er den Zustand, und der Fokusring ist sichtbar.
- [ ] **AK1.6** GIVEN der Baustein WHEN sein Quelltext geprüft wird THEN enthält er nur
  Token-Farbklassen (kein rohes Tailwind-Farbwort, kein `dark:`); die Datei liegt im
  Farb-Gate (`app/components/ui/` ist dort bereits eingetragen).
- [ ] **AK1.7** GIVEN der Titel eines Aufklappers WHEN ein Konsument ihn setzt THEN bleibt die
  Überschriften-Semantik erhalten, wo die Seite sie braucht (die Gruppe ist per Screenreader
  als Abschnitt mit Namen auffindbar, wie heute `aria-labelledby`).

### Baustein ListenZeile (Issue-AK2)

- [ ] **AK2.1** GIVEN eine ListenZeile WHEN sie gerendert wird THEN ist sie eine Karte mit
  `bg-surface`, `border-line-subtle`, `rounded-lg`, und die **ganze Zeile** ist Tipp-Ziel.
- [ ] **AK2.2** GIVEN eine ListenZeile WHEN die Maus darüber fährt oder sie Fokus hat THEN wechselt
  sie auf `border-accent bg-accent-subtle` und zeigt einen sichtbaren Fokusring.
- [ ] **AK2.3** GIVEN die Variante „führt woandershin" WHEN sie gerendert wird THEN ist sie ein
  Link und zeigt rechts einen Pfeil; das Linkziel (`href`) und das Prefetch-Verhalten
  (`prefetch={false}` auf der Startseite, ADR-031) werden vom Konsumenten bestimmt und
  unverändert durchgereicht.
- [ ] **AK2.4** GIVEN die Variante „mit Zeilenaktion" WHEN sie gerendert wird THEN zeigt sie rechts
  den ⋯-Knopf (Zeilenmenü); der Knopf liegt **neben**, nicht **in** dem Link/Tipp-Ziel
  (keine verschachtelten interaktiven Elemente), und ein Tipp auf den Knopf löst die
  Zeilen-Navigation nicht aus.
- [ ] **AK2.5** GIVEN der Zustand „verblasst" WHEN er gesetzt ist THEN sind Titel, Untertitel und
  Pfeil der Zeile mit `opacity-60` abgeblendet und die Zeile trägt ein **nicht** abgeblendetes
  Badge (Ton `neutral`) mit dem Text des Zustands (z. B. „abgeschlossen", „deaktiviert"); der
  Zustand steht zusätzlich als Text, nie nur als Abblendung (Badge-Regel spec-368 AK2.9).
  Der Untertitel nutzt dabei `text-foreground` statt `text-muted`, damit Titel und Untertitel
  im abgeblendeten Zustand ≥ 4,5 : 1 behalten (ADR-059 D3; Abweichung vom Issue-Wortlaut
  „Zeile `opacity-60`", aus Q1).
- [ ] **AK2.6** GIVEN lange Texte WHEN Titel oder Untertitel nicht in die Zeile passen THEN brechen
  sie um (`break-words`), statt Pfeil/Knopf aus dem Bild zu schieben.
- [ ] **AK2.7** GIVEN der Baustein WHEN sein Quelltext geprüft wird THEN enthält er nur Token-Farben
  (kein rohes Tailwind-Farbwort, kein `dark:`).
- [ ] **AK2.8** GIVEN die Zeile WHEN sie rendert THEN ist die Tippfläche mindestens 44 px hoch
  (`min-h-11`, wie bisher).

### Veranstaltungsliste `/veranstaltung` (Issue-AK3)

- [ ] **AK3.1** GIVEN die Liste mit offenen und abgeschlossenen Veranstaltungen WHEN die Seite lädt
  THEN sind „Offen (n)" und „Abgeschlossen (m)" je ein Aufklapper.
- [ ] **AK3.2** GIVEN die Seite WHEN sie lädt THEN ist „Offen" aufgeklappt und „Abgeschlossen"
  zugeklappt.
- [ ] **AK3.3** GIVEN abgeschlossene Veranstaltungen WHEN „Abgeschlossen" aufgeklappt wird THEN
  sind deren Zeilen verblasst und tragen das Badge „abgeschlossen".
- [ ] **AK3.4** GIVEN keine offene Veranstaltung, aber abgeschlossene WHEN die Seite lädt THEN
  zeigt „Offen (0)" im aufgeklappten Zustand weiterhin den bisherigen Leerzustand
  „Keine offene Veranstaltung." mit der Anlege-Aktion (unverändert).
- [ ] **AK3.5** GIVEN keine abgeschlossene Veranstaltung WHEN die Seite lädt THEN erscheint der
  Abschnitt „Abgeschlossen" nicht (unverändert); GIVEN gar keine Veranstaltung THEN gilt der
  Leerzustand „Noch keine Veranstaltung angelegt." unverändert.
- [ ] **AK3.6** GIVEN die Zeilen WHEN sie gerendert werden THEN zeigen sie weiter Bezeichnung und
  „Datum · Katalog · Kasse", Reihenfolge innerhalb der Gruppen unverändert (spec-373 AK2.3,
  AK7), Link auf `/veranstaltung/<id>`.

### Weitere ListenZeile-Konsumenten (Issue-AK4)

- [ ] **AK4.1** GIVEN offene Veranstaltungen auf der Startseite WHEN sie gerendert werden THEN
  nutzen sie ListenZeile (Variante „führt woandershin") mit unverändertem Inhalt, Link und
  `prefetch={false}`.
- [ ] **AK4.2** GIVEN die drei Arbeitsschritt-Kacheln der Detailseite WHEN sie gerendert werden
  THEN nutzen sie ListenZeile; Titel, Kennzahl (nur bei offener Veranstaltung), Link auf die
  Unterseite und das Dreispalten-Raster bleiben unverändert.
- [ ] **AK4.3** GIVEN die Teilnehmerzeile der Detailseite (`ZeileRow`) WHEN sie gerendert wird THEN
  nutzt sie ListenZeile; bei `editable` mit der Variante „mit Zeilenaktion" (⋯ → Entfernen mit
  Bestätigung, unverändert), sonst ohne Knopf. Der Name führt weiter in die Verzehr-Erfassung
  dieser Person.
- [ ] **AK4.4** GIVEN Veranstaltungsliste, Startseite, Kacheln und Detail-Teilnehmer WHEN sie
  nebeneinander betrachtet werden THEN haben sie dieselbe Karten-Optik (Rahmen, Hintergrund,
  Radius, Hover) – es gibt in diesen Dateien kein eigenes Zeilen-Styling mehr.

### Aufklapper-Konsumenten und Farb-Gate (Issue-AK5)

- [ ] **AK5.1** GIVEN die Kassieren-Seite WHEN sie gerendert wird THEN ist „Abrechnung im Detail"
  ein Aufklapper (zugeklappt, mit Pfeil und „Anzeigen"/„Ausblenden"), Inhalt unverändert.
- [ ] **AK5.2** GIVEN eine Teilnehmerzeile mit Verzehr WHEN `VerzehrAufschluesselung` gerendert wird
  THEN ist sie ein Aufklapper (zugeklappt) mit Pfeil; Tabelleninhalt (Menge, Artikel,
  Einzelpreis, Betrag) und Leertext „Kein Verzehr erfasst" bleiben unverändert.
- [ ] **AK5.3** GIVEN `VerzehrAufschluesselung.tsx` und `KassierZeilenListe.tsx` WHEN `pnpm lint`
  läuft THEN stehen beide in `eslint/ui-token-files.mjs` und enthalten keine rohen
  Farbklassen/`dark:` mehr.
- [ ] **AK5.4** GIVEN die hervorgehobene Zielzeile eines personenbezogenen Aufrufs (#308) WHEN die
  Farben auf Tokens umgestellt sind THEN ist die Zielzeile weiterhin klar von den übrigen
  Zeilen unterscheidbar; Scroll-in-den-Sichtbereich, eingefrorene Reihenfolge (#253) und
  Inhalt sind unverändert.

## Fehlerszenarien

- [ ] **F1** GIVEN JavaScript ist nicht verfügbar/noch nicht hydriert WHEN ein Aufklapper
  bedient wird THEN funktioniert Auf-/Zuklappen trotzdem (natives `<details>`); die
  Hinweis-Wechsel „Anzeigen"/„Ausblenden" darf nicht an JS hängen.
- [ ] **F2** GIVEN Zeilen mit sehr langem Namen/Untertitel WHEN gerendert THEN kein horizontaler
  Überlauf, Pfeil/⋯ bleiben sichtbar und bedienbar (AK2.6).
- [ ] **F3** GIVEN eine verblasste Zeile WHEN gerendert THEN bleibt der Text lesbar – Kontrast von
  Titel und Untertitel bei `opacity-60` ist gegen die Token-Farben geprüft (siehe Offene Fragen).
- [ ] **F4** GIVEN eine ListenZeile mit Zeilenaktion WHEN der ⋯-Knopf per Tastatur bedient wird THEN
  bleibt er fokussierbar und löst die Zeilennavigation nicht aus (AK2.4).

## Offene Fragen

> **Entschieden in `/architecture` (ADR-059):** Q1 → `opacity-60` nur auf Text/Pfeil, Badge
> unabgeblendet, Untertitel `text-foreground` (AK2.5 angepasst); Q2 → `pfeil={false}` an den
> Kacheln; Q3 → Titel „Verzehr"; Q4 → Zähler optional; Q5 → ADR-059 geschrieben.

- [x] **Q1 Kontrast bei `opacity-60`:** Die Vorgabe `opacity-60` dämpft auch Text. Muss der
  Kontrast (WCAG AA, 4,5 : 1) im hellen **und** dunklen Theme gemessen werden? *Vorschlag:*
  ja – bei Unterschreitung gilt der Kontrast vor `opacity-60` (Wert anpassen, Entscheidung
  in `/architecture` bzw. `/implement`).
- [ ] **Q2 Pfeil in den Arbeitsschritt-Kacheln:** Die Kacheln stehen dreispaltig, ein rechter Pfeil
  je Kachel wäre auf dem Smartphone sehr eng. *Vorschlag:* ListenZeile bekommt die Variante
  „führt woandershin" **ohne** Pfeil als Option für Kacheln (Karten-Optik identisch, Pfeil
  entfällt wegen der Breite).
- [ ] **Q3 Titel der Verzehr-Aufschlüsselung:** Heute „Verzehr anzeigen" (Link-Optik). Im
  Aufklapper mit Hinweis „Anzeigen" wäre das doppelt. *Vorschlag:* Titel „Verzehr", Hinweis
  rechts „Anzeigen"/„Ausblenden".
- [ ] **Q4 Zähler:** Soll der Zähler im Titel immer sichtbar sein oder nur, wenn ein Konsument ihn
  übergibt? *Vorschlag:* optionaler Prop – „Abrechnung im Detail" und „Verzehr" haben keinen.
- [ ] **Q5 Ist der `/architecture`-Schritt nötig?** Zwei neue UI-Bausteine mit Varianten-API und
  ein Nachtrag zu ADR-052 (D1: Bausteine) sind wahrscheinlich; ein eigenes ADR nur, wenn
  die Variantenaufteilung (Link vs. Aktion) eine Grundsatzentscheidung ist.
