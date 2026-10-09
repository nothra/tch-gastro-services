# ADR 058: Toast-Rückmeldung (react-hot-toast hinter eigenem Baustein), Meldung aus der Client-Hülle, Löschsperren vorab

## Status

Accepted

> Ergänzt **ADR-052** D1 („keine neuen npm-Abhängigkeiten") um genau **eine** benannte Ausnahme
> (`react-hot-toast`, D1); alle übrigen Regeln von ADR-052/ADR-053 gelten unverändert.

## Datum

2026-10-09

## Kontext

[spec-372](../specs/spec-372-einheitliches-bestaetigen-rueckmelden.md) (UX-5) verlangt, dass jede
erfolgreiche Schreibaktion **einen** einheitlichen Erfolgshinweis zeigt (AK12–AK17), dass er einen
Dialog-Schluss und einen Seitenwechsel überlebt (AK13), dass „Veranstaltung löschen" einen
Sperrgrund **vor** dem Absenden nennt (AK9) und dass Auslage löschen / Katalog deaktivieren
bestätigt werden (AK1–AK8). Der Mensch hat entschieden: **Toast, unten mittig, 5 s, „×"; Fehler nie
als Toast** (Q2) und **eine Bibliothek statt Eigenbau** (Q6). Die Bibliothek ist eine neue
Abhängigkeit und damit ein ADR-Trigger.

Ausgangslage im Code:
- `Dialog`/`ConfirmDialog` (ADR-053 D1) und `Notice` (ADR-052) existieren; `ConfirmDialog` und
  `useSchliessendeAction` tragen schon Teilnehmer entfernen, Veranstaltung löschen und
  Abschließen. Für Formulare im Dialog gibt es `FormularDialog` (`useFormularDialog`,
  `useDialogFormular`, `DialogAktionen`), genutzt von `CatalogRow`.
- Die drei Katalog-Modals in `CatalogControls` sind ein altes, selbstgebautes `<dialog open>`
  ohne Escape/Fokusführung; „Katalog deaktivieren" ist ein direkter Form-Submit.
- `removeAuslageAction` und `setAuslageStatusAction` sind `Promise<void>`-Actions ohne Zustand;
  ein serverseitig abgelehntes Löschen bleibt stumm.
- Die Sperren für „Veranstaltung löschen" (Verzehr → Kassiert → Auslage) prüft nur
  `deleteVeranstaltungAction`. Die Detailseite lädt `zeilen`, `positionen`, `auslagen` aber schon
  (`ladeOffeneDaten`), alle drei Bedingungen sind daraus ableitbar.
- `deleteVeranstaltungAction` leitet per `redirect(LIST_PATH)` weiter; ein Toast im Client ist
  damit unmöglich (Q7 verlangt `{ ok: true }` + `router.replace`).
- Root-Layout (`app/layout.tsx`) ist ein Server Component ohne Client-Provider; ein CSP gibt es
  nicht (`next.config`/`proxy.ts` setzen keinen `Content-Security-Policy`-Header).

Entscheidungen: **D1** Bibliothek und Kapselung, **D2** Wo die Meldung entsteht, **D3**
Löschsperren vorab, **D4** Dialog-Umstellungen.

## Entscheidung

### D1 · `react-hot-toast`, ausschließlich hinter `ui/Toaster` und `ui/meldung`

- Abhängigkeit: **`react-hot-toast`** (MIT, 2.6.1, transitiv `goober`, `csstype`). Sie wird nur in
  zwei Dateien importiert: `app/components/ui/Toaster.tsx` (Client-Komponente, rendert die
  Toasts) und `app/components/ui/meldung.ts` (`meldeErfolg(text: string): void`). Kein anderer
  Code importiert die Bibliothek – ein Austausch ist damit eine Zwei-Dateien-Änderung, und
  Tests ersetzen `meldung.ts` per `vi.mock`.
- `Toaster` rendert **eigenes** Markup über die Render-Prop der Bibliothek (Token-Klassen, kein
  `dark:`, ADR-052 D1/D3) und setzt `role="status"`/`aria-live="polite"` aus `toast.ariaProps`
  (die Bibliothek liefert beides je Toast). Dazu eine „×"-Schaltfläche (`IconButton`, Rufen von
  `toast.dismiss(id)`, ≥ 44 px Tippfläche). Optik und Farbe kommen aus **derselben** Quelle wie
  `Notice` (Stil-Tabelle aus `Notice.tsx` exportieren, nicht kopieren).
