# ADR 052: UI-Grundlage – eigene schlanke Bausteine, semantische Tokens, Farb-Gate im Lint

## Status

Accepted

> Löst **ADR-014** in genau einem Punkt ab: Die UI-Zeile „Tailwind CSS + shadcn/ui" wird zu
> „Tailwind CSS + eigene Bausteine (`app/components/ui/`)". Alle übrigen Stack-Entscheidungen
> aus ADR-014 bleiben unverändert.

## Datum

2026-09-30

## Kontext

[spec-368](../specs/spec-368-ui-grundlage.md) (UX-1) verlangt einen kleinen, verbindlichen
Satz an Farb-Tokens (hell/dunkel), sechs Bausteine (`Button`, `Field`, `Card`, `Badge`,
`Notice`, `PageHeader`), Geist als echte Schrift, eine Typo-Skala und eine **automatische**
Prüfung, dass umgestellte Dateien keine rohen Tailwind-Farbklassen mehr enthalten (AK6). Alle
weiteren UX-Issues #369–#374 bauen darauf auf.

Ausgangslage im Code:
- ADR-014 nennt shadcn/ui, installiert ist es nicht (kein `components.json`, keine
  Radix-/`cva`-/`tailwind-merge`-Abhängigkeit).
- Tailwind v4 mit CSS-first-Konfiguration (`@import "tailwindcss"` + `@theme inline` in
  `app/globals.css`). Der Dunkelmodus wird bereits über `@media (prefers-color-scheme: dark)`
  auf `:root`-Variablen umgeschaltet, genutzt wird das aber nur für `--background`/`--foreground`.
- Route-neutrale Shell-Komponenten liegen in `app/components/` (`AppHeader`, `AppNav`,
  `StageBanner`).
