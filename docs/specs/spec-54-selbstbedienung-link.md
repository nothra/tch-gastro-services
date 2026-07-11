# Spec: Selbstbedienung – Zugang per Link/QR & Namenswahl

> Feature F7 · Issue #54 · Epic [Digitale Veranstaltungs-Abrechnung](README-montagsrunde.md)

## Kontext

Damit Teilnehmer ihre Getränke selbst erfassen können (Punkt 3 des Ablaufs), brauchen
sie Zugang zum Abend – **ohne** eigenes Konto. Der Abrechner teilt einen Abend-Link bzw.
QR-Code. Wer ihn öffnet, wählt seinen Namen aus der Teilnehmerliste des Abends und
erfasst wie in F5. Genutzt wird das hybrid: auf dem eigenen Handy und auf einem
gemeinsamen Theken-Gerät.

## Scope

**Inbegriffen:**
- Je offenem Abend ein teilbarer **Zugangs-Link** mit unratbarem Token, als Text und als
  **QR-Code** darstellbar.
- Öffnen des Links zeigt den Abend und die Teilnehmerliste; Auswahl des eigenen Namens.
- Nach Namenswahl: Erfassen von Getränken/Essen/Kaffee gemäß F5 (volle Sicht auf die
  ganze Liste).
- Kein Passwort (bewusste Entscheidung).
- Nur **offene** Abende sind über den Link erfassbar; abgeschlossene sind (höchstens)
  lesbar.

**Nicht inbegriffen:**
- Persönliche Anmeldung/Konten (bewusst nicht, siehe F1/Rahmen).
- Kassieren über den Link (bleibt beim Abrechner, F8).
- PIN-Schutz des Links (wurde als Option verworfen; ggf. später).

## Akzeptanzkriterien

- [ ] GIVEN ein offener Abend WHEN der Abrechner den Zugang teilt THEN erhält er einen
      Link **und** einen QR-Code, die auf genau diesen Abend zeigen.
- [ ] GIVEN ein Teilnehmer öffnet den gültigen Link WHEN er seinen Namen aus der Liste
      wählt THEN kann er Positionen für **die ganze** Liste erfassen (volle Transparenz)
      und sieht die laufenden Summen.
- [ ] GIVEN der Link zu einem **abgeschlossenen** Abend WHEN er geöffnet wird THEN ist
      keine Erfassung mehr möglich (nur Ansicht oder Hinweis „abgeschlossen").
- [ ] GIVEN ein ungültiges/unbekanntes Token WHEN der Link geöffnet wird THEN erscheint
      ein neutraler Fehler, ohne dass andere Abende preisgegeben werden.
- [ ] GIVEN der QR-Code am Theken-Gerät WHEN mehrere Teilnehmer nacheinander erfassen
      THEN funktioniert die Erfassung ohne persönliche Anmeldung.

## Fehlerszenarien

- [ ] Raten/Erraten fremder Abende → durch unratbares Token verhindert (ausreichend
      lang/zufällig; Detail /architecture, /security-review).
- [ ] Link nach Abschluss weiterverwendet → keine Schreibwirkung.
- [ ] Token-Weitergabe an Unbeteiligte → im MVP akzeptiertes Restrisiko (Vertrauens-
      modell wie beim offenen Zettel); dokumentiert für /security-review.

## Offene Fragen

- [ ] Soll das Token pro Abend rotieren/ablaufen (z. B. am Folgetag ungültig)? →
      /architecture.
- [ ] Darf ein Selbstbedienungs-Nutzer einen **neuen** Teilnehmer zum Abend hinzufügen
      (Walk-in), oder nur der Abrechner? (Annahme MVP: nur Abrechner.) → bestätigen.
- [ ] Ist eine minimale Missbrauchsbremse gewünscht (z. B. Rate-Limit), obwohl kein
      Passwort? → /security-review.