- Konfiguration: Position `bottom-center`, Dauer **5 000 ms** (`duration` am `Toaster`, nicht je
  Aufruf), Container-Abstand `calc(env(safe-area-inset-bottom) + 1rem)` (ADR-031 Safe-Area),
  Hover pausiert die Laufzeit (Bibliotheksverhalten). Es gibt nur `meldeErfolg`; **kein**
  `meldeFehler` – Fehler bleiben `Notice kind="fehler"` am Ort (AK16).
- **Fokus pausiert ebenfalls – als eigener Zusatz** (Nachtrag Review #372): die Bibliothek bindet
  nur `onMouseEnter`/`onMouseLeave`. Die Toast-Karte hält deshalb bei Fokus (Tastatur auf „×")
  über die Pause-Handler aus `useToaster` an und gibt beim Verlassen, beim Ausblenden und beim
  Aushängen wieder frei. `useToaster` plant die Standzeit ein zweites Mal ein; beide Stellen
  teilen deshalb dasselbe Optionsobjekt (sonst griffe für `success` die Bibliotheks-Vorgabe 2 s).
  Bekannte Grenze: verlässt die Maus den Toast, während er den Fokus hat, endet die Pause mit dem
  Hover – die Bibliothek kennt nur einen Pausen-Zustand.
- Eingehängt **einmal im Root-Layout** (`app/layout.tsx`, nach `{children}`), damit der Toast
  Client-Navigation (`router.replace`) überlebt; der Store der Bibliothek liegt im Modul, nicht
  im Komponentenbaum.
- Ist ein modaler `<dialog>` offen, rendert der `Toaster` per Portal **in diesen Dialog** (den
  letzten offenen in Dokumentreihenfolge – bei Verschachtelung der innerste –, erkannt über
  `dialog[open]` und einen `MutationObserver`). Sonst läge der
  Toast unter dem inerten Hintergrund: verdeckt, nicht anklickbar, für Screenreader stumm (FS6).
  Nachgetragen in `/implement`: „Einstellungen" bleibt nach dem Speichern offen (ADR-056 D3).
- Das Farb-Gate (`eslint/ui-token-files.mjs`) deckt `app/components/ui/` bereits ab; die neuen
  Dateien fallen darunter.

### D2 · Die Erfolgsmeldung entsteht in der Client-Hülle, nicht auf dem Server

- Server Actions bleiben bei `{ ok: true }` (ggf. mit Nutzdaten) und kennen **keinen** Meldungstext
  und keine Toast-Mechanik (Cookie/Flash wäre Zustand auf dem Server für ein reines Darstellungs-
  detail). Der Text lebt beim Konsumenten, der Auslöser und Objekt kennt.
- `useSchliessendeAction` (`app/components/useSchliessendeAction.ts`) ruft bei `result.ok` bereits
  `onErfolg`. Er bekommt **eine** Erweiterung: einen optionalen Erfolgstext (String oder Funktion
  `(ergebnis) => string`), den er per `meldeErfolg` ausgibt – **im Action-Wrapper nach dem
  `await`**, nicht in einem `useEffect` auf den State (Lesson `react-hooks/set-state-in-effect`,
  und StrictMode-Doppelaufruf vermeiden). Inline-Formulare ohne Dialog (`VeranstaltungMetaForm`,
  `KatalogWechsel`, `ThekeSetup`, Anlege-Formulare) nutzen denselben Hook bzw. dessen
  Meldungs-Teil, damit es **einen** Weg gibt. Die Signatur bekommt ein Optionsobjekt
  (`{ onErfolg?, onLaeuftChange?, erfolgsMeldung? }`) statt weiterer Positionsparameter; alle
  bestehenden Aufrufer wurden darauf umgestellt. `useDialogFormular` nimmt die Meldung ebenso als
  Optionsobjekt (`{ erfolgsMeldung }`).
- `Promise<void>`-Actions der AK12-Liste werden auf `{ ok?: true; error?: string }` umgestellt:
  `removeAuslageAction`, `setAuslageStatusAction` und `setTeilnehmerActiveAction`. Die
  Ablehnungen (Veranstaltung nicht offen, Auslage/Teilnehmer nicht gefunden) werden dabei
  **sichtbar** (FS1/FS2) statt stumm.
- **Veranstaltung löschen (Q7):** `deleteVeranstaltungAction` ersetzt `redirect(LIST_PATH)` durch
  `return { ok: true }`; der Client ruft `meldeErfolg("Veranstaltung gelöscht")` und
  `router.replace(LIST_PATH)`. Die Revalidierungen von `thekePath(token)` und `LIST_PATH` bleiben,
  `revalidatePath(detailPath(id))` bleibt **verboten** (die Detailseite existiert danach nicht mehr;
  `actions.ts`-Kommentar zu AK9).

### D3 · Löschsperren aus einer reinen Funktion, vorab berechnet, serverseitig weiter erzwungen

- Neue reine Funktion `loeschSperren` in `app/veranstaltung/loeschSperren.ts` – neben
  `kassierSummen.ts`/`auslagenSummen.ts`, denn alle Nutzer liegen in `app/veranstaltung/`
  (Nachtrag Review #372; ursprünglich als `lib/…` geplant). Eingabe `zeilen`, `positionen`, `auslagen`, Ausgabe die **geordnete Liste** der
  zutreffenden Gründe `("verzehr" | "kassiert" | "auslage")[]` (Reihenfolge Verzehr → Kassiert →
  Auslage, Q5). Regeln wie heute: Verzehr = Position mit `menge > 0`, Kassiert = Zeile mit
  `erhaltenCents !== null`, Auslage = jede Zeile unabhängig vom Status. **Die Texte zu den Gründen
  stehen in derselben Datei** und werden von Seite und Action gemeinsam genutzt (Glossar:
  „Löschen nicht möglich: …").
- `deleteVeranstaltungAction` lädt weiterhin die drei Quellen und ruft **dieselbe** Funktion; sie
  nimmt den ersten Grund als Ablehnung (Verhalten und Reihenfolge bleiben, AK11). Zwei Kopien der
  Bedingung (Dialog und Action) sind damit ausgeschlossen (Lesson zu `hatErfasstenVerzehr`:
  geteilt, sonst divergiert es). Die Verzehr-Regel selbst steht als `hatVerzehr(positionen)` in
  derselben Datei; auch die Sperre des Katalogwechsels (`setVeranstaltungCatalogAction`) nutzt sie.
- Der Sperr-Dialog nimmt nur eine **nicht-leere** Liste an (Typ `LoeschSperren`, Typwächter
  `istGesperrt`): ohne Grund gibt es keinen Satz zu bilden.
- Die Detailseite berechnet die Liste aus den schon geladenen Daten (**keine** zusätzliche DB-
  Abfrage) und reicht sie als Prop `sperren` an `VeranstaltungLoeschen`. Bei `sperren.length > 0`
  zeigt der Dialog die Gründe und nur „Schließen" – gebaut auf `Dialog`, **nicht** durch einen
  Sonderfall in `ConfirmDialog` (der bleibt „bestätigen"). Fehlt/ist die Liste unlesbar, gilt
  fail-closed: keine Bestätigung anbieten (FS4). Die Prop ist ein Hinweis, die Entscheidung trifft
  der Server beim Absenden.

### D4 · Dialog-Umstellungen: vorhandene Bausteine, kein neuer Dialog-Typ

- **Auslage löschen:** Auslöser ist ein `type="button"` (öffnet `ConfirmDialog`, danger, nennt
  Teilnehmer/Kategorie/Betrag); die Action läuft über `useSchliessendeAction`. Es bleibt **kein**
  direkter Form-Submit (FS7). `AuslageRow` wird auf `Button`/Token-Klassen umgestellt und in
  `eslint/ui-token-files.mjs` aufgenommen.
- **Katalog deaktivieren:** `ConfirmDialog` (danger) mit der Folge in einem Satz (Q4);
  „Reaktivieren" (reversibel) bleibt ein direkter Schalter, heißt aber **„Aktivieren"** (Glossar)
  und meldet per Toast.
- **Katalog anlegen/umbenennen/duplizieren:** der route-neutrale Baustein `FormularDialog`
  (Auslöser + Dialog mit Titel/Beschreibung, `app/components/FormularDialog.tsx`; `AnlegeDialog`
  setzt darauf auf) mit `useDialogFormular`; `CatalogModal` und `useCloseOnSuccess` entfallen samt
  Tests (Lesson „Verschieben eines route-neutralen Moduls": Altcode im selben Schritt löschen).
- **Bestätigungs-Steuerung als Hook** (Nachtrag Review #372): `useBestaetigung(ersatzFokusId?)`
  (`app/components/useBestaetigung.ts`) bündelt Offen-Zustand, Fokus-Rückgabe, `key` je Öffnen und
  das Ersatz-Fokusziel nach einem Erfolg, der den Auslöser aushängt. Auslage löschen, Katalog
  deaktivieren und Veranstaltung löschen nutzen ihn; `ZeilenMenue` und `AbschlussAktion` ziehen
  nach (`docs/factory/kleinfunde.md`).
- Alle Texte nach `docs/ux/glossar.md`; die Abweichungen mit Ziel #372 stehen dort in der
  Abweichungsliste und sind im selben PR zu streichen.

## Alternativen

### D1 – Toast-Technik

**Option A: `react-hot-toast` hinter eigener Kapsel (gewählt).**
Vorteile: setzt `role="status"` und `aria-live="polite"` **je Toast** selbst; headless nutzbar
(eigenes Markup, damit kein zweites Farbsystem neben den Tokens); klein (≈ 4 kB gzip + `goober`),
MIT, aktiv gepflegt (Release 2026-09-16), peer `react >=16` deckt React 19.2.
Nachteile: kleineres Ökosystem als sonner; Live-Region entsteht mit dem Toast (nicht vorab) –
gängige Screenreader sagen sie an, eine Garantie für jeden gibt es nicht; `goober` wird zur
transitiven Abhängigkeit.

**Option B: `sonner`.**
Vorteile: sehr verbreitet (≈ 50 Mio. Downloads/Woche), gute Gesten und Stapelung, aktuell.
Nachteile: liefert **eigene** Farbpalette und eigenes CSS (hsl/hex, `data-sonner-theme`), die
gegen das Token-Modell (ADR-052) per `unstyled` + `classNames` ausgeschaltet werden müssten; das
Live-Verhalten hängt am umgebenden Container (`aria-live="polite"`), die Toasts selbst tragen
**kein** `role="status"` (im Paket geprüft) – AK12 wäre nur über `toast.custom` einzulösen; ≈ 15 kB
gzip.

**Option C: `react-toastify`.**
Nachteile: größte Abhängigkeit (≈ 565 kB entpackt), eigenes Stylesheet zum Einbinden, deutlich
mehr Funktion (Fortschrittsbalken, Drag, Transitions), als gebraucht wird → verworfen (YAGNI).

**Option D: Eigenbau (`Toast.tsx` mit React-Zustand/Context).**
Vorteile: keine Abhängigkeit, volle Kontrolle über Live-Region (persistent vorab gemountet).
Nachteile: Stapelung, Pausieren, Timer-Aufräumen und Tests selbst pflegen. **Vom Menschen
verworfen** (Q6, Entscheidung zugunsten einer Bibliothek).

### D2 – Meldungs-Transport

**Option A: Client-Hülle ruft `meldeErfolg` (gewählt).** Einfach, der Server bleibt
darstellungsfrei, Texte stehen beim Konsumenten.
**Option B: Server liefert Text (Cookie/Flash, `{ ok, meldung }`).** Würde Texte und Glossar auf
den Server ziehen, braucht für den Redirect-Fall Cookie-Zustand. Verworfen, weil Q7 den Redirect
ohnehin in den Client verlegt.

### D3 – Löschsperren

**Option A: reine Funktion + Prop aus bereits geladenen Daten (gewählt).** Keine Zusatzabfrage,
eine Quelle für Seite und Action.
**Option B: Vorab-Server-Aufruf beim Öffnen des Dialogs.** Aktuell, aber zusätzlicher Roundtrip
und eine zweite Action; der Dialog „öffnet sofort" (AK9) nur mit Ladezustand. Verworfen.
**Option C: Sonderfall im `ConfirmDialog` („nicht bestätigbar").** Vermischt zwei Rollen in einem
Baustein; verworfen zugunsten von `Dialog`.

## Begründung

- Die Spec-Kriterien AK12/AK14 sind als `role="status"` am Toast formuliert; `react-hot-toast`
  erfüllt das ohne Umweg, und seine Render-Prop hält das Erscheinungsbild unter ADR-052.
- Die Kapsel (`Toaster` + `meldung.ts`) hält die Fremdabhängigkeit klein und testbar (Dependency-
  Inversion): Konsumenten kennen nur `meldeErfolg(text)`.
- Die Meldung gehört zur Darstellung und damit in den Client; der Hook, der heute schon das
  Schließen nach `ok` kennt, ist der einzige Ort, an dem „Erfolg" zuverlässig und einmal
  eintritt.
- Eine geteilte reine Funktion für die Sperren verhindert, dass Dialog-Hinweis und Server-Gate
  auseinanderlaufen.

## Konsequenzen

- **Neue Abhängigkeit:** `react-hot-toast` (+ `goober`, `csstype`). `pnpm-lock.yaml` ändert sich;
  der Durchgang `/security-review` prüft sie (Lizenz, Advisories). Kein CSP im Projekt, die
  Laufzeit-Styles von `goober` kollidieren damit nicht.
- **Live-Region-Grenze:** Der Toast mountet mit Inhalt; bei geöffnetem **modalem** Dialog ist die
  Seite inert, eine Ansage kann entfallen. Schließt der Erfolg den Dialog, erscheint der Toast
  danach im `<body>`; bleibt der Dialog offen, hängt sich der Toast in ihn ein (D1, FS6). Beides ist in der Spec-/E2E-Prüfung zu belegen (Verhalten sichtbar, Rolle vorhanden); eine
  Screenreader-Garantie über alle Geräte gibt es nicht.
- **Portalwechsel montiert neu:** Wechselt das Portalziel (Dialog öffnet/schließt, während ein
  Toast steht), montiert React den Toast-Container samt Live-Region neu. Ein Screenreader kann
  die Meldung dabei ein zweites Mal ansagen oder eine laufende Ansage abbrechen; nicht auf Geräten
  geprüft. Ein fester Container, der per `appendChild` umgehängt wird, vermiede das, bräuchte aber
  beim Server-Rendern einen eigenen Hydrations-Weg – bewusst nicht gebaut.
- `ConfirmDialog`, `Dialog`, `Notice` bleiben in der Schnittstelle unverändert; `Notice` exportiert
  zusätzlich die Stil-Tabelle.
- Mehrere Server Actions ändern ihre Signatur (`removeAuslageAction`, `setAuslageStatusAction`,
  `setTeilnehmerActiveAction` auf `(prev, formData)` + State; `deleteVeranstaltungAction` ohne `redirect`). Zugehörige Tests,
  `docs/routes.md` (keine Pfadänderung) und E2E-Helfer sind mitzuziehen.
- Inline-Erfolgs-`Notice` entfallen (`„Gespeichert.“`, `„Änderungen gespeichert.“`,
  `„Katalog gewechselt.“`, `„Theke eingerichtet.“`, Kassieren-Rückmeldung) zugunsten des Toasts;
  die Kassieren-Meldung behält ihren Inhalt (Betrag, Spende).
- Reversibel: Austausch der Bibliothek betrifft zwei Dateien, Entfernen eine Zeile im Layout.

## Implementierungs-Hinweise

- Reihenfolge (jeweils Red → Green): `loeschSperren` (reine Funktion + Test) →
  `deleteVeranstaltungAction` auf die Funktion und auf `{ ok: true }` umstellen →
  `ui/meldung.ts` + `ui/Toaster.tsx` (RTL-Test: Rolle `status`, Schließen, 5 s mit
  `vi.useFakeTimers`) → `useSchliessendeAction`-Erweiterung → `VeranstaltungLoeschen` (Sperr-/
  Bestätigungsvariante, `router.replace`) → `removeAuslageAction`/`setAuslageStatusAction` +
  `AuslageRow` → `CatalogControls` → übrige Aufrufer (Meta-Form, Katalogwechsel, Theke, Stammdaten,
  Artikel) → Inline-Meldungen und Altcode entfernen → Glossar-Abweichungen streichen.
- **Risiko, im E2E zu prüfen:** Ruft die Löschen-Action `revalidatePath`, kann Next die aktuelle
  Route (die gelöschte Detailseite) im Action-Response neu rendern und kurz eine 404-Seite
  zeigen, bevor `router.replace` greift. Tritt das auf, die Navigation im selben `startTransition`
  wie die Action auslösen oder die Revalidierung der Liste erst am Ziel sicherstellen – nicht
  `revalidatePath(detailPath)` hinzufügen. **Geprüft (Review #372):** ein `MutationObserver` im
  E2E (`veranstaltung-bearbeiten-loeschen.spec.ts`, mit Positivkontrolle) sah zwischen Bestätigen
  und Ankunft auf der Übersicht kein 404-Bild; keine Abhilfe nötig.
- Tests mocken `@/app/components/ui/meldung`, nicht die Bibliothek; ein einziger Test montiert
  den echten `Toaster`. Lint-Regel (`no-restricted-imports` auf `react-hot-toast` außerhalb der
  beiden Dateien) als Nachziehen vorschlagen, nicht erzwingen.
- E2E-Helfer/Capture-Spec, die auf „Gespeichert."/„Katalog gewechselt." oder auf die
  Auslage-Löschen-Schaltfläche zeigen, per Grep mitziehen (Lesson „Verschobener UI-Einstiegspunkt").
- Toast **nicht** für `adjustVerzehr*` (Q1) und nicht für „Link kopiert." – dort bleibt es beim
  Auslöser.
- Doku: `docs/routes.md` unverändert (keine Pfad-/Zugriffsänderung).
