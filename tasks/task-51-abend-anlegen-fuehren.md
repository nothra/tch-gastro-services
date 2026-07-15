# Task 51: abend-anlegen-fuehren

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Feature F4: **Veranstaltung anlegen & führen**. „Veranstaltung" ist der Primärbegriff
(statt „Abend"), das **Datum** ist Pflichtfeld. Zwei Typen (ein gemeinsames Datenmodell):
1. **Datierte Veranstaltung** (`veranstaltung`) – Abrechner legt sie mit Datum, Bezeichnung,
   Kasse und Essenpreis an; Teilnehmer aus Stammdaten; Status `offen`/`abgeschlossen`;
   Namens-Snapshot je Zeile (ADR-022).
2. **Stehende Theken-Selbstbedienung** (`theke`) – dauerhaft offener Vorgang je Kasse für
   spontanen Wochentag-Verzehr ohne anwesenden Abrechner und ohne Login/Rolle (nur Getränke
   + Kaffee, Namenswahl aus Stammdaten).

Kanonische Spec: `docs/specs/spec-51-abend-anlegen.md`.

## Akzeptanzkriterien
**A) Datierte Veranstaltung**
- [ ] Abrechner legt Veranstaltung mit Datum, Bezeichnung, Kasse, Essenpreis an → Typ `veranstaltung`, Status `offen`.
- [ ] Kasse fehlt → serverseitige Ablehnung (Pflichtfeld).
- [ ] Datum fehlt → serverseitige Ablehnung (Pflichtfeld).
- [ ] Teilnehmer aus Stammdaten auswählen → je Teilnehmer eine Zeile mit Namens-Snapshot.
- [ ] Offene Veranstaltung: Teilnehmer hinzufügen/entfernen (solange ohne Erfassung).
- [ ] Essen-Position rechnet mit dem Essenpreis der Veranstaltung.
- [ ] Essenpreis-Änderung wirkt auf alle Essen der Veranstaltung (abendweit einheitlich).
- [ ] Teilnehmer mit erfassten Positionen entfernen → verhindert / bewusste Bestätigung.
- [ ] Abrechner-Walk-in legt neuen Teilnehmer an (in Stammdaten + Zeile).
- [ ] Abgeschlossene Veranstaltung schreibgeschützt; Abrechner kann protokolliert wieder öffnen (F8).

**B) Stehende Theken-Selbstbedienung**
- [ ] Verwalter/Abrechner richtet je Kasse genau eine stehende Theke ein (idempotent).
- [ ] Nicht angemeldeter Gast öffnet festen Theken-Link/QR und wählt Namen aus Stammdaten.
- [ ] Gast erfasst Getränke/Kaffee → Zeile in der stehenden Theke.
- [ ] Erfassung ohne anwesenden Abrechner möglich (Theke steht bereit).
- [ ] Theke ist einer Kasse zugeordnet; Einnahmen wirken auf diese Kasse.
- [ ] Abrechner kassiert offene Einträge später (F8); Theke bleibt danach offen.

**Fehlerszenarien**
- [ ] Essenpreis ungültig/fehlend/über int4-Max → Ablehnung mit Hinweis (kein DB-500).
- [ ] Zweite Theke je Kasse → abgelehnt (Idempotenz).
- [ ] Essen an der Theke → nicht verfügbar (nur Getränke + Kaffee).
- [ ] Ungültiges Theken-Token → neutraler Fehler.

## Technische Notizen
**Entscheidung: [ADR-023](../docs/adr/023-veranstaltung-datenmodell.md).** Kurzfassung für /implement:

