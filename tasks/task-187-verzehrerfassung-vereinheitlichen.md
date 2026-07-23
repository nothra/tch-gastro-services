# Task 187: verzehrerfassung-vereinheitlichen

## Status
- [x] In Bearbeitung
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
- [x] Offene Veranstaltung + ≥1 Teilnehmer → identische Fokus-/Akkordeon-Darstellung wie F7 (Chip-Leiste + Karten). (page.test: `should_renderCollapsedAccordionWithChipBar_when_veranstalterAndOpen`)
- [x] Initial keine Karte aufgeklappt. (FokusListe.test: `should_openNoCard_when_initialOpenIdNull`; page.test: Chip-Bar sichtbar, keine MengeControl)
- [x] Chip-Tipp: genau dessen Karte auf, andere zu, scrollIntoView – wie F7. (FokusListe.test: `should_switchFocusCloseOthersAndNotifyConsumer_when_chipTapped`, `should_deferScrollUntilAfterLayoutExpansion_when_focusSelected`)
- [x] Kopf-Tipp auf offene Karte → klappt zu. (FokusListe.test: `should_collapseCardAndNotNotifyConsumer_when_openCardHeadTapped`)
- [x] Chip-Leiste sticky + horizontal scrollbar (identisch F7 – dieselbe Komponente, `sticky top-0 … overflow-x-auto`).

Erfassung unverändert:
- [x] Mengenänderung via `MengeControl` wirkt wie bisher (`adjustVerzehrAction`); Größen-Gruppen + „Nicht mehr im Katalog" unverändert. (page.test: `should_openCardEditable_when_chipTappedOnOpenVeranstaltung`, `should_showPositionMenge_when_positionExists`; ZeileKarte unverändert)

Identity-Gate F7-only:
- [x] F5 zeigt kein Gate / keine „Erfasser wechseln"-Leiste. (F5-Seite rendert `FokusListe` direkt, kein `IdentityGate`)
- [x] F7-Gate (Erfasser→Ziel) bleibt unverändert, öffnet Ziel-Karte. (IdentityGate.test: alle Gate-Tests grün, `initialOpenId={zielId}`)

Read-only konsistent:
- [x] Abgeschlossene Veranstaltung auf F5 → gleiche Akkordeon-Darstellung, nicht bearbeitbar, eingeklappt. (page.test: `should_renderReadOnly_when_veranstaltungAbgeschlossen`)
- [x] F7-Read-only unverändert. (IdentityGate.test: `should_renderReadOnlyAccordionWithoutGate_when_notEditable`)

Route-Neutralität / Clean:
- [x] Kein Feature-Import aus `app/theke/` in den F5-Weg; geteilte Fokus-Darstellung in `app/_verzehr/`, token-frei. (`FokusListe` nach `app/_verzehr/` verschoben, `token`/`erfasser-ziel-storage`-Kopplung entfernt)
- [x] F7 merkt Ziel weiterhin geräte-lokal (Persistenz injiziert, nicht hardcodiert). (IdentityGate: `onFokusWechsel={(id) => writeZielId(token, id)}` nur im editierbaren Zweig)

Empty-State:
- [x] F5 ohne Teilnehmer → Hinweis wie bisher (statt leerer Fokusliste). (page.test: `should_showEmptyHint_when_noZeilen`)

Fehlerszenarien:
- [x] F7 `localStorage` nicht verfügbar → fail-open, unverändert. (Persistenz in `erfasser-ziel-storage` unverändert, IdentityGate.test grün)
- [x] scrollIntoView bleibt guarded (jsdom ohne Implementierung). (FokusListe: `?.scrollIntoView?.(...)`; Tests laufen in jsdom grün)

## Technische Notizen
> Entschieden in [ADR-039](../docs/adr/039-verzehrerfassung-fokusliste-route-neutral.md).

**Kern:** `FokusListe` wird route-neutral (token-/persistenzfrei), wandert nach `app/_verzehr/`,
F5 rendert sie direkt. Persistenz (F7-Ziel-Merkung) wird injiziert. Rein präsentations-/
clientseitig – keine Migration, keine neue Dependency, keine Action-/DB-/Summen-Änderung.

**Betroffene Dateien:**
- `app/_verzehr/FokusListe.tsx` **(neu, verschoben aus `app/theke/[token]/`)**: Props `token` +
  direkter `writeZielId`-Aufruf entfernt; stattdessen optionaler Callback
  `onFokusWechsel?: (zeileId: string) => void`, aufgerufen in `waehleZiel` (Chip **und**
  Aufklappen). `initialOpenId` bleibt. Import von `erfasser-ziel-storage` fällt weg.
