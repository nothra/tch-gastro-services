# Projekt-Kontext

> **Initialisierung:** Diese Datei wird durch `scripts/init-factory.sh` angelegt (Basis)
> und durch `/setup-project` in Claude Code vervollständigt (Tech-Stack-Analyse).
>
> Halte sie aktuell – sie ist das Projekt-Gedächtnis der Factory.
> Agenten haben kein Langzeitgedächtnis. Diese Datei ist ihr Onboarding-Dokument.

---

## Projekt

| Feld | Wert |
|------|------|
| **Name** | TCH Gastro Services |
| **Beschreibung** | Cross-Platform WebApp fuer Browser, Android und iOS; zentrale Komponente auf Vercel |
| **Typ** | webapp (Browser + Android + iOS, Vercel) |
| **Team** | TBD |
| **Startdatum** | 2026-07-08 |
| **Repository** | https://github.com/nothra/tch-gastro-services |

---

## Tech-Stack

| Feld | Wert |
|------|------|
| **Primärsprache** | TBD (Stack offen) |
| **Framework / Runtime** | TBD |
| **Datenbank** | TBD |
| **Build-Tool** | {{BUILD_TOOL}} |
| **Weitere Technologien** | {{OTHER_TECH}} |

---

## Build & Run

```bash
# Projekt bauen
{{BUILD_COMMAND}}

# Dev-Server / lokale Ausführung starten
{{DEV_COMMAND}}

# Produktions-Build
{{PROD_BUILD_COMMAND}}
```

---

## Testing

```bash
# Alle Tests ausführen
{{TEST_COMMAND}}

# Tests mit Coverage-Report
{{TEST_COVERAGE_COMMAND}}

# Einen einzelnen Test ausführen
{{SINGLE_TEST_COMMAND}}
```

- **Test-Framework:** {{TEST_FRAMEWORK}}
- **Mindest-Coverage:** {{COVERAGE_THRESHOLD}} %
- **Test-Konventionen:** {{TEST_CONVENTIONS}}

---

## Code-Qualität

```bash
# Linting ausführen
{{LINT_COMMAND}}

# Formatierung prüfen
{{FORMAT_CHECK_COMMAND}}

# Formatierung automatisch anwenden
{{FORMAT_FIX_COMMAND}}
```

- **Linter:** {{LINTER}}
- **Formatter:** {{FORMATTER}}

---

## Architektur

- **Stil:** {{ARCHITECTURE_STYLE}}
  _(z.B. Hexagonal Architecture, Layered, Event-Driven, CQRS)_
- **Domain-Aufteilung:** {{DOMAIN_STRUCTURE}}
- **API-Stil:** {{API_STYLE}} _(z.B. REST, GraphQL, gRPC, Event-basiert)_
- **Besonderheiten:** {{ARCHITECTURE_NOTES}}

Relevante ADRs: siehe `docs/adr/`

---

## Projektspezifische Coding-Konventionen

> Hier nur Ergänzungen zu den globalen Guidelines in `docs/factory/guidelines/`.
> Nur dokumentieren, was in diesem Projekt anders oder zusätzlich gilt.

{{PROJECT_SPECIFIC_CONVENTIONS}}

---

## Bekannte Stolpersteine

> Wird durch `/codify` befüllt – Dinge, die Claude wiederholt falsch gemacht hat
> und die als projektspezifische Regeln gelten.

### Agenten-Blockerverhalten (aus Task 002 / K-01, K-02)

Agenten wissen, dass sie bei fehlenden Voraussetzungen stoppen sollen – schreiben aber nicht **warum** sie stehen. Das macht Blockiergründe für den Menschen unsichtbar.

**Regel:** Wenn ein Agent pausiert oder abbricht (fehlende ADR, fehlende Task-Datei, Schreibfehler), muss er den Grund **explizit in der Task-Datei protokollieren** bevor er stoppt. Kein stilles Warten.

Format: `Blocker [Datum]: [Grund] – [was der Mensch tun muss]`

### Kanonische Quellen immer referenzieren (aus Task 002 / W-02, W-03)

Wenn eine Regel oder Liste an mehreren Stellen auftaucht (Skill + Persona + Spec), muss jede Kopie auf die kanonische Quelle verweisen. Fehlt der Verweis, entstehen beim nächsten Update inkonsistente Versionen.

**Regel:** Bei Änderungen an Regel-Listen: (1) Kanonische Quelle aktualisieren, (2) alle Kopien synchronisieren, (3) alte Formulierungen vollständig ersetzen – nie neben neuen stehen lassen.

---

## Offene Architektur-Fragen

> Noch nicht entschiedene Fragen, die eine ADR benötigen.

<!-- Wird bei /architecture befüllt -->
