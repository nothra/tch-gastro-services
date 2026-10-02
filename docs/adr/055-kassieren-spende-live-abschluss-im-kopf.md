# ADR 055: Kassieren – Spende live aus einer geteilten Formel, Rückmeldung aus der Action, Abschluss im Kopf der Detailseite

## Status

Accepted

> **Ersetzt ADR-053 D6 teilweise:** Der Abschnitt „`StatusToggle` … an das Ende der
> Kassieren-Seite" gilt nicht mehr – Abschließen/Wieder öffnen wandert in den Seitenkopf der
> Detailseite (D3). Der Rest von ADR-053 D6 (Seitenstruktur, Einstellungen als `<details>`,
> Abschlussbericht in eigener Datei) bleibt. **Erweitert ADR-033 D5** (Single Source) um eine
> clientseitig nutzbare Spenden-Funktion (D1). ADR-033 D3 (fail-closed Abschluss-Gate) und die
> Protokollierung bleiben unverändert.

## Datum

2026-10-02

## Kontext

[spec-371](../specs/spec-371-kassieren-summe-abschluss.md) (#371, UX-4) baut die Kassieren-Seite
um. Drei technische Fragen sind offen:

1. **Spende live (AK8/AK9).** Die Spende `max(0, erhalten − verzehrGesamt)` steht heute nur in
   `kassierZeile` (`kassierSummen.ts`, ADR-033 D1/D5) und wird serverseitig nach dem Speichern
   angezeigt. Vor dem Absenden muss sie im Browser aus dem getippten Betrag erscheinen – ohne dass
   eine zweite, lautlos divergierende Formel entsteht.
2. **Rückmeldung mit Betrag und Spende (AK12).** `kassiereZeileAction` meldet nur
   `{ ok: true }`. Die Meldung braucht den gespeicherten Betrag und die Spende.
3. **Abschluss im Kopf der Detailseite (AK17–AK23).** Die Detailseite ist eine Server Component
   (ADR-053 D6); der Abschluss braucht einen Client-Dialog (`ConfirmDialog`, ADR-053 D1) mit
   Server-Action-Zustand, und der Dialog soll bei offenen Zeilen Anzahl und Betrag nennen.

Rein **Präsentations-/Client-Schicht** plus eine kleine Erweiterung der Action-Antwort: kein
Datenmodell, keine Migration, keine neue Abhängigkeit, keine Änderung am Abschluss-Gate oder am
Protokoll.

## Entscheidung

### D1 · Die Spenden-Formel wird als reine Funktion aus `kassierSummen.ts` exportiert

- `kassierSummen.ts` exportiert `spendeCents(verzehrGesamtCents, erhaltenCents | null)`;
  `kassierZeile` ruft sie auf, statt die Formel inline zu halten. Das Modul ist DB- und DOM-frei
  (ADR-033 D5) und deshalb aus Client Components importierbar.
- `kassierTagessummen` führt zusätzlich `offenerBetragCents`
  (Σ `verzehrGesamt − (erhalten ?? 0)` über Zeilen mit `bezahlt === false`; bezahlte Zeilen
  tragen 0 bei, eine Überzahlung mindert ihn nicht). Das löst #305 ab (spec-371 AK4).
- Der Client liest den getippten Betrag mit `EURO_INPUT_RE` / `parseEuroToCents` aus
  `lib/money` – derselbe Parser wie die Zod-Grenze. Unlesbar oder leer ergibt 0 Spende (AK9);
  abgelehnt wird weiterhin nur serverseitig.
- Die Live-Anzeige ist **Hinweis, nicht Wahrheit**: gespeichert wird `Erhalten`, die Spende bleibt
  abgeleitet (ADR-033 D1).

### D2 · `kassiereZeileAction` meldet den gespeicherten Betrag zurück

- `VeranstaltungFormState` bekommt ein optionales Feld `erhaltenCents?: number | null`; die Action
  liefert den soeben gespeicherten Wert (`parsed.data.erhalten`) – `null`, wenn die Eingabe
  geleert wurde („Kassieren zurückgenommen").
- Die Spende der Meldung rechnet der Client mit `spendeCents` aus dem bekannten Verzehr-Gesamt der
  Zeile (Prop des Formulars). Es gibt **keine zusätzliche DB-Abfrage** in der Action. Ändert sich
  der Verzehr zwischen Rendern und Absenden (anderes Gerät), kann die Meldung kurz vom
  revalidierten Seitenstand abweichen; dieser ist maßgeblich und erscheint nach dem
  `revalidatePath` ohnehin.
- Die Meldung ist ein `Notice` (#368) statt „Gespeichert."; Fehler erscheinen als `Notice` im
  Fehler-Ton.

### D3 · Abschließen/Wieder öffnen: eine Client-Komponente im `PageHeader`-Slot der Detailseite

- Neue Client Component `AbschlussAktion` in `app/veranstaltung/[id]/` ersetzt `StatusToggle`
  (Datei und Test werden **gelöscht**, nicht liegengelassen). Sie rendert den Auslöser und einen
  `ConfirmDialog` mit `setStatusAction` – die Action bleibt unverändert (Gate ADR-033 D3,
  Protokoll, Theke-Ablehnung).
- Die Detailseite übergibt `offeneZeilen` und `offenerBetragCents` als Props. Sie stammen aus
  `kassierTagessummen` (D1), nicht aus einer Nachrechnung in der Page. Der Hinweis im Dialog ist
  informativ; die Entscheidung trifft der Server (spec-371 FS1).
- Den Action-Zustand erneuert die Komponente je Öffnen per `key` (Konsumenten-Pflicht aus
  ADR-053 D1), damit eine alte Ablehnung nicht im neu geöffneten Dialog steht.
- Die stehende Theke (`typ = theke`) bekommt den Auslöser nicht (spec-371 AK23); die Action lehnt
  sie weiterhin serverseitig ab.
- Die abgeschlossene Variante der Detailseite lädt weiterhin keine Positionen (ADR-053 D4): „Wieder
  öffnen" braucht keinen Offen-Hinweis.
- Der `PageHeader`-`action`-Slot trägt Badge **und** Auslöser in einer umbrechenden Gruppe (AK24).
  Keine Änderung am `PageHeader`-Baustein.

### D4 · „Abrechnung im Detail" ist ein natives `<details>`, kein neuer Baustein

Tagessummen, Gesamtabrechnung und Protokoll liegen in einem standardmäßig geschlossenen
`<details>` – dieselbe Mechanik wie „Einstellungen" (ADR-053 D6). Ein gemeinsamer
`Disclosure`-Baustein wäre erst bei einem dritten Verbraucher gerechtfertigt (YAGNI).

## Alternativen

### D1 — Spenden-Formel im Client

- **A: Geteilte reine Funktion (gewählt).** + Eine Formel für Server, Gate und Live-Anzeige,
  trivial unit-testbar. − `kassierSummen.ts` wird zur Client-Abhängigkeit (bleibt aber DOM-/DB-frei).
- **B: Formel im Client nachbauen.** + Keine Kopplung. − Zweite Wahrheit, die lautlos
  divergieren kann (ADR-033 D5 verbietet genau das).
- **C: Live-Wert per Server-Roundtrip rechnen.** + Streng eine Formel. − Netzwerk bei jedem
  Tastendruck, an der Theke mit schwachem Netz unbrauchbar.

### D2 — Rückmeldung

- **A: Action liefert den gespeicherten Betrag, Client rechnet die Spende (gewählt).**
  + Keine Zusatzabfrage, Spende aus der geteilten Funktion. − Meldung kann bei gleichzeitigem
  Verzehrwechsel kurz vom Seitenstand abweichen.
- **B: Action liest Zeile und Positionen erneut und liefert die fertige Spende.**
  + Streng autoritativ. − Zwei zusätzliche Abfragen pro Kassiervorgang unter `neon-http` (serielle
  Roundtrips) für eine Meldung, die der revalidierte Seitenstand ohnehin korrigiert.
- **C: Client leitet alles aus seinem eigenen Eingabewert ab, Action unverändert.**
  + Kleinster Eingriff. − Zeigte auch dann „gespeichert", wenn der Server einen anderen Wert
  normalisiert hätte (z. B. Komma/Punkt, Trimmen); keine Bestätigung des gespeicherten Werts.

### D3 — Abschluss-Auslöser

- **A: Eigene Client-Komponente im Kopf (gewählt, Entscheidung des Auftraggebers).**
  + Sofort sichtbar, ein Ort für beide Richtungen. − Der Auslöser steht vor dem Kassieren;
  abgefedert durch Bestätigung und Offen-Hinweis.
- **B: Ende der Kassieren-Seite (ADR-053 D6).** + Natürliche Reihenfolge. − Wieder öffnen ist auf
  der Detailseite nicht auffindbar; wegen der Doppelung zwei Orte.
- **C: Im Bereich „Einstellungen".** + Schwer versehentlich auszulösen. − Schlecht auffindbar.

## Begründung

Der leitende Grundsatz ist eine Wahrheit je Regel: Die Spenden-Formel und der offene Betrag
bleiben in `kassierSummen.ts`, damit Anzeige, Live-Vorschau und Abschluss-Hinweis nicht
auseinanderlaufen (ADR-033 D5). Der Server bleibt Autorität über Speichern und Abschluss; Live-
Anzeige und Dialog-Hinweis sind nur Vorschau. Der Abschluss-Auslöser folgt der Entscheidung des
Auftraggebers und nutzt die vorhandenen Bausteine (`ConfirmDialog`, `Notice`, `PageHeader`) ohne
neue Abstraktion.

## Konsequenzen

**Positiv:**
- #305 ist abgelöst; eine Formel für Anzeige, Live-Vorschau und Gate.
- „Wieder öffnen" ist auf der Detailseite wieder auffindbar; Abschließen verlangt Bestätigung.
- Keine Migration, keine neue Abhängigkeit, keine Routen-Änderung (`docs/routes.md` unberührt).

**Negativ / Trade-offs:**
- `kassierSummen.ts` wird von einer Client Component importiert (muss DB-/DOM-frei bleiben).
- Die Rückmeldung kann bei gleichzeitigem Verzehrwechsel kurz abweichen (D2).
- Der Abschluss-Auslöser steht oben auf der Detailseite; die Reihenfolge „erst kassieren, dann
  abschließen" erzwingt nur das Gate (ADR-033 D3), nicht das Layout.

## Hinweise für die Umsetzung

- **TDD-Reihenfolge:** `spendeCents`/`offenerBetragCents` zuerst (reine Unit-Tests: leer, nur
  bezahlt, nur offen, gemischt inkl. Teilzahlung und Überzahlung) → Action-Antwort →
  `KassiereZeileForm` (Live-Spende, Notice, unlesbare Eingabe) → `AbschlussAktion` → Seiten.
- `StatusToggle.tsx` und `StatusToggle.test.tsx` löschen; danach per Grep alle Doku-Treffer
  (ADR-053 D6 trägt diesen ADR im Status-Hinweis, spec-369 AK24–AK26) prüfen – ein Modul-Move
  ist erst mit dem Löschen der alten Datei fertig.
- Die eingefrorene Reihenfolge (`KassierZeilenListe`, #253) bleibt unangetastet; die
  Summenkarte liegt **außerhalb** der Liste und rendert aus dem Server-Stand.
- Neue UI nur mit Token-Klassen (ADR-052); betroffene Pfade in `eslint/ui-token-files.mjs`
  eintragen. Zeile und Summenkarte auf `Card`/`Badge`/`Notice` umstellen.
- Der Dialog muss `pending` setzen (Escape und Schaltflächen gesperrt, ADR-053 D1), damit eine
  Server-Ablehnung nicht ungesehen bleibt.
