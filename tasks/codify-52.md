# Codify-Report: Task 52

## Neue Regeln hinzugefügt

- **[docs/factory/PROJECT-CONTEXT.md] Route-neutrale Module: keine Feature-Imports beim Implementieren prüfen**
  – wegen: Review-Finding 2 (`app/_verzehr/` importierte aus `app/verwaltung/katalog/CatalogFields`).
  ADR-025 D5 beschrieb die Isolation schriftlich, aber kein aktives Check-Kriterium beim Coden.
  Neue Regel: Jedes `app/_<name>/`-Modul explizit mit `grep -r 'from "@/app/[^_]' app/_<name>/`
  auf Feature-Imports prüfen, bevor das Review landet.

## Keine weiteren Regeländerungen nötig

**Security Hinweis TOCTOU (Status-Check → Schreiben):** Niedrig eingestuft (nur vertrauenswürdige
Rolle `veranstalter`, kein Eskalationsrisiko). Das Muster ist situationsabhängig und nicht
generell regelbar; ggf. per ADR-025-Nachnotiz festhalten, wenn F8 (Kassieren/Abschluss) den
Statuswechsel-Pfad schärfer sichern muss.

**Folge-Issue #135 (soft-gelöschter Artikel in Summen):** Kein neuer Codify-Eintrag – das
Muster (Soft-Delete-Aggregation) ist inhaltlich bereits durch Codify #51 abgedeckt. Das
konkrete Folge-Verhalten (unsichtbare, nicht-korrigierbare Summe) ist als Issue #135 angelegt.

## Positives – was exemplarisch gut lief

- Alle vorausgegangenen Codify-Regeln (#49, #50, #51, #105, #116) wurden korrekt und
  vollständig angewendet – kein Rückfall in bekannte Muster.
- Atomarer Delta-Upsert (`GREATEST(0, …)` + DB-CHECK) und fail-closed Action-Reihenfolge
  (ADR-025 D6) ohne Review-Kritik umgesetzt.
- Guard-Clause-Branches vollständig getestet; IDOR-Bindung und Soft-Delete-Prüfung
  von Security-Review als unauffällig bestätigt.

## Empfehlung für nächste Features

Bei Features mit route-neutralen `app/_<name>/`-Modulen (z. B. F7/#54 öffentliche Theke)
den neuen Grep-Check als ersten Schritt nach dem Draft-Implement ausführen – bevor
Tests und Review starten.