- `app/_verzehr/FokusListe.test.tsx` **(verschoben)** + `app/_verzehr/raf-stub.ts` **(verschoben)**.
- `app/theke/[token]/IdentityGate.tsx`: Import `./FokusListe` → `@/app/_verzehr/FokusListe`;
  in beiden `FokusListe`-Einsätzen `token`-Prop raus; im editierbaren Zweig
  `onFokusWechsel={(id) => writeZielId(token, id)}` ergänzen (read-only-Zweig: kein Callback).
- `app/theke/[token]/IdentityGate.test.tsx`: `raf-stub`-Import → `@/app/_verzehr/raf-stub`.
- `app/veranstaltung/[id]/verzehr/page.tsx`: `VerzehrErfassung` → `FokusListe`
  (`initialOpenId={null}`, **kein** `onFokusWechsel`); Empty-Guard (≥1 Zeile) mit der bisherigen
  F5-Meldung („Noch keine Teilnehmer erfasst – zuerst Teilnehmer hinzufügen.") ergänzen, da
  `FokusListe` ≥1 Zeile voraussetzt.
- `app/veranstaltung/[id]/verzehr/page.test.tsx`: Erwartungen auf Akkordeon/Chip-Leiste/Empty
  anpassen.
- `docs/routes.md`: F5-Funktionsbeschreibung ggf. präzisieren (keine Struktur-/Zugriffsänderung).
- `erfasser-ziel-storage.ts` + `VerzehrErfassung.tsx` **bleiben** (Storage F7-only; `VerzehrErfassung`
  weiter als read-only-Liste im `IdentityGate`-Flow, spec-54 AC B).

**TDD-Reihenfolge (Red→Green→Refactor):**
1. `FokusListe` verschieben + `onFokusWechsel` einführen; bestehende Tests anpassen (Callback statt
   `writeZielId`-Kopplung), scrollIntoView-Guard + rAF-Timing-Test erhalten (#188/#194).
2. `IdentityGate`: Callback-Injektion (editierbar) / kein Callback (read-only) – Test: F7 merkt Ziel
   weiterhin (writeZielId aufgerufen), read-only nicht.
3. F5-Seite auf `FokusListe` umstellen: Tests für Chip-Leiste sichtbar, initial keine Karte offen,
   Chip-Klick öffnet genau eine Karte, Kopf-Tipp klappt zu, read-only eingeklappt + disabled,
   Empty-State-Meldung.
4. Regressionstest: `MengeControl`/`adjustVerzehrAction`-Verdrahtung unverändert (mit befülltem
   Positionen-Array prüfen, Mock-Mapping-Lesson).

**Guardrails:** keine Feature-Importe `app/theke/` → `app/veranstaltung/` (Codify #52); rAF-Stub
nicht duplizieren (#194); `setState`-Updater rein halten (#183).

## Offene Fragen
- [x] Persistenz-Entkopplung: **injizierter Callback `onFokusWechsel`** (ADR-039 D1), nicht `persistKey`.
- [x] ADR nötig: **ja** → [ADR-039](../docs/adr/039-verzehrerfassung-fokusliste-route-neutral.md), ändert ADR-035 D2.
- [x] Benennung: **`FokusListe` beibehalten** (ADR-039 D2).
- [x] Empty-State: **beim Konsumenten** (F5-Seite + `IdentityGate`), wegabhängige Meldung (ADR-039 D4).
- [x] `docs/routes.md`: F5-Funktionsbeschreibung im Implement-PR präzisiert („Fokus-Akkordeon + Chip-Leiste"; keine Struktur-/Zugriffsänderung).

## Implement-Notizen
- Gates grün: `pnpm lint` ✓, volle Test-Suite (626 passed / 59 skipped) ✓, `tsc --noEmit` ✓.
- **Move der `FokusListe` abgeschlossen:** die alten, nun toten Dateien in `app/theke/[token]/`
  (`FokusListe.tsx` token-gekoppelt, `FokusListe.test.tsx`, `raf-stub.ts` – Byte-Duplikat von
  `app/_verzehr/raf-stub.ts`, verletzt #194) werden per `git rm` entfernt (der route-neutrale
  Ersatz liegt vollständig in `app/_verzehr/`; `IdentityGate` importiert bereits von dort).

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/187-verzehrerfassung-vereinheitlichen`
Erstellt: 2026-07-23 13:03
