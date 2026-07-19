# Spec: Selbstbedienung – Zugang per Link/QR & Namenswahl

> Feature F7 · Issue #54 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)
>
> **Zielbild (ADR-024, #120):** F7 baut auf der bereits freigegebenen öffentlichen Route
> `app/theke/[token]` auf (login-frei, Seam im `proxy.ts`-Matcher) und teilt die Erfassungs-UI
> route-neutral über `app/_verzehr/` mit F5. Der authentifizierte Bereich heißt **`app/veranstaltung`**
> (vormals `app/abrechnung/veranstaltung`), die Owner-Rolle `abrechner` → **`veranstalter`**.
> Siehe [ADR-024](../adr/024-route-schnitt-veranstaltung-lifecycle.md).

## Kontext

Damit Teilnehmer ihre Getränke selbst erfassen können (Punkt 3 des Ablaufs), brauchen
sie Zugang zur Veranstaltung – **ohne** eigenes Konto. Der Veranstalter teilt einen Veranstaltungs-Link bzw.
QR-Code. Wer ihn öffnet, wählt seinen Namen aus der Teilnehmerliste der Veranstaltung und
erfasst wie in F5. Genutzt wird das hybrid: auf dem eigenen Handy und auf einem
gemeinsamen Theken-Gerät.

## Scope

**Inbegriffen:**
- Je offener Veranstaltung ein teilbarer **Zugangs-Link** mit unratbarem Token, als Text und als
  **QR-Code** darstellbar.
- Öffnen des Links zeigt die Veranstaltung und die Teilnehmerliste; Auswahl des eigenen Namens.
- Nach Namenswahl: Erfassen von Getränken/Essen/Kaffee gemäß F5 (volle Sicht auf die
  ganze Liste).
- Kein Passwort (bewusste Entscheidung).
- Nur **offene** Veranstaltungen sind über den Link erfassbar; abgeschlossene sind (höchstens)
  lesbar.

**Nicht inbegriffen:**
- Persönliche Anmeldung/Konten (bewusst nicht, siehe F1/Rahmen).
- Kassieren über den Link (bleibt beim Veranstalter, F8).
- PIN-Schutz des Links (wurde als Option verworfen; ggf. später).

## Akzeptanzkriterien

- [ ] GIVEN eine offene Veranstaltung WHEN der Veranstalter den Zugang teilt THEN erhält er einen
      Link **und** einen QR-Code, die auf genau diese Veranstaltung zeigen.
- [ ] GIVEN ein Teilnehmer öffnet den gültigen Link WHEN er seinen Namen aus der Liste
      wählt THEN kann er Positionen für **die ganze** Liste erfassen (volle Transparenz)
      und sieht die laufenden Summen.
- [ ] GIVEN der Link zu einer **abgeschlossenen** Veranstaltung WHEN er geöffnet wird THEN ist
      keine Erfassung mehr möglich (nur Ansicht oder Hinweis „abgeschlossen").
- [ ] GIVEN ein ungültiges/unbekanntes Token WHEN der Link geöffnet wird THEN erscheint
      ein neutraler Fehler, ohne dass andere Veranstaltungen preisgegeben werden.
- [ ] GIVEN der QR-Code am Theken-Gerät WHEN mehrere Teilnehmer nacheinander erfassen
      THEN funktioniert die Erfassung ohne persönliche Anmeldung.

## Fehlerszenarien

- [ ] Raten/Erraten fremder Veranstaltungen → durch unratbares Token verhindert (ausreichend
      lang/zufällig; Detail /architecture, /security-review).
- [ ] Link nach Abschluss weiterverwendet → keine Schreibwirkung.
- [ ] Token-Weitergabe an Unbeteiligte → im MVP akzeptiertes Restrisiko (Vertrauens-
      modell wie beim offenen Zettel); dokumentiert für /security-review.

## Gesetzte Entscheidungen (2026-07-11)

- **Walk-in nur durch Veranstalter:** Ein Selbstbedienungs-Nutzer kann **keinen** neuen
  Teilnehmer anlegen; er wählt nur aus der bestehenden Liste der Veranstaltung. Neue Namen legt
  der Veranstalter an (F3/F4).

## Zusätzliche Akzeptanzkriterien

- [ ] GIVEN ein Selbstbedienungs-Nutzer über den Link WHEN er einen neuen Teilnehmer
      anlegen will THEN ist diese Aktion nicht verfügbar (nur Auswahl aus der Liste).

## Offene Fragen (für /architecture & /security-review)

- [ ] Token-Länge/Zufälligkeit, Rotation/Ablauf (z. B. am Folgetag ungültig) →
      /architecture, /security-review.
- [ ] Minimale Missbrauchsbremse (z. B. Rate-Limit) trotz fehlendem Passwort? →
      /security-review.
