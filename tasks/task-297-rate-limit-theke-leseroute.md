# Task 297: rate-limit-theke-leseroute

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung

Rate-Limit-/Amplifikations-Bremse für die öffentliche, login-freie GET-Route `/theke/[token]`.
Die Route führt heute für **jeden** Aufruf mit beliebigem Pfad-Segment mindestens
`getVeranstaltungByToken` aus (bei Treffer vier Neon-Reads) – der Token ist hier ein frei
wählbares URL-Segment, kein serverseitig gebundenes Argument. Nach #182/ADR-044 ist der
Schreibpfad gedeckelt und dieser Lesepfad die verbleibende, billigste Amplifikationsfläche
(Verfügbarkeit/Kosten, **kein** Vertraulichkeitsrisiko – der 256-bit-Token bleibt unratbar).

Spec: [`docs/specs/spec-297-rate-limit-theke-leseroute.md`](../docs/specs/spec-297-rate-limit-theke-leseroute.md)

**Vom Auftraggeber gesetzt (keine offenen Fragen mehr):** eigene „Zu viele Anfragen"-Seite (429)
statt `notFound()`; großzügiger Schwellwert + fail-open (konsistent ADR-020/044); Schutzziel sind
DB-Reads **und** Function-Invocations → die Bremse sitzt **vor** der Route (Edge-Proxy), nicht in
der Page. Die **Zähl-Dimension** bleibt bewusst offen und geht an `/architecture`.

**Nächster Pipeline-Schritt: `/architecture 297`** – erst danach `/implement`.

## Akzeptanzkriterien
- [ ] AK-1 Normalfall unverändert: gültiger Token unter Schwellwert → Seite rendert wie heute
- [ ] AK-2 Deckelung greift: ausgeschöpftes Fenster → kein `getVeranstaltungByToken`/`listZeilen`/`listActiveCatalog`/`listPositionen`
- [ ] AK-3 Invocation gespart: gedrosselte Anfrage wird vor der Route beantwortet, `ThekePage` läuft nicht
- [ ] AK-4 Sichtbare, ehrliche Antwort: eigene „Zu viele Anfragen"-Seite mit Retry-Hinweis, Status 429, nicht 404
- [ ] AK-5 Öffentlicher Zugang bleibt öffentlich: `/theke/<token>` ohne Login → 200, kein 307 auf `/login` (Nachweis auf Proxy-Ebene, Lesson #63)
- [ ] AK-6 Auth-Gate bleibt fail-closed: geschützte Route ohne Session → weiterhin Redirect auf `/login`
- [ ] AK-7 Schreibpfad unberührt: Server-Action-POST unterliegt weiterhin nur ADR-044, nie der Lese-Bremse
- [ ] AK-8 Kein Selbst-Drosseln: Schwellwert deckt reale Theken-Last inkl. `revalidatePath`-Re-Renders und 60 Schreibaufrufen/Fenster
- [ ] AK-9 Fenster-Reset: nach Fensterablauf wieder normale Verarbeitung
- [ ] AK-10 Muster wiederverwendet: Fixed-Window-Arithmetik aus `lib/rate-limit.ts`, keine dritte Implementierung

## Fehlerszenarien
- [ ] FS-1 Fail-open bei Limiter-Störung/Cold-Start
- [ ] FS-2 Throttle-Pfad billiger als Verarbeitungspfad (kein I/O)
- [ ] FS-3 Kein Lockout über das Fenster hinaus
- [ ] FS-4 Kein Enumerations-Leak: Drossel-Antwort für gültiges und erfundenes Token ununterscheidbar
- [ ] FS-5 Kein angreiferkontrolliert unbegrenzt wachsender Zustand (Schlüsselraum ist hier frei wählbar)
- [ ] FS-6 Keine Regression der Session-Rotations-Unterdrückung (#164/#170, ADR-032)

## Technische Notizen
<!-- Von /architecture befüllt -->

Betroffene Dateien (Erwartung, `/architecture` bestätigt oder korrigiert):
`proxy.ts` (Matcher + früher Zweig vor `authMiddleware`), `lib/rate-limit.ts` (Wiederverwendung),
ggf. eine neue Route für die Hinweisseite (dann `docs/routes.md` mitpflegen – Drift-Check ist
fail-closed im Push-Gate).

## Offene Fragen
- [ ] OF-1 Zähl-Dimension: pro Token vs. global vs. hybrid vs. bewusst nichts (inkl. FS-5)
- [ ] OF-2 Schwellwert + Fensterlänge, hergeleitet aus AK-8 (Begründung gehört in die ADR)
- [ ] OF-3 Verdrahtung im `proxy.ts` ohne Aufweichen des Auth-Gates (AK-5 + AK-6 + FS-6 gleichzeitig)
- [ ] OF-4 Konsequenz der Edge-Runtime: mehr, kurzlebigere Instanzen → schwächere aggregierte Deckelung als ADR-020/044
- [ ] OF-5 Auslieferung der Hinweisseite: 429-HTML aus dem Proxy vs. `rewrite` auf eigene Route
- [ ] OF-6 Zähl-Umfang: HEAD, RSC-Prefetch und Server-Action-POST mitzählen oder nicht

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/297-rate-limit-theke-leseroute`
Erstellt: 2026-09-09 02:03