- **Schema (`db/schema.ts`):**
  - Enums `veranstaltung_typ` (`veranstaltung`|`theke`), `veranstaltung_status` (`offen`|`abgeschlossen`).
  - Tabelle `veranstaltung`: `id`(uuid), `typ`(default `veranstaltung`), `bezeichnung`,
    `datum`(date, nullable), `kasse`(**text-Key**, nicht Enum), `essenpreisCents`(nullable),
    `status`(default `offen`), `token`(text, unique, unratbar via crypto), `createdAt/updatedAt`.
  - **Partial-Unique-Index** `on(kasse) where typ='theke'` → genau eine Theke je Kasse.
  - **CHECK** `typ<>'veranstaltung' OR (datum IS NOT NULL AND essenpreis_cents IS NOT NULL)`.
  - **CHECK** `kasse IN ('montagsrunde','vereinskasse')` (fail-closed ohne Enum).
  - Tabelle `veranstaltung_zeile`: `id`, `veranstaltungId`(FK cascade), `teilnehmerId`(FK),
    `anzeigename`(**Snapshot** aus `teilnehmer.name` beim Anlegen), `createdAt/updatedAt`,
    `UNIQUE(veranstaltungId, teilnehmerId)`.
- **Migration** lokal gegen Wegwerf-DB verifizieren (`0000→…→n` grün, Codify #48). CHECKs +
  Partial-Index von Hand prüfen (drizzle-kit-Prompt ggf. per PTY beantworten).
- **Data-Layer `db/veranstaltung.ts`** (rollen-neutral, einziger Query-Ort): `createVeranstaltung`,
  `listVeranstaltungen`, `getVeranstaltung`, `setStatus`, `ensureThekeForKasse`, `addZeile`,
  `removeZeile`, `listZeilen`. UPDATE/DELETE mit `.returning()` → `Promise<T | undefined>` (Codify #50).
  Konstante `KASSEN = ["montagsrunde","vereinskasse"] as const` als kanonische Quelle (Zod + Seed + CHECK).
- **Actions** unter `app/abrechnung/veranstaltung/` mit `requireRole("abrechner")`. Zod-Grenze:
  `essenpreis` via `parseEuroToCents` + `.refine(c<=2_147_483_647)` (Codify #49); `datum` Pflicht
  für `typ='veranstaltung'`; `kasse` gegen `KASSEN`. `useActionState`-Erfolg per `useCallback`-Wrapper
  schließen, **kein** `useEffect` (Codify #49).
- **Provisionierung Theke:** Seed-Erweiterung + `ensureThekeForKasse` (Guard
  `requireAnyRole(["verwalter","abrechner"])`); Idempotenz via Partial-Unique (`23505` → „existiert bereits").
- **proxy.ts:** Negativ-Lookahead um `theke/[token]` erweitern (eng gefasst, fail-closed, Codify #63).
- **Feature-Schnitt (ADR-023 §D7):** #51 baut **Fundament** (Schema, Data-Layer, Abrechner-UI
  datierte Veranstaltung, Theke-Provisionierung, token + proxy-Seam). Der **Gast-Erfassungsfluss**
  der Theke (öffentliche Seite/Erfassung) kommt mit **F5/#52 + F7/#54** – nicht in #51 vorziehen.
- **Tests:** Oberflächentests gegen lokalen `pnpm dev`-Server gehören in /implement (Memory-Notiz).
  Vitest ohne `globals:true` → `cleanup()` in `afterEach` (Codify #48).

## Offene Fragen
**In ADR-023 entschieden:**
- Kasse als Text-Key statt Enum/Entität (§D2); Provisionierung idempotent serverseitig (§D3);
  bedingte Pflichtfelder via CHECK (§D4).

**Bewusst an Folge-Features/Reviews delegiert:**
- [ ] Abrechnungs-Periodik der stehenden Theke (offen vs. kassiert) → **F8/#55** (ADR-023 §D7).
- [ ] Fester Theken-Token: Länge/Rotation/Rate-Limit → **F7/#54 & /security-review**.
- [ ] Unbekannter Gast an der Theke: nur Stammdaten vs. Freitext → **F7/#54**.
- [ ] Echtzeit-Updates / Nebenläufigkeit an derselben Zeile → **F5/#52**.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/51-abend-anlegen-fuehren`
Erstellt: 2026-07-15 15:13
