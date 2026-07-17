## Codify-Report: Task 137

### Neue Regeln hinzugefügt
- `docs/factory/PROJECT-CONTEXT.md` (Bekannte Stolpersteine) – "Lint/Vitest fangen keine
  Typfehler – Gate-Lücke bis zum manuellen `pnpm build`" – wegen: Review-Runde 1 fand einen
  Build-Break (fehlender `import type`), den `pnpm lint`/`pnpm test` beide grün durchließen
  (Vitest transpiliert über esbuild ohne Type-Check, ESLint hier nicht typed-aware). Kein
  automatisiertes Gate deckte diese Fehlerklasse ab.
- `package.json` + `scripts/checks/pre-push.sh` – neues `"typecheck": "tsc --noEmit"`-Script,
  als Pre-Push-Check verdrahtet (override via `FACTORY_TYPECHECK_COMMAND`), fail-closed.
  Schließt exakt die oben beschriebene Gate-Lücke.
- Nebenbefund beim Einführen des Gates: ein vorbestehender, mit #137 nicht verwandter
  `@ts-expect-error` in `db/veranstaltung.test.ts` war stale (TS2578, "Unused directive")
  und hätte das neue Gate sofort für jeden Branch blockiert. Als Mini-Fix im selben PR
  behoben (Kommentar erklärt jetzt, dass die CHECK-Constraint zur Laufzeit prüft, nicht TS)
  und in der neuen Regel oben als Lehre festgehalten: neue Gates immer gegen den
  **aktuellen** Baum verifizieren, nicht nur gegen den eigenen Diff.

### Keine Änderungen nötig
Die übrigen Review-/Security-Findings (leere Größe in Gruppe, Route-Neutralität, IDOR/XSS-
Checks) waren feature-spezifisch und bereits in den jeweiligen Runden behoben – kein
wiederkehrendes Muster, das eine neue Guideline-Regel rechtfertigt.

### Out-of-Scope-Issue angelegt
`#142` – Katalog-Schema (`app/verwaltung/katalog/schema.ts`) fehlt eine `.max()`-Obergrenze
auf `name`/`size` (Erweiterung der bestehenden #50-Regel auf einen weiteren Schreibpfad).
Aus dem Security-Review als Vorbedingung geflaggt, nicht durch #137 eingeführt. Labels:
`enhancement` + `security`.

### Empfehlung für nächste Features
Das neue Typecheck-Gate ist jetzt scharf – nächste Tasks sollten `pnpm typecheck` lokal
laufen lassen, bevor sie pushen, nicht erst am Pre-Push-Hook scheitern.
