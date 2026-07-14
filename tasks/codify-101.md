# Codify-Report: Task 101

## Neue Regeln hinzugefügt

- **[docs/factory/guidelines/bash-gotchas.md] Gotcha #7: Substring-Match in strukturellen Guards**
  – wegen: Review-Nitpick zu `grep -q 'pnpm test'` als Substring-Match.

  `grep -q 'pnpm test'` trifft auch `pnpm test:coverage`. Der Coverage-Guard war dadurch nur
  implizit abgedeckt – eine Änderung des Coverage-Befehls wäre unentdeckt geblieben. Fix:
  immer den spezifischsten (längsten) String verwenden, ggf. mit `-F` zum Vermeiden von
  Regex-Fehlinterpretierung. Faustregel: Negativ-Beispiel-Test schreiben (geänderter Befehl
  → Guard schlägt an).

## Keine weiteren Änderungen nötig

- **Review:** Keine kritischen oder wichtigen Findings. Nur ein adressierter Nitpick
  (Substring-Guard → siehe oben) und ein explizit als kosmetisch eingestufter Hinweis zur
  Platzierung der CMD-Variablen (nicht umgesetzt, im Review so empfohlen).
- **Security:** Nur ein informativer Hinweis zum bestehenden `eval "$command"`-Muster in
  `quality_gate` – keine neue Angriffsfläche, Konvention bereits etabliert in den Hook-Gates.
  Kein neuer Stolperstein.

## Empfehlung für nächste Features

- **Verhaltens-Test via Marker-Datei** (yq-gated Non-Dry-Run + Mock-`claude`) war der
  entscheidende Qualitätsnachweis: Er beweist, dass das Gate den echten Befehl ausführt und
  die Pipeline stoppt – ein reiner Struktur-Grep hätte die Regression nicht gefangen. Dieses
  Testmuster bei künftigen Skript-Gate-Änderungen wiederverwenden.
- **Fail-open-Erkennung:** Die Platzhalter-`echo`-Situation ist ein Muster, das auch in
  anderen Harness-Skripten entstehen kann (z. B. neue Phasen mit Dummy-Befehlen). Beim
  nächsten Review/Security-Check explizit auf `echo …`-Commands in `quality_gate`-Aufrufen
  achten.
