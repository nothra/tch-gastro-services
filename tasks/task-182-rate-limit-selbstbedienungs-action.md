# Task 182: rate-limit-selbstbedienungs-action

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Rate-Limit/Missbrauchsbremse für `adjustVerzehrByTokenAction` (öffentliche, unauthentifizierte
Schreib-Grenze, F7/ADR-034 D3). Delegiert aus ADR-034 D7. Details, Kontext und Begründung:
[spec-182](../docs/specs/spec-182-rate-limit-selbstbedienung.md).

Gesetzte Parameter (mit Auftraggeber abgestimmt): Zähl-Dimension pro Token, Fixed-Window 60 s,
Schwellwert 60 Anfragen/Fenster, fail-open bei Limiter-Störung, Fehlertext
"Zu viele Anfragen – bitte kurz warten." bei Drosselung.

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK-1 (Normalfall unverändert): GIVEN Aufrufrate unter Schwellwert WHEN `adjustVerzehrByTokenAction` mit gültigem Token/offener Veranstaltung/existierender Zeile/aktivem Katalogartikel aufgerufen wird THEN läuft `applyVerzehrAdjust` unverändert durch.
- [ ] AK-2 (Deckelung pro Token): GIVEN 61 Aufrufe mit demselben Token in 60 s WHEN der 61. Aufruf im Fenster erfolgt THEN wird er ohne DB-Zugriff abgelehnt (`"Zu viele Anfragen – bitte kurz warten."`).
- [ ] AK-3 (Isolation zwischen Veranstaltungen): GIVEN Token A ist ausgeschöpft WHEN Token B (andere Veranstaltung) im selben Zeitraum aufgerufen wird THEN wird B nicht gedrosselt.
- [ ] AK-4 (Fenster-Reset): GIVEN Token A war gedrosselt WHEN nach Ablauf des 60-s-Fensters ein neuer Aufruf mit Token A erfolgt THEN wird er wieder normal verarbeitet.
- [ ] AK-5 (Kein Seiteneffekt bei Drosselung): GIVEN ein Aufruf wird gedrosselt THEN kein `adjustMenge`-Aufruf, kein `revalidatePath`, State ohne `ok`/`menge`.
- [ ] AK-6 (Andere Actions unberührt): GIVEN das Rate-Limit ist aktiv WHEN `adjustVerzehrAction` (F5, authentifiziert) beliebig oft aufgerufen wird THEN wird sie nicht gedrosselt.
- [ ] FS-1 (Fail-open): GIVEN die Limiter-Auswertung schlägt unerwartet fehl THEN wird die Anfrage durchgelassen (normale Verarbeitung).
- [ ] FS-2 (Kein Cross-Token-Lockout): GIVEN ein Token wird geflutet THEN bleiben andere Veranstaltungen/Token unbeeinflusst.
- [ ] FS-3 (Throttle billiger): GIVEN eine Anfrage wird gedrosselt THEN ist die Antwortzeit nicht langsamer als der reguläre Pfad (reine In-Memory-Prüfung).

## Technische Notizen
<!-- Von /architecture befüllt oder eigene Notizen -->

## Offene Fragen
<!-- Fragen, die noch geklärt werden müssen -->
- [ ] Modul-/Schnittstellenwahl (Erweiterung `lib/rate-limit.ts` um Pro-Schlüssel-Variante vs. neues Modul) → `/architecture`.
- [ ] Speicher-Hygiene der Pro-Token-Map über die Zeit (Bereinigung nötig oder YAGNI bei Vereins-Skala?) → `/architecture`.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/182-rate-limit-selbstbedienungs-action`
Erstellt: 2026-08-15 08:04
