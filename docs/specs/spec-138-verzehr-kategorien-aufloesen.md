# Spec: Verzehr erfassen – Kategorie „Sonstige" in Kaffee und Essen auflösen

## Kontext

Auf der Seite **Verzehr erfassen** weist die Zeilen-Zusammenfassung je Teilnehmer aktuell
nur zwei Beträge aus: `Getränke {getraenkeCents} · Sonstige {sonstigeCents}`
(siehe [VerzehrErfassung.tsx:86](../../app/_verzehr/VerzehrErfassung.tsx) und die Split-Logik
in [summen.ts](../../app/_verzehr/summen.ts)). Alles, was nicht `getraenk` ist – also **Essen +
Kaffee** – landet gemeinsam im Topf `sonstigeCents`.

Der Katalog kennt drei Kategorien (`getraenk` / `kaffee` / `essen`, ADR-023 §D4). Die Sammel-
Anzeige „Sonstige" verdeckt die Aufteilung zwischen Kaffee und Essen, die fachlich getrennt
geführt werden. Die Auflösung macht die Zusammenfassung deckungsgleich mit den drei
Erfassungs-Sektionen darunter.

## Scope

**Inbegriffen:**
- `zeileSummen` in `app/_verzehr/summen.ts` liefert drei getrennte Töpfe: `getraenkeCents`,
  `essenCents`, `kaffeeCents` (kein gemeinsamer `sonstigeCents` mehr).
- Die Zeilen-Zusammenfassung in `VerzehrErfassung.tsx` zeigt drei getrennte Beträge in der
  Reihenfolge **Getränke · Essen · Kaffee** (konsistent mit `CATEGORY_ORDER`,
  `VerzehrErfassung.tsx:22`).
- **Alle drei Kategorien werden immer angezeigt**, auch bei 0,00 € (bewusste Design-
  Entscheidung: vorhersehbare, konsistente Zeile – siehe AC-3).
- Unit-Tests (`summen.test.ts`) und Component-Test (`VerzehrErfassung.test.tsx`) angepasst/ergänzt.

**Nicht inbegriffen:**
- Änderung der Auslagen- oder Kassier-/Spenden-Vorgänge.
- Änderung des Verzehr-Gesamt-Betrags (bleibt `Getränke + Essen + Kaffee`).
- Neue Katalog-Kategorien.
- Umgang mit inaktiven Positionen („Nicht mehr im Katalog") – bleibt unverändert; sie zählen
  weiterhin in ihre jeweilige Kategorie ein (ADR-026 D3).

## Akzeptanzkriterien

- [ ] **AC-1 (summen: drei Töpfe):** GIVEN Positionen mit Kategorien `getraenk`, `essen` und
  `kaffee` WHEN `zeileSummen(positionen)` aufgerufen wird THEN liefert das Ergebnis
  `{ getraenkeCents, essenCents, kaffeeCents }` mit je `Σ menge × priceCents` der Kategorie und
  **ohne** ein Feld `sonstigeCents`.
- [ ] **AC-2 (Essen getrennt):** GIVEN nur `essen`-Positionen WHEN `zeileSummen` aufgerufen wird
  THEN ist `essenCents` = `Σ menge × priceCents` und `getraenkeCents` = `kaffeeCents` = 0.
- [ ] **AC-3 (Kaffee getrennt):** GIVEN nur `kaffee`-Positionen WHEN `zeileSummen` aufgerufen wird
  THEN ist `kaffeeCents` = `Σ menge × priceCents` und `getraenkeCents` = `essenCents` = 0.
- [ ] **AC-4 (Anzeige drei Beträge):** GIVEN eine Zeile mit Positionen in mehreren Kategorien
  WHEN die Zusammenfassung gerendert wird THEN zeigt sie **Getränke**, **Essen** und **Kaffee**
  mit je formatiertem Betrag (`formatCents`) in genau dieser Reihenfolge.
- [ ] **AC-5 (0,00 € immer sichtbar):** GIVEN eine Zeile mit ausschließlich `getraenk`-Positionen
  WHEN die Zusammenfassung gerendert wird THEN werden trotzdem **alle drei** Kategorien angezeigt;
  Essen und Kaffee mit `0,00 €`.
- [ ] **AC-6 (Verzehr-Gesamt unverändert):** GIVEN beliebige Positionen THEN gilt weiterhin
  `Verzehr-Gesamt = getraenkeCents + essenCents + kaffeeCents`; keine Änderung an der Kassier-/
  Spenden-Berechnung (keine anderen Konsumenten von `zeileSummen` betroffen).

## Fehlerszenarien

- [ ] GIVEN keine Positionen (`[]`) WHEN `zeileSummen` aufgerufen wird THEN
  `{ getraenkeCents: 0, essenCents: 0, kaffeeCents: 0 }`.
- [ ] GIVEN Positionen mit `menge = 0` WHEN `zeileSummen` aufgerufen wird THEN tragen sie 0 Cent
  zu ihrer Kategorie bei (kein Einfluss auf die Summe).

## Offene Fragen

_Keine – Design-Entscheidungen (0-Betrag-Anzeige, Reihenfolge) sind in dieser Session geklärt._

## Technischer Anhalt

- `app/_verzehr/summen.ts` + `summen.test.ts` – `ZeileSummen`-Typ und Split-Schleife auf drei
  Kategorien umstellen. `else`-Zweig durch explizites Kategorie-Mapping (`essen`/`kaffee`) ersetzen.
- `app/_verzehr/VerzehrErfassung.tsx` (Zeile ~86) – Anzeige auf drei Beträge erweitern.
- `app/_verzehr/VerzehrErfassung.test.tsx` – Component-Test für die drei Beträge.
- **Konsumenten-Check:** vor dem Umbau `grep -rn "sonstigeCents\|zeileSummen" app/ db/ lib/`,
  um sicherzustellen, dass kein weiterer Ort `sonstigeCents` liest (AC-6).
