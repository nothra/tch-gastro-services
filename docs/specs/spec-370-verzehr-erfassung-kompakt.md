# Spec: Verzehr-Erfassung kompakt und touch-tauglich

> Issue #370 · UX-3 der UX-Überarbeitung (`docs/ux/ux-issue-entwuerfe.md`) · Abhängig von
> #368 (UI-Grundlage, gemerged; [spec-368](spec-368-ui-grundlage.md), ADR-052) · Überschneidung
> mit #205 (Rand-Bleed der Chip-Leiste, löst sich durch den Umbau auf).
>
> Richtungsvorgabe: klickbares Mockup (privates Artifact, im Issue verlinkt) – hier nur als
> Orientierung für Aufbau und Reihenfolge, **nicht** als Pixelvorgabe. Wo Mockup und Issue-AK
> auseinandergehen (Chip-Höhe 40 px vs. 44 px), gilt der Issue-AK.

## Kontext

Die Verzehr-Erfassung ist der meistgenutzte Arbeitsschritt am Handy, oft einhändig an der Theke.
Heute quetscht der Kartenkopf Name und Kategorie-Summen nebeneinander (Name bricht dreizeilig
um), aufgeklappt folgt eine lange, gleichförmige Liste aller Kategorien mit winziger
Überschrift, Artikel mit mehreren Größen sind eingerückt, einzelne nicht, und die +/−-Knöpfe
messen 32 px – zu klein für den Theken-Einsatz.

Beide Zugangswege nutzen dieselbe route-neutrale Erfassungs-UI (`app/_verzehr/`): die
Veranstalter-Seite (`/veranstaltung/[id]/verzehr`) und die öffentliche Theke (`/theke/[token]`).

## Entscheidung (2026-10-01, Ralf): Einzelansicht statt Akkordeon

