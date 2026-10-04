# ADR 056: Header mit Wortmarke und Konto-Menü (natives Popover), Startseite mit offenen Veranstaltungen, `PublicHeader` auf der Theke

## Status

Accepted

> **Ergänzt ADR-031 teilweise:** Kopfzeilen-Aufbau (E-Mail als Text, „Abmelden" als dauerhaft
> sichtbarer Button), Aufbau des Dashboard-Hubs auf `/` (nur rollengefilterte Kacheln) und der
> Satz „#54 hängt sie [die `PublicHeader`] auf `theke/[token]` ein" gelten nicht mehr in dieser Form
> (D1–D4). Unverändert bleiben ADR-031 D1 (eigene Bausteine, kein shadcn/ui), der Off-Canvas-Drawer
> für die Navigation, die kanonische Menü-Definition `lib/navigation.ts` und die serverseitige
> Rollen-Filterung. Die Bausteinregeln aus ADR-052 (Tokens, Farb-Gate) und ADR-053 D1 (native
> Plattform-Elemente statt Fokus-Trap-Eigenbau) gelten für alles Neue hier.

## Datum

2026-10-04

## Kontext

[spec-374](../specs/spec-374-header-startseite-zurueck-navigation.md) (#374, UX-7) verlangt eine
Wortmarke als Startlink, ein Konto-Menü (E-Mail + „Abmelden"), eine Startseite mit den offenen
Veranstaltungen und den `PublicHeader` auf der öffentlichen Thekenseite. Vier technische Fragen
sind offen:

1. **Konto-Menü (AK1.2–1.4, 1.6).** Ein Aufklapp-Menü braucht Öffnen/Schließen, Escape,
   Schließen bei Klick außerhalb, Fokus-Rücksprung – und soll auch ohne JavaScript „Abmelden"
   erreichbar lassen (spec-374 Fehlerszenarien; heute ist der Button immer sichtbar).
2. **Wortmarke und Kopfzeilen-Layout auf 375 px (AK1.1, 1.6).** Hamburger, Wortmarke, Navigation
   und Konto-Knopf müssen ohne Überlauf in **eine** Kopfzeile (ADR-031: keine zweite Leiste).
3. **Offene Veranstaltungen auf `/` (AK2).** Datenzugriff, Rollenbedingung (nur `veranstalter`,
   AK2.4) und Verhalten bei Datenbankfehler.
4. **`PublicHeader` auf `/theke/[token]` (AK3).** Wo wird er eingebunden, ohne dass ein
   ungültiger Token einen Veranstaltungsnamen preisgibt oder `/login` ihn bekommt?

## Entscheidung

### D1 · Konto-Menü auf dem nativen Popover (`popover` + `popovertarget`)

Der Konto-Knopf ist ein `<button popovertarget="konto-menue">`, das Menü ein
`<div id="konto-menue" popover>` mit der E-Mail (Text) und dem bestehenden
`<form action={signOutAction}>` mit „Abmelden". Escape, Schließen bei Klick außerhalb
(„light dismiss"), `aria-expanded` am Auslöser und der Fokus-Rücksprung kommen von der Plattform;
es gibt **keinen eigenen Zustand und keinen Fokus-Trap** im Konto-Menü. Die Komponente
`KontoMenue` liegt in `app/components/` (kontospezifisch, nicht route-neutral genug für
`ui/`; sie kennt `signOutAction`), ohne eigene Abhängigkeit. Positionierung: `position: fixed`
oben rechts mit Safe-Area-Abstand (kein CSS Anchor Positioning – zu neu für iOS-Safari-Bestand).

Der Auslöser trägt `aria-label="Konto"`, damit der zugängliche Name nicht von der (ggf. langen)
E-Mail abhängt. Eine lange E-Mail bricht im Menü um (`break-all`), nicht im Knopf.

### D2 · Kopfzeile: Wortmarke links, Konto rechts, eine Zeile

Reihenfolge: Hamburger (nur < `md`) · Wortmarke (`Link` auf `/`, `prefetch={false}` wie die übrigen
Links, ADR-031) · Desktop-Navigation (ab `md`) · `ml-auto` · Konto-Knopf. Die Wortmarke steht auch
unter `md` im Header; sie darf auf schmalen Viewports kürzen (`truncate`, `min-w-0`), der
Hamburger und der Konto-Knopf nie (`shrink-0`, je ≥ 44 px). Der Drawer (`useNavDrawerFocus`) und
die kanonische `lib/navigation.ts` bleiben unverändert.

`AppNav` verliert die Props `label` zugunsten einer Konto-Beschriftung für das Menü, behält aber
die Schnittstelle (`items`, `signOutAction`); `AppHeader` bleibt die Server Component, die `auth()`
liest und für Besucher ohne Session `null` liefert.

### D3 · Startseite: eigene Abfrage, Rollen-Gate vor dem Laden, Fehler abfangen

- **Data-Layer:** neue Funktion `listOffeneVeranstaltungen()` in `db/veranstaltung.ts`
  (`typ = 'veranstaltung'` **und** `status = 'offen'`, `ORDER BY datum DESC, created_at DESC`) –
  die Filterung geschieht in der Datenbank, nicht durch Laden aller Veranstaltungen und
  Aussortieren im Server-Code. Die stehende Theke (`typ = 'theke'`) bleibt ausgeschlossen
  (wie in `listVeranstaltungen`).
- **Zugriff:** `app/page.tsx` ruft sie **nur**, wenn `hasRole(session.user.roles, "veranstalter")`
  gilt (AK2.4: ohne Rolle wird nichts geladen). Das ist Anzeige-Komfort; die Durchsetzung liegt
  unverändert in den Zielrouten (ADR-016).
- **Fehler:** ein Fehler der Abfrage wird in der Startseite abgefangen (`try/catch` um genau diesen
  Aufruf, Catch-Scope nicht weiter, vgl. Lesson #353); die Seite zeigt dann Hinweis + Kacheln statt
  Absturz (spec-374 Fehlerszenario). Es wird nicht in `error.tsx` eskaliert – die Kacheln sind
  die Hauptnavigation und müssen bleiben.
- **Komposition:** die Liste ist eine kleine Server Component im Feature-Ordner
  (`app/veranstaltung/OffeneVeranstaltungen.tsx`, bekommt die Zeilen als Props); `app/page.tsx` bleibt
  reine Zusammensetzung. Kein neuer Routen-Eintrag, aber `docs/routes.md` (Zeile `/`) beschreibt
  danach den Veranstaltungs-Schnellzugriff.

### D4 · `PublicHeader` wird in `app/theke/[token]/page.tsx` eingebunden – nach dem Token-Check

Die Einbindung erfolgt im Page-Rendering **nach** `getVeranstaltungByToken` und `notFound()`, mit
`contextLabel={veranstaltung.bezeichnung}`. Damit erscheint bei ungültigem/abgelaufenem Token nie
ein Header mit Namen (AK3.3), und `/login` bleibt frei (kein Layout-Mount, wie in ADR-031 festgelegt).
`PublicHeader` bleibt route-neutral (kein Feature-Import); er wird auf die Token-Klassen aus ADR-052
umgestellt (bisher rohe Zinc-Klassen).

### D5 · Zurück-Navigation: nur Verwendung des vorhandenen `PageHeader`

Keine neue Architektur: Verzehr, Auslagen, Veranstaltungsliste und Teilnehmerverwaltung nutzen den
vorhandenen `PageHeader` (ADR-052 D1/spec-368). „Kassieren" auf der Verzehr-Seite ist weiter ein
`ButtonLink`, nur das `→` im Label entfällt. Das Farb-Gate (`eslint/ui-token-files.mjs`) wird für
diese vier Seiten **nicht** erweitert, solange ihre Dateien weitere rohe Farbklassen enthalten –
die Umstellung folgt mit #373. Aufgenommen werden die vollständig umgestellten Dateien:
`AppNav`, `KontoMenue`, `PublicHeader`, `app/page.tsx`, `OffeneVeranstaltungen`.

## Alternativen

### D1 – Option A: `<details>/<summary>`
- Vorteile: Ganz ohne JavaScript, keine neue Plattformfunktion.
- Nachteile: Kein Escape, kein Schließen bei Klick außerhalb, kein Fokus-Rücksprung – alles
  nachzubauen und genau die Fälle, die AK1.3 fordert. Das Panel schöbe zudem den Header-Inhalt
  nach unten, statt darüber zu liegen.

### D1 – Option B: Client-Komponente mit `useState` und eigener Fokus-/Outside-Click-Logik
- Vorteile: Volle Kontrolle; Muster wie `useNavDrawerFocus` existiert.
- Nachteile: Ein zweiter handgeschriebener Fokus-Hook neben dem Drawer; ohne JavaScript ist „Abmelden"
  nicht erreichbar (heute ist es das). ADR-053 hat für den Dialog bereits entschieden, Plattform-
  Verhalten dem eigenen Code vorzuziehen.

### D1 – Option C: natives Popover (gewählt)
- Vorteile: Escape, Light-Dismiss, Fokus-Rücksprung und `aria-expanded` kommen von der Plattform;
  deklarativ, also ohne JavaScript bedienbar; keine neue Abhängigkeit; passt zu ADR-053.
- Nachteile: Popover-API erst ab Chrome 114 / Safari 17 / Firefox 125 – für eine installierte PWA
  im Vereinsumfeld vertretbar, aber eine Mindestversion. jsdom kennt die API nicht: Unit-Tests prüfen
  Attribute/Verdrahtung, das Öffnen/Schließen/Fokus belegt ein Playwright-Test. Ältere Browser
  zeigen das Menü nie – dort fiele „Abmelden" weg; wird mit „Konto"-Link-Fallback **nicht** gelöst
  (YAGNI), die Mindestversion ist als Browser-Anforderung zu dokumentieren.

### D3 – Option A: `listVeranstaltungen()` laden und im Code filtern
- Vorteile: Keine neue Funktion.
- Nachteile: Lädt auf jeder Startseiten-Anfrage **alle** Veranstaltungen (wächst mit der Zeit),
  obwohl nur die offenen gebraucht werden.

### D3 – Option B: eigene Abfrage `listOffeneVeranstaltungen` (gewählt)
- Vorteile: Filter in der Datenbank, begrenzter und stabiler Datenumfang; klare Benennung.
- Nachteile: Eine weitere Funktion in `db/veranstaltung.ts`; Sortierung dupliziert die von
  `listVeranstaltungen` (beide Zeilen `orderBy` teilen sich dieselbe Reihenfolge – bei Bedarf
  als Konstante extrahieren, nicht als Vorab-Abstraktion).

### D4 – Option A: `PublicHeader` im Layout bedingt global mounten
- Nachteile: Layout kennt Route/Session-Zustand nicht sauber; widerspricht ADR-031 („opt-in");
  Gefahr, dass `/login` ihn bekommt.

### D4 – Option B: in der Seite nach dem Token-Check (gewählt)
- Vorteile: Nichts erscheint ohne gültigen Token; ein Ort; keine Layout-Logik.
- Nachteile: Jede künftige öffentliche Seite muss ihn selbst einbinden (opt-in, wie gewollt).

## Begründung

Das Einfachste, das spec-374 erfüllt, ist, Plattformverhalten zu nutzen (Popover wie schon
`<dialog>`), statt einen zweiten Fokus-Hook zu pflegen, und die Datenbank filtern zu lassen, was
sie filtern kann. Die Änderungen sind lokal und reversibel: Das Konto-Menü kann später gegen eine
Client-Variante getauscht werden, ohne den Header-Schnitt zu ändern; `lib/navigation.ts`,
Drawer, Rollen-Durchsetzung und Server/Client-Schnitt aus ADR-031 bleiben unberührt.

## Konsequenzen

- **Neu:** `app/components/KontoMenue.tsx`, `app/veranstaltung/OffeneVeranstaltungen.tsx`,
  `listOffeneVeranstaltungen()` in `db/veranstaltung.ts`.
- **Geändert:** `AppNav.tsx` (Wortmarke, Konto-Knopf, Tokens), `PublicHeader.tsx` (Tokens),
  `app/page.tsx`, `app/theke/[token]/page.tsx`, `ArbeitsschrittKacheln.tsx` (Titel, spec-374 AK5),
  die vier Seiten aus D5; ADR-031 bekommt einen Hinweis auf diese ADR; `docs/routes.md` (`/`).
- **Browser-Mindestversion** für das Konto-Menü: Chrome 114, Safari 17, Firefox 125 (Popover-API).
- **Tests:** `KontoMenue` – Attribut-Verdrahtung (`popover`, `popovertarget`, `aria-label`),
  `signOutAction` im Formular, E-Mail im Menü, Fallback „Angemeldet"; `AppNav` – Wortmarke
  verlinkt auf `/`; `listOffeneVeranstaltungen` – DB-Integrationstest (offen/abgeschlossen/Theke,
  Reihenfolge inkl. Gleichstand); Startseite – Rolle ja/nein (Abfrage wird bei fehlender Rolle
  **nicht** aufgerufen), leer, Fehler; `/theke/[token]` – Header nur bei gültigem Token;
  Playwright – Konto-Menü öffnen/Escape/Fokus (echter Browser) und 375 px ohne Überlauf.
- **Bekannte Lücke (mit Absicht):** Farb-Gate für die vier AK4-Seiten folgt mit #373 (D5).
