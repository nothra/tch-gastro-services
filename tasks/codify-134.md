## Codify-Report: Task 134

### Neue Regeln hinzugefügt
- `docs/factory/PROJECT-CONTEXT.md` (Bekannte Stolpersteine) – **„`aria-modal="true"` ist ein
  Versprechen, kein Automatismus – Fokus-Trap explizit bauen + alle Branches testen"** – wegen:
  Review-Runde-1-Finding W1 (Drawer setzte `aria-modal="true"` ohne echtes Fokus-Containment,
  Tab tabbte auf verdeckte Header-Elemente) **und** dem Nachfund in `/test` (zwei ungetestete
  Tab-Branches in genau dieser Logik, erst durch Coverage-Analyse sichtbar, nicht beim
  ursprünglichen TDD-Durchlauf). Die Regel bündelt beide Findings zu einer Checkliste: vier
  konkrete Tab-Branches, die jede `aria-modal`-Komponente in diesem Projekt künftig braucht.

### Keine Änderungen nötig
- **Review-Finding W2 (`vi.clearAllMocks()` statt `resetAllMocks()`):** Kein neuer Regel-Bedarf
  – die Regel existiert bereits (#51-Codify) und wurde im Rework korrekt angewendet
  (`AppHeader.test.tsx`, `page.test.tsx`, `nav-consistency.test.tsx` → `resetAllMocks()`;
  `AppNav.test.tsx` behält begründet `clearAllMocks()`). Der ursprüngliche Verstoß zeigt, dass
  die Regel beim ersten Draft noch übersehen wird – aber der Review-Prozess hat genau das
  gefangen, wofür er da ist. Kein Automatisierungs-Kandidat: ein Grep-Gate müsste zwischen
  „leakender Mock-Implementierung" und „reinem `vi.fn()`" unterscheiden, was ohne
  AST-Analyse nicht zuverlässig geht – Aufwand steht in keinem Verhältnis zum seltenen Fehler.
- **Security-Review:** PASSED ohne Findings. Die einzige zukunftsrelevante Notiz (XSS-Vorsorge
  für `PublicHeader.contextLabel`, sobald #54 einen dynamischen Namen einspeist) wurde nicht
  als Factory-Regel kodifiziert, sondern direkt als Breadcrumb-Kommentar auf
  [Issue #54](https://github.com/nothra/tch-gastro-services/issues/54#issuecomment-5015490155)
  hinterlassen – sie betrifft eine konkrete Folge-Task, nicht ein wiederkehrendes Muster.
- **Sonstige Task-Historie** (Rework, Test-Vervollständigung, Refactoring) verlief ohne weitere
  Blocker oder Wiederholungsfehler; keine neuen Stolpersteine über die beiden oben genannten
  hinaus.

### Empfehlung für nächste Features
Enthält eine künftige Task eine weitere Overlay-/Dialog-Komponente (Modal, Bottom-Sheet,
Command-Palette), den neuen Stolperstein aktiv gegen die Implementierung prüfen, statt den
Fokus-Trap erst im Review nachzurüsten.
