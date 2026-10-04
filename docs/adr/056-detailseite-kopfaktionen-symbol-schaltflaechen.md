# ADR 056: Detailseite – Kopfaktionen als Symbol-Schaltflächen (Teilen, Einstellungen, Löschen)

## Status

Accepted

> Löst **ADR-053 D6** im Punkt „Einstellungen als natives `<details>`" ab. ADR-053 D1
> (`Dialog`/`ConfirmDialog`) und D5 („Link & QR": Server rendert, Client öffnet) gelten
> unverändert weiter und werden hier nur wiederverwendet. ADR-052 (Bausteine, Tokens,
> Farb-Gate) gilt unverändert.

## Datum

2026-10-02

## Kontext

Spec-391 (#391) holt die Einstellungen einer Veranstaltung vom Seitenende in den Seitenkopf:
Teilen (Link & QR), Einstellungen (Katalog, Stammdaten) und Löschen werden je eine
Symbol-Schaltfläche in der Aktionszone des `PageHeader`, neben dem Status-Badge. Der
eingeklappte `<details>`-Bereich entfällt.

Dafür sind vier Fragen zu entscheiden (spec-391 Q2/Q3 und die Rest-Frage aus Q1):

1. **Symbole:** Das Projekt hat keine Icon-Bibliothek; es gibt bislang kein einziges `<svg>`
   außerhalb des serverseitig erzeugten QR-Codes.
2. **Symbol-Schaltfläche:** `Button` kennt nur Text-Schaltflächen; eine Schaltfläche ohne
   sichtbaren Text braucht zwingend einen zugänglichen Namen (spec-391 AK3).
3. **Dialog „Einstellungen":** Wie werden die bestehenden Formulare (`KatalogWechsel`,
   `VeranstaltungMetaForm`) in einen Dialog gebracht, und schließt er nach dem Speichern?
4. **Löschen:** Wo erscheint die Ablehnungsmeldung, wenn kein Einstellungsbereich mehr den
   Rahmen bildet (spec-391 AK12)? `VeranstaltungLoeschen` nutzt heute noch ein eigenes
   `<dialog open>` mit rohen Farbklassen – vor `ConfirmDialog` (ADR-053 D1) entstanden.

## Entscheidung

### D1 · Symbole als eigene Inline-SVG-Komponenten in `app/components/ui/icons.tsx`

- Drei Komponenten `TeilenIcon`, `ZahnradIcon`, `PapierkorbIcon`: 24×24-`viewBox`,
  `fill="none"`, `stroke="currentColor"`, `aria-hidden="true"`, `focusable="false"`. Die Farbe
  kommt ausschließlich über `currentColor` aus der Token-Klasse des Elternelements (ADR-052) –
  dadurch automatisch hell/dunkel richtig (spec-391 AK15).
- Die Pfade dürfen aus **Lucide** (ISC-Lizenz) übernommen werden; dann steht der
  ISC-Lizenzhinweis mit Copyright-Zeile im Dateikopf. Keine neue npm-Abhängigkeit.

### D2 · Neuer route-neutraler Baustein `IconButton` in `app/components/ui/`

- Props: `label: string` (**Pflicht**, wird `aria-label` und `title`), `icon: ReactNode`,
  `tone?: "neutral" | "danger"` (Default `neutral`), dazu die üblichen Button-Attribute
  (`onClick`, `disabled`, `ref`).
- Quadratisch `size-11` (44 × 44 px, spec-391 AK3), gleiche Basisklassen für Fokus/Disabled wie
  `Button` – dafür die Basisklassen aus `Button.tsx` exportieren statt kopieren.
- `tone="neutral"`: `text-foreground`, Hover `bg-background`; `tone="danger"`: `text-danger`,
  Hover `bg-danger-subtle`. Bewusst **keine** gefüllte `danger`-Fläche: im Kopf stünde sonst
  ein roter Block neben dem Status, der lauter ist als die eigentliche Arbeit.
- Das Pflicht-`label` macht eine Symbol-Schaltfläche ohne Namen zum Typfehler, nicht zum
  Review-Finding.

### D3 · Ein feature-lokaler `KopfDialog` statt `ZugangDialog` + zweiter Kopie

- `ZugangDialog` wird zu `app/veranstaltung/[id]/KopfDialog.tsx` verallgemeinert:
  Props `label`, `icon`, `title`, `children`. Inhalt: `IconButton` als Auslöser
  (`returnFocusRef`), `Dialog`, darunter „Schließen". `ZugangDialog.tsx` und sein Test werden
  **gelöscht** (Move, nicht Kopie – Lesson #187); Doku-Treffer per Grep im selben PR
  nachziehen (Lesson #370).
- Die Seite (Server Component) nutzt ihn zweimal:
  - `KopfDialog label="Link & QR teilen"` mit `<ZugangTeilen>` als `children` – ADR-053 D5
    bleibt erfüllt (`qrcode` nicht im Client-Bundle).
  - `KopfDialog label="Einstellungen"` mit `<KatalogWechsel>` und – nur bei `typ ===
    "veranstaltung"` – `<VeranstaltungMetaForm>` als `children`.
- **Nach erfolgreichem Speichern bleibt der Dialog offen** (spec-391 Q3). Die Formulare zeigen
  ihre bestehende Erfolgsmeldung im Dialog; `revalidatePath` aktualisiert den Seitenkopf
  dahinter, und der Client-Zustand `open` überlebt das RSC-Refresh. Kein Rückkanal „Erfolg →
  Dialog schließen" nötig – der bräuchte einen Effekt auf den Action-Zustand
  (`react-hooks/set-state-in-effect`, Lesson #49) oder einen Callback durch zwei Formulare.
  Fehler (FS3) bleiben damit ebenfalls im offenen Dialog stehen, Eingaben bleiben erhalten.
- Weil `Dialog` seine Kinder nur bei offenem Zustand mountet (ADR-053 D1), beginnt jedes Öffnen
  mit frischem `useActionState` der Formulare – keine alte Meldung beim Wiederöffnen.

### D4 · Löschen auf `ConfirmDialog` umstellen, Auslöser ist der Papierkorb

- `VeranstaltungLoeschen` behält seine Rolle (Auslöser + Bestätigung), tauscht aber das eigene
  `<dialog open>` gegen `ConfirmDialog` (`variant="danger"`, `pending`, `error`,
  `returnFocusRef`) und den Text-Button gegen `IconButton tone="danger"
  label="Veranstaltung löschen"` mit `PapierkorbIcon`.
- **Die Ablehnungsmeldung steht im Bestätigungsdialog** (spec-391 AK12) – wie heute: der
  Nutzer steht nach dem Absenden dort, `ConfirmDialog` zeigt `error` über `Notice` und sperrt
  während `pending` Schließen und Escape. Bei Erfolg leitet die Action wie bisher selbst um.
- Den Action-Zustand je Öffnen erneuern (Vertrag aus `ConfirmDialog`-Doku): die heutige
  `abgeschickt`-Logik bleibt oder wird durch einen `key` je Öffnungs-Zyklus ersetzt – beides
  erfüllt den Vertrag; der Reset gehört an `onSubmit` des Formulars bzw. das Öffnen, nicht an
  `onClick` (Lesson #352).
- Texte (Titel, Beschreibung, „Endgültig löschen") bleiben unverändert (spec-352).

### D5 · Aktionszone im `PageHeader`

- `page.tsx` übergibt dem `PageHeader` als `action` eine Gruppe
  `flex flex-wrap items-center gap-1`: `Badge` · Abschluss-Aktion · Teilen · Einstellungen ·
  Papierkorb.
  Die Abschluss-Aktion („Veranstaltung abschließen"/„Wieder öffnen") kommt aus #371
  ([ADR-055](055-kassieren-spende-live-abschluss-im-kopf.md) D3, spec-371 AK18/AK22–AK24) und
  steht als Statuswechsel direkt am Badge, vor den Symbolen (spec-391 Q5).
- Zustandsregeln liegen in `page.tsx` (`DetailRahmen` bekommt Abschluss-Aktion und
  Kopfaktionen als zwei getrennte Props `aktion`/`kopfAktionen`): offen + datiert →
  Abschließen + alle drei Symbole; offen + Theke → Teilen + Einstellungen (kein Abschließen,
  spec-371 AK23); abgeschlossen → Badge + „Wieder öffnen", keine Symbole (spec-391 AK2, AK13,
  AK14).
- `PageHeader` hält Titel und Aktion in einer `flex-wrap`-Zeile mit `min-w-0` + `break-words`
  am Titel; die Aktionsgruppe bricht bei 375 px unter den Titel und dort in sich um, sodass
  Badge, Abschluss-Schaltfläche und 3 × 44 px ohne horizontales Scrollen sichtbar bleiben
  (spec-391 AK16, spec-371 AK24).
- **Einzige Änderung am `PageHeader`:** sein Aktionsbereich (`shrink-0`) bekommt `max-w-full`.
  Ohne Grenze wird er so breit wie sein Inhalt, und die `flex-wrap`-Gruppe bricht nie um –
  Badge + 3 Symbole passten noch, mit der Abschluss-Schaltfläche aus #371 ragte der Papierkorb
  37 px über den Rand (E2E, Review-Iteration 4). Die Grenze greift nur, wo die Aktion sonst
  überliefe; für die übrigen Konsumenten ändert sich nichts.

### D6 · Formulare im Dialog auf Bausteine/Tokens

- `KatalogWechsel` und `VeranstaltungMetaForm` stehen künftig in einem Token-Dialog. Ihre rohen
  Farbklassen (`zinc-*`, `dark:`) und eigene Rahmen-Box werden auf `SelectField`/`Field`,
  `Button`, `Notice` und Token-Klassen umgestellt; Verhalten, Texte und Actions bleiben gleich.
  Die eigene Überschrift „Veranstaltung bearbeiten" wird zu einer Zwischenüberschrift im Dialog
  (`h3`), weil der Dialog-Titel bereits `h2` ist.
- Alle neu oder umgestellten Dateien kommen in `eslint/ui-token-files.mjs`:
  `app/veranstaltung/[id]/KopfDialog.tsx`, `VeranstaltungLoeschen.tsx`,
  `VeranstaltungMetaForm.tsx`, `app/veranstaltung/KatalogWechsel.tsx`; der Eintrag
  `ZugangDialog.tsx` entfällt (sonst bricht das fail-closed-Gate am fehlenden Pfad).

## Alternativen

### D1 – Symbole

- **Option A: eigene Inline-SVGs (gewählt).** Vorteile: keine Abhängigkeit, drei Symbole,
  `currentColor` passt direkt ins Token-Modell, kein Bundle-Zuwachs außer ein paar Pfaden.
  Nachteile: jedes weitere Symbol muss man selbst hinzufügen; Lizenzhinweis pflegen.
- **Option B: `lucide-react` als Abhängigkeit.** Vorteile: großer, konsistenter Satz, typisiert.
  Nachteile: neue Laufzeit-Abhängigkeit (Audit-/Override-Pflege, vgl. #291/#339) für drei
  Symbole; YAGNI.
- **Option C: Unicode-Zeichen (⚙, 🗑, ⇪).** Vorteile: null Aufwand. Nachteile: Emoji werden je
  Plattform farbig und unterschiedlich gerendert, ignorieren `currentColor`/Dark-Mode und
  Screenreader lesen sie teils vor – verletzt AK3/AK15.

### D2 – Symbol-Schaltfläche

- **Option A: eigener `IconButton` mit Pflicht-`label` (gewählt).** Vorteile: zugänglicher Name
  durch den Typ erzwungen, einheitliche 44-px-Fläche, wiederverwendbar (#374 Header).
  Nachteile: ein weiterer Baustein.
- **Option B: `Button` mit `className="size-11 px-0"` + `aria-label` je Aufruf.** Vorteile: kein
  neuer Baustein. Nachteile: Name optional und vergessbar; dreifach wiederholte
  Größen-/Ton-Klassen; die Danger-Variante wäre die gefüllte Fläche.

### D3 – Dialog „Einstellungen"

- **Option A: verallgemeinerter `KopfDialog`, bleibt nach Speichern offen (gewählt).**
  Vorteile: eine Hülle für Teilen und Einstellungen, Formulare unverändert im Verhalten,
  kein Erfolgs-Rückkanal. Nachteile: Nutzer schließt nach dem Speichern selbst (ein Tipp).
- **Option B: zweite Hülle `EinstellungenDialog` neben `ZugangDialog`.** Nachteile: zwei
  fast identische Dateien (Duplikat, Clean-Code-Regel).
- **Option C: Dialog schließt nach Erfolg automatisch.** Vorteile: ein Tipp weniger.
  Nachteile: braucht Erfolgs-Callback durch beide Formulare oder Effekt auf den
  Action-Zustand; Erfolgsmeldung wäre unsichtbar, sofern kein Toast existiert (#372).
- **Option D: Einstellungen als eigene Unterroute `/veranstaltung/[id]/einstellungen`.**
  Vorteile: kein Dialog-Zustand. Nachteile: Navigationswechsel für zwei kleine Formulare,
  Routen-Doku/Proxy-Pflege; widerspricht dem gewählten Dialog aus spec-391 AK4.

### D4 – Löschen

- **Option A: `VeranstaltungLoeschen` auf `ConfirmDialog` umstellen (gewählt).** Vorteile:
  eine Dialog-Grundlage (spec-369 AK30), Tokens statt Rohfarben, Fokus-Rücksprung geschenkt.
  Nachteile: Tests der Komponente müssen auf die neue Struktur angepasst werden.
- **Option B: altes `<dialog open>` behalten, nur den Auslöser tauschen.** Vorteile: kleinster
  Diff. Nachteile: Rohfarben im Seitenkopf (ADR-052-Verstoß, Farb-Gate), kein modales
  Verhalten/Escape, zweites Dialog-Verhalten.

## Begründung

Alle Entscheidungen setzen auf vorhandene Grundlagen (ADR-052/053) statt neuer Mechanik: kein
neues Paket, kein neuer Dialog-Typ, keine neue Route. Der einzige neue Baustein (`IconButton`)
macht die zentrale Zugänglichkeits-Forderung von spec-391 (Name trotz fehlendem Text) zur
Typ-Garantie und wird mit #374 (Header) absehbar wiederverwendet. Dass der Dialog nach dem
Speichern offen bleibt, hält die Formulare unverändert und die Erfolgsmeldung sichtbar, bis
#372 ein einheitliches Rückmelden liefert.

## Konsequenzen

- Neu: `app/components/ui/icons.tsx`, `app/components/ui/IconButton.tsx` (+ Tests),
  `app/veranstaltung/[id]/KopfDialog.tsx` (+ Test).
- Gelöscht: `app/veranstaltung/[id]/ZugangDialog.tsx` und `ZugangDialog.test.tsx`.
- Geändert: `page.tsx` (Kopfaktionen, kein `<details>`), `VeranstaltungLoeschen.tsx`
  (ConfirmDialog + IconButton), `VeranstaltungMetaForm.tsx` und `KatalogWechsel.tsx` (Tokens),
  `Button.tsx` (Basisklassen exportiert), `PageHeader.tsx` (`max-w-full` am Aktionsbereich, D5),
  `eslint/ui-token-files.mjs`.
- E2E: `e2e/helpers/detailseite.ts` (`oeffneEinstellungen`/`schliesseEinstellungen` öffnen und
  schließen jetzt den Dialog), `veranstaltung-detailseite.spec.ts`,
  `veranstaltung-bearbeiten-loeschen.spec.ts`, `verzehr-einzelansicht.spec.ts`,
  `anleitung-veranstalter.spec.ts` + Screenshots, `docs/anleitung/veranstalter/anleitung.md`.
- ADR-053 D6 erhält einen Hinweis auf diese ADR.
- Keine Routen-, Datenmodell- oder Action-Änderung; `docs/routes.md` bleibt unverändert.

## Implementierungs-Hinweise

- Reihenfolge TDD: `IconButton` + Icons → `KopfDialog` (Ersatz für `ZugangDialog`-Tests) →
  `VeranstaltungLoeschen` auf `ConfirmDialog` → Formulare auf Tokens → `page.tsx`-Komposition
  → E2E/Anleitung.
- `page.test.tsx`: je Zustand (offen datiert / Theke / abgeschlossen) die Menge und
  **Reihenfolge** der Kopfaktionen per zugänglichem Namen assertieren (Lesson #322/#318: exakte
  Indizes); Abwesenheit des `<details>`-Bereichs und „Link & QR teilen"/„Veranstaltung löschen"
  **nicht** im Einstellungsdialog (AK5) explizit prüfen.
- `IconButton`-Test: `aria-label` und `title` = `label`; Icon `aria-hidden`; `tone`-Klassen;
  Diskriminierung beider Töne.
- `KopfDialog`: Fokus-Rücksprung auf den Auslöser nach Schließen und Escape (AK8, AK9).
- Löschen: Test für „Fehler bleibt im Dialog", „Wiederöffnen zeigt keine alte Ablehnung",
  „während pending kein Schließen" – die bestehenden `VeranstaltungLoeschen`-Tests sind die
  Vorlage.
- E2E-Lauf im Worktree auf eigenem Port (Lesson #368), vorher `db:migrate` + `db:seed`
  (Lesson #370); Screenshots über die Capture-Spec, Zählungen relativ (Lesson #388).
- Nach jedem `next dev`-Lauf `git checkout -- CLAUDE.md` (Lesson #337).
- ADR-Status beim Implementieren auf **Accepted** setzen (Lesson #197).
