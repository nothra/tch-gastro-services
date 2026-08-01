# Spec: Config-Validation Root-Typ-Guard

## Kontext
Bei der Security-Review zu Task 249 (model_tiers.heavy-Sperre) aufgefallen:
`scripts/checks/config-validation-check.sh` setzt implizit voraus, dass der
Override-Root (`factory.config.yml`) ein YAML-Mapping ist. `leaf_paths()` und
die darauf aufbauenden Regeln 2/6 haben keinen expliziten Root-Typ-Check. Ist
der Root kein Mapping (Skalar, Bool, Sequence, Mehrdokument-YAML mit `---`),
liefert `leaf_paths` keine oder irreführende Pfade; das Gate schlägt aktuell
nur zufällig fehl, weil der spätere `yq eval-all`-Merge (Regel 4) bei
Typkonflikt scheitert und `effective` leer bleibt — das triggert Regel 4b mit
einer irreführenden Meldung ("max_turns ... kein positiver Integer") statt der
eigentlichen Ursache.

Aktuell nicht ausnutzbar (ein Nicht-Map-Root kann `model_tiers.heavy`
strukturell nicht setzen), aber fragil gegen künftiges yq-Verhalten und
verwirrend beim Debuggen — eine eigenständige Robustheits-Härtung des Gates.

## Scope

**Inbegriffen:**
- Ein früher, expliziter Root-Typ-Check im Override: der Root muss ein
  YAML-Mapping sein.
- Ein eigenständiger Mehrdokument-Guard: enthält die Override-Datei mehr als
  ein YAML-Dokument (`---`-getrennt), wird das mit einer eigenen, vom
  "kein Mapping"-Fall unterscheidbaren Fehlermeldung abgelehnt — auch wenn
  jedes einzelne Dokument für sich ein gültiges Mapping ist.
- Beide neuen Checks laufen vor den bestehenden Regeln 2 (unbekannte Keys)
  und 6 (`model_tiers.heavy`), sodass ein struktureller Root-Fehler immer mit
  der neuen, eindeutigen Meldung abbricht statt mit einem der bestehenden
  irreführenden Folgefehler.
- Der bestehende Fall "kein Override vorhanden" (nur Defaults) bleibt
  unverändert.

**Nicht inbegriffen:**
- Die Defaults-Datei (`factory.defaults.yml`) bekommt keinen neuen
  Root-Typ-Guard — sie gilt als vertrauenswürdiges Template (ADR-009/010) und
  ist bereits über Regel 1 (YAML-Parse + schemaVersion-Typ-Check) grob
  abgesichert.
- Keine Verhaltensänderung für einen gültigen Override (ein Dokument,
  Mapping-Root) — bestehende Regeln 1–6 bleiben unverändert.
- Keine Änderung an `leaf_paths()` selbst oder an der Fehlerbehandlung
  anderer Regeln.

## Akzeptanzkriterien
- [ ] GIVEN ein Override, dessen Root ein Skalar ist (z. B. `just_a_string`)
      WHEN `config-validation-check.sh` läuft
      THEN bricht das Gate mit exit ≠ 0 und einer expliziten Meldung ab, dass
      der Override kein YAML-Mapping ist (nicht mit der irreführenden
      max_turns-Meldung aus Regel 4b).
- [ ] GIVEN ein Override, dessen Root ein Boolean ist
      WHEN `config-validation-check.sh` läuft
      THEN bricht das Gate mit derselben expliziten "kein Mapping"-Meldung ab.
- [ ] GIVEN ein Override, dessen Root eine YAML-Sequence ist
      WHEN `config-validation-check.sh` läuft
      THEN bricht das Gate mit derselben expliziten "kein Mapping"-Meldung ab.
- [ ] GIVEN ein Override mit Mehrdokument-YAML (zwei durch `---` getrennte
      Dokumente, jedes für sich ein gültiges Mapping)
      WHEN `config-validation-check.sh` läuft
      THEN bricht das Gate mit einer eigenen, vom "kein Mapping"-Fall
      unterscheidbaren Meldung ab, die auf die Mehrdokument-Struktur
      hinweist.
- [ ] GIVEN ein gültiger Override mit genau einem Mapping-Root
      WHEN `config-validation-check.sh` läuft
      THEN verhält sich das Gate exakt wie zuvor (Regeln 1–6 greifen
      unverändert, keine Regression).
- [ ] GIVEN kein Override-File vorhanden (nur Defaults)
      WHEN `config-validation-check.sh` läuft
      THEN werden die neuen Root-Typ-/Mehrdokument-Checks übersprungen (wie
      bereits bei den bestehenden Override-only-Regeln).

## Fehlerszenarien
- [ ] Skalar-Root im Override → klare Fehlermeldung statt irreführender
      Folgefehler (Reproduktion aus Issue #254).
- [ ] Boolean-Root im Override → gleiche Behandlung wie Skalar.
- [ ] Sequence-Root im Override → gleiche Behandlung wie Skalar.
- [ ] Mehrdokument-Override → eigene Meldung, kein Vermischen mit
      "kein Mapping".

## Offene Fragen
Keine — durch Rückfrage geklärt: Guard gilt nur für den Override (nicht für
die Defaults-Datei); Mehrdokument-YAML bekommt eine eigene, unterscheidbare
Fehlermeldung statt der generischen "kein Mapping"-Meldung.

---
Issue: #254
