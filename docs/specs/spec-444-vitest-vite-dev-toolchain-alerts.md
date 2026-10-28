# Spec: vitest/vite auf gefixte Versionen heben (7 Dev-Toolchain-Alerts)

## Kontext
Sieben offene Dependabot-Alerts betreffen die Test-/Dev-Toolchain, nur über `pnpm-lock.yaml` und
transitiv über `vitest`:

| Alert | Severity | Paket | Advisory | Fix in |
|-------|----------|-------|----------|--------|
| #93 | medium | `@vitest/mocker` | GHSA-qxg6-89mg-rqv8 | 4.1.12 |
| #92 | medium | `@vitest/mocker` | GHSA-xp26-3454-mjgp | 4.1.12 |
| #90 | medium | `vite` | GHSA-rq7h-c2jc-7f22 | 8.1.6 |
| #91 | low | `vite` | GHSA-9jrq-w75r-8gcw | 8.1.6 |
| #86 | medium | `vite` (launch-editor) | GHSA-r825-w8mm-5pxw | 8.1.6 |
| #85 | high | `vite` (launch-editor) | GHSA-587h-7wmj-h5pm | 8.1.6 |
| #84 | medium | `vite` (launch-editor) | GHSA-698v-4r3x-3vcv | 8.1.6 |

Ist-Stand (`package.json` / Lockfile): `vitest ^4.1.11` → `vitest@4.1.11`,
`@vitest/coverage-v8 ^4.1.11` → `4.1.11`, `@vitest/mocker@4.1.11`, `vite@8.1.3` (transitiv).
`launch-editor` ist kein eigenes Paket im Lockfile, sondern in `vite` gebündelt – die Alerts #84–#86
schließt also der `vite`-Bump.

Die Pakete laufen nur lokal und in CI (Tests, Coverage), nicht im Produktions-Bundle auf Vercel.
Deshalb liegt das Issue in der Priorität unter dem next-Issue (#443).

## Scope
**Inbegriffen:**
- `vitest` auf eine gefixte Version heben (Caret in 4.x, Untergrenze >= 4.1.12)
- `@vitest/coverage-v8` im Gleichschritt heben, weil es `vitest` versionsgleich als Peer erwartet
- Lockfile neu auflösen, sodass `@vitest/mocker` >= 4.1.12 und `vite` >= 8.1.6 aufgelöst werden
- nur falls die Neuauflösung `vite` nicht hebt: Override in `pnpm-workspace.yaml` als Caret in der
  8.x-Linie (Lesson #291/#339)
- Gates grün

**Nicht inbegriffen:**
- andere Dependabot-Alerts
- Major-Upgrades (vitest 5, vite 9)
- `@vitejs/plugin-react` nur heben, wenn sein Peer-Range `vite` >= 8.1.6 nicht zulässt
- Änderungen an Tests oder an `vitest.config.*`, sofern der Bump sie nicht erzwingt

## Akzeptanzkriterien
- [ ] AK1: GIVEN `package.json` WHEN `vitest` und `@vitest/coverage-v8` geprüft werden THEN tragen beide einen Caret-Range in 4.x mit Untergrenze >= 4.1.12, und beide Untergrenzen sind gleich (Gleichschritt). Den tatsächlich geschriebenen Specifier in der Task-Notiz festhalten (Lesson #448).
- [ ] AK2: GIVEN `pnpm-lock.yaml` WHEN alle aufgelösten Versionen gelistet werden (`pnpm why @vitest/mocker`, `pnpm why vite`) THEN ist keine `@vitest/mocker`-Version < 4.1.12 und keine `vite`-Version < 8.1.6 enthalten, auch nicht transitiv.
- [ ] AK3: GIVEN ein Override für `vite` wurde gesetzt WHEN `pnpm install --lockfile-only` ohne bestehendes Lockfile einmal mit und einmal ohne Override läuft THEN zeigt die Messung, dass der Override nötig ist (ohne ihn wird < 8.1.6 aufgelöst). Andernfalls wird der Override wieder entfernt (Lesson #291/#412). Ohne Override entfällt das AK und das wird in der Task-Datei vermerkt.
- [ ] AK4: GIVEN der Bump WHEN `pnpm test`, `pnpm test:coverage`, `pnpm lint`, Typecheck und `pnpm build` laufen THEN sind alle grün. Die Coverage-Schwelle von 80 % wird weiter gemessen und erreicht.
- [ ] AK5: GIVEN die DB-Integrationstests WHEN sie mit `pnpm dotenv -e .env.local -- vitest run` laufen THEN sind sie grün. Das belegt, dass `vi.mock`-basierte Tests mit der neuen `@vitest/mocker`-Version unverändert laufen.
- [ ] AK6: GIVEN die Advisory-Prüfung (npm-Bulk-Advisory-API über den ganzen Lockfile-Baum, mit Gegenprobe gegen die Altversionen, Lesson #390) WHEN sie nach dem Bump läuft THEN meldet sie für `@vitest/mocker` und `vite` keinen offenen Treffer.

## Fehlerszenarien
- [ ] Der Bump ändert das Mock-Verhalten (`vi.mock`-Hoisting, Pfadauflösung) und einzelne Tests werden rot → nur das Nötigste anpassen, jede Testanpassung in der Task-Datei begründen. Eine geänderte Assertion ist kein stiller Fix.
- [ ] `@vitejs/plugin-react` erlaubt `vite` >= 8.1.6 nicht (Peer-Konflikt) → Plugin im Rahmen derselben Major-Linie mitheben und in der Task-Datei vermerken.
- [ ] `vitest` und `@vitest/coverage-v8` laufen auseinander (unterschiedliche aufgelöste Versionen) → `pnpm test:coverage` scheitert oder warnt. Beide müssen auf dieselbe Version aufgelöst sein.
- [ ] `pnpm audit` scheitert in der Sandbox (Gzip-Bug, Lesson #228) → Ersatzweg aus AK6 nutzen, nicht als Blocker werten.

## Offene Fragen
- [ ] Ob die Dependabot-Alerts #84–#86 und #90–#93 wirklich geschlossen sind, lässt sich erst nach dem Merge prüfen, weil Dependabot nur den Default-Branch scannt. Das ist eine Nach-Merge-Prüfung (Lesson #390), kein Vor-Merge-AK.