- Die Bausteine, die wirklich gebraucht werden, sind einfache Präsentations-Primitive. Komplexe
  interaktive Widgets (Dialog mit Fokus-Trap, #134) existieren bereits als eigene Lösung.
- ESLint läuft im `pre-commit`-Hook **und** als required CI-Check `lint` (ADR-029). Die
  Push-Gate-Skripte (`pre-push.sh`) haben in CI kein eigenes Pendant. ADR-041 hat entschieden,
  dass ein Gate CI-seitig als eigener benannter Check verankert gehört, nicht als zufällige
  Testzeile.

Drei Fragen sind zu entscheiden: **D1** Komponenten-Ansatz und Ablageort, **D2** Token-Modell
und Hell/Dunkel-Mechanismus, **D3** Ort und Form des Farb-Gates samt Liste der umgestellten
Dateien.

## Entscheidung

### D1 · Eigene, schlanke Bausteine unter `app/components/ui/`, keine neue Abhängigkeit

- Je Baustein eine Datei + Test in `app/components/ui/` (`Button.tsx`, `Field.tsx`, `Card.tsx`,
  `Badge.tsx`, `Notice.tsx`, `PageHeader.tsx`). Die Bausteine sind route-neutral: keine
  Feature-Imports, kein Auth-/DB-Wissen (Lesson „Route-neutrale Module").
  > **Nachtrag (#369):** [ADR-053](053-detailseite-dialog-baustein-mehrfach-anlage-kennzahlen.md)
  > D1 ergänzt `Dialog` und `ConfirmDialog`; die Regeln dieser Entscheidung gelten für sie
  > unverändert.
  >
  > **Nachtrag (#403):** [ADR-059](059-bausteine-listenzeile-aufklapper.md) ergänzt `ListenZeile`
  > und `Aufklapper`; die Regeln dieser Entscheidung gelten für sie unverändert – mit einer
  > begründeten Ausnahme zu D2: der Kartenrand der `ListenZeile` ist `line-subtle` wie bei
  > `Card`, obwohl die ganze Karte ein Link ist (ADR-059 D1).
- Varianten als typisierte `Record<Variante, string>`-Tabellen mit Tailwind-**Token**-Klassen,
  kein `cva`, kein `tailwind-merge`. Ein optionaler `className`-Prop wird angehängt und ist
  für **Layout** gedacht (Abstand, Breite, Ausrichtung), nicht für Farben. Farben erzwingt das
  Gate aus D3.
- **Keine neuen npm-Abhängigkeiten.**
  > **Nachtrag (#372):** [ADR-058](058-toast-rueckmeldung-react-hot-toast-bestaetigen-sperrgruende.md)
  > D1 macht genau eine benannte Ausnahme: `react-hot-toast`, gekapselt hinter `ui/Toaster.tsx`
  > und `ui/meldung.ts`, mit eigenem Markup aus Token-Klassen.
- shadcn/ui bleibt eine Option für spätere komplexe Widgets (z. B. Combobox). Deren Einführung
  braucht dann eine eigene ADR, die an diese Tokens andockt.

### D2 · Semantische Tokens als CSS-Variablen, Umschaltung über `prefers-color-scheme`

- Tokens werden auf `:root` als CSS-Variablen definiert, im `@media (prefers-color-scheme:
  dark)`-Block überschrieben und über `@theme inline` als Tailwind-Farben `--color-<name>`
  veröffentlicht. Das ist derselbe Mechanismus wie heute für `background`/`foreground`, nur
  vollständig. Seiten setzen **kein** `dark:`: Jede Token-Klasse folgt dem Gerätemodus von
  selbst (spec AK1.2).
- Festgelegter Token-Satz und Werte (hell / dunkel):

  | Token | Zweck | Hell | Dunkel |
  |---|---|---|---|
  | `background` | Seitenhintergrund | `#f4f4f5` | `#09090b` |
  | `surface` | Karten, Eingaben | `#ffffff` | `#18181b` |
  | `foreground` | Text | `#18181b` | `#f4f4f5` |
  | `muted` | gedämpfter Text | `#52525b` | `#a1a1aa` |
  | `line` | Rahmen von Bedienelementen (Eingabe, Secondary-Button) | `#71717a` | `#71717a` |
  | `line-subtle` | rein dekorative Trenner/Kartenrand | `#e4e4e7` | `#27272a` |
  | `accent` | Vereins-Cyan: Primary, Links, Fokus-Rahmen | `#0e7490` | `#22d3ee` |
  | `accent-hover` | Hover auf Akzent | `#155e75` | `#67e8f9` |
  | `on-accent` | Text auf Akzent | `#ffffff` | `#083344` |
  | `accent-subtle` | Akzent-Hintergrund (Badge) | `#ecfeff` | `#083344` |
  | `danger` | Gefahr | `#b91c1c` | `#f87171` |
  | `danger-hover` | Hover auf Gefahr | `#991b1b` | `#fca5a5` |
  | `on-danger` | Text auf Gefahr | `#ffffff` | `#450a0a` |
  | `danger-subtle` | Fehler-Hintergrund (Notice/Badge) | `#fef2f2` | `#450a0a` |
  | `success` | Erfolg | `#15803d` | `#4ade80` |
  | `success-subtle` | Erfolgs-Hintergrund | `#f0fdf4` | `#052e16` |
  | `warning` | Warnung | `#b45309` | `#fbbf24` |
  | `warning-subtle` | Warn-Hintergrund | `#fffbeb` | `#451a03` |
  | `overlay` | Abdunkler hinter Dialogen | `#09090b8c` | `#09090bcc` |

  `overlay` kam bei der Umsetzung hinzu: Der Katalog-Dialog (`CatalogControls.tsx`) brauchte
  einen halbtransparenten Abdunkler, und `bg-black/50` fällt unter das Gate. Er trägt keinen
  Text und ist deshalb nicht Teil der Kontrastpaare.

  Hell entspricht `accent` dem bisherigen `cyan-700` (spec AK1.4). Im Dunkelmodus wird der
  Akzent aufgehellt und trägt dunklen Text, weil Weiß auf Cyan-600 nur 3,7 : 1 erreicht.
- **Kontrast (spec AK1.3), nachgerechnet nach WCAG-2-Formel:** Text-Paare hell ≥ 4,79 : 1
  (knappstes Paar: `success` auf `success-subtle`), dunkel ≥ 5,84 : 1. `line` gegen `surface`
  und `background` hell ≥ 4,40, dunkel ≥ 3,67. Fokus-Rahmen (`accent`) hell ≥ 4,87, dunkel
  ≥ 9,80. `line-subtle` ist rein dekorativ und nach WCAG 1.4.11 vom 3 : 1-Kriterium
  ausgenommen. Bedienelement-Rahmen nutzen deshalb immer `line`, nie `line-subtle`.
- **Schrift (AK3):** Der `font-family: Arial, …`-Override in `body` entfällt. `--font-sans`
  zeigt bereits auf Geist, `body` nutzt `font-sans`.
- **Typo-Skala (AK4):** Basis-Stile für `h1`/`h2`/`h3` in `@layer base` von `globals.css`
  (h1 `text-2xl`, h2 `text-xl`, h3 `text-lg`, je `font-semibold`; Fließtext `text-base`).
  Global statt per Baustein, damit die Hierarchie sofort überall gilt. Explizite Utility-Klassen
  auf nicht umgestellten Seiten gewinnen weiter über `@layer base`. Beträge bekommen die
  Tailwind-Utility `tabular-nums` an der Anzeigestelle. Ein eigener `Amount`-Baustein wäre
  YAGNI.

### D3 · Farb-Gate als lokale ESLint-Regel, Liste in einer eigenen Config-Datei

- **Eigene lokale ESLint-Regel** `tch/no-raw-color-classes` (lokales Plugin unter `eslint/`),
  eingebunden in `eslint.config.mjs` über einen Config-Block mit `files` = Liste der
  umgestellten Pfade und `ignores` = `**/*.test.*`. Test-Dateien dürfen rohe Klassen in
  Negativ-Assertions nennen.
- Die Regel prüft String-`Literal`s und `TemplateElement`s (deckt `className="…"`,
  `className={`…`}` über mehrere Zeilen und Hilfsaufrufe ab) und meldet **jede** gefundene
  Klasse mit Zeile/Spalte. Erkannt werden, mit beliebigen Varianten-Präfixen (`dark:`,
  `hover:`, `sm:`, `data-[…]:`, `[&>*]:`, eine Ebene verschachtelt wie `[&_[data-x]]:`,
  `group-hover/item:`, `@sm:` …), optionalem `!` (vorn oder hinten) und optionalem
  Opazitäts-Suffix (`/50`, `/[0.35]`, `/(--a)`):
  - Farb-Utilities (`bg`, `text`, `border`/`border-{t,r,b,l,x,y,s,e}`, `ring`, `ring-offset`,
    `inset-ring`, `outline`, `divide`, `fill`, `stroke`, `from`, `via`, `to`, `placeholder`,
    `decoration`, `accent`, `caret`, `shadow`, `inset-shadow`, `drop-shadow`, `text-shadow`) +
    Tailwind-Palettenfarbe + Stufe (`50`, `100`–`900`, `950`). Die Palettenliste gleicht ein
    Drift-Test gegen die `theme.css` des installierten Tailwind ab,
  - dieselben Utilities mit `black`/`white` und mit Arbitrary-Farbwert (`-[#…]`, `-[rgb…]`).

  Das ist strenger als der Spec-Wortlaut „Palette-Farbe mit Stufe": Auch `bg-white`/`text-black`
  umgehen den Dunkelmodus und fallen deshalb darunter. Nicht erkannt und erlaubt: Token-Klassen
  (`bg-surface`, `text-on-accent`), Nicht-Farb-Klassen (`text-sm`, `border-2`,
  `bg-transparent`, `bg-current`) und Klassen innerhalb längerer Bezeichner (Wortgrenze).
- **Liste** in `eslint/ui-token-files.mjs` als exportiertes Array von Pfaden relativ zum
  Repo-Root. Ein Eintrag ist eine Datei oder ein Verzeichnis. Ein Verzeichnis deckt alle
  `*.ts`/`*.tsx` darunter ab, damit neue Dateien in einem umgestellten Bereich automatisch
  mitgeprüft werden. Startinhalt: `app/components/ui/`, `app/login/`, `app/verwaltung/katalog/`.
- **Fail-closed (AK6.4):** Beim Laden der Config prüft ein Helfer jeden Eintrag per `fs` auf
  Existenz und wirft bei leerer Liste oder fehlendem Pfad. ESLint bricht dann mit Fehler ab,
  `pnpm lint` ist rot. Ein Tippfehler in der Liste kann die Prüfung so nicht still leerlaufen
  lassen (ESLint selbst ignoriert ein `files`-Muster ohne Treffer kommentarlos).
- **Verankerung:** Über `pnpm lint` greift die Regel im `pre-commit`-Hook und im **required
  CI-Check `lint`** (ADR-029). Es gibt keinen neuen Check in `pre-push.sh` und keinen neuen
  CI-Job. Damit entsteht auch nicht die von ADR-041 verworfene „Gate nur als Testzeile"-
  Konstruktion: Die Tests belegen die Regel, verankert ist sie im Lint-Check.
- **Erweiterung durch #369–#374 (AK6.6):** Pfad in `eslint/ui-token-files.mjs` eintragen,
  sonst nichts. Dokumentiert als Kopfkommentar der Datei.

## Alternativen

### D1 – Option A: shadcn/ui installieren (wie ADR-014 vorgesehen)
**Vorteile:** bewährte, zugängliche Komponenten. Große Auswahl für später (Dialog, Select,
Combobox). Konvention ist Agenten gut bekannt.
**Nachteile:** Für sechs einfache Primitive zieht es `cva`, `clsx`, `tailwind-merge`,
`components.json` und je Komponente Radix-Pakete nach. Es bringt ein eigenes Token-Schema
(`primary`, `destructive`, `muted-foreground` …) ohne `success`/`warning` mit, das an die
Vereinsfarben angepasst werden müsste. Generierter Code landet als „fremder" Code im Repo, den
wir trotzdem pflegen und auf 100 % testen müssen. Für den heutigen Bedarf Over-Engineering.

### D1 – Option B: eigene schlanke Bausteine (gewählt)
**Vorteile:** keine Abhängigkeit, jede Zeile verstanden und getestet, Tokens exakt nach Spec.
Später reversibel: shadcn-Komponenten lassen sich an dieselben CSS-Variablen andocken.
**Nachteile:** Eigene a11y-Sorgfalt nötig (Label-/`aria-describedby`-Verknüpfung, Rollen).
Durch AK2.5–AK2.11 und Tests abgedeckt.

### D3 – Option A: Shell-Check `scripts/checks/raw-color-check.sh` in `pre-push.sh`
**Vorteile:** gleiches Muster wie `routes-doc-check.sh`.
**Nachteile:** `pre-push.sh` hat in CI kein Pendant. Server-seitig bräuchte es einen eigenen
CI-Job + Ruleset-Änderung (ADR-041/ADR-029), sonst wäre es nur mit `--no-verify` umgehbares
lokales Feedback. Regex-Erkennung von Klassen in JSX per `grep` ist fehleranfällig
(Template-Strings, mehrzeilige Klassen, POSIX-Einschränkungen).

### D3 – Option B: `no-restricted-syntax` mit Regex-Selektor statt eigener Regel
**Vorteile:** kein Plugin-Code.
**Nachteile:** Meldet nur „String verletzt Muster", nicht welche Klasse. Esquery-Regex im
Selektor ist schwer lesbar und nicht mit `RuleTester` testbar. Wortgrenzen/Präfix-Logik bleibt
unübersichtlich.

### D3 – Option C: eigene ESLint-Regel im bestehenden Lint-Gate (gewählt)
**Vorteile:** Greift ohne neue Infrastruktur bereits beim Commit und im required CI-Check.
Parst den echten AST statt Text. Präzise Meldung je Klasse. Mit ESLints `RuleTester`
(Positiv/Negativ) und der `ESLint`-API (Datei auf/nicht auf der Liste) verhaltensbasiert
testbar.
**Nachteile:** Etwas Plugin-Code (eine Regel, ein Loader), den das Projekt selbst pflegt.

## Begründung

Der Bedarf sind sechs einfache Präsentations-Primitive. Das Einfachste, das funktioniert
(YAGNI), sind eigene Bausteine auf semantischen Tokens. Der Token-Mechanismus ist bereits im
Code angelegt und wird nur vervollständigt. Für das Gate ist der vorhandene, bereits required
Lint-Check der stärkste Verankerungsort bei kleinster neuer Fläche. Ein zusätzlicher Push-Check
wäre schwächer, weil er in CI fehlt, und aufwendiger, weil er einen neuen Job samt
Ruleset-Änderung bräuchte.

## Konsequenzen

**Positiv:**
- Ein Ort für Farben: Ein Farbwechsel oder Kontrast-Fix ist eine Änderung in `globals.css`.
- Dunkelmodus wird für jede Token-Klasse automatisch korrekt, ohne `dark:`-Streuung.
- Folge-Issues stellen um, indem sie Bausteine nutzen und einen Pfad in die Liste eintragen.
  Das Gate schützt sie ab da vor Rückfällen.

**Negativ / Trade-offs:**
- Die globalen `h1`–`h3`-Basis-Stile und die Geist-Schrift verändern auch nicht umgestellte
  Seiten leicht (Größe/Laufweite). Das ist gewollt, aber bis #369–#374 können einzelne
  Stellen optisch nachjustiert werden müssen.
- Die Regel sieht nur statische Strings. Aus Variablen zusammengesetzte Klassennamen
  (`` `bg-${farbe}-600` ``) erkennt sie nicht. Das ist bei Tailwind ohnehin ein Anti-Pattern,
  weil der Compiler solche Klassen nicht erzeugt, und fällt im Review auf.
- Test-Dateien sind ausgenommen. Rohe Klassen in Tests sind damit erlaubt, beeinflussen aber
  nie die Oberfläche.

## Bezug zu anderen ADRs

- **ADR-014:** UI-Zeile wird durch diese ADR ersetzt (siehe Status-Hinweis). ADR-014 erhält
  einen Verweis.
- **ADR-029 / ADR-041:** Das Gate nutzt den bestehenden required Check `lint`, keine
  Ruleset-Änderung.
- **ADR-039 / ADR-025:** Route-Neutralität der Bausteine in `app/components/ui/`.
- **ADR-047:** Keine neue Guideline im `@import`-Dauerkontext. Die Regel ist fail-closed
  erzwungen und braucht deshalb keinen Prosa-Kontext.
