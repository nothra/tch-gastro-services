# Spec: Deploy-Freeze bei rotem Gate

## Kontext

Das Deploy-Gate (`.github/workflows/deploy-gate.yml`) promotet bei einem grünen Lauf den
**gesamten `main`-HEAD** nach `production` (`git push origin HEAD:production`). Der
akkumulierende Promote ist selbst-korrigierend – **solange das Gate verlässlich ist**.

**Vorfall (19.07.2026):** PR #162 (#134) machte das Gate am Schritt „E2E gegen INT" rot
(Logout-Race), der Promote wurde übersprungen – der Defekt blieb aber auf `main`. ~2,5 h
später wurde das Gate für PR #168 (#167) **grün** (die E2E-Prüfung war *flaky-grün* über den
weiterhin vorhandenen Defekt). Dieser grüne Lauf promotete den `main`-HEAD **inklusive #134**
nach `production` → fehlerhafter Code auf Produktion.

Root cause: **ein Gate wurde falsch-grün über kaputten Code.** #170 macht den konkreten
Logout-Fall deterministisch (Hebel 1). Diese Task ist der **strukturelle Schutz** (Hebel 2):
Ein einmal rotes Gate darf nicht durch einen späteren – evtl. flaky- – grünen Lauf still
überholt werden. Wirkt unabhängig davon, *welche* Flakiness künftig durchrutscht.

## Scope

**Inbegriffen:**
- Ein **Freeze-Marker**, den das Gate bei einem verifikationsrelevanten Fehlschlag setzt
  (Grund + blockierender Commit-SHA).
- Ein **fail-closed Freeze-Check** im Gate, der bei gesetztem *oder* unlesbarem Marker sowohl
  die PRD-DB-Migration+Seed als auch den Promote-Push unterbindet.
- Ein **dokumentierter, manueller Freigabe-Weg** für Maintainer (Voraussetzung: Fix gemergt +
  verifiziert).
