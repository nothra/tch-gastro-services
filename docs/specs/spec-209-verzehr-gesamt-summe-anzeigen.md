# Spec: Verzehr-Erfassen – Gesamt-Summe je Teilnehmer anzeigen

## Kontext

Auf der Verzehr-Erfassen-Seite zeigt der Karten-Kopf je Teilnehmer bislang nur die drei
Kategorie-Summen an (`Getränke X · Essen Y · Kaffee Z`). Die **Gesamt-Summe des Verzehrs** –
die zentrale fachliche Kennzahl je Teilnehmer – fehlt und muss vom Nutzer im Kopf addiert
werden.

Fachliche Regel (`docs/factory/PROJECT-CONTEXT.md`):

```
Verzehr-Gesamt = Summe Getränke (Theke) + Summe Essen + Summe Kaffee
```

Die Karte (`ZeileKarte` in `app/_verzehr/VerzehrErfassung.tsx`) ist route-neutral und wird von
**beiden** Erfassungswegen genutzt: der Veranstalter-Seite (`/veranstaltung/[id]/verzehr`) und
der Selbstbedienung (`/theke/[token]` über `IdentityGate`). Eine Änderung im Karten-Kopf wirkt
damit auf beide, ohne Zusatzarbeit.

## Scope

**Inbegriffen:**
- `gesamtCents` als abgeleitete Summe in der DB-freien Summen-Logik `app/_verzehr/summen.ts`
  (TDD, statt Ad-hoc-Addition in der UI).
- Anzeige der Gesamt-Summe im Karten-Kopf (`ZeileKarte`), **optisch hervorgehoben** an die
  bestehende Kategorie-Zeile angehängt (`… · Kaffee Z,ZZ € · Gesamt G,GG €`), formatiert via
  `formatCents`.
- Wirkt automatisch in editierbarer Erfassung **und** Lesesicht (abgeschlossene Veranstaltung)
  sowie auf der Selbstbedienungs-Seite (dieselbe Komponente).

**Nicht inbegriffen:**
- Keine Änderung an der Summen-Berechnung selbst (Kategorie-Summen bleiben unverändert).
- Keine veranstaltungs- oder kassenübergreifende Gesamtsumme (das ist Backlog #57).
- Kein Umbau der Kopf-Hierarchie (Gesamt wird nicht zur Primär-Zahl; Kategorie-Aufschlüsselung
  bleibt gleichwertig sichtbar).
- Keine Änderung an Auslagen/Kassieren.

## Akzeptanzkriterien

- [ ] GIVEN eine Verzehr-Zeile mit Positionen in mehreren Kategorien WHEN der Karten-Kopf
  gerendert wird THEN erscheint neben den Kategorie-Summen eine optisch hervorgehobene
  Gesamt-Summe.
- [ ] GIVEN Positionen mit Cent-Beträgen WHEN `gesamtCents` berechnet wird THEN gilt
  `gesamtCents = getraenkeCents + essenCents + kaffeeCents` (exakt in Cent, ADR-021, keine
  Rundung).
- [ ] GIVEN eine Zeile mit **0 Positionen** WHEN der Kopf gerendert wird THEN zeigt die
  Gesamt-Summe `0,00 €`.
- [ ] GIVEN eine Zeile mit Positionen aus **nur einer** Kategorie WHEN der Kopf gerendert wird
  THEN entspricht die Gesamt-Summe genau dieser Kategorie-Summe.
- [ ] GIVEN eine Zeile mit Positionen aus **allen drei** Kategorien WHEN der Kopf gerendert wird
  THEN ist die Gesamt-Summe die Summe der drei Kategorie-Summen.
- [ ] GIVEN eine **abgeschlossene** Veranstaltung (Lesesicht, `editable=false`) WHEN der Kopf
  gerendert wird THEN erscheint die Gesamt-Summe ebenso wie in der editierbaren Erfassung.

## Fehlerszenarien

- [ ] Der bestehende Exhaustiveness-Guard in `zeileSummen` (unbekannte Kategorie) bleibt
  wirksam; `gesamtCents` wird nur aus den drei bekannten Kategorie-Summen gebildet und führt
  keinen neuen Fehlerpfad ein.

## Offene Fragen

- [x] Darstellung im Kopf → **hervorgehoben an die Kategorie-Zeile angehängt** (mit dem
  Entwickler geklärt, 2026-07-23).
