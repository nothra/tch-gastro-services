## Codify-Report: Task 374

### Neue Regeln hinzugefügt
- `docs/factory/lessons/frontend-react.md` – Nativer Popover: `aria-expanded` ist kein DOM-Attribut, jsdom kennt die API nicht; Öffnen/Escape/Expanded per Playwright über den AX-Baum – wegen: Implement-Befund, Unit-Tests hätten nichts belegt.
- `docs/factory/lessons/frontend-react.md` – Refactor, der Klassen aus gegateten Dateien in eine neue Datei zieht, trägt die Zieldatei ins Farb-Gate ein und greppt Handkopien – wegen: Review-Runde-2-Finding (`headerStyles.ts` fehlte in `UI_TOKEN_FILES`, `PublicHeader` hielt eine Kopie der Fokus-Klassen).
- `docs/factory/lessons/testing.md` – E2E gegen `localhost`, nicht `127.0.0.1` (`allowedDevOrigins` blockt HMR, keine Hydration) – wegen: /implement-Selbstfund, sah wie eine Regression aus.
- `docs/factory/lessons/build-tooling.md` – Nachtrag zu #67/#324: drittes Vorkommnis, `playwright.capture.tmp.config.ts` war nicht gitignoret.
- `docs/factory/PROJECT-CONTEXT.md` – vier Index-Zeilen bzw. Ergänzungen mit „Laden bei"-Trigger für die obigen Einträge.

### Keine Änderungen nötig
- Security-Review ohne Findings. Rollen-Gate vor dem Laden, `prefetch={false}` (#164) und der Token-Gate-Vorrang auf `/theke/[token]` waren von Anfang an eingehalten.
- Die Review-Nitpicks (Magic Number `height: 240`, dreifach nachgebauter Screenshot-Aufruf) sind Einzelfälle ohne Muster.

### Offen (nicht erledigt)
- **`.gitignore` ergänzen:** `*.tmp.config.ts` fehlt noch. Der Edit wurde in dieser Session nicht freigegeben. Eine Zeile unter `*.tmp.spec.tsx`.
- **AK5.4 (Anleitung + Screenshots)** ist weiterhin offen: `git diff origin/main...HEAD -- docs/anleitung` ist leer. Damit sind auch `Fertig / PR erstellt` und die Task-Datei noch nicht abschließbar. Das ist ein menschlicher bzw. manueller Schritt (Bild-Anhänge, Lesson #368), der vor `/pr-shepherd` erledigt sein muss.
- Der `.gitignore`-Eintrag und AK5.4 sind keine Issue-würdigen Funde, sondern Rest dieser Task.

### Empfehlung für nächste Features
- Vor einem Refactor, der Code aus gegateten Dateien verschiebt, zuerst `eslint/ui-token-files.mjs` anfassen.
- Wegwerf-Artefakte vor dem Anlegen mit `git check-ignore -v` prüfen.