- Eine **aktive Benachrichtigung**, wenn ein Freeze gesetzt wird oder einen Promote zurückhält.
- Ein **automatisierter Test**, der die Vorfall-Sequenz (#134-rot → #167-grün) simuliert und
  belegt, dass der grüne Folgelauf **nicht** promotet.
- Ein **ADR**, der Marker-Variante, Trigger-Eingrenzung, Check-Position, Freigabe-Weg,
  Benachrichtigung und das Zusammenspiel mit `concurrency: deploy-gate`, ADR-007 und ADR-017
  festhält.

**Nicht inbegriffen:**
- Der **akkumulierende Promote** bleibt unverändert (bewusste Entscheidung, kein per-Commit-Promote).
- Kein Revert / keine Quarantäne einzelner Commits.
- Kein Blockieren des `main`-Fortschritts – PRs mergen und Gates laufen normal weiter; nur der
  **Promote** wird angehalten.
- Der konkrete Logout-Determinismus (#170, Hebel 1) ist eine getrennte Task.
- Die Wahl des Marker-Speichers (Sentinel-Ref vs. Label vs. Repo-Variable) und des
  Benachrichtigungs-Kanals ist Aufgabe von `/architecture` (siehe Offene Fragen).

## Requirements-Entscheidungen (Session 19.07.2026)

Drei Requirements-Ebenen-Fragen wurden mit dem Entwickler geklärt:

1. **Freeze-Trigger eingegrenzt:** Nur Fehlschläge, die auf tatsächlich kaputten oder
   nicht-als-gut-verifizierten Code hindeuten, setzen den Freeze – nämlich die
   **E2E-Verifikation gegen INT** und die **Schema-Migrationen (INT und PRD)**. Reine
   Infrastruktur-/Vorbereitungsschritte (Secret-Presence-Check, Dependency-Install,
   INT-Deploy-Wait/Timeout, Neon-Reset, Anonymisierung) frieren **nicht** ein – ein solcher
   Fehlschlag verhindert ohnehin den Promote dieses Laufs, und ein späterer Lauf darf regulär
   promoten. Ziel: Schutz vor falsch-grün, ohne Fehlalarm-Freezes bei transienter Infra-Flakiness.
2. **Freeze-Check vor der PRD-Migration:** Bei aktivem Freeze wird der Marker **vor** der
   effektbehafteten PRD-DB-Migration+Seed geprüft; die Migration wird übersprungen. Damit
   eilt das Prod-Schema dem deployten Code während eines Freezes **nicht** voraus – Schema und
   Code bleiben strikt gekoppelt.
3. **Aktive Benachrichtigung:** Zusätzlich zur Log-/Summary-Meldung erzeugt das Gate eine aktive
   Benachrichtigung, wenn ein Freeze gesetzt wird oder einen Promote zurückhält (Kanal: ADR).

## Akzeptanzkriterien

- [ ] **AC1 – Freeze setzen:** GIVEN ein Gate-Lauf auf `main` WHEN ein verifikationsrelevanter
      Schritt fehlschlägt (E2E gegen INT, `db:migrate:int` oder `db:migrate:prd`) THEN wird ein
      **persistenter** Freeze-Marker gesetzt, der den **Grund** und den **blockierenden
      Commit-SHA** enthält.
- [ ] **AC2 – Infra-Fehler frieren nicht:** GIVEN ein Gate-Lauf WHEN ein reiner
      Infrastruktur-/Vorbereitungsschritt fehlschlägt (Secret-Presence-Check,
      Dependency-Install, INT-Deploy-Wait/Timeout, Neon-Reset, Anonymisierung) THEN wird
      **kein** Freeze gesetzt (der Lauf schlägt fehl und promotet nicht; ein späterer Lauf darf
      regulär promoten).
- [ ] **AC3 – Promote fail-closed gegen Marker:** GIVEN ein Freeze-Marker ist gesetzt **oder**
      nicht lesbar/nicht eindeutig WHEN das Gate die Prod-Phase erreicht THEN werden **weder**
      die PRD-DB-Migration+Seed **noch** der Promote-Push ausgeführt (kein Deploy).
- [ ] **AC4 – Check vor PRD-Migration:** GIVEN ein aktiver Freeze WHEN das Gate die
      effektbehafteten Prod-Schritte erreicht THEN wird der Marker **vor** der PRD-DB-Migration
      geprüft und Migration+Seed übersprungen (kein Seiteneffekt auf die Prod-DB).
- [ ] **AC5 – Zurückgehaltener Promote ist kein Fehlschlag:** GIVEN ein aktiver Freeze WHEN das
      Gate den Promote deswegen zurückhält THEN endet der Lauf **ohne Fehler** (nicht rot) mit
      einer klaren Log-/Summary-Meldung inkl. blockierendem SHA + Grund – damit nicht jeder
      Folgelauf fälschlich als neuer Fehlschlag erscheint und der bestehende Freeze nicht still
      überschrieben wird.
- [ ] **AC6 – Simulation der Vorfall-Sequenz:** GIVEN die Sequenz #134-rot (E2E-Fehlschlag →
      Freeze) → #167-grün WHEN der grüne Folgelauf das Gate durchläuft THEN promotet er
      **nicht** – nachgewiesen durch einen **automatisierten Test**, der die Freeze-Logik ohne
      echten Deploy ausführt (Setzen → Check verweigert Promote).
- [ ] **AC7 – Manueller Freigabe-Weg:** GIVEN ein aktiver Freeze und ein gemergter, verifizierter
      Fix WHEN ein Repo-Maintainer den **dokumentierten** Freigabe-Schritt ausführt THEN wird
      der Marker entfernt und der **nächste** grüne Gate-Lauf promotet wieder regulär.
- [ ] **AC8 – Aktive Benachrichtigung:** GIVEN das Gate setzt einen Freeze **oder** hält einen
      Promote wegen Freeze zurück WHEN das Ereignis eintritt THEN wird eine **aktive**
      Benachrichtigung erzeugt (nicht nur Log), die den blockierenden SHA + Grund enthält.
- [ ] **AC9 – ADR + Doku:** GIVEN die Umsetzung THEN ist ein **ADR** ergänzt (Marker-Variante &
      Trade-offs, Trigger-Eingrenzung, Check-Position vor PRD-Migration, Freigabe-Weg,
      Benachrichtigung, Zusammenspiel mit `concurrency: deploy-gate`, ADR-007, ADR-017) und der
      **Freigabe-Weg** in README/Runbook dokumentiert.

## Fehlerszenarien

- [ ] **Marker-Speicher nicht erreichbar/unlesbar** beim Check → fail-closed: kein Promote,
      Meldung „Marker-Status unklar – Promote verweigert".
- [ ] **Marker gesetzt, aber Grund/SHA fehlt oder ist korrupt** → weiterhin fail-closed (kein
      Promote); die Meldung weist auf den unlesbaren Marker hin.
- [ ] **Zweiter roter Lauf, während ein Freeze bereits steht** (Doppel-Freeze) → der ursprünglich
      **blockierende SHA/Grund bleibt nachvollziehbar** (nicht still überschreiben – die
      Freigabe-Voraussetzung muss auf den auslösenden Defekt zurückführbar bleiben; genaues
      Verhalten im ADR).
- [ ] **Zwei Gate-Läufe zeitgleich** → `concurrency: deploy-gate` (seriell, in Merge-Reihenfolge)
      stellt sicher, dass der Marker vor dem nächsten Promote greift – kein Race zwischen
      Setzen und Check.
- [ ] **Freigabe während ein Lauf aktiv ist** → durch die Serialisierung kein Overlap; der
      Freigabe-Effekt gilt ab dem nächsten Lauf (Verhalten im ADR festhalten).

## Offene Fragen (für /architecture)

- [ ] **Marker-Speicher:** dediziertes Sentinel-Ref (z. B. `refs/factory/deploy-freeze`) vs.
      Repo-Label vs. Repo-Variable – Kriterien: Persistenz, fail-closed-Lesbarkeit, Auth zum
      Setzen/Löschen aus dem Gate heraus, Sichtbarkeit für den Menschen.
- [ ] **Benachrichtigungs-Kanal:** Kommentar auf einem dedizierten „Deploy-Freeze"-Tracking-Issue,
      GitHub-Notification, o. Ä.
- [ ] **Freigabe-Mechanik:** manueller `workflow_dispatch` vs. Skript vs. Ref-Delete – inkl. Auth,
      wer sie auslösen darf, und Idempotenz.
- [ ] **Genaue Schritt-Zuordnung des Triggers:** welche Gate-Steps exakt als
      „Verifikation/Migration" (setzen Freeze) vs. „Infrastruktur" (setzen keinen) gelten.
- [ ] **Testbarkeit (AC6):** Extraktion der Freeze-Logik (Setzen/Prüfen/Freigeben) in ein
      testbares Skript (z. B. `scripts/…`), damit die Vorfall-Simulation ohne echten Deploy und
      ohne GitHub-API im Unit-Test läuft.
