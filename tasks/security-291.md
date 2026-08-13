# Security Review: Task 291

**Scope:** `git diff origin/main...HEAD` – `package.json`, `pnpm-workspace.yaml`,
`pnpm-lock.yaml`, `scripts/checks/tests/run-tests.sh`, Doku (Spec, Lesson, Kleinfunde, Task).
**Kein Produktionscode geändert** (`app/`, `lib/`, `db/`, `components/`, `e2e/`,
`next.config.ts` sind im Diff nicht enthalten – verifiziert per `git diff --name-only`).
Die Angriffsfläche der Anwendung ändert sich damit ausschließlich über die
Dependency-Auflösung, nicht über eigenen Code.

**Prüfmethode:** Die Advisory-Daten wurden **nicht** aus den Kommentaren übernommen, sondern
read-only gegen die Dependabot-API des Repos gegengeprüft
(`repos/nothra/tch-gastro-services/dependabot/alerts?state=open`, Wrapper-Skript nach dem
Muster aus #67, `pnpm audit` bleibt wegen #228 außen vor). Die aufgelösten Versionen stammen
aus `pnpm-lock.yaml`, nicht aus `package.json`.

---

## Kritische Findings (Blocker)

_Keine._

---

## Wichtige Findings

- [ ] **[Dependency Security / Verifikation] AK-9 ist nach einem Proxy-Bypass-Patch offen –
      das Auth-Gate dieser App ist die gepatchte Komponente.**
      Der next-Bump schließt u. a. **GHSA-6gpp-xcg3-4w24 (high): „Middleware / Proxy bypass in
      App Router applications using Turbopack and single locale"**. Genau dieser Mechanismus
      *ist* die Autorisierungsgrenze des Projekts: `proxy.ts` hängt das komplette RBAC-Gate an
      den Next-Proxy (`matcher` mit fail-closed Negativ-Liste), das Projekt baut mit Turbopack
      und hat keine i18n-/Locale-Konfiguration – die Vorbedingungen des Advisories lagen also
      vor dem Bump vor.
      Der Bump ist damit die richtige und wichtigste Maßnahme dieses PRs. Offen ist nur die
      **Gegenprobe**: dass das Gate nach dem Versionswechsel unverändert greift, ist bisher
      weder durch Playwright (AK-9, Umgebungs-Blocker: kein `.env.local`, kein Docker) noch
      durch einen anderen Lauf belegt. Bei einer Änderung an der Proxy-Auswertung ist ein
      unbemerkt zu weit gefasster oder ins Leere laufender `matcher` das realistische
      Restrisiko – und ein durchlässiges Auth-Gate fällt in Unit-Tests nicht auf.
      **Lösung:** vor dem Merge `.env.local` bereitstellen, `pnpm db:up`, dann
      `pnpm test:e2e e2e/auth.spec.ts` (Login, Rollen-Gate, Logout). Ist das vor dem Merge
      nicht darstellbar, unmittelbar nach dem Merge `/post-merge-verify` gegen die deployte
      Umgebung fahren und den geschützten Pfad **unauthentifiziert** anfragen (erwartet: 307
      auf `/login`, kein 200). Kein Merge ohne eine der beiden Proben.
      *Kein Blocker im Sinne eines Defekts im Diff – der Diff ist korrekt; blockierend ist die
      fehlende Verifikation.*

---

## Hinweise

- [ ] **[Dependency Security] Alle sechs Floors und alle GHSA-IDs sind gegen die
      Dependabot-API korrekt** – kein Finding, sondern das Ergebnis der Gegenprobe, weil die
      IDs in zwei Vorrunden als „nicht ermittelbar" geführt wurden. Jede ID in
      `pnpm-workspace.yaml:30-58` existiert, gehört zum genannten Paket, trägt die genannte
      Severity und den genannten Scope, und ihr `first_patched_version` stimmt **exakt** mit
      dem eingetragenen Floor überein:

      | Paket | Floor lt. Advisory | Override-Selektor | aufgelöst im Lockfile |
      |---|---|---|---|
      | `next` | 16.2.11 (9 Advisories: 5 high, 4 medium) | direkter Pin | **16.2.12** ✓ |
      | `postcss` | 8.5.18 / 8.5.23 | `<8.5.23` | **8.5.26** ✓ |
      | `brace-expansion` | 1.1.18 / 2.1.4 | `<1.1.18`, `>=2.0.0 <2.1.4` | **1.1.18 / 2.1.4** ✓ |
      | `sharp` | 0.35.0 | `<0.35.0` | **0.35.3** ✓ |
      | `undici` | 7.29.0 (5 Advisories, dev) | `<7.29.0` | **7.29.0** ✓ |
      | `js-yaml` | 4.3.1 (dev) | `<4.3.1` | **4.3.1** ✓ |
      | `nanoid` | 3.3.17 (kein Override) | – | **3.3.18** ✓ |

      **Es bleibt kein offener Alert unbehandelt:** die API meldet 25 offene Advisory-Zeilen,
      und jede einzelne ist durch die aufgelösten Versionen dieses Branches abgedeckt. AK-10
      ist damit inhaltlich vorweggenommen; nach dem Merge ist nur noch die Neubewertung durch
      Dependabot abzuwarten. Die Alt-Overrides `esbuild`/`uuid` erscheinen erwartungsgemäß
      nicht mehr in der Liste.

- [ ] **[Dependency Security] `sharp` außerhalb der von next deklarierten Range – Restrisiko
      unabhängig nachgeprüft und bestätigt null.** Die Begründung in
      `pnpm-workspace.yaml:45-49` habe ich nicht übernommen, sondern selbst geprüft:
      `grep -rn -e "next/image" -e "<Image" app lib e2e components` → kein Treffer,
      `next.config.ts` trägt keine `images`-Config (nur `serverExternalPackages`). `sharp` ist
      zur Laufzeit nicht erreichbar; der erzwungene Minor-Bump über `^0.34.5` hinaus ist
      vertretbar. **Nebenbefund zur Supply Chain:** der Bump zieht zwei neue Paketnamen in den
      Lockfile (`@img/sharp-freebsd-wasm32`, `@img/sharp-webcontainers-wasm32`, beides
      `optional` und plattform-gated → auf darwin/linux-x64 nie installiert). Sonst enthält der
      Lockfile-Diff **ausschließlich 1:1-Versionswechsel bereits vorhandener Pakete** – keine
      neuen Registry-Quellen, keine `git+`/`file:`/`link:`-Auflösungen, keine sonstige
      Ausweitung der Install-Zeit-Fläche. Da `sharp` in `allowBuilds` steht, laufen dessen
      Post-Install-Skripte weiterhin; das ist Bestandsentscheidung, nicht neu.

- [ ] **[Security Misconfiguration] Vier Override-Selektoren sind nach unten offen.**
      `postcss@<8.5.23`, `sharp@<0.35.0`, `undici@<7.29.0` und `js-yaml@<4.3.1` matchen auch
      ältere Major-Linien desselben Pakets; der Caret-Ziel-Range begrenzt nur nach oben. Zöge
      künftig ein Paket z. B. `js-yaml@3.14` in den Baum, höbe der Override ihn auf 4.x –
      dieselbe Mechanik, die bei `brace-expansion` bereits eingetreten ist und dort mit einem
      disjunkten Selektor behoben wurde. **Heute kein Defekt und kein Sicherheitsrisiko:** im
      aktuellen Lockfile existiert je genau eine aufgelöste Kopie, alle in der Ziel-Major
      (geprüft). Der Auslöser ist in diesem Repo derzeit nicht herstellbar → nach der
      Schwellen-Tabelle (ADR-043) **kein Issue**, sondern als Kleinfund abgelegt
      (`docs/factory/kleinfunde.md`, Eintrag „Override-Selektoren ohne untere Schranke").

- [ ] **[Test-Abdeckung] Der Floor-Guard ist Major-Linien-gebunden.** `floor_cases_291` in
      `scripts/checks/tests/run-tests.sh` prüft je Paket **eine** Major-Linie
      (`postcss|8`, `undici|7`, …). Eine künftige, neue Major-Kopie (etwa `undici@8` mit
      eigenem Advisory) entginge sowohl dem Override-Selektor als auch dem Guard, ohne dass ein
      Test rot wird. Das ist eine inhärente Eigenschaft von Floor-Guards und akzeptabel –
      Dependabot bleibt der eigentliche Backstop, der Guard sichert nur gegen den stillen
      **Rückfall** unter einen bereits geschlossenen Floor. Bewusst als Hinweis notiert, damit
      der Guard nicht später mit einer Vollständigkeitsgarantie verwechselt wird, die er nicht
      gibt.

- [ ] **[Bash / Gate-Robustheit] Der `#291`-Block ist injektionsfrei.** Geprüft, weil er
      Repo-Inhalte in `grep`/`sed`-Muster einsetzt: die Schleifenwerte stammen ausschließlich
      aus dem literalen `floor_cases_291`-Array (nicht aus Fremdinhalt), alle Variablen sind
      quotiert, `grep -qxF --` wird bei variablen Suchwerten korrekt genutzt, Fixtures liegen
      in `mktemp`-Pfaden und werden aufgeräumt. Der Fail-closed-Vorspann (`[ -r … ]` auf alle
      drei Quellen) verhindert einen stillen Leer-Durchlauf. Kein Handlungsbedarf.

- [ ] **[Doku-Genauigkeit] Veraltete Zeilenanker im Kleinfund-Eintrag korrigiert.** Der
      `/review`-Fund (`docs/factory/kleinfunde.md:121`/`:123` zeigten auf
      `pnpm-workspace.yaml:44-45` bzw. `:14-17`) war noch offen; die Ziele liegen tatsächlich
      auf `:66-67` (Override-Einträge `esbuild`/`uuid`) und `:15-18` (Caret-Regel). In diesem
      Schritt behoben, damit er nicht bis `/codify` durchrutscht.

---

## Prüfkatalog – Ergebnis

| Bereich | Ergebnis |
|---|---|
| Input-Validierung & Injection (SQL/Command/XSS) | **n/a** – kein Produktionscode im Diff; einziger neuer ausführbarer Code ist der Bash-Guard (geprüft, s. o.) |
| Authentifizierung & Autorisierung | **verbessert** – der next-Bump schließt einen Proxy-Bypass auf genau der Komponente, die das RBAC-Gate trägt; Verifikation offen (Wichtiges Finding) |
| Hartkodierte Credentials / Secrets im Diff | **keine** – Diff (ohne Lockfile) auf `password`/`secret`/`token`/`api key`/Key-Header gegrept, nur Prosa-Treffer über die `.env.local`-Sperre |
| Sensible Daten in Logs | **n/a** – keine Log-Aufrufe im Diff |
| Kryptographie / Zufall | **n/a** – nicht berührt |
| Dependencies | **geprüft** – 25 offene Advisory-Zeilen gegen die API abgeglichen, alle abgedeckt; keine neuen Pakete außer zwei plattform-gated `@img/*`-Optionalen |
| Error Handling / Information Disclosure | **n/a** – nicht berührt |

---

## Ergebnis

**PASSED**

Keine kritischen Findings – der Merge ist aus Security-Sicht nicht blockiert. Der PR verbessert
die Sicherheitslage substanziell (Proxy-Bypass, SSRF und DoS in `next`; XSS-Pfad in `postcss`;
ReDoS in `brace-expansion`).

**Eine Auflage vor dem Abschluss:** die Auth-Gegenprobe aus dem wichtigen Finding
(Playwright `e2e/auth.spec.ts` **oder** `/post-merge-verify` mit unauthentifizierter Anfrage auf
einen geschützten Pfad). Sie ist eine Ausführungs-, keine Code-Aufgabe.
