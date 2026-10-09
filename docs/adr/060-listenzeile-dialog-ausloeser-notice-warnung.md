# ADR 060: ListenZeile als Dialog-Auslöser (Button-Variante) und Notice-Art „warnung"

## Status

Accepted

> Nachtrag zu **ADR-059** D1 (API von `ListenZeile`) und **ADR-052** D1 (`Notice`). Alle übrigen
> Regeln aus ADR-052/059 (route-neutral, Token-Farben, Slot statt Menü-Prop, Abblendung D3)
> gelten unverändert.

## Datum

2026-10-09

## Kontext

[spec-405](../specs/spec-405-teilnehmer-verwaltung-artikel-muster.md) (#405) stellt die
Teilnehmer-Verwaltung auf `ListenZeile` um. Zwei Dinge passen nicht zur heutigen API:

1. **Die Teilnehmerzeile führt nirgends hin, sie öffnet einen Dialog** („Teilnehmer bearbeiten",
   Muster `CatalogRow`). `ListenZeile` rendert den Tipp-Ziel-Bereich aber immer als `next/link`,
   `href` ist Pflicht (ADR-059 D1). Der Dialog braucht außerdem einen Fokus-Rücksprung auf den
   Auslöser (`useFormularDialog`: `ausloeserRef`, `id` als Ersatz-Fokusziel, Lesson #371/#373)
   und muss als Geschwister der Zeile gerendert werden können.
2. **Die Duplikat-Warnung** beim Anlegen ist ein rohes `<p className="text-warning">`
   (`DuplikatWarnung.tsx`). `Notice` kennt nur `erfolg` und `fehler`.

## Entscheidung

### D1 · ListenZeile: Tipp-Ziel ist Link **oder** Button (diskriminierte Props)

`ListenZeile` bekommt zwei Betriebsarten, getrennt über die Props (TypeScript-Union, nicht über
ein Flag):

| | Link (bisher) | Auslöser (neu) |
|---|---|---|
| Pflicht | `href` | `onOeffnen` |
| Tipp-Ziel | `next/link` | `<button type="button">` |
| weitere Props | `prefetch?` | `id?`, `ausloeserRef?` (auf den Button), `aria-haspopup="dialog"` fix |

Gemeinsam bleiben `titel`, `untertitel`, `zustand`, `pfeil`, `aktion`, `className`. Layout,
Karten-Optik, Verblassen/Badge (D3 aus ADR-059), Fokusring und 44-px-Fläche sind **ein** Markup:
der Inhalt des Tipp-Ziels wird intern einmal gebaut, nur das umschließende Element wechselt.
Kein Doppel-Markup, kein zweiter Baustein.

Neuer Slot **`anhang?: ReactNode`**: wird als Geschwister nach dem Tipp-Ziel im `<li>` gerendert
(ohne Wrapper, ohne Einfluss auf den Pfeil). Hier hängt der Konsument seinen `Dialog` ein – wie
`CatalogRow`, wo der `<Dialog>` ebenfalls im `<li>` steht. `aktion` bleibt die Zeilenaktion
(ersetzt den Pfeil), `anhang` ist unsichtbarer Begleitinhalt; beide Slots nicht vermischen.

`Link`-Betrieb: Verhalten unverändert (`ZeileRow`, `VeranstaltungListe`, `OffeneVeranstaltungen`,
Kacheln). `ListenZeile` bleibt ohne `"use client"`; im Auslöser-Betrieb wird sie aus einer
Client Component importiert und läuft dort mit (Funktion `onOeffnen` kann nicht aus einer Server
Component fließen) – Konsumenten im Link-Betrieb bleiben Server Components.

### D2 · Notice: Art `warnung`

`NoticeKind` wird `"erfolg" | "fehler" | "warnung"`. `NOTICE_STYLES.warnung`:
`role: "status"` (nicht unterbrechend, wie die heutige Duplikat-Warnung), Zeichen `⚠`
(Zeichen statt reiner Farbe), Klassen `border-warning bg-warning-subtle text-warning`. Die Token
existieren; Kontrast `warning` auf `surface`/`warning-subtle` ist in `tokens.test.ts` bereits
abgesichert. `Toaster` nutzt weiter nur `NOTICE_STYLES.erfolg` – unberührt. `DuplikatWarnung`
(Verwaltung **und** „Teilnehmer anlegen" der Veranstaltung, spec-404 AK4.3) rendert die Warnung
über `Notice`; das versteckte `confirmDuplicate`-Feld bleibt.

### D3 · Dialog-Inhalt der Teilnehmerzeile

`TeilnehmerRow` übernimmt das Gerüst von `CatalogRow`: `useFormularDialog(zeilenId)`,
`Dialog title="Teilnehmer bearbeiten"`, zwei Formulare (Speichern / Aktiv-Umschalten, damit
„Deaktivieren" keine ungespeicherten Felder mitsendet), `useDialogFormular`, `DialogAktionen`.
Die Zeilen-`id` ist stabil (`teilnehmer-<id>`) als Ersatz-Fokusziel, weil der Gruppenwechsel
(Aktiv ⇄ Deaktiviert) die Zeile neu mountet. Landet die Zeile dabei in einem **zugeklappten**
Aufklapper („Deaktiviert" startet zu), ist sie im Browser nicht fokussierbar; `useErsatzFokus`
lenkt den Fokus dann auf das `<summary>` dieses Aufklappers („Deaktiviert (n)") statt ihn auf
`<body>` fallen zu lassen (spec-405 AK3.5). Die Aufteilung in Aktiv/Deaktiviert macht die
Server-Page mit `Aufklapper` (ADR-059 D2, `ueberschrift` + `aria-labelledby` wie
`VeranstaltungListe`).

## Alternativen

### D1 – Option A: Eigener Baustein `ListenZeileButton`
**Vorteile:** keine Union-API.
**Nachteile:** Karten-Optik, Verblassen und Badge doppelt – genau die Drift, die #403 beenden
sollte; jede Optik-Änderung an zwei Stellen.

### D1 – Option B: `ListenZeile` mit `href` **optional** und stillem Fallback auf `<button>`
**Vorteile:** kleinste Änderung.
**Nachteile:** `href` vergessen wird zum stillen Button (kein Typfehler); beide Fälle nicht
unterscheidbar.

### D1 – Option C: Diskriminierte Union `href` | `onOeffnen` (gewählt)
**Vorteile:** ein Markup, Typsystem erzwingt genau eine Betriebsart, Link-Konsumenten
unverändert.
**Nachteile:** Props-Typ etwas komplexer; Auslöser-Betrieb macht die Datei client-seitig
eingebunden.

### D2 – Option A: Warnung weiter als rohes `<p>`, nur Farbe tokenisieren
**Nachteile:** dritte Meldungs-Optik neben `Notice`; AK4 des Issues fordert `Notice`.

### D2 – Option B: Neue Art `warnung` am `Notice` (gewählt)
Eine Meldungs-Sprache (Zeichen + Farbe + Rolle) für alle Rückmeldungen.

## Begründung

Der Baustein soll Optik an einem Ort halten (ADR-059); eine zweite Komponente oder ein stiller
Fallback würden das aufweichen. Die Union ist die kleinste Form, die den Auslöser-Fall
typsicher macht. `anhang` ist nötig, damit der Dialog – wie bei Artikeln – im `<li>` neben dem
Tipp-Ziel steht, ohne den Pfeil-/Aktions-Mechanismus zu stören.

## Konsequenzen

**Positiv:**
- Teilnehmer, später Auslagen und weitere Dialog-Listen nutzen dieselbe Karten-Zeile.
- Alle Rückmeldungen (Fehler, Erfolg, Warnung) laufen über `Notice`.

**Negativ / Trade-offs:**
- `ListenZeile` hat zwei Betriebsarten; Tests decken beide ab (Link wie bisher, Button neu:
  `onOeffnen`, `ausloeserRef`, `id`, kein Link-Element, Badge/Verblassen gleich).
- `focus-within`/Hover am `<li>` greift auch bei offenem nicht portaliertem Dialog (wie in
  ADR-059 D1 für `ConfirmDialog` beschrieben; gewollt).

## Bezug zu anderen ADRs

- **ADR-059 D1/D2/D3:** Erweiterung der API; Abblendung und Aufklapper unverändert.
- **ADR-052 D1/D3:** Bausteinort und Farb-Gate (`app/verwaltung/teilnehmer/` wird Verzeichnis-Eintrag).
- **ADR-022:** Duplikat-Warnung bleibt überstimmbar, nur ihre Darstellung ändert sich.
