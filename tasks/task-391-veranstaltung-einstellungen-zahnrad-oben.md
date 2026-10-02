# Task 391: veranstaltung-einstellungen-zahnrad-oben

## Status
- [ ] In Bearbeitung
- [ ] Review bestanden
- [ ] Tests vollständig
- [ ] Security-Review bestanden
- [ ] Refactoring abgeschlossen
- [ ] Codify ausgeführt
- [ ] Fertig / PR erstellt

## Beschreibung
Einstellungen der Veranstaltung vom Seitenende in den Seitenkopf holen: Zahnrad-Symbol öffnet
einen Dialog „Einstellungen" (Katalog, Stammdaten). „Link & QR teilen" und „Veranstaltung löschen"
werden eigene Symbol-Schaltflächen im Seitenkopf (Teilen bzw. Papierkorb). Spec: `docs/specs/spec-391-veranstaltung-einstellungen-zahnrad-oben.md`
(ersetzt spec-369 AK1/AK21/AK22).

## Akzeptanzkriterien
<!-- Von /requirements befüllt oder manuell eingeben -->
- [ ] AK1 Kein Einstellungen-Bereich mehr am Seitenende
- [ ] AK2 Seitenkopf-Aktionszone: Badge, Teilen, Zahnrad, Papierkorb
- [ ] AK3 Symbol-Schaltflächen mit zugänglichem Namen, ≥ 44 px, Papierkorb als Gefahr abgesetzt
- [ ] AK4 Zahnrad öffnet Dialog „Einstellungen"
- [ ] AK5 Datierte Veranstaltung: Katalog, Bearbeiten (ohne Teilen, ohne Löschen)
- [ ] AK6 Stehende Theke: nur Katalog wechseln
- [ ] AK7 Funktionen im Dialog verhalten sich unverändert
- [ ] AK8 Schließen/Escape + Fokusrückgabe aufs Zahnrad
- [ ] AK9 Teilen-Schaltfläche öffnet „Link & QR teilen", QR serverseitig
- [ ] AK10 Link & QR mit einem Tap erreichbar
- [ ] AK11 Papierkorb öffnet Bestätigungsdialog, Fokusrückgabe
- [ ] AK12 Abgelehnte Löschung: Meldung sichtbar, Veranstaltung bleibt
- [ ] AK13 Stehende Theke: kein Papierkorb
- [ ] AK14 Abgeschlossen: weder Teilen, Zahnrad noch Papierkorb
- [ ] AK15 Nur Tokens/Bausteine (ADR-052), Symbole hell/dunkel erkennbar
- [ ] AK16 375 px + langer Titel: Kopf-Aktionen bleiben sichtbar
- [ ] AK17 Anleitung + Screenshots nachgezogen
- [ ] FS1 Kein Zugriff unverändert
- [ ] FS2 Parallel abgeschlossen → Schreibaktion abgelehnt mit Meldung
- [ ] FS3 Fehler beim Speichern → Dialog bleibt offen, Werte bleiben

## Technische Notizen
ADR: `docs/adr/055-detailseite-kopfaktionen-symbol-schaltflaechen.md` (Proposed → beim
Implementieren Accepted setzen).

- Symbole als eigene Inline-SVGs `app/components/ui/icons.tsx` (`currentColor`, `aria-hidden`),
  ggf. Lucide-Pfade mit ISC-Hinweis – keine neue Abhängigkeit (D1).
- Neuer Baustein `app/components/ui/IconButton.tsx`: Pflicht-`label` → `aria-label`/`title`,
  44 × 44 px, `tone` neutral/danger; Basisklassen aus `Button.tsx` exportieren (D2).
- `ZugangDialog` → verallgemeinerter `KopfDialog` (label/icon/title/children), alte Datei + Test
  löschen; zweimal genutzt: Teilen (mit `ZugangTeilen` als Server-children) und Einstellungen
  (`KatalogWechsel` + bei datierter Veranstaltung `VeranstaltungMetaForm`). Dialog bleibt nach
  Speichern offen (D3).
- `VeranstaltungLoeschen` auf `ConfirmDialog` + `IconButton tone="danger"`; Ablehnung im
  Bestätigungsdialog, Action-Zustand je Öffnen erneuern (D4).
- Aktionszone: Badge · Teilen · Einstellungen · Papierkorb; Theke ohne Papierkorb,
  abgeschlossen nur Badge; `PageHeader` unverändert (D5).
- `KatalogWechsel`/`VeranstaltungMetaForm` auf Field/Button/Notice + Tokens; Dateien in
  `eslint/ui-token-files.mjs`, `ZugangDialog.tsx`-Eintrag raus (D6).
- E2E-Helfer `oeffneEinstellungen`/`schliesseEinstellungen`, betroffene Specs, Capture-Spec,
  Screenshots und Anleitung nachziehen; ADR-053 D6 hat bereits den Ablöse-Hinweis.

## Offene Fragen
Q1 vom Nutzer entschieden (Löschen als Papierkorb im Kopf); Q2/Q3 für `/architecture` (Icon-Quelle, Schließen nach Speichern) + Ort der Lösch-Ablehnungsmeldung.

## Review-Findings
<!-- Wird durch /review befüllt -->

## Codify-Notizen
<!-- Wird durch /codify befüllt – Learnings dieser Task -->

---
Branch: `feature/391-veranstaltung-einstellungen-zahnrad-oben`
Erstellt: 2026-10-02 23:07
