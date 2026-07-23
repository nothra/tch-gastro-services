# Spec: Verzehrerfassung – Link- und Veranstalter-Ansicht optisch vereinheitlichen

> Issue: #187 · Label: `enhancement` · Branch: `feature/187-verzehrerfassung-vereinheitlichen`

## Kontext

Die Verzehrerfassung (Getränke/Essen/Kaffee je Teilnehmer) ist über zwei Wege erreichbar,
die fachlich dasselbe tun, aber seit #183 optisch auseinandergelaufen sind:

- **F7 – Link/Selbstbedienung** (`/theke/[token]`): öffentlich, login-frei. `IdentityGate`
  (Namenswahl „Wer bist du?" / „Für wen?") → **`FokusListe`**: Akkordeon, genau **eine** oder
  **keine** Karte offen, oben eine sticky, horizontal scrollbare **Chip-Leiste** zum schnellen
  Teilnehmerwechsel (eingeführt in #183, ADR-035).
- **F5 – Veranstalter** (`/veranstaltung/[id]/verzehr`): angemeldet, Rolle `veranstalter`.
  Rendert **`VerzehrErfassung`** direkt: flache Liste, **alle** Karten offen, keine Chip-Leiste.

Erwartung: **beide Seiten sehen identisch aus** – dieselbe Fokus-/Akkordeon-Darstellung wie im
Link-Weg, unabhängig vom Zugang. Rein präsentationsseitig; **kein neues fachliches Verhalten**
(gleiche Actions, gleiche Summen, gleiches Katalog-/Positionen-Handling).

Die geteilte `ZeileKarte` liegt bereits route-neutral in `app/_verzehr/` und kann collapsible.
Die Akkordeon-Mechanik (Chip-Leiste, „eine Karte offen", scrollIntoView) steckt aktuell in
`app/theke/[token]/FokusListe.tsx` und hängt am **Token** (merkt das Ziel geräte-lokal via
`erfasser-ziel-storage`). Für die Vereinheitlichung wandert `FokusListe` route-neutral nach
`app/_verzehr/` und wird **token-frei** (die Ziel-Persistenz ist F7-spezifisch).

## Scope

**Inbegriffen:**
- F5 (Veranstalter) nutzt dieselbe Fokus-/Akkordeon-Darstellung wie F7 (`FokusListe`), inkl.
  identischer sticky Chip-Leiste zum Teilnehmerwechsel.
- **F5-Startzustand: keine Karte offen** (alle eingeklappt); Auswahl über Chip-Leiste bzw.
  Kopf-Tipp. Keine geräte-lokale Merkung des zuletzt bearbeiteten Teilnehmers auf F5.
- `FokusListe` wird route-neutral nach `app/_verzehr/` gehoben und von der Token-/
  `erfasser-ziel-storage`-Kopplung entkoppelt (Persistenz vom Konsumenten injiziert).
- Read-only (abgeschlossene Veranstaltung) auf beiden Wegen konsistent: dieselbe Akkordeon-
  Darstellung, nicht bearbeitbar, alle Karten eingeklappt.
- Empty-State (keine Teilnehmer) bleibt auf beiden Wegen erhalten.

**Nicht inbegriffen:**
- Der `IdentityGate` (Erfasser→Ziel-Zweischritt, „Erfasser wechseln") bleibt **ausschließlich**
  auf dem öffentlichen Link-Weg (F7). Der angemeldete Veranstalter braucht ihn nicht.
- Keine Änderung an Server-Actions (`adjustVerzehrAction`, `adjustVerzehrByTokenAction`),
  DB-Zugriff, Summenlogik, Katalog-/Positionen-Verarbeitung oder RBAC.
- Kein „zuletzt bearbeitete Karte merken" auf F5 (bewusst verworfen).
- Keine Änderung am F7-Ablauf (Gate, Ziel-Merkung, Alt-Schlüssel-Adoption) außer der durch den
  Komponenten-Umzug nötigen Anpassung der Import-Pfade / Persistenz-Injektion.

## Akzeptanzkriterien

**Optische Vereinheitlichung (F5):**
- [ ] GIVEN ein angemeldeter Veranstalter öffnet `/veranstaltung/[id]/verzehr` einer **offenen**
  Veranstaltung mit ≥1 Teilnehmer, WHEN die Seite lädt, THEN erscheint dieselbe Fokus-/
  Akkordeon-Darstellung wie im Link-Weg (`FokusListe`): sticky Chip-Leiste oben, je Teilnehmer
  eine Karte, Kopf mit Name + Summen sichtbar.
- [ ] GIVEN die geladene F5-Seite, WHEN noch kein Teilnehmer gewählt wurde, THEN ist **keine**
  Karte aufgeklappt (alle eingeklappt).
- [ ] GIVEN die F5-Chip-Leiste, WHEN der Veranstalter einen Teilnehmer-Chip antippt, THEN klappt
  **genau dessen** Karte auf, alle anderen zu, und die Karte wird in den Sichtbereich gescrollt –
  identisch zum Link-Weg.
- [ ] GIVEN eine offene Karte auf F5, WHEN auf den Kartenkopf getippt wird, THEN klappt sie zu
  (danach keine Karte offen).
- [ ] GIVEN die F5-Seite, WHEN geladen, THEN ist die Chip-Leiste **sticky** und horizontal
  scrollbar (identisch zu F7).

**Erfassungs-Funktionalität unverändert:**
- [ ] GIVEN eine offene Karte auf F5, WHEN die Menge über `MengeControl` geändert wird, THEN
  wirkt die gebundene Veranstalter-Action (`adjustVerzehrAction`) wie bisher; Getränke/Essen/
  Kaffee inkl. Größen-Gruppen und „Nicht mehr im Katalog"-Positionen werden unverändert gerendert.

**Identity-Gate bleibt F7-only:**
- [ ] GIVEN die F5-Seite, WHEN geladen, THEN erscheint **kein** „Wer bist du?" / „Für wen?"-Gate
  und **keine** „Erfasser wechseln"-Leiste.
- [ ] GIVEN der Link-Weg (F7), WHEN geladen, THEN bleibt der `IdentityGate` (Erfasser→Ziel)
  unverändert vorhanden und öffnet nach der Zielwahl die Ziel-Karte in der Fokusliste.

**Read-only konsistent:**
- [ ] GIVEN eine **abgeschlossene** Veranstaltung, WHEN die F5-Seite geladen wird, THEN erscheint
  dieselbe Akkordeon-Darstellung, **nicht bearbeitbar** (`MengeControl` disabled), alle Karten
  eingeklappt – konsistent mit dem F7-Read-only-Verhalten.
- [ ] GIVEN der Link-Weg (F7) einer abgeschlossenen Veranstaltung, WHEN geladen, THEN bleibt das
  Verhalten unverändert (kein Gate, Akkordeon eingeklappt, nicht bearbeitbar).

**Route-Neutralität / Clean Code:**
- [ ] GIVEN das Repo nach der Änderung, WHEN die Imports geprüft werden, THEN importiert der
  Veranstalter-Weg **kein** Feature-Modul aus `app/theke/`; die geteilte Fokus-Darstellung liegt
  unter `app/_verzehr/` und hängt **nicht** an `token`/`erfasser-ziel-storage` (Codify #52, ADR-025 D5).
- [ ] GIVEN der Link-Weg (F7), WHEN ein Ziel gewählt wird, THEN wird es weiterhin geräte-lokal
  gemerkt – die Persistenz-Anbindung wird vom Konsumenten **injiziert**, nicht in der geteilten
  Komponente hardcodiert.

**Empty-State:**
- [ ] GIVEN eine Veranstaltung **ohne** Teilnehmer, WHEN die F5-Seite geladen wird, THEN erscheint
  ein Hinweis wie bisher (sinngemäß „Noch keine Teilnehmer erfasst – zuerst Teilnehmer hinzufügen.")
  statt einer leeren Fokusliste.

## Fehlerszenarien
- [ ] GIVEN `localStorage` ist auf F7 nicht verfügbar (privater Modus), WHEN das Ziel gewählt
  wird, THEN bleibt der Ablauf fail-open (kein Absturz), es wird beim nächsten Laden erneut
  gefragt – unverändert zum Ist-Zustand.
- [ ] GIVEN ein clientseitiger Fokuslisten-Zustand ohne offene Karte (F5, initial), WHEN
  scrollIntoView-Logik läuft (Test-/jsdom-Umgebung ohne Implementierung), THEN bleibt sie guarded
  (kein Fehler), wie in der bestehenden `FokusListe`.

## Offene Fragen (→ `/architecture`)
- [ ] **Entkopplung der Ziel-Persistenz:** `FokusListe` token-frei machen – via injiziertem
  Callback (z. B. `onZielGewaehlt?: (id) => void`, F7 bindet `writeZielId(token, …)`, F5 lässt
  ihn weg) **oder** generischem `persistKey`. Welche Variante? Braucht der Umzug eine **ADR**
  (Erweiterung von ADR-025 D5 / ADR-035), weil `FokusListe` aus einer route-spezifischen Position
  in einen geteilten Baustein wandert?
- [ ] **Benennung** der Komponente in `app/_verzehr/` (`FokusListe` beibehalten vs. sprechenderer,
  route-neutraler Name).
- [ ] **Ort des Empty-States** auf F5 (in der Seite vs. in der geteilten Fokus-Komponente).
- [ ] **`docs/routes.md`:** Route-Pfade/Zugriffe ändern sich nicht – aber prüfen, ob die
  Funktions-Beschreibung der F5-Route angepasst werden muss (Drift-Check).
