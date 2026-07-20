# Security Review: Task 183

Scope: `git diff origin/main...HEAD` – reine Präsentations-/Client-Schicht der öffentlichen
Selbstbedienung F7 (`app/theke/[token]`). Geprüfte Produktionsdateien:
`app/theke/[token]/erfasser-ziel-storage.ts` (NEU), `app/theke/[token]/IdentityGate.tsx`,
`app/theke/[token]/FokusListe.tsx` (NEU), `app/_verzehr/VerzehrErfassung.tsx`.
Kein neues Datenmodell, keine Migration, keine neue Dependency (verifiziert).

## Kritische Findings (Blocker)
_Keine._

## Wichtige Findings
_Keine._

## Hinweise
- [ ] [AuthZ/Server-Grenze – bestätigt intakt] Die Client-Gate-Änderung (`editable`) weicht keine
  Server-Grenze auf. `editable` leitet sich rein aus `veranstaltung.status === "offen"` ab und
  wird serverseitig unabhängig durchgesetzt: `applyVerzehrAdjust` (via `adjustVerzehrByTokenAction`)
  prüft `status !== "offen"` → `NOT_OFFEN` und bindet `zeileId` IDOR-fest an die aus dem Token
  aufgelöste Veranstaltung (`getZeile(zeileId, ziel.id)`). Ein manipuliertes localStorage/Client-Gate
  kann daher weder eine abgeschlossene Veranstaltung beschreiben noch eine fremde Zeile treffen.
- [ ] [XSS – kein Befund] Alle Anzeigenamen (`zeile.anzeigename`, `erfasser?.anzeigename`) und der
  `token` werden ausschließlich über JSX-Textinterpolation bzw. als localStorage-Schlüssel/
  Action-Argument verwendet – kein `dangerouslySetInnerHTML`/`innerHTML`/`eval`. React escaped
  standardmäßig; der Token wird nie ins DOM gerendert. Kein Injektionsvektor.
- [ ] [IDOR – kein Befund] Gemerkte Erfasser-/Ziel-IDs steuern nur, welche Akkordeon-Karte offen
  ist. `readValidId` löst eine gemerkte ID gegen die token-scoped `zeilen`-Liste auf und liefert
  bei Nicht-Treffer `null` (Stale-Fallback) – eine per Hand gesetzte Fremd-ID resolved also nicht,
  und selbst bei Treffer bleibt die Server-IDOR-Bindung die maßgebliche Grenze.
- [ ] [Sensitive Data / localStorage] Gespeichert werden nur opake Zeilen-IDs (`tch:sb:erfasser:` /
  `tch:sb:ziel:`), keine Secrets/PII-Freitexte. Der Legacy-Schlüssel `tch:sb:name:` (#54, enthielt
  einen Anzeigenamen) wird bei Adoption gelesen, auf eine ID gemappt und in jedem Fall entfernt –
  Netto-Verbesserung (Name → ID). Restrisiko: geräte-lokaler Angreifer mit physischem Zugriff kann
  ablesen, welchem Teilnehmer ein Gerät zugeordnet ist – inhärent im geräte-lokalen F7-Modell und
  ohne Server-Speicherung (Anonymität, spec-52/ADR-034 D4). Kein Handlungsbedarf.
- [ ] [Error Handling / DoS-Resilienz] Jeder localStorage-/Event-Zugriff ist fail-open (try/catch,
  stiller Fallback „erneut fragen") – kein Absturz bei deaktiviertem Storage (privater Modus),
  keine Fehler-/Stack-Ausgabe, kein Information Disclosure. Korrekt umgesetzt.
- [ ] [Route-Neutralität] `app/_verzehr/` führt keine Feature-Imports ein (`grep 'from "@/app/[^_]'`
  leer); der `ZeileKarte`-Export exponiert nur Props, keine internen Daten. Codify #52 eingehalten.

## Ergebnis
PASSED
