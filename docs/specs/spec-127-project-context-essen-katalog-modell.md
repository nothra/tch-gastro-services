# Spec: PROJECT-CONTEXT auf das Katalog-Essen-Modell anpassen

> Doku-Abgleich · Issue #127 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
> Kanonische Quellen: [ADR-023](../adr/023-veranstaltung-datenmodell.md) §D4/§D7,
> [spec-49](spec-49-getraenke-katalog.md), [spec-116](spec-116-katalog-kategorie-essen.md).
> Gefunden im `/review` von #116 (dort out-of-scope).

## Kontext

Das Essen-Modell wurde am 2026-07-15 geändert (ADR-023 §D4/§D7, umgesetzt in #116): **Essen ist
keine Eigenschaft der Veranstaltung mehr**, sondern ein **Katalogartikel der Kategorie `essen`**
mit festem Preis – wie Getränk und Kaffee. Es gibt **keinen** `essenpreis_cents` je Abend und
**keine** spontane Preiseingabe. #116 hat zudem den Katalog-Begriff von „Getränke-Katalog" auf
„Katalog" umbenannt, da er nun auch Speisen enthält.

`docs/factory/PROJECT-CONTEXT.md` (das Onboarding-Dokument für Agenten) beschreibt in der Sektion
**Fachdomäne → Kernbegriffe** noch das alte Modell:
- Zeile 36: „Essenpreis" als Eigenschaft von **Veranstaltung/Abend**.
- Zeile 38–39: Kernbegriff **„Getränke-Katalog"** mit „**Essen** pro Abend festgelegt".

Beide widersprechen den kanonischen Quellen und führen Agenten in die Irre (Verstoß gegen die
CLAUDE.md-Regel „Kanonische Quellen immer referenzieren").

## Scope

**Inbegriffen:**
- Reine Doku-Änderung an `docs/factory/PROJECT-CONTEXT.md`, Sektion „Fachdomäne → Kernbegriffe".
- Zeile 36: „Essenpreis" aus der Eigenschaftenliste von Veranstaltung/Abend entfernen.
- Zeile 38–39: Katalog-Kernbegriff auf das neue Modell ziehen (Essen = Katalogartikel fester
  Preis, Kategorie `essen`) und – konsistent mit #116/spec-116 – auf „Katalog" umbenennen.
- Verweis auf die kanonische Quelle (ADR-023 §D4/§D7) an der geänderten Stelle setzen.

**Nicht inbegriffen:**
- Keine Änderung an Zentralen Regeln (Zeile 46–52), Auslagen-Kategorien (Zeile 42) oder der
  Zweck-Beschreibung (Zeile 30) – diese sind bereits konsistent.
- Keine Code-, Schema- oder Test-Änderungen (Modell ist bereits durch #116 umgesetzt).
- Keine Route-Änderung (`/verwaltung/katalog` bleibt; nur #116-Sache, hier nicht berührt).

## Akzeptanzkriterien
- [ ] GIVEN der Kernbegriff „Veranstaltung/Abend" in PROJECT-CONTEXT.md WHEN man seine
  Eigenschaftenliste liest THEN enthält sie **keinen** „Essenpreis" mehr (nur Datum, Bezeichnung,
  Kasse, Status `offen`/`abgeschlossen`).
- [ ] GIVEN der Katalog-Kernbegriff WHEN man ihn liest THEN wird Essen als **Katalogartikel mit
  festem Preis (Kategorie `essen`)** beschrieben, nicht als „pro Abend festgelegt".
- [ ] GIVEN der Katalog-Kernbegriff WHEN man den Namen liest THEN heißt er **„Katalog"** (nicht
  „Getränke-Katalog"), konsistent mit der UI-Umbenennung aus #116/spec-116.
- [ ] GIVEN die geänderte Stelle WHEN man sie prüft THEN verweist sie auf die kanonische Quelle
  (**ADR-023 §D4/§D7**), damit ein künftiges Modell-Update die Kopie mitzieht.

## Fehlerszenarien
- [ ] Keine – reine Doku-Änderung ohne Laufzeitverhalten. Verifikation = Konsistenz-Abgleich
  gegen ADR-023 §D4/§D7 + spec-49/116 (kein „Essenpreis"/„pro Abend festgelegt" mehr in der
  Kernbegriff-Sektion).

## Offene Fragen
- [ ] Keine. Alle Entscheidungen sind durch die kanonischen Quellen determiniert.
