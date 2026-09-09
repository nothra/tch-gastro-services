## Codify-Report: Task 297

### Neue Regeln hinzugefügt

- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) – Rezidiv der #172-Regel
  (Diskriminierungs-Kontrolle in der Gegenrichtung): `isThekePath` hatte in Review-Runde 2 keinen
  Negativtest mit einem **ähnlichen, aber falschen** Pfad (`/thekenwart`), nur einen thematisch
  entfernten (`/veranstaltung`) – eine Präfix-Verbreiterung wäre unentdeckt geblieben, obwohl sie
  das Auth-Gate für zusätzliche Pfade außer Kraft gesetzt hätte. Index-Zeile in
  `PROJECT-CONTEXT.md` ergänzt.
- [`docs/factory/lessons/testing.md`](../docs/factory/lessons/testing.md) – Modulweit geteilter
  Rate-Limiter-Singleton in Tests war reihenfolgeabhängig: drei `describe`-Blöcke testeten gegen
  dasselbe produktive Modul-Objekt und stellten die Fake-Uhr nur relativ vor. Erst
  `--sequence.shuffle` mit gepinntem Seed deckte einen roten Test auf (Review-Runde 3); Fix in
  `/test` (`resetModules` + absolutes Einfrieren pro Test). Index-Zeile ergänzt.
- [`docs/factory/lessons/next-auth.md`](../docs/factory/lessons/next-auth.md) – Ein früher
  Gate-/Drossel-Zweig vor einer Route, die auch Server Actions bedient, muss deren
  Antwortprotokoll einhalten: die generische 429-HTML-Antwort war für `useActionState`-POSTs
  außerhalb des erwarteten Protokolls und riss mangels `error.tsx` die ganze Seite in den globalen
  Client-Error-Screen (Security-Review-Finding W1, Issue #331). Index-Zeile ergänzt.

### Keine Änderungen nötig

- Der kritische Runde-1-Fund (Discriminator = HTTP-Methode statt Server-Action-Marker) und der
  Runde-2-Fund (spec-297-Drift nach Rework) sind bereits durch bestehende Lessons abgedeckt
  (Server-Action-Marker-Musterwahl ist projektspezifisch am Code gelöst, kein neues generisches
  Learning; Doku-Drift nach Rework ist bereits als Regel unter `factory-workflow.md` → „PR ändert
  eine von einer ADR/Spec beschriebene Mechanik" erfasst, #211/#176/#253).
- ADR-048-Konsequenzen-Nachpflege (Budget-Verdopplung durch zweites Budget) ist ebenfalls bereits
  durch die bestehende #211-Regel gedeckt.
- Security-Review-Finding W2 (ADR-Doku-Nachpflege im selben PR) ist derselbe #211-Mechanismus,
  keine neue Regel nötig.
- Kein neuer Check in `scripts/checks/` – beide neuen Testing-Learnings sind Testschreib-Disziplin,
  kein automatisierbares Gate (Shuffle-Seed-Läufe sind bereits als Nachweis-Methode dokumentiert,
  nicht als CI-Pflichtlauf – das wäre ein neuer CI-Job und über die Schwelle hinaus, die dieser
  Task abdeckt).
- Kein neues Issue/Kleinfund nötig – Issue #331 (Server-Action-Protokoll-Verletzung) wurde bereits
  im Security-Review-Schritt über den Seam angelegt.

### Empfehlung für nächste Features

- Bei jedem neuen Pfad-Präfix-Prädikat, das über Auth-Gate-Bypass entscheidet: sofort einen
  Negativtest mit einem Nachbar-Pfad einplanen, nicht erst im Review nachliefern.
- Bei jedem neuen schlüssellosen, modulweiten Rate-Limiter: von Anfang an `resetModules` +
  absolutes Zeit-Einfrieren pro Testfall nutzen (Muster jetzt in `testing.md` dokumentiert), statt
  erst durch einen Shuffle-Lauf im Review/Test darauf zu stoßen.
- Bei jedem neuen Gate/Zweig vor einer Route mit Server-Action-Verkehr: das Antwortprotokoll der
  Client-Runtime von Anfang an mitdenken, nicht erst im Security-Review.

Branch: `feature/297-rate-limit-theke-leseroute`