Die Erfassung zeigt **eine Person auf einmal** (Personen-Chips oben, darunter nur Kopf und
Artikel dieser Person), wie im Mockup. Das ersetzt das Fokus-Akkordeon („genau eine Karte offen
oder keine", ADR-035 D2/ADR-039 D3). **Bewusste Konsequenz:** Die Summen der anderen Personen
stehen in der Erfassung nicht mehr untereinander auf dem Schirm; die „volle Transparenz" aus
[spec-54](spec-54-selbstbedienung-link.md) (AC B, Liste mit laufenden Summen vor der Namenswahl)
wird in der Erfassung nicht mehr über Kartenköpfe erfüllt. Gesamtsichten bleiben in Detailseite
und Kassieren (#369/#371). → **ADR-Trigger:** ADR-039 wird ergänzt/abgelöst, ADR-035 D2 und
spec-54 AC B sind anzupassen (`/architecture`).

## Scope

**Inbegriffen:**
- Umbau von `app/_verzehr/` (`VerzehrErfassung`, `FokusListe`, `MengeControl`) auf
  Einzelansicht: sticky Kopf, Kategorie-Umschalter, einheitliches Zeilenmuster,
  44-px-Bedienelemente, „Nächste Person".
- Beide Einstiege (F5 Veranstalter, F7 Theke inkl. Identitäts-Gate und Lese-Ansicht).
- Umstellung der berührten Dateien auf Bausteine/Tokens aus #368 (ADR-052).
- Neu erzeugte Anleitungs-Screenshot `docs/anleitung/veranstalter/bilder/08-verzehr.png` (AK7.5).

**Nicht inbegriffen:**
- Seitenköpfe/Zurück-Navigation der beiden Seiten (#369, #374), Kassieren (#371),
  Bestätigen/Rückmelden (#372), Wording-Glossar (#375).
- Fachlogik: Summenformeln, Server-Actions, Delta-Protokoll (±1), Katalogbindung,
  Rate-Limit-Verhalten bleiben unverändert.
- Neuer Identitäts-Flow der Theke (Erfasser/Ziel, ADR-035 D1) – nur die Darstellung ändert sich.

## Akzeptanzkriterien

### Kopf der aktiven Person (AK1)
- [ ] **AK1.1** GIVEN eine aktive Person WHEN die Erfassung angezeigt wird THEN zeigt der Kopf den
  Namen groß, den Gesamtbetrag groß rechts daneben und darunter klein die Aufschlüsselung
  Getränke · Kaffee · Essen mit Beträgen (Betragsziffern gleicher Breite).
- [ ] **AK1.2** GIVEN ein langer Name (z. B. „Familie Müller-Lüdenscheidt-Hoffmann") bei 375 px
  WHEN der Kopf gerendert wird THEN bricht der Gesamtbetrag nicht um und bleibt lesbar; der Name
  darf umbrechen, aber höchstens auf zwei Zeilen (danach Kürzung mit Auslassung).
- [ ] **AK1.3** GIVEN die Liste ist länger als der Bildschirm WHEN der Nutzer scrollt THEN bleiben
  Personen-Chips, Kopf und Kategorie-Umschalter (AK2) sichtbar am oberen Rand stehen.
- [ ] **AK1.4** GIVEN die Person ändert ihren Verzehr WHEN der Server die Aktion bestätigt THEN
  zeigen Gesamtbetrag und Aufschlüsselung im Kopf den neuen Wert (server-autoritativ, keine
  optimistische Anzeige – Verhalten wie heute).

### Personen-Wahl (AK1a)
- [ ] **AK1a.1** GIVEN eine Veranstaltung mit n ≥ 1 Teilnehmern WHEN die Erfassung geöffnet wird
  THEN steht pro Teilnehmer ein Chip in der Liste-Reihenfolge; genau einer ist als aktiv
  markiert (`aria-pressed`/`aria-current`, nicht nur Farbe) und dessen Verzehr ist sichtbar.
- [ ] **AK1a.2** GIVEN ein Chip einer anderen Person WHEN er angetippt wird THEN wechselt die
  Einzelansicht auf diese Person; bei der Theke wird dabei wie heute das geräte-lokal gemerkte
  Ziel aktualisiert (`onFokusWechsel`); bei der Veranstalter-Seite gibt es keine Merkung.
- [ ] **AK1a.3** GIVEN die Chip-Leiste ist breiter als der Bildschirm WHEN der Nutzer wechselt THEN
  ist der aktive Chip sichtbar (horizontal in den Sichtbereich gescrollt) und die Leiste
  erzeugt keinen horizontalen Seiten-Scroll.
- [ ] **AK1a.4** GIVEN eine Person mit erfasstem Verzehr (Summe > 0) WHEN die Chips angezeigt
  werden THEN ist sie am Chip erkennbar (Punkt/Marke mit Textalternative, nicht nur Farbe).
  *(Aus dem Mockup übernommen, bestätigt 2026-10-02.)*
- [ ] **AK1a.5** GIVEN der Aufruf der Veranstalter-Seite trägt einen gültigen Personenbezug
  (`?zeile=`, #308) WHEN die Seite lädt THEN ist genau diese Person aktiv und im Sichtbereich;
  GIVEN ein Aufruf ohne oder mit ungültigem Bezug THEN ist die erste Person der Liste aktiv
  (fail-soft, keine Fehlermeldung – unverändert zu #308 F1).
- [ ] **AK1a.6** GIVEN die Theke mit gemerktem Ziel WHEN die Erfassung erscheint THEN ist das Ziel
  aktiv; ohne gültiges Ziel führt weiterhin das Identitäts-Gate („Wer bist du?" → „Für wen?").

### Kategorie-Umschalter (AK2)
- [ ] **AK2.1** GIVEN ein Katalog mit Artikeln in mehreren Kategorien WHEN die Erfassung angezeigt
  wird THEN gibt es einen Umschalter mit den Kategorien (Getränke, Kaffee, Essen) und es ist
  **immer genau eine** Kategorie sichtbar; der aktive Eintrag ist nicht nur farblich erkennbar.
- [ ] **AK2.2** GIVEN der Umschalter WHEN eine Kategorie gewählt wird THEN zeigt die Liste nur deren
  Artikel; die anderen Kategorien sind nicht im Dokument sichtbar.
- [ ] **AK2.3** GIVEN ein Katalog ohne aktive Artikel einer Kategorie (z. B. stehende Theke ohne
  Essen, ADR-023 §D7) WHEN der Umschalter gebaut wird THEN erscheint diese Kategorie nicht als
  Eintrag; gibt es nur eine Kategorie, entfällt der Umschalter nicht zwingend, zeigt aber
  keinen leeren Eintrag.
- [ ] **AK2.4** GIVEN die Erfassung wird geöffnet THEN ist die erste vorhandene Kategorie in der
  Reihenfolge Getränke, Kaffee, Essen vorgewählt; GIVEN der Nutzer wechselt die Person THEN
  bleibt die gewählte Kategorie erhalten (Zügig-Erfassen derselben Kategorie für mehrere
  Personen). *(Bestätigt 2026-10-02.)*
- [ ] **AK2.5** GIVEN eine Person hat eine Position auf einem inzwischen deaktivierten Artikel
  (Menge > 0, ADR-026 D3) WHEN ihre Ansicht angezeigt wird THEN bleibt diese Position sichtbar und
  korrigierbar, und zwar als zusätzlicher Umschalter-Eintrag „Nicht mehr im Katalog", der **nur**
  erscheint, wenn die aktive Person solche Positionen hat. *(Platzierung bestätigt 2026-10-02.)* GIVEN keine solchen Positionen THEN erscheint der Eintrag nicht.

### Zeilenmuster (AK3)
- [ ] **AK3.1** GIVEN die sichtbare Kategorie WHEN Artikel gerendert werden THEN bilden
  gleichnamige Artikel eine Gruppe mit dem Artikelnamen als Gruppenüberschrift, und **jede
  Größe** steht in genau einer Zeile mit Größe, Preis und Stepper.
- [ ] **AK3.2** GIVEN ein Artikel mit nur einer Größe WHEN er gerendert wird THEN folgt er demselben
  Muster (Name als Gruppenüberschrift, eine Zeile) – keine abweichende Einrückung, kein
  eigenes Einzelzeilen-Layout.
- [ ] **AK3.3** GIVEN ein Artikel ohne Größenangabe (`size` leer) WHEN er gerendert wird THEN zeigt
  die Zeile eine sinnvolle Beschriftung (heute „ohne Größe" in Gruppen, sonst nur der Name);
  die Regel ist für Gruppen- und Einzelfall **einheitlich**.
- [ ] **AK3.4** GIVEN Preise WHEN sie angezeigt werden THEN im deutschen Format mit „€" und
  Ziffern gleicher Breite, sodass Beträge untereinander bündig stehen.
- [ ] **AK3.5** GIVEN die Gruppenüberschrift WHEN sie gerendert wird THEN ist sie als Überschrift
  erkennbar (Schriftgröße/-stärke über Fließtext, nicht das winzige graue Label von heute).

### Touch-Ziele (AK4)
- [ ] **AK4.1** GIVEN ein Stepper WHEN „−" und „+" gerendert werden THEN messen beide mindestens
  44 × 44 px (gemessen, nicht nur Klasse).
- [ ] **AK4.2** GIVEN Personen-Chips und Kategorie-Umschalter WHEN sie gerendert werden THEN messen
  sie in der Höhe mindestens 44 px, Chips zusätzlich in der Breite mindestens 44 px.
- [ ] **AK4.3** GIVEN die Menge einer Position ist 0 WHEN der Stepper gerendert wird THEN ist „−"
  deaktiviert (`disabled`, nicht auslösbar, erkennbar); ab Menge 1 ist es aktiv.
- [ ] **AK4.4** GIVEN eine laufende Aktion (pending) WHEN sie noch nicht bestätigt ist THEN sind die
  Knöpfe der betroffenen Position deaktiviert (Verhalten wie heute, kein Doppelklick-Verlust);
  das gilt, solange die Person angezeigt wird (ADR-054 D2).
- [ ] **AK4.5** GIVEN die Menge WHEN sie angezeigt wird THEN ist sie groß genug lesbar und in
  Ziffern gleicher Breite; Menge 0 ist zurückgenommen dargestellt (erkennbar „leer").
- [ ] **AK4.6** GIVEN Knöpfe und Bedienelemente THEN sind sie Bausteine aus `app/components/ui/`
  (Button o. ä.) bzw. nutzen deren Touch-Mindesthöhe; keine neue Kopie eines Klassenstrings.

### Nächste Person (AK5)
- [ ] **AK5.1** GIVEN mindestens zwei Teilnehmer WHEN die Erfassung angezeigt wird THEN steht in einer fixierten Fußleiste am unteren Rand (beim Scrollen sichtbar, andere
  Inhalte nicht überdeckend) eine Schaltfläche „Nächste Person →", die auf die in der Liste
  folgende Person wechselt (Wirkung wie ein Chip-Tipp, AK1a.2).
- [ ] **AK5.2** GIVEN die aktive Person ist die letzte der Liste WHEN „Nächste Person →" getippt
  wird THEN wechselt die Ansicht auf die **erste** Person (Umlauf); die Schaltfläche ist bei
  jeder Person vorhanden, sofern es mindestens zwei Teilnehmer gibt. *(Entschieden 2026-10-02;
  das Mockup zeigte stattdessen „Alle erfasst · Kassieren" auf der Veranstalter-Seite.)*
- [ ] **AK5.3** GIVEN der Wechsel zur nächsten Person WHEN er ausgeführt wird THEN beginnt die
  Ansicht der neuen Person am Anfang (Kopf sichtbar, Liste oben) – keine übernommene
  Scroll-Position der vorigen Person.
- [ ] **AK5.4** GIVEN nur ein Teilnehmer WHEN die Erfassung angezeigt wird THEN erscheinen keine
  „Nächste Person"-Schaltfläche (ein einzelner Chip ist zulässig; ein Umlauf auf sich selbst
  entfiele ohnehin).
- [ ] **AK5.5** GIVEN die Veranstalter-Seite WHEN die Fußleiste angezeigt wird THEN bleibt der
  personenbezogene Weg „Kassieren →" (#308) erreichbar, und zwar **in der Fußleiste** neben
  „Nächste Person"; er ist auch in der Lese-Ansicht (abgeschlossen) vorhanden, reine Navigation
  (#308 AK10). GIVEN die Theke THEN bietet sie ihn nicht an (#308 AK9).

### Beide Einstiege und Lese-Ansicht (AK6)
- [ ] **AK6.1** GIVEN die Veranstalter-Seite und die Theke WHEN sie dieselben Daten laden THEN
  rendern beide dieselbe Einzelansicht aus `app/_verzehr/` (keine duplizierte Variante je
  Einstieg); Unterschiede kommen nur über Props (Action, `editable`, Kassieren-Link, Fokus-Callback).
- [ ] **AK6.2** GIVEN eine abgeschlossene Veranstaltung (`editable=false`) WHEN die Ansicht erscheint
  THEN sind Kopf, Personen-Wahl und Kategorie-Umschalter nutzbar, die Mengen aber nur
  lesend dargestellt (kein Stepper, keine Schreib-Aktion) – Lese-Sicht bleibt vollständig
  einsehbar, nicht versteckt (Codify #54).
- [ ] **AK6.3** GIVEN die Theke vor der Namenswahl (Identitäts-Gate, Schritt 1/2) WHEN die Seite
  lädt THEN bleibt die Wahl-Frage wie heute führend, und darunter steht eine **Nur-Lese-Liste mit
  Name und Gesamtbetrag** je Teilnehmer (keine Aufschlüsselung, keine Artikel, nicht
  bearbeitbar). *(Entschieden 2026-10-02.)*
- [ ] **AK6.4** GIVEN eine Veranstaltung ohne Teilnehmer WHEN die Erfassung geöffnet wird THEN
  erscheint unverändert der bestehende Hinweis (Veranstalter: `KEIN_TEILNEHMER_HINWEIS`; Theke:
  „bitte an den Veranstalter wenden"), keine leere Einzelansicht.

### Querschnitt (AK7)
- [ ] **AK7.1** GIVEN `app/_verzehr/` WHEN die Umstellung fertig ist THEN steht das Verzeichnis in
  `eslint/ui-token-files.mjs`, und `pnpm lint` ist grün: keine rohen Tailwind-Farbklassen und
  kein `dark:` in diesen Dateien (ADR-052, PROJECT-CONTEXT „Projektspezifische Konventionen").
- [ ] **AK7.2** GIVEN die Einzelansicht WHEN sie bei 375 px in hell **und** dunkel gegen den lokalen
  Dev-Server durchgeklickt wird THEN ist nichts abgeschnitten oder unlesbar, kein horizontaler
  Seiten-Scroll entsteht, und Fußleiste sowie sticky Kopf überdecken keine bedienbaren
  Elemente (Nachweis: E2E/Screenshot; Screenshot-Anhang am PR ist ein menschlicher Schritt,
  `gh` lädt keine Bilder hoch).
- [ ] **AK7.3** GIVEN die Fachlogik WHEN die bestehenden Unit-, Integrations- und E2E-Tests laufen
  THEN sind sie grün; Anpassungen betreffen nur Struktur/Selektoren (Akkordeon →
  Einzelansicht), keine fachlichen Erwartungen. Die Tests zum alten Akkordeon-Verhalten
  (mehrere Karten, genau eine offen) werden durch Tests der Einzelansicht ersetzt, nicht
  stillschweigend gelöscht.
- [ ] **AK7.4** GIVEN #205 (Rand-Bleed der Chip-Leiste hart kodiert) WHEN der Umbau fertig ist THEN
  existiert kein hart kodierter Rand-Bleed (`-mx-6`/`px-6`) mehr in der route-neutralen
  Komponente; ein Layout-Offset kommt, wo nötig, vom Konsumenten per `className`. Das Issue
  #205 ist damit erledigt und wird im PR mit `Closes #205` geschlossen, sofern der Befund
  wegfällt.
- [ ] **AK7.5** GIVEN die Anleitung für Veranstalter WHEN der Umbau fertig ist THEN zeigt
  `docs/anleitung/veranstalter/bilder/08-verzehr.png` die neue Einzelansicht (neu erzeugt wie
  bei #388 für 05/07, 375 px) und etwaiger erklärender Text neben dem Bild passt dazu.

## Fehlerszenarien
- [ ] **FS1** GIVEN eine Action antwortet mit regulärem Fehlerzustand (z. B. Drossel, ADR-044) WHEN
  der Nutzer „+" oder „−" tippt THEN bleibt die alte Menge stehen und der Fehler erscheint inline
  an der betroffenen Zeile (ohne Layout-Sprung der Fußleiste); Nachricht nicht nur farblich. Das gilt,
  solange die Person angezeigt wird (ADR-054 D2).
- [ ] **FS2** GIVEN eine Antwort außerhalb des Server-Action-Protokolls (429-Klartext, Offline)
  WHEN sie eintrifft THEN greift unverändert die bestehende Fehlergrenze der Theke (#331);
  die Einzelansicht führt dafür keinen eigenen Fangweg ein.
- [ ] **FS3** GIVEN die aktive Person verschwindet (Teilnehmer wurde parallel entfernt) WHEN die
  Seite neu lädt THEN fällt die Ansicht auf die erste vorhandene Person zurück (fail-soft,
  wie bei ungültigem Personenbezug).
- [ ] **FS4** GIVEN Veranstaltung wird während der Erfassung abgeschlossen WHEN der Nutzer tippt
  THEN lehnt der Server wie heute ab; die Anzeige zeigt die Ablehnung inline.
- [ ] **FS5** GIVEN gemerktes Ziel/Erfasser der Theke ist nicht mehr in der Liste (stale) WHEN die
  Seite lädt THEN greift unverändert die bestehende Stale-Behandlung des Gates.

## Offene Fragen

Keine. Entschieden am 2026-10-02: Nur-Lese-Liste (Name + Gesamt) vor der Namenswahl, Kategorie
bleibt beim Personenwechsel, „Nicht mehr im Katalog" als Umschalter-Eintrag, Punkt „hat Verzehr"
am Chip, „Nächste Person" läuft von der letzten zur ersten Person, Anleitungs-Screenshot 08 wird
in diesem PR neu erzeugt.
