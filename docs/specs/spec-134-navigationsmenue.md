# Spec: Rollenbewusstes, PWA-optimiertes Navigationsmenü

> Issue #134 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> Baut auf dem RBAC-Modell aus [spec-48](spec-48-login-rollen.md) (Rollen `verwalter`/`veranstalter`,
> serverseitige Durchsetzung) und dem login-freien Theken-Self-Service aus
> [spec-54](spec-54-selbstbedienung-link.md) (Route `app/theke/[token]`) auf.
> Route-Schnitt & Rollen-Namen: [ADR-024](../adr/024-route-schnitt-veranstaltung-lifecycle.md).

## Kontext

Die App hat mehrere Funktionsbereiche (Veranstaltungen, Katalog- und Teilnehmer-Verwaltung),
aber **keine durchgängige Navigation**. Der bestehende `AppHeader`
(`app/components/AppHeader.tsx`) zeigt nur E-Mail + „Abmelden"; die Startseite `/`
(`app/page.tsx`) ist eine statische Begrüßung ohne Links. Nutzer erreichen Bereiche heute
nur über direkte URLs oder Inline-Links einzelner Seiten – es fehlt ein zentraler,
rollengerechter Einstieg.

Zusätzlich gibt es Funktionen, die **bewusst ohne Login** laufen – allen voran der
Theken-Self-Service (Gast erfasst Verzehr per Veranstaltungs-/QR-Link + Namenswahl,
spec-54). Das Navigationskonzept muss den angemeldeten Personal-Kontext und den anonymen
Gast-Kontext klar trennen.

**Warum jetzt:** Ohne zentrale Navigation ist die App auf Handy/Tablet und in der
installierten PWA schwer bedienbar; Nutzer müssen URLs kennen. Ein rollenbewusstes Menü +
Startseite macht die verfügbaren Funktionen sichtbar und PWA-tauglich.

## Scope

**Inbegriffen:**
- Zentrales Navigationsmenü, das die bestehenden Funktionsbereiche bündelt und Einträge
  **serverseitig** nach den Rollen des angemeldeten Nutzers filtert (RBAC).
- **Rollenbewusste Startseite `/`**: zeigt dem angemeldeten Nutzer seine verfügbaren
  Bereiche als Kacheln/Liste (gleiche Rollenfilterung wie das Menü).
- PWA-/Touch-Optimierung: mobil auf-/zuklappbares Menü, Desktop sichtbare Navigation;
  Touch-Ziele ≥ 44 px, Safe-Area-Insets, aktiver Zustand, Tastatur-/A11y-Bedienung,
  Dark Mode.
- Behandlung des **login-freien Kontexts** (Theken-Self-Service): kein Personal-Menü,
  keine `/login`-Umleitung; ein **dezenter „Anmelden"-Einstieg** fürs Personal ist
  vorhanden, ohne den Gast-Flow zu verdrängen.
- „Abmelden" bleibt aus der Navigation erreichbar (bestehende `signOutAction`).

**Nicht inbegriffen:**
- Umbau bestehender Routen oder Rollen-Guards (`requireRole`/`requireAnyRole`) – nur
  Navigation und Startseite.
- Neue Funktionsbereiche; es werden nur bestehende Routen verlinkt.
- **Implementierung** der Theken-Self-Service-Seite selbst (`theke/[token]`) – das ist
  F7/#54 (spec-54). Dieses Issue stellt nur sicher, dass die Navigation den login-freien
  Kontext korrekt behandelt.
- Feingranulare Rechte über die zwei Rollen hinaus (spec-48).

## Menüeinträge nach Rolle (RBAC)

Sichtbarkeit anhand `session.user.roles` (Prädikate aus `lib/authz.ts` – `hasRole`/`hasAnyRole`).

| Eintrag | Route | Sichtbar für Rolle |
|---|---|---|
| Veranstaltungen | `/veranstaltung` | `veranstalter` |
| Katalog | `/verwaltung/katalog` | `verwalter` |
| Teilnehmer | `/verwaltung/teilnehmer` | `verwalter` |
| Abmelden | (Server Action `signOutAction`) | jede angemeldete Rolle |

- Ein Nutzer mit **beiden** Rollen sieht alle Bereichs-Einträge.
- Die Menü-/Startseiten-Sichtbarkeit ist **Komfort, keine Sicherheitsgrenze**: Die
  tatsächliche Durchsetzung bleibt serverseitig in den Routen/Actions (spec-48). Das Menü
  blendet nur aus, was der Nutzer ohnehin nicht darf.

## Akzeptanzkriterien

### Rollenbasierte Sichtbarkeit (Menü)
- [ ] GIVEN ein angemeldeter `veranstalter` (ohne Verwalter-Rolle) WHEN eine beliebige
      geschützte Seite geöffnet ist THEN zeigt die Navigation „Veranstaltungen", **nicht**
      „Katalog"/„Teilnehmer".
