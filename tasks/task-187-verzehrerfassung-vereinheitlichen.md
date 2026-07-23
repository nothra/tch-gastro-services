# Task 187: verzehrerfassung-vereinheitlichen

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Die Verzehrerfassung sieht auf dem Veranstalter-Weg (F5, `/veranstaltung/[id]/verzehr`) und dem
Selbstbedienungs-Link (F7, `/theke/[token]`) unterschiedlich aus, obwohl beide fachlich dasselbe
tun. Seit #183 nutzt F7 die Fokus-/Akkordeon-Ansicht (`FokusListe` + sticky Chip-Leiste), F5 noch
die flache `VerzehrErfassung`. Ziel: **F5 bekommt dieselbe Fokus-/Akkordeon-Darstellung wie F7**.
Rein präsentationsseitig, kein neues fachliches Verhalten.

`FokusListe` wandert dazu route-neutral nach `app/_verzehr/` und wird token-frei (die geräte-lokale
Ziel-Merkung bleibt F7-spezifisch). Der `IdentityGate` bleibt F7-only.

**Nutzer-Entscheidungen (aus /requirements):**
- F5-Startzustand: **keine Karte offen** (alle eingeklappt), Auswahl über Chip-Leiste/Kopf-Tipp;
  kein „zuletzt bearbeitete merken" auf F5.
- Chip-Leiste auf F5: **identisch** zu F7 (sticky, horizontal scrollbar).

Spec: [`docs/specs/spec-187-verzehrerfassung-vereinheitlichen.md`](../docs/specs/spec-187-verzehrerfassung-vereinheitlichen.md)

## Akzeptanzkriterien
> Kanonisch in der Spec; hier gespiegelt für den Fortschritt.

Optische Vereinheitlichung (F5):
- [ ] Offene Veranstaltung + ≥1 Teilnehmer → identische Fokus-/Akkordeon-Darstellung wie F7 (Chip-Leiste + Karten).
- [ ] Initial keine Karte aufgeklappt.
- [ ] Chip-Tipp: genau dessen Karte auf, andere zu, scrollIntoView – wie F7.
- [ ] Kopf-Tipp auf offene Karte → klappt zu.
- [ ] Chip-Leiste sticky + horizontal scrollbar (identisch F7).

Erfassung unverändert:
- [ ] Mengenänderung via `MengeControl` wirkt wie bisher (`adjustVerzehrAction`); Größen-Gruppen + „Nicht mehr im Katalog" unverändert.

Identity-Gate F7-only:
- [ ] F5 zeigt kein Gate / keine „Erfasser wechseln"-Leiste.
- [ ] F7-Gate (Erfasser→Ziel) bleibt unverändert, öffnet Ziel-Karte.

Read-only konsistent:
- [ ] Abgeschlossene Veranstaltung auf F5 → gleiche Akkordeon-Darstellung, nicht bearbeitbar, eingeklappt.
- [ ] F7-Read-only unverändert.

Route-Neutralität / Clean:
- [ ] Kein Feature-Import aus `app/theke/` in den F5-Weg; geteilte Fokus-Darstellung in `app/_verzehr/`, token-frei.
- [ ] F7 merkt Ziel weiterhin geräte-lokal (Persistenz injiziert, nicht hardcodiert).

Empty-State:
- [ ] F5 ohne Teilnehmer → Hinweis wie bisher (statt leerer Fokusliste).

Fehlerszenarien:
- [ ] F7 `localStorage` nicht verfügbar → fail-open, unverändert.
- [ ] scrollIntoView bleibt guarded (jsdom ohne Implementierung).

## Technische Notizen
<!-- Von /architecture befüllt -->
- `FokusListe` token-frei: Ziel-Persistenz via injiziertem Callback (F7 bindet `writeZielId(token,…)`, F5 lässt ihn weg) vs. generischem `persistKey` – in `/architecture` entscheiden.
- Ggf. ADR (Erweiterung ADR-025 D5 / ADR-035), da `FokusListe` aus route-spezifischer Position in einen geteilten Baustein wandert.

## Offene Fragen
- [ ] Persistenz-Entkopplung: Callback vs. `persistKey`? ADR nötig?
- [ ] Benennung der Komponente in `app/_verzehr/` (`FokusListe` behalten?).
- [ ] Ort des F5-Empty-States (Seite vs. geteilte Komponente).
- [ ] `docs/routes.md`: F5-Funktionsbeschreibung ggf. anpassen (Drift-Check).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/187-verzehrerfassung-vereinheitlichen`
Erstellt: 2026-07-23 13:03
