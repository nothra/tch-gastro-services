# ADR 039: Verzehrerfassung – FokusListe route-neutral, F5 übernimmt das Fokus-Akkordeon

## Status
Accepted

## Date
2026-07-23

## Kontext

[spec-187](../specs/spec-187-verzehrerfassung-vereinheitlichen.md) (#187) vereinheitlicht die
**Darstellung** der Verzehrerfassung über ihre zwei Zugangswege:

- **F7 – Link/Selbstbedienung** (`app/theke/[token]`): `IdentityGate` → **`FokusListe`** –
  Fokus-Akkordeon (genau eine oder keine Karte offen) mit sticky Chip-Leiste (ADR-035 D2/D3).
- **F5 – Veranstalter** (`app/veranstaltung/[id]/verzehr`): rendert **`VerzehrErfassung`** direkt –
  flache Liste, **alle** Karten offen, keine Chip-Leiste (ADR-025 D5).

Seit #183/[ADR-035](035-selbstbedienung-erfasser-ziel-fokus.md) sind die beiden Ansichten optisch
auseinandergelaufen. ADR-035 D2 hatte bewusst **F5 unberührt** gelassen und `FokusListe` als
**F7-spezifische** Client-Komponente unter `app/theke/[token]/` angelegt. #187 kehrt genau diesen
Teil um: **beide Wege sollen identisch aussehen** – die Fokus-/Akkordeon-Darstellung wird der
gemeinsame Nenner.

Aus /requirements sind gesetzt: F5 startet mit **keiner** offenen Karte (kein Identity-Gate, der
ein Ziel vorwählt), bekommt die **identische** Chip-Leiste, und merkt sich den zuletzt gewählten
Teilnehmer **nicht** geräte-lokal. Der `IdentityGate` (Erfasser→Ziel) bleibt **F7-only**.

Rein **präsentations-/client-seitig**: kein Datenmodell, keine Migration, keine neue Dependency,
kein neuer Auth-Pfad. Die Server-Actions (`adjustVerzehrAction`, `adjustVerzehrByTokenAction`),
die Summenlogik und das Positionen-/Katalog-Handling bleiben unverändert.

**Kernproblem:** `FokusListe` hängt heute am **Token** – sie ruft `writeZielId(token, id)`
(geräte-lokale Ziel-Merkung, `erfasser-ziel-storage`) direkt auf. Der F5-Weg hat keinen Token.
Zu klären: (D1) wie `FokusListe` token-/persistenzfrei und route-neutral wird, (D2) wo sie liegt,
(D3) wie F5 sie einbindet, (D4) wo der Empty-State lebt.

## Entscheidung

### D1 · `FokusListe` wird route-neutral und persistenzfrei; Persistenz wird injiziert
`FokusListe` verliert die Props `token` und den direkten `writeZielId`-Aufruf. An deren Stelle
tritt ein **optionaler Callback** `onFokusWechsel?: (zeileId: string) => void`, den die Komponente
aufruft, wann immer eine Karte zur offenen (fokussierten) wird – aus der Chip-Leiste **und** beim
Aufklappen einer eingeklappten Karte (die bestehende `waehleZiel`-Logik). `initialOpenId` bleibt
als Prop erhalten.

- **F7 (editierbar):** `IdentityGate` reicht `initialOpenId={zielId}` und
  `onFokusWechsel={(id) => writeZielId(token, id)}` herein – die geräte-lokale Ziel-Merkung
  (ADR-035 D1) bleibt Wort für Wort erhalten, wandert aber in den **Konsumenten**.
- **F7 (read-only) & F5:** kein Callback → keine Persistenz.

So kennt `FokusListe` weder Token noch localStorage-Schema noch die Erfasser/Ziel-Semantik – sie
ist reine Präsentations- + Akkordeon-Zustandslogik. Das ist exakt die Grenze aus **ADR-025 D5**
(„keine Auth-/Session-/Token-Annahme im Inneren; erhält Daten und die Action als Prop") und die
Wiederverwendungslinie aus **ADR-035 D2** (eine Quelle für Kopf/Summen/Erfassung, kein Duplikat).

`erfasser-ziel-storage.ts` und `IdentityGate` **bleiben** unter `app/theke/[token]/` – sie sind
F7-Identitäts-spezifisch und route-gebunden.

### D2 · `FokusListe` wandert nach `app/_verzehr/` – Name bleibt
Die Datei zieht von `app/theke/[token]/FokusListe.tsx` nach `app/_verzehr/FokusListe.tsx` (samt
Test `FokusListe.test.tsx`). Der Name **`FokusListe`** bleibt – er ist in Specs/ADR-035/Kommentaren
etabliert und im Ordner `_verzehr/` unmissverständlich; ein Rename brächte nur Churn ohne
semantischen Gewinn. Import-Richtung bleibt regelkonform: F7 (`app/theke`) → `app/_verzehr`
(Codify #52), jetzt zusätzlich F5 → `app/_verzehr`.

Der geteilte Test-Helfer `raf-stub.ts` (Layout-Timing, #194) zieht mit nach `app/_verzehr/`, weil
die rAF-Logik dort ihren Ursprung hat; `IdentityGate.test.tsx` (bleibt in `theke/`) importiert ihn
dann aus `@/app/_verzehr/raf-stub` (kein Duplikat, Codify #194).

### D3 · F5-Seite rendert `FokusListe` direkt (Startzustand: keine Karte offen)
`app/veranstaltung/[id]/verzehr/page.tsx` ersetzt `<VerzehrErfassung … />` durch
`<FokusListe … initialOpenId={null} />` **ohne** `onFokusWechsel` (keine Persistenz, Nutzer-
Entscheidung). `editable` bleibt an `status === "offen"` gebunden. Header, „← Zur Veranstaltung"-
Link und RBAC-Guard bleiben unverändert. Damit erscheint F5 mit sticky Chip-Leiste, alle Karten
eingeklappt – identisch zur F7-Fokusliste.

### D4 · Read-only konsistent + Empty-State beim Konsumenten
- **Read-only:** Eine abgeschlossene Veranstaltung nutzt auf beiden Wegen dieselbe `FokusListe` mit
  `editable={false}`, `initialOpenId={null}` (ADR-035 D5) – Akkordeon eingeklappt, `MengeControl`
  disabled, Chip-Leiste zum Ansehen nutzbar. F5 wechselt damit von „flach, alles offen" auf das
  konsistente Akkordeon.
- **Empty-State:** `FokusListe` setzt **≥1 Zeile** voraus (wie es `IdentityGate` heute schon
  garantiert). Der leere Fall bleibt beim **Konsumenten**, weil die Meldung wegabhängig ist
  (F5: „Noch keine Teilnehmer erfasst – zuerst Teilnehmer hinzufügen."; F7: „…bitte an den
  Veranstalter wenden."). Die F5-Seite bekommt daher einen expliziten Empty-Guard mit der
  bisherigen F5-Wortlaut-Meldung; F7 behält seinen Guard im `IdentityGate`.

`VerzehrErfassung` **bleibt bestehen**: der `IdentityGate` nutzt es weiterhin als nicht-editierbare
Liste, die **während** der Erfasser-/Ziel-Fragen sichtbar bleibt (spec-54 AC B). Nur der F5-Weg
hört auf, es zu verwenden.

## Alternativen

### Entkopplung der Persistenz
- **A (gewählt): injizierter Callback `onFokusWechsel`.** Pro: `FokusListe` bleibt frei von
  Token/localStorage/Identitäts-Semantik (SRP, ADR-025 D5); F7 behält die exakte Ziel-Merkung im
  route-gebundenen Konsumenten; F5 gibt schlicht nichts mit. Con: eine Prop mehr.
- **B: generischer `persistKey`-Prop, `FokusListe` liest/schreibt localStorage selbst.** Pro: ein
  Aufruf weniger beim Konsumenten. Con: zieht das Storage-Schema **und** die „welche Karte offen"-
  Ableitung zurück in die geteilte Komponente; F7s Startkarte ist aber das **Ziel** aus dem
  Erfasser/Ziel-Flow (reicher als „zuletzt offen") – das würde F7-Identitäts-Semantik in den
  route-neutralen Baustein lecken. Widerspricht ADR-025 D5. → abgelehnt.
- **C: `FokusListe` in `theke/` lassen, F5 importiert von dort.** Pro: kein Move. Con: F5 (Feature
  `veranstaltung`) importierte aus Feature `app/theke/` – verletzt die Route-Neutralitäts-/
  Import-Regel (Codify #52, ADR-025 D5). → abgelehnt.

### Ort des Empty-States
- **A (gewählt): beim Konsumenten** (F5-Seite + `IdentityGate`). Pro: wegabhängige Meldung bleibt
  möglich; `FokusListe` behält eine klare Vorbedingung (≥1 Zeile). Con: F5 braucht einen kleinen
  Guard (eine Zeile Text – wie vorher in `VerzehrErfassung`).
- **B: Empty-State in `FokusListe`** (hardcodierte Meldung oder `leerHinweis`-Prop). Pro: ein Ort.
  Con: entweder falsche (einheitliche) Meldung für beide Wege, oder eine weitere Prop für einen
  String – mehr Fläche ohne Gewinn. → abgelehnt.

## Begründung

Die Entscheidung zieht die etablierte Linie konsequent weiter: **maximale Wiederverwendung bei
minimaler neuer Fläche** (ADR-034/035) und **route-neutrale Präsentation ohne Auth-/Token-Wissen**
(ADR-025 D5). `FokusListe` wird damit das, was `ZeileKarte` schon ist – ein geteilter,
präsentationaler Baustein –, nur eine Ebene höher (Akkordeon statt Einzelkarte). Alle Änderungen
liegen in der Client-/Präsentationsschicht und sind reversibel (architecture-principles: reversible
Entscheidungen schnell treffen). Kein Datenmodell, keine Migration, kein Auth-Pfad – additiv.

## Konsequenzen

**Positiv:**
- F5 und F7 zeigen dieselbe Fokus-/Akkordeon-Darstellung; eine Quelle (`FokusListe` + `ZeileKarte`),
  kein Duplikat.
- `FokusListe` ist jetzt vollständig route-neutral (kein Token, kein localStorage) und damit für
  beide Wege und künftige Konsumenten wiederverwendbar.
- Read-only „geschenkt" über denselben Pfad (`editable={false}`, `initialOpenId={null}`).
- F7-Verhalten (Gate, Ziel-Merkung, Alt-Schlüssel-Adoption) bleibt fachlich unverändert – nur der
  Persistenz-Aufruf wandert in den Konsumenten.

**Zu beachten / Trade-offs:**
- **Ändert [ADR-035](035-selbstbedienung-erfasser-ziel-fokus.md) D2** („F5 bleibt unberührt";
  `FokusListe` F7-spezifisch): F5 nutzt nun dieselbe `FokusListe`, die nach `app/_verzehr/` wandert.
  Der Rest von ADR-035 (Identity-Gate, Persistenz-Schema, Chip-Leiste, Read-only, Legacy-Adoption)
  bleibt gültig. Siehe Drift-Hinweis dort.
- F5-Read-only wechselt von „flach, alle offen" auf „Akkordeon, eingeklappt" – bewusste,
  konsistente Verhaltensänderung (spec-187).
- `import`-Pfad-Anpassung in `IdentityGate` (`./FokusListe` → `@/app/_verzehr/FokusListe`) und im
  geteilten Test-Stub-Import.
- **`docs/routes.md`:** keine Routen-/Zugriffsänderung; nur die Funktionsbeschreibung der F5-Route
  ggf. präzisieren (Darstellung). Der Drift-Check prüft Struktur, nicht Text – trotzdem im PR mitpflegen.

## Implementierungs-Hinweise
Siehe **Technische Notizen** in
[`tasks/task-187-verzehrerfassung-vereinheitlichen.md`](../../tasks/task-187-verzehrerfassung-vereinheitlichen.md)
(betroffene Dateien, TDD-Reihenfolge, Testfälle). Keine Migration, keine neue Dependency, keine
neue Route.