- [ ] GIVEN ein angemeldeter `verwalter` (ohne Veranstalter-Rolle) WHEN eine geschützte
      Seite geöffnet ist THEN zeigt die Navigation „Katalog" und „Teilnehmer", **nicht**
      „Veranstaltungen".
- [ ] GIVEN ein Nutzer mit **beiden** Rollen WHEN die Navigation gerendert wird THEN sind
      alle Bereichs-Einträge sichtbar.
- [ ] GIVEN die Rollenprüfung WHEN entschieden wird, welche Einträge erscheinen THEN
      erfolgt sie **serverseitig** (Session/`lib/authz.ts`), nicht nur clientseitig
      ausgeblendet.
- [ ] GIVEN ein angemeldeter Nutzer WHEN er „Abmelden" auslöst THEN wird die bestehende
      `signOutAction` aufgerufen und die Sitzung beendet.

### Rollenbewusste Startseite `/`
- [ ] GIVEN ein angemeldeter Nutzer WHEN er `/` öffnet THEN sieht er seine verfügbaren
      Bereiche (nach denselben Rollenregeln wie das Menü) als Kacheln/Liste mit Link in
      den jeweiligen Bereich.
- [ ] GIVEN ein `veranstalter` WHEN er `/` öffnet THEN erscheint eine Kachel
      „Veranstaltungen", **nicht** „Katalog"/„Teilnehmer" (und umgekehrt für `verwalter`).

### Login-freier / öffentlicher Kontext
- [ ] GIVEN ein nicht angemeldeter Besucher auf `/login` WHEN die Seite rendert THEN
      erscheint **kein** angemeldetes Navigationsmenü (Seite bleibt sauber).
- [ ] GIVEN der login-freie Theken-Self-Service (`theke/[token]`) WHEN ein Gast ihn
      öffnet THEN erscheint **kein** Personal-Menü und **keine** Umleitung auf `/login`;
      der Gast-Flow bleibt bedienbar und es gibt keinen Link auf geschützte Bereiche.
- [ ] GIVEN der login-freie Theken-Kontext WHEN er rendert THEN ist ein **dezenter
      „Anmelden"-Einstieg** fürs Personal vorhanden, der den Gast-Flow nicht in den
      Hintergrund drängt.

### PWA / Mobile / A11y
- [ ] GIVEN ein schmaler (mobiler) Viewport WHEN die Navigation rendert THEN ist sie über
      ein Bedienelement auf-/zuklappbar; GIVEN ein breiter (Desktop-)Viewport THEN ist die
      Navigation direkt sichtbar.
- [ ] GIVEN die Navigation WHEN interaktive Elemente gerendert werden THEN sind deren
      Touch-Ziele ≥ 44×44 px.
- [ ] GIVEN ein Gerät mit Safe-Area (Notch/Home-Indicator) WHEN die installierte PWA
      läuft THEN respektiert die Navigation die `env(safe-area-inset-*)`.
- [ ] GIVEN ein geöffneter Bereich WHEN die Navigation rendert THEN ist der aktive Eintrag
      markiert (`aria-current="page"`).
- [ ] GIVEN ein Tastaturnutzer WHEN er die (mobil aufklappbare) Navigation bedient THEN
      kann er sie per Tastatur öffnen, schließen (Escape) und zwischen Einträgen
      navigieren; Fokus wird beim Öffnen/Schließen korrekt geführt und ARIA-Rollen sind
      gesetzt.
- [ ] GIVEN dunkles Farbschema WHEN die Navigation rendert THEN wird der Dark Mode
      unterstützt (konsistent zum bisherigen `AppHeader`).

## Fehlerszenarien
- [ ] GIVEN ein manipulierter/abgelaufener Session-Zustand WHEN die Navigation gerendert
      wird THEN werden keine geschützten Einträge angezeigt (fail-closed; Nutzer gilt als
      nicht ausreichend berechtigt).
- [ ] GIVEN ein Nutzer **ohne** jede Rolle (nur angemeldet) WHEN die Navigation/Startseite
      rendert THEN erscheint kein Bereichs-Eintrag (nur „Abmelden"), ohne Fehler.

## Offene Fragen (für /architecture)
- [ ] Mobil-Navigationsmuster: Off-Canvas-Drawer vs. Bottom-Sheet/Bottom-Nav (Touch-
      Ergonomie in der PWA) → /architecture, ggf. ADR.
- [ ] Aufteilung Server-/Client-Component: rollengefilterte Menü-Definition serverseitig,
      Auf-/Zuklappen clientseitig – konkreter Schnitt → /architecture.
- [ ] Wie erkennt die Navigation den „öffentlichen Theken-Kontext" robust (Routen-Segment
      vs. fehlende Session) → /architecture, mit Blick auf spec-54.
