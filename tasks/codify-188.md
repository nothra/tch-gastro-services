## Codify-Report: Task 188

### Neue Regeln hinzugefügt

- [docs/factory/PROJECT-CONTEXT.md] **„Layout-abhängige DOM-Aktion nach layout-änderndem
  `setState` erst im nächsten Frame; sticky Header braucht `scroll-margin-top` am Ziel (aus #188)"**
  – wegen: Der Bug-Root-Cause (aus #183) rief `scrollIntoView` im selben Tick wie `setOpenId` auf
  (scrollt gegen das nicht-reflowte Layout → Karte außerhalb Sichtbereich) und ohne
  `scroll-margin-top` unter der sticky Chip-Leiste (Kopf verdeckt). Regel: rAF nach dem Reflow +
  `scroll-margin-top` am Ziel; inkl. jsdom-Testmuster (rAF capture-only stubben).

- [docs/factory/PROJECT-CONTEXT.md] **„Route-neutrale Komponente: Fremd-Layout-Offset vom
  Konsumenten via `className` steuern, nicht hardcoden/an fremd-semantischen Prop koppeln
  (aus #188, Review-Finding)"** – wegen: Der Implement-Entwurf hardcodete `scroll-mt-16` in die
  route-neutrale `ZeileKarte` und koppelte es an `collapsible` (leaky abstraction, im Review
  gefunden, im `/refactor` behoben). Erweitert Codify #52 über die reine Import-Ebene hinaus.

### Keine Änderungen nötig

- Security-Review: PASSED ohne Findings (rein client-seitige Präsentations-Änderung) → kein Learning.
- Bestehende Regeln waren ausreichend für den restlichen Zyklus; die #183-Regel zu
  Updater-Reinheit war bereits vorhanden und wurde eingehalten (Seiteneffekte im Handler, nicht im
  Updater) – die zwei neuen Regeln ergänzen orthogonale Aspekte (Timing/CSS-Offset bzw. Kopplung),
  keine Dublette.

### Prozess-Beobachtung (kein Regel-Bedarf, nur Notiz)

- Während dieses Zyklus war der Bash/Write-Sicherheits-Classifier (`auto`-Mode) wiederholt
  „temporarily unavailable" und blockierte Schreib-/Exec-Tools über mehrere Versuche. Read-only
  Analyse lief durch; die Schritte wurden nach Wiederholung abgeschlossen. Rein
  infrastrukturell/transient – keine Factory-Regel ableitbar.

### Empfehlung für nächste Features

- Für weitere Akkordeon-/Scroll-Interaktionen das etablierte Muster wiederverwenden: rAF-verzögerter
  `scrollIntoView` + `scroll-mt-*` am Ziel, Offset vom Layout-Konsumenten via `className` vorgegeben.
