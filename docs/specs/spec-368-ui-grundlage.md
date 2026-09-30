# Spec: Gemeinsame UI-Grundlage (Tokens, Bausteine, Schrift)

> Issue: #368 (UX-1) · Teil der UX-Überarbeitung, Übersicht und Abhängigkeiten:
> [`docs/ux/ux-issue-entwuerfe.md`](../ux/ux-issue-entwuerfe.md). Die Richtung (Mockup) ist
> abgenommen. **ADR-Trigger:** ja → `/architecture` vor `/implement` (siehe „Offene Fragen").

## Kontext

Es gibt keine gemeinsamen UI-Bausteine. Jede UI-Datei unter `app/` stylt selbst. Das führt
zu sichtbaren Brüchen: Der Hauptbutton existiert in 6 Varianten und zwei Farbfamilien
(Katalog `blue-600`, sonst `cyan-700`, Hover nur bei Blau), der Nebenbutton in 7+ Varianten mit
drei Eckenradien, und derselbe Eingabefeld-Klassenstring ist 9× kopiert. Die geladene Schrift
Geist wird durch einen Arial-Override in `app/globals.css` nie angezeigt. Überschriften heben
sich kaum vom Fließtext ab, und Fehler-/Erfolgsfarben haben keine Dunkel-Variante.

Die folgenden UX-Issues #369–#374 setzen alle auf dieser Grundlage auf. Ohne sie würde jedes
dieser Issues die Stilfragen erneut und anders beantworten.

**Primäre Nutzer:** Veranstalter und Verwalter am Handy (375 px Breite, Touch), teils in
dunkler Umgebung (Dunkelmodus des Geräts).

## Scope

**Inbegriffen:**
- Zentrale Farb-Tokens für hell und dunkel, im Tailwind-Theme nutzbar.
- Sechs Bausteine: `Button`, `Field`, `Card`, `Badge`, `Notice`, `PageHeader`, jeweils mit Tests.
- Schrift Geist tatsächlich aktiv. Festgelegte Typo-Skala (h1/h2/h3). Beträge in Ziffern
  gleicher Breite.
- Umstellung als Nachweis: **Login-Seite** (`app/login/**`) und **Katalog-Bereich**
  (`app/verwaltung/katalog/**`, also Übersicht **und** `[id]`-Detail mit allen dort
  gerenderten Komponenten).
- Automatische Prüfung (Gate), die rohe Tailwind-Farbklassen in umgestellten Dateien ablehnt.
  Die Liste der umgestellten Dateien ist erweiterbar, damit #369–#374 sie fortschreiben.

**Nicht inbegriffen:**
- Umbau weiterer Seiten (#369–#374). Dort bleiben die rohen Farbklassen vorerst stehen.
- Lade-Indikator/Pending-Zustand von Buttons (#306 nutzt später die Bausteine).
- Header, Navigation, Startseite (#374), einschließlich `AppHeader`/`AppNav`.
- `StageBanner`: Seine Farbe kommt bewusst aus der Stage-Konfiguration (DEV/INT/PRD) und ist
  kein Theme-Token.
- Manueller Hell/Dunkel-Umschalter. Das Theme folgt der Geräteeinstellung.
- Wording/Texte (#375). Umgestellte Seiten behalten ihre bisherigen Texte.
- Neues fachliches Verhalten. Login und Katalog funktionieren nach der Umstellung identisch.

## Akzeptanzkriterien

### Tokens (AK1)
- [ ] **AK1.1** GIVEN das Theme WHEN ein Entwickler Farben setzt THEN stehen mindestens diese
  semantischen Tokens als Tailwind-Klassen zur Verfügung: Akzent (Vereins-Cyan), Fläche, Linie,
  Text, gedämpfter Text, Gefahr, Erfolg, Warnung.
- [ ] **AK1.2** GIVEN das Gerät steht auf Dunkelmodus WHEN eine umgestellte Seite geladen wird
  THEN liefert jedes Token aus AK1.1 seinen Dunkel-Wert, ohne dass die Seite eine eigene
  `dark:`-Variante setzt. GIVEN Hellmodus THEN den Hell-Wert.
- [ ] **AK1.3** GIVEN die Token-Paare (Text auf Fläche, gedämpfter Text auf Fläche, Button-Text
  auf Akzent/Gefahr, Gefahr/Erfolg/Warnung als Text auf Fläche) WHEN der Kontrast gemessen wird
  THEN erreicht jedes Paar in hell **und** dunkel mindestens WCAG AA (4,5 : 1 für Text). Rahmen
  von Bedienelementen (Eingabe, Secondary-Button) und Fokus-Rahmen erreichen mindestens 3 : 1
  gegen die Fläche. Rein dekorative Trenner sind nach WCAG 1.4.11 ausgenommen (ADR-052 D2).
- [ ] **AK1.4** GIVEN der Akzent-Ton WHEN er mit dem bisher genutzten `cyan-700` verglichen
  wird THEN bleibt er erkennbar derselbe Vereins-Cyan (keine neue Markenfarbe). Blau
  (`blue-*`) kommt als Akzent nicht mehr vor.

### Bausteine (AK2)
- [ ] **AK2.1 Button** GIVEN ein `Button` WHEN er in den Varianten `primary`, `secondary`,
  `danger`, `ghost` gerendert wird THEN unterscheiden sich die Varianten sichtbar, und jede
  Größe hat eine Touch-Höhe von **mindestens 44 px**.
- [ ] **AK2.2 Button-Zustände** GIVEN ein `Button` WHEN er deaktiviert ist THEN ist er als
  deaktiviert erkennbar und nicht auslösbar. WHEN er per Tastatur fokussiert wird THEN zeigt er
  einen sichtbaren Fokus-Rahmen. WHEN der Zeiger darüber steht THEN zeigt jede Variante einen
  Hover-Zustand.
- [ ] **AK2.3 Button als Link** GIVEN eine Aktion, die navigiert (z. B. „Zurück", „Öffnen")
  WHEN sie im Button-Stil erscheint THEN ist sie semantisch ein Link, kein `<button>`.
- [ ] **AK2.4 Button-Formularverhalten** GIVEN ein `Button` in einem Formular WHEN kein Typ
  angegeben ist THEN löst er das Formular nicht ungewollt aus. Ein Absenden-Button muss den Typ
  explizit tragen.
- [ ] **AK2.5 Field** GIVEN ein `Field` mit Label, Eingabe und optional Hinweis/Fehler WHEN es
  gerendert wird THEN ist das Label per `id` mit der Eingabe verknüpft (Klick aufs Label
  fokussiert die Eingabe), und Hinweis bzw. Fehler sind per `aria-describedby` an die Eingabe
  gebunden.
- [ ] **AK2.6 Field-Fehler** GIVEN ein `Field` mit Fehlermeldung WHEN es gerendert wird THEN
  trägt die Eingabe `aria-invalid="true"` und ist optisch als fehlerhaft markiert (Gefahr-Token).
  Ohne Fehler fehlt `aria-invalid`.
- [ ] **AK2.7 Field-Typen** GIVEN die in Login und Katalog vorkommenden Eingabearten (Text,
  Passwort, Zahl/Betrag, Auswahl) WHEN sie über `Field` gebaut werden THEN sind alle ohne
  eigenen Klassenstring darstellbar. Native Attribute (`name`, `required`, `inputMode`,
  `autoComplete`, `defaultValue`, …) werden unverändert durchgereicht.
- [ ] **AK2.8 Card** GIVEN ein `Card` WHEN es Inhalt umschließt THEN erscheint der Inhalt als
  abgegrenzte Fläche (Fläche-/Linie-Token), in hell und dunkel.
- [ ] **AK2.9 Badge** GIVEN ein `Badge` mit Ton `neutral`, `akzent`, `erfolg`, `warnung` oder
  `gefahr` WHEN es gerendert wird THEN ist der Ton an der Farbe erkennbar **und** der Status
  steht als Text im Badge (Information nicht allein über Farbe).
- [ ] **AK2.10 Notice** GIVEN ein `Notice` vom Typ Erfolg WHEN es gerendert wird THEN hat es
  `role="status"`. GIVEN Typ Fehler THEN `role="alert"`. Beide sind farblich (Erfolg- bzw.
  Gefahr-Token) und nicht nur über Farbe unterscheidbar.
- [ ] **AK2.11 PageHeader** GIVEN ein `PageHeader` WHEN er mit Titel gerendert wird THEN ist
  der Titel die `h1` der Seite. Zurück-Link, Meta-Zeile und Aktion sind je optional und
  erscheinen nur, wenn übergeben. Der Zurück-Link ist ein Link mit sprechendem, zugänglichem
  Namen.
- [ ] **AK2.12 Tests** GIVEN die sechs Bausteine WHEN die Test-Suite läuft THEN deckt jeder
  Baustein seine Varianten, optionalen Teile und a11y-Verknüpfungen aus AK2.1–AK2.11 ab
  (100 % Coverage für neuen Code, `testing-standards.md`).

### Schrift und Typo (AK3, AK4)
- [ ] **AK3** GIVEN eine beliebige Seite WHEN sie gerendert wird THEN ist die berechnete
  Schriftfamilie des Fließtexts Geist (kein Arial/Helvetica-Override mehr in `globals.css`).
- [ ] **AK4.1** GIVEN die Typo-Skala WHEN h1, h2 und h3 nebeneinander stehen THEN
  unterscheiden sie sich in der Schriftgröße (h1 > h2 > h3 > Fließtext), nicht nur in der
  Strichstärke.
- [ ] **AK4.2** GIVEN ein Geldbetrag (z. B. Artikelpreis im Katalog) auf einer umgestellten
  Seite WHEN er angezeigt wird THEN nutzt er Ziffern gleicher Breite (`tabular-nums`), sodass
  Beträge untereinander bündig stehen.

### Umstellung als Nachweis (AK5)
- [ ] **AK5.1** GIVEN die Login-Seite und alle UI-Dateien unter `app/verwaltung/katalog/**`
  WHEN sie umgestellt sind THEN nutzen Buttons, Eingabefelder, Karten, Status-Anzeigen,
  Rückmeldungen und Seitenköpfe dort die Bausteine aus AK2. Kein kopierter
  Button-/Eingabe-Klassenstring bleibt übrig.
- [ ] **AK5.2** GIVEN die umgestellten Seiten WHEN die bestehenden Unit- und E2E-Tests laufen
  THEN sind sie grün. Anpassungen an Tests betreffen nur Selektoren/Struktur, keine fachlichen
  Erwartungen. Login, Katalog anlegen/umbenennen/wechseln/deaktivieren und Artikel
  anlegen/bearbeiten/deaktivieren verhalten sich unverändert.
- [ ] **AK5.3** GIVEN die umgestellten Seiten WHEN sie in 375 px Breite in hell **und** dunkel
  gegen den lokalen Dev-Server durchgeklickt werden THEN ist kein Element abgeschnitten oder
  unlesbar, alle Aktionen sind erreichbar, und kein horizontaler Seiten-Scroll entsteht (Nachweis
  per Screenshot in der Task-Datei/PR).

### Farb-Gate (AK6)
- [ ] **AK6.1** GIVEN eine Datei auf der Liste der umgestellten Dateien WHEN sie eine rohe
  Tailwind-Farbklasse enthält (Palette-Farbe mit Stufe, z. B. `text-red-600`, `bg-cyan-700`,
  `border-zinc-300`, auch mit Präfix wie `dark:`/`hover:`) THEN schlägt die automatische Prüfung
  im Lint-Gate fehl (`pnpm lint`: `pre-commit`-Hook und required CI-Check `lint`, ADR-052 D3) und nennt Datei und Fundstelle.
- [ ] **AK6.2** GIVEN eine Datei **nicht** auf der Liste WHEN sie rohe Farbklassen enthält THEN
  schlägt die Prüfung **nicht** fehl (Nicht-umgestellte Seiten bleiben bis #369–#374 unberührt).
- [ ] **AK6.3** GIVEN eine umgestellte Datei, die nur Token-Klassen nutzt, WHEN geprüft wird
  THEN ist die Prüfung grün. Klassen ohne Farbbezug (`text-sm`, `bg-transparent`,
  `border-2`, …) und Wörter, die nur zufällig ähnlich aussehen, lösen keinen Fehlalarm aus.
- [ ] **AK6.4** GIVEN die Liste der umgestellten Dateien WHEN ein Eintrag auf eine nicht
  existierende Datei zeigt oder die Liste nicht lesbar ist THEN schlägt die Prüfung fehl
  (fail-closed, kein stilles Durchwinken).
- [ ] **AK6.5** GIVEN die Prüfung WHEN ihre Tests laufen THEN belegen sie je einen Positiv- und
  Negativfall für AK6.1–AK6.4 gegen das echte Gate (`clean-code.md` → Portabilität), und die
  Prüfung läuft lokal (macOS) und in CI gleich (ESLint-Regel in Node, ADR-052 D3, statt
  Shell-Regex).
- [ ] **AK6.6** GIVEN ein Folge-Issue (#369–#374) stellt eine Seite um WHEN es die Datei in die
  Liste aufnimmt THEN greift die Prüfung für sie ohne weitere Änderung am Gate. Wo die Liste
  liegt und wie man sie erweitert, ist dokumentiert.

## Fehlerszenarien

- [ ] `Field` ohne übergebene `id`: Die Verknüpfung Label↔Eingabe↔Hinweis muss trotzdem
  eindeutig sein, auch wenn mehrere `Field`s gleichzeitig auf der Seite stehen (z. B.
  mehrere Katalog-Zeilen im Bearbeiten-Modus).
- [ ] `Notice` ohne Inhalt bzw. leere Fehlermeldung: Es entsteht kein leerer `role="alert"`, den
  ein Screenreader ansagen würde.
- [ ] Deaktivierter `Button` innerhalb eines Formulars löst das Formular nicht aus.
- [ ] Sehr lange Titel/Artikelnamen in `PageHeader`/`Card` bei 375 px: umbrechen statt
  überlaufen, Aktion bleibt erreichbar.
- [ ] Farb-Gate: rohe Farbklasse in einem Template-String oder über mehrere Zeilen verteilt
  wird ebenso erkannt wie im einfachen `className="…"`.

## Offene Fragen

- [x] **→ `/architecture` (ADR-Trigger, entschieden in ADR-052 D1):** Komponenten-Ansatz: shadcn/ui wie in ADR-014
  vorgesehen (dafür wäre es zu installieren) oder eigene, schlanke Bausteine? Dazu gehört auch
  der Ablageort der Bausteine (route-neutral, vgl. Lesson „Route-neutrale Module").
- [x] **→ `/architecture` (ADR-052 D2):** Exakte Token-Werte (hell/dunkel) inkl. Nachweis zu AK1.3. Dazu
  der Mechanismus, über den Tokens dem Gerätemodus folgen.
- [x] **→ `/architecture` (ADR-052 D3):** Ort und Format der Liste umgestellter Dateien sowie Verankerung
  des Farb-Gates (nur `pre-push.sh` oder zusätzlich eigener CI-Check). Vorher prüfen, ob eine
  bestehende ADR den Ort für Gates dieser Klasse schon entschieden hat (ADR-041/ADR-047,
  Lesson aus #319).

## Entschiedene Punkte aus `/architecture` (ADR-052, 30.09.2026)

- Eigene schlanke Bausteine unter `app/components/ui/`, kein shadcn/ui, keine neue Abhängigkeit.
- Token-Satz und Werte hell/dunkel inkl. Kontrastnachweis: ADR-052 D2. Umschaltung über
  `prefers-color-scheme` auf CSS-Variablen.
- Farb-Gate als lokale ESLint-Regel `tch/no-raw-color-classes`. Die Liste liegt in
  `eslint/ui-token-files.mjs`. Verankert über `pnpm lint` (pre-commit + required CI-Check).
  Erkennt zusätzlich `black`/`white` und Arbitrary-Farbwerte (strenger als AK6.1-Wortlaut).

## Entschiedene Punkte (aus `/requirements`, 30.09.2026)

- **AK6 wird automatisch geprüft** (Gate), nicht nur per Review: Entscheidung des Entwicklers.
- Dunkelmodus folgt der Geräteeinstellung. Ein Umschalter ist nicht Teil dieser Task.
- „Katalog-Seite" umfasst den ganzen Bereich `app/verwaltung/katalog/**` (Übersicht + Detail).
- Kontrastziel WCAG AA in beiden Modi.
