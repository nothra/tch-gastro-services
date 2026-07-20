## Codify-Report: Task 54

### Neue Regeln hinzugefügt
- `docs/factory/PROJECT-CONTEXT.md` (Bekannte Stolpersteine): „Schreib-Gate darf die Lese-Ansicht
  nicht mitverstecken – vorhandenes `editable`-Flag nutzen" – wegen: Review-Runde-1-Finding an
  `IdentityGate`. Das Gate zeigte vor der Namenswahl nur den Picker statt Liste+Summen (spec-54
  AC B1), obwohl die dahinterliegende `VerzehrErfassung` bereits ein `editable`-Flag für ihren
  Read-only-Modus (aus F5) mitbrachte. Muster: Ein binäres Alles-oder-Nichts-Gate statt der
  vorhandenen Read-only-Fähigkeit der Komponente. Regel verlangt künftig, ein reines Schreib-Gate
  auf ein bestehendes `editable`-Flag abzubilden statt eine eigene Picker/Komponente-Verzweigung
  zu bauen, plus einen Test gegen die tatsächlich sichtbaren Daten vor Gate-Erfüllung.

### Keine Änderungen nötig
- **Review (Runde 2): APPROVED**, keine kritischen/wichtigen Findings offen. Die vier Nitpicks
  (Host-Header-Vertrauen, Namensabgleich über Anzeigename statt `zeile.id`, ungetesteter
  Cross-Tab-`storage`-Event, F5-Randfall „abgeschlossen + 0 Zeilen") sind bewusste
  Design-Entscheidungen bzw. Alt-Scope – keine neue Regel erforderlich, da jeweils Einzelfall
  ohne erkennbares Wiederholungsmuster.
- **Security-Review: PASSED**, keine kritischen/wichtigen Findings. IDOR-Bindung, Status-Gate,
  Token-Entropie, Proxy-Exemption, XSS-Prüfung des QR-SVG und Dependency-Audit sind sauber und
  entsprechen bereits bestehenden Regeln (Codify #51, #63). Das einzige Restrisiko (kein
  Rate-Limit auf der öffentlichen Schreib-Action) ist laut ADR-034 D7 ein bewusster,
  dokumentierter Trade-off und bereits als Backlog-Issue **#182** (`enhancement` + `security`)
  erfasst – kein neuer Issue-Anlage-Bedarf durch Codify.
- Der Duplicate-Code-Fund aus `/refactor` (Zeilen-/Artikel-Mapping zwischen `app/theke/[token]/`
  und F5 dupliziert, extrahiert nach `app/_verzehr/verzehr-props.ts`) ist regulärer
  Red-Green-**Refactor**-Ablauf (TDD-Prinzipien: keine vorzeitige Abstraktion vor dem zweiten
  Vorkommen) – keine neue Guideline nötig.

### Empfehlung für nächste Features
- Bei künftigen Auth-/Namens-/Rollen-Gates vor einer bestehenden Anzeige-Komponente zuerst prüfen,
  ob die Komponente schon ein `editable`/Read-only-Konzept hat, bevor eine neue Gate-spezifische
  UI-Verzweigung entsteht (siehe neue Regel oben).
- Folge-Issues aus dieser Task bereits angelegt und nicht erneut zu duplizieren: **#181**
  (Theke-QR/Link anzeigen & drucken, ausgegründet aus spec-51-Angleichung), **#182**
  (Rate-Limit/Missbrauchsbremse der token-scoped öffentlichen Action, ADR-034 D7).
