# Task 54: selbstbedienung-link-namenswahl

## Status
- [x] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Feature **F7** (Epic „Digitale Veranstaltungs-Abrechnung"). Teilnehmer erfassen ihren Verzehr
**selbst** – ohne Konto/Login – über einen geteilten **Link/QR** und Wahl ihres Namens aus der
Teilnehmerliste. Kanonische Spec: [`docs/specs/spec-54-selbstbedienung-link.md`](../docs/specs/spec-54-selbstbedienung-link.md).

Baut auf der in #51 vorbereiteten Grundlage auf: `veranstaltung.token` (unratbar), `veranstaltung_typ`,
rollen-neutrale `db/verzehr.ts`, `proxy.ts`-Seam für `theke/`, route-neutrale `app/_verzehr/`-UI.

**Kern der Umsetzung:** öffentliche Route `app/theke/[token]`, token-scoped Verzehr-Action,
Namenswahl-UI (+ Merken/„Person wechseln"), Link/QR-Anzeige beim Veranstalter, Read-only bei
abgeschlossener Veranstaltung, neutraler Fehler bei ungültigem Token.

**Geschärft am 2026-07-20:** gemeinsame Route für datierte Veranstaltung **und** stehende Theke
(Essen bleibt eingeblendet); Namens-Persistenz je Gerät; abgeschlossen → Read-only; Token stabil
solange offen. Theke-QR-Aushang ausgegründet nach **#181**.

## Akzeptanzkriterien
<!-- Kanonische Quelle: spec-54; hier gespiegelt für den Fortschritt -->

**A) Zugang teilen (Veranstalter)**
- [ ] Offene Veranstaltung → Veranstalter sieht auf `veranstaltung/[id]` Link **und** QR-Code auf `theke/[token]` dieser Veranstaltung.

**B) Öffnen & Namenswahl (ohne Login)**
- [ ] Gültiger Link → Veranstaltung, Teilnehmerliste und laufende Summen ohne Login sichtbar.
- [ ] Namenswahl aus der Liste → Erfassen für die ganze Liste (volle Transparenz), Summen aktualisieren sich (F5).
- [ ] Name wird je Gerät gemerkt; „Person wechseln" jederzeit möglich.
- [ ] Neuen Teilnehmer anlegen ist über den Link **nicht** verfügbar (nur Auswahl).

**C) Status offen vs. abgeschlossen**
- [ ] Abgeschlossene Veranstaltung → Read-only-Ansicht (Liste + Summen), keine Erfassungs-Controls.
- [ ] Erfassung bei inzwischen abgeschlossener Veranstaltung → serverseitig abgelehnt (Action prüft `offen`).

**D) Token & Fehler**
- [ ] Ungültiges/unbekanntes Token → neutraler 404, keine Preisgabe anderer Veranstaltungen.
- [ ] Token bleibt gültig, solange die Veranstaltung offen ist (keine Rotation/kein Ablauf).

**E) Gemeinsame Route & geteiltes Gerät**
- [ ] Theke-Token über `theke/[token]` → dieselbe Selbstbedienung wie datierte Veranstaltung (Essen eingeblendet).
- [ ] Geteiltes Theken-Gerät → mehrere Teilnehmer nacheinander, Wechsel via „Person wechseln".

**F) Serverseitige Autorisierung (token-scoped)**
- [ ] Schreibzugriff nur über gültigen Token einer offenen Veranstaltung; adressierte `zeile`/`teilnehmer` muss zu dieser Veranstaltung gehören (kein IDOR, Codify #51).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

Nächster Schritt: **/architecture 54** – offene Punkte aus spec-54: Read-only-Pfad,
localStorage-Schlüssel & Verhalten bei entferntem Teilnehmer, QR-Erzeugung (Lib/Server vs. Client,
PWA-Bündelgröße). Sicherheit (Rate-Limit) → /security-review.

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->

Alle Requirements-Fragen sind entschieden (siehe spec-54 → „Gesetzte Entscheidungen").
Verbleibende Punkte sind Architektur-/Security-Fragen (spec-54 → „Offene Fragen").

**Doku-Folgeaufgabe (außerhalb #54):** spec-51 B) an „Essen an der Theke bleibt eingeblendet"
angleichen. **Ausgegründet:** #181 (Theke-QR/Link anzeigen & drucken).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/54-selbstbedienung-link-namenswahl`
Erstellt: 2026-07-20 07:22
