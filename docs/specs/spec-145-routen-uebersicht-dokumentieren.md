# Spec: Routen-Übersicht dokumentieren und Pflege verankern

> Issue #145 · Label `documentation`
>
> **Deliverable:** eine gepflegte, kuratierte **Routen-Übersicht** in der Doku **plus** die
> verbindliche Verankerung ihrer Pflege bei jeder route-verändernden Änderung – inklusive eines
> **automatischen Drift-Checks**, der Doku und tatsächliche Route-Dateien gegeneinander prüft.
>
> **Kanonische Quelle bleibt der Code.** Die Doku ist die *kuratierte* Übersicht; die einzelne
> Liste hat genau **eine** kanonische Stelle (`docs/routes.md`), auf die alle anderen Stellen
> nur **verweisen** (PROJECT-CONTEXT „Kanonische Quellen immer referenzieren").

## Kontext

Die verfügbaren Routen der App sind bisher **nicht** zentral dokumentiert – man muss sie aus dem
`app/`-Baum rekonstruieren. Dadurch bleiben neue oder geänderte Routen leicht unbemerkt (zuletzt
fiel `/veranstaltung/[id]/auslagen` erst beim manuellen Auflisten auf). Es fehlt außerdem eine
Prozessregel, die die Pflege der Übersicht an jede Routen-Änderung koppelt – analog zur bestehenden
Guardrail „Entscheidungen dokumentieren" (ADR).

**Ist-Stand `main` (Stand 2026-07-18)** – Grundlage der ersten Befüllung:

| Pfad (URL) | Typ | Funktion | Zugriff |
|-----------|-----|----------|---------|
| `/` | Seite | Landing/Startseite | angemeldet |
| `/login` | Seite | Anmeldung (Credentials) | öffentlich |
| `/veranstaltung` | Seite | Veranstaltungs-Liste | `veranstalter` |
| `/veranstaltung/[id]` | Seite | Veranstaltung führen (Detail) | `veranstalter` |
| `/veranstaltung/[id]/verzehr` | Seite | Verzehr erfassen | `veranstalter` |
| `/veranstaltung/[id]/auslagen` | Seite | Auslagenerstattung | `veranstalter` |
| `/verwaltung/katalog` | Seite | Katalog/Preise pflegen | `verwalter` |
| `/verwaltung/teilnehmer` | Seite | Teilnehmer-Stammdaten | `verwalter` |
| `/api/auth/[...nextauth]` | API | Auth.js-Handler | öffentlich (proxy-exempt) |
| `/api/health` | API | Healthcheck | öffentlich (proxy-exempt) |
| `/api/version` | API | Versions-Info | öffentlich (proxy-exempt) |

> Zugriffs-Semantik: **öffentlich** = keine Anmeldung nötig; **angemeldet** = Login nötig, aber
> keine spezifische Rolle; **`veranstalter`/`verwalter`** = Rollen-Gate. Quelle je Seite:
> `hasRole(...)` im `page.tsx` (Komfort-Redirect; Durchsetzung serverseitig in den Actions über
> `requireRole`, `lib/authz.ts`). Öffentliche API-Routen sind zusätzlich im
> `proxy.ts`-Negativ-Lookahead-Matcher ausgenommen.

## Scope

**Inbegriffen:**

1. **`docs/routes.md`** – neue kanonische Übersicht: alle Seiten (`app/**/page.tsx`) und
   API-Route-Handler (`app/api/**/route.ts`), je Route **Pfad**, **Typ** (Seite/API),
   **Kurzbeschreibung/Funktion** und **Zugriff** (öffentlich / angemeldet / `veranstalter` /
   `verwalter`). Spiegelt den aktuellen `main`-Stand **vollständig**.
2. **Referenz aus `PROJECT-CONTEXT.md`** (Abschnitt „Architektur") auf `docs/routes.md` – kein
   Duplikat der Liste, nur ein Verweis.
3. **Kurzhinweis + Link in `README.md`** (Abschnitt „Projektstruktur (Auszug)") auf
   `docs/routes.md` – ein Satz Beschreibung, keine Liste (Duplikat vermeiden).
4. **Prozess-Verankerung** der Regel „Routen-Doku bei jeder Routen-Änderung/-Neuerung
   aktualisieren" an **drei** Stellen:
   - **CLAUDE.md-Guardrails** (Root, kanonischer Ort der nicht verhandelbaren Regeln),
   - **`/review`-Kriterium** (`.claude/commands/review.md`),
   - **`/implement`-Checkliste** (`.claude/commands/implement.md`).
5. **Automatischer Drift-Check** (`scripts/checks/`): Gate-Test, der die in `docs/routes.md`
   dokumentierten Pfade gegen die tatsächlichen Route-Dateien (`app/**/page.tsx` +
   `app/api/**/route.ts`) abgleicht und bei Abweichung **fail-closed** blockiert. Eingebunden in
   den Push-Gate-Lauf (`scripts/checks/pre-push.sh` bzw. `scripts/checks/tests/run-tests.sh`,
   je nach bestehender Konvention).

**Nicht inbegriffen:**

- Änderungen am tatsächlichen Routing/an Seiten oder API-Handlern (kein neues Verhalten der App).
- Dokumentation von Server Actions, privaten `_`-Ordnern oder Nicht-Routen-Komponenten
  (die Übersicht listet **Routen**, nicht die interne Code-Struktur).
- Ein ADR (reine Doku-/Tooling-Task, keine Architektur-Entscheidung).
- Route Groups `(name)`/Layouts als eigene Zeilen (sie erzeugen keine eigene URL).

## Verankerung der Verortung (entschieden in /requirements)

- Kanonische Liste: **`docs/routes.md`** (einzige vollständige Tabelle).
- `PROJECT-CONTEXT.md` und `README.md` **verweisen** nur darauf – keine zweite Kopie der Tabelle.
  Grund: „Kanonische Quellen immer referenzieren" – zwei Kopien driften beim nächsten Update
  auseinander.

## Akzeptanzkriterien

**Routen-Übersicht (`docs/routes.md`):**

- [ ] GIVEN der aktuelle `main`-Stand WHEN `docs/routes.md` gelesen wird THEN enthält es je
      dokumentierter Route **Pfad**, **Typ** (Seite/API), **Kurzbeschreibung/Funktion** und
      **Zugriff** (öffentlich / angemeldet / `veranstalter` / `verwalter`).
- [ ] GIVEN alle Route-Dateien unter `app/**/page.tsx` und `app/api/**/route.ts` WHEN die
      Übersicht mit dem Baum verglichen wird THEN ist **jede** existierende Route dokumentiert und
      **keine** nicht existierende Route gelistet (vollständig und exakt, Stand `main`).
- [ ] GIVEN eine Route mit Rollen-Gate WHEN ihr Zugriff dokumentiert wird THEN entspricht der
      dokumentierte Zugriff dem `hasRole(...)`-Gate im zugehörigen `page.tsx` (bzw. der
      `proxy.ts`-Ausnahme für öffentliche API-Routen).

**Referenzen (keine Duplikate):**

- [ ] GIVEN `PROJECT-CONTEXT.md` → Abschnitt „Architektur" WHEN es gelesen wird THEN verweist es
      auf `docs/routes.md` als Routen-Übersicht, **ohne** die Tabelle zu duplizieren.
- [ ] GIVEN `README.md` → Abschnitt „Projektstruktur (Auszug)" WHEN es gelesen wird THEN nennt es
      die Routen-Übersicht mit einem Kurzsatz und verlinkt `docs/routes.md`, **ohne** die
      Tabelle zu duplizieren.

**Prozess-Verankerung:**

- [ ] GIVEN CLAUDE.md WHEN die Guardrails gelesen werden THEN enthalten sie die verbindliche Regel
      „Bei jeder route-verändernden Änderung `docs/routes.md` aktualisieren" (analog zu
      „Entscheidungen dokumentieren").
- [ ] GIVEN das `/review`-Skill (`.claude/commands/review.md`) WHEN eine Routen-Änderung reviewt
      wird THEN prüft ein explizites Kriterium, ob `docs/routes.md` mit-aktualisiert wurde.
- [ ] GIVEN das `/implement`-Skill (`.claude/commands/implement.md`) WHEN eine route-verändernde
      Task implementiert wird THEN erinnert die Checkliste an die Aktualisierung von
      `docs/routes.md`.

**Automatischer Drift-Check:**

- [ ] GIVEN `docs/routes.md` stimmt mit den Route-Dateien überein WHEN der Drift-Check läuft THEN
      endet er mit Exit 0 (grün).
- [ ] GIVEN eine neue Route-Datei ohne Doku-Eintrag (oder ein Doku-Eintrag ohne Datei) WHEN der
      Drift-Check läuft THEN endet er **fail-closed** mit Exit ≠ 0 und benennt die abweichende(n)
      Route(n).
- [ ] GIVEN der Drift-Check WHEN das Push-Gate läuft (`scripts/checks/pre-push.sh` bzw. der von
      ihm aufgerufene Test-Runner) THEN ist der Check dort eingebunden und blockiert einen Push
      bei Drift.

## Fehlerszenarien / Risiken

- [ ] **Nicht-portable Regex im Drift-Check** (BSD/macOS lokal vs. GNU/Alpine in CI): nur
      POSIX-`grep -E`, kein `\s`/`\d`/`\w`, kein PCRE-Lookahead (clean-code.md „Portabilität in
      Gate-Skripten"). Gate mit Positiv- **und** Negativ-Beispiel testen.
- [ ] **Gate greift nicht** (still grün trotz Drift): Der Drift-Check braucht selbst einen Test
      (`scripts/checks/tests/run-tests.sh`), der ihn gegen ein bewusst driftendes Fixture rot
      laufen lässt – sonst merkt niemand, wenn das Muster nicht mehr matcht (#114).
- [ ] **Dynamische Segmente** (`[id]`, `[...nextauth]`) werden vom Ableitungs-Muster nicht sauber
      auf den dokumentierten Pfad gemappt → falsche Positiv-/Negativ-Treffer. Mapping explizit
      definieren und testen.
- [ ] **Route Groups / private Ordner** (`(name)`, `_name`) fälschlich als Route gezählt → der
      Check meldet Drift für Nicht-Routen. Nur `page.tsx`/`route.ts` als Route-erzeugend werten.
- [ ] **Doppelte kanonische Liste**: Die Tabelle landet versehentlich auch in PROJECT-CONTEXT
      oder README → zwei Quellen driften. Nur Verweis, nie Kopie.

## Randbedingungen

- **`.claude/**` ist für den Agenten hard-denied.** Änderungen an `.claude/commands/review.md`
  und `.claude/commands/implement.md` müssen als **Patch-Datei** (`tasks/patch-145.diff`, via
  `git diff` programmatisch erzeugt, **nicht** von Hand getippt) geliefert werden; der Mensch
  wendet sie mit `git apply` an. Blocker mit Datum + Grund + erforderlicher Aktion in der
  Task-Datei protokollieren (CLAUDE.md „`.claude/**`-Änderungen erfordern Patch-Workflow").
- **CLAUDE.md, `docs/routes.md`, PROJECT-CONTEXT.md, README.md** sind direkt editierbar
  (kein Patch nötig).
- Gate-Skripte in `scripts/checks/` laufen lokal (macOS/BSD) **und** in CI (GNU/Alpine) →
  POSIX-portabel, fail-closed.

## Offene Fragen

- [ ] Genaue Einbindungsstelle des Drift-Checks: eigener Check in `pre-push.sh` **oder** als
      Fall in `scripts/checks/tests/run-tests.sh` – entscheidet `/implement` nach bestehender
      Konvention der Nachbar-Checks. (Kein Blocker für die Requirements.)
