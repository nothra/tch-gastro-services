# Spec: Rollenbewusstes, PWA-optimiertes Navigationsmenü

> Issue #134 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> Baut auf dem bestehenden `AppHeader` (`app/components/AppHeader.tsx`) auf und nutzt die
> Rollen-Prädikate aus [`lib/authz.ts`](../../lib/authz.ts) (`hasRole`/`hasAnyRole`). Die
> serverseitige Durchsetzung bleibt in den Routen/Server Actions (`requireRole`/`requireAnyRole`,
> spec-48) unverändert – diese Task betrifft **nur die Navigation** (Sichtbarkeit = Komfort).

## Kontext

Die App hat inzwischen mehrere Funktionsbereiche (Veranstaltungen führen, Katalog- und
Teilnehmer-Verwaltung), aber **keine durchgängige Navigation**. Der heutige `AppHeader` zeigt nur
E-Mail + „Abmelden"; Bereiche sind nur über direkte URLs oder verstreute Links erreichbar. Es fehlt
ein zentraler, rollenbewusster Einstieg, der im Browser genauso trägt wie in der installierten PWA
auf Handy/Tablet.

Zwei Kontexte müssen abgedeckt sein:
- **Angemeldetes Personal** (`verwalter` / `veranstalter`) – volle, rollengefilterte Navigation.
- **Login-freier Gast** (künftiger Theken-Self-Service `theke/[token]`, F7/#54) – **kein**
  Personal-Menü, **keine** `/login`-Umleitung; höchstens eine minimale kontextpassende Orientierung.

## Ubiquitous Language / kanonische Menü-Definition

Die Navigationseinträge werden an **einer** Stelle als rollengefilterte Liste definiert
(kein verstreutes RBAC in Einzelkomponenten). Sowohl das Kopfzeilen-Menü als auch der
Dashboard-Hub auf `/` leiten ihre sichtbaren Einträge aus **derselben** Definition ab.

| Eintrag | Route | Sichtbar für Rolle | Prädikat |
|---|---|---|---|
| Veranstaltungen | `/veranstaltung` | `veranstalter` | `hasRole(roles, "veranstalter")` |
| Katalog | `/verwaltung/katalog` | `verwalter` | `hasRole(roles, "verwalter")` |
| Teilnehmer | `/verwaltung/teilnehmer` | `verwalter` | `hasRole(roles, "verwalter")` |
| Abmelden | `signOutAction` (Server Action) | jede angemeldete Rolle | Session vorhanden |

Rollen-Quelle ist die Server-Session (`auth()` → `session.user.roles`). Die Filterung läuft im
Server-Component-Teil; nur das Auf-/Zuklappen (mobil) ist Client-seitig.

## Scope

**Inbegriffen:**
- Erweiterung des bestehenden `AppHeader` zu einer rollenbewussten Navigation – **keine** zweite,
  parallele Kopfzeile. E-Mail-Label und „Abmelden" bleiben erreichbar.
- Eine kanonische, rollengefilterte Menü-Definition als einzige Quelle für Header **und** Dashboard.
- **Startseite `/` als Dashboard-Hub:** zeigt die verfügbaren Bereiche als große, touch-taugliche
  Kacheln/Karten, gefiltert aus derselben Menü-Definition.
- **Responsive/PWA:** mobil auf-/zuklappbares Menü, auf Desktop-Breite direkt sichtbare Navigation;
  Touch-Ziele ≥ 44×44 px; Safe-Area-Insets (`env(safe-area-inset-*)`); Dark Mode analog `AppHeader`.
- **A11y/Tastatur:** Öffnen/Schließen/Navigieren per Tastatur (Tab/Enter/Escape), korrekte
  ARIA-Rollen, Fokus-Management beim Öffnen/Schließen des mobilen Menüs, aktiver Bereich via
  `aria-current="page"`.
- **Minimale Anonym-Orientierung (Komponente):** eine schlanke, **wiederverwendbare** Leiste für den
  login-freien Kontext (Slot für Kontextname z. B. Veranstaltungs-/Thekenname, dezenter
  „Anmelden"-Einstieg) – **nicht** global gemountet (damit `/login` sauber bleibt); wird von #54
  auf der Theken-Seite eingehängt.

**Nicht inbegriffen:**
- **Kein** Umbau der bestehenden Routen-/Rollen-Guards – die serverseitige Durchsetzung bleibt.
- **Keine** neuen Funktionsbereiche; es werden nur bestehende Routen verlinkt.
- **Keine** Implementierung der Theken-Self-Service-Seite `theke/[token]` selbst (F7/#54, spec-54).
  Diese Task liefert nur die wiederverwendbare Anonym-Leiste + garantiert das korrekte
  Navigationsverhalten ohne Session.
- **Kein** persistentes State-Handling über die Session hinaus (keine Menü-Präferenzen speichern).

## Akzeptanzkriterien

### Rollen-Sichtbarkeit (RBAC, serverseitig gefiltert)

- [ ] GIVEN ein angemeldeter Nutzer mit ausschließlich Rolle `veranstalter` WHEN er das
      Navigationsmenü sieht THEN erscheint „Veranstaltungen", **nicht** „Katalog"/„Teilnehmer".
- [ ] GIVEN ein angemeldeter Nutzer mit ausschließlich Rolle `verwalter` WHEN er das Menü sieht
      THEN erscheinen „Katalog" und „Teilnehmer", **nicht** „Veranstaltungen".
- [ ] GIVEN ein angemeldeter Nutzer mit **beiden** Rollen WHEN er das Menü sieht THEN erscheinen
      alle drei Bereichs-Einträge.
- [ ] GIVEN eine angemeldete Session mit **leerem** Rollen-Array WHEN das Menü rendert THEN
      erscheint **kein** Bereichs-Eintrag, aber „Abmelden" bleibt erreichbar (fail-closed).
- [ ] GIVEN irgendeine angemeldete Session WHEN das Menü rendert THEN wird die Sichtbarkeit über
      `hasRole`/`hasAnyRole` aus der Server-Session bestimmt (Server-Component), nicht nur per
      CSS/Client ausgeblendet.

### Anonymer / login-freier Kontext

- [ ] GIVEN kein angemeldeter Nutzer (z. B. auf `/login`) WHEN die Kopfzeile rendert THEN wird
      **kein** angemeldetes Navigationsmenü angezeigt und die Seite bleibt sauber (heutiges
      `AppHeader`-Verhalten bleibt erhalten).
- [ ] GIVEN der login-freie Theken-Kontext (kein Session) WHEN eine öffentliche Seite die
      Anonym-Orientierungsleiste einbindet THEN erscheint **kein** Personal-Menü und **kein** Link
      auf geschützte Bereiche, und es erfolgt **keine** Umleitung auf `/login`.
- [ ] GIVEN die Anonym-Orientierungsleiste WHEN ihr ein Kontextname übergeben wird THEN zeigt sie
      diesen an und stellt höchstens einen dezenten „Anmelden"-Einstieg bereit, der den Gast-Flow
      nicht in den Vordergrund drängt.

### Startseite als Dashboard-Hub

- [ ] GIVEN ein angemeldeter Nutzer WHEN er `/` öffnet THEN sieht er die für seine Rolle(n)
      verfügbaren Bereiche als anklickbare Kacheln – gefiltert aus **derselben** Menü-Definition
      wie das Kopfzeilen-Menü (keine zweite RBAC-Quelle).
- [ ] GIVEN ein Nutzer mit nur einer Rolle WHEN er `/` öffnet THEN erscheinen auf dem Dashboard nur
      die zu seiner Rolle gehörenden Bereichs-Kacheln.

### PWA / Mobile / Bedienbarkeit

- [ ] GIVEN ein schmaler (mobiler) Viewport WHEN die Navigation rendert THEN ist das Menü über ein
      Bedienelement auf-/zuklappbar erreichbar.
- [ ] GIVEN ein breiter (Desktop-)Viewport WHEN die Navigation rendert THEN ist die Navigation
      direkt sichtbar (kein Aufklappen nötig).
- [ ] GIVEN das Navigationsmenü WHEN interaktive Flächen gemessen werden THEN sind Touch-Ziele
      ≥ 44×44 px, und Safe-Area-Insets (`env(safe-area-inset-*)`) werden respektiert.
- [ ] GIVEN der aktuell geöffnete Bereich WHEN das Menü rendert THEN ist der zugehörige Eintrag als
      aktiv markiert (`aria-current="page"`).
- [ ] GIVEN „Abmelden" WHEN der Nutzer es aus dem Menü heraus auslöst THEN wird die bestehende
      `signOutAction` verwendet.
- [ ] GIVEN das (mobile) Menü WHEN es per Tastatur bedient wird THEN lässt es sich öffnen
      (Enter/Space), schließen (Escape) und die Einträge sind per Tab/Enter navigierbar; ARIA-Rollen
      und Fokus-Management beim Öffnen/Schließen sind korrekt.
- [ ] GIVEN Dark Mode WHEN die Navigation rendert THEN werden die Farben analog zum bestehenden
      `AppHeader` dunkel dargestellt.

### Tests

- [ ] Komponententests für Rollen-Sichtbarkeit je Rolle (`veranstalter`, `verwalter`, beide,
      leeres Rollen-Array) sowie „kein angemeldetes Menü ohne Session".
- [ ] Komponententest für das Auf-/Zuklappen des mobilen Menüs (inkl. Escape schließt, Fokus).
- [ ] Test der Anonym-Orientierungsleiste (zeigt Kontextname, kein Link auf geschützte Bereiche).
- [ ] Test, dass Dashboard-Hub und Kopfzeilen-Menü dieselbe rollengefilterte Definition nutzen
      (identische sichtbare Bereichsmenge je Rolle).
- [ ] Ggf. E2E (Playwright) für den mobilen Menü-Flow (öffnen → navigieren → aktiver Zustand).

## Fehlerszenarien

- [ ] GIVEN eine Session mit einer unbekannten/zukünftigen Rolle (nicht in der Menü-Definition)
      WHEN das Menü rendert THEN erscheint **kein** Eintrag für diese Rolle (nur bekannte
      Prädikate greifen – fail-closed, kein Absturz).
- [ ] GIVEN JavaScript ist deaktiviert/nicht geladen (Progressive Enhancement) WHEN ein Desktop-
      Nutzer die Seite öffnet THEN sind die Bereichs-Links dennoch als normale Links nutzbar und
      „Abmelden" funktioniert (Form-Action) – das mobile Aufklappen darf JS voraussetzen.
- [ ] GIVEN das mobile Menü ist geöffnet WHEN der Nutzer zu einer anderen Seite navigiert THEN
      schließt das Menü (kein „hängendes" Overlay über der Zielseite).

## Offene Fragen (für `/architecture`)

- [ ] **Navigationsmuster mobil:** Off-Canvas-Drawer vs. Bottom-Nav/Bottom-Sheet – bewusst per ADR
      entscheiden (Issue nennt beides als Option). Bewertungskriterien: Daumen-Erreichbarkeit,
      Safe-Area, Anzahl Einträge, PWA-Home-Screen-Gefühl.
- [ ] **UI-Baustein-Basis:** shadcn/ui ist im Repo noch **nicht** vorhanden (`components/ui/` fehlt).
      Entscheiden: shadcn/ui einführen (wie im Issue erwähnt) vs. reines Tailwind + eigene
      Primitive – inkl. Auswirkung auf Bundle/PWA und A11y-Fokus-Management. Ggf. ADR.
- [ ] **Platzierung der Anonym-Orientierungsleiste:** als eigenständige, opt-in Komponente (nicht im
      Root-Layout global gemountet, damit `/login` sauber bleibt) – Schnittstellenform (Props:
      Kontextname, optionaler „Anmelden"-Einstieg) im Architektur-Schritt festlegen.
