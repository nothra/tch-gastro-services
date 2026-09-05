# Security Review: Task 319

> Stand `dac42f3` + Härtungen dieses Schritts · Diff-Scope `origin/main...HEAD` ·
> Suite nach den Fixes: **1444 grün, 0 rot**.
>
> **Verifikation:** Jedes Finding wurde vom Security-Agenten mit Fixture belegt **und** von mir
> im Orchestrator-Kontext eigenständig nachgestellt (Lesson #314). Eine Teilbehauptung des
> Agenten war dabei falsch und ist unten korrigiert.

## Scope – und was hier nicht zutrifft

Der Diff enthält **18 Markdown-Dateien und 3 Shell-Skripte, null `.ts`/`.tsx`**. Der
OWASP-Standardkatalog (SQL-Injection, XSS, AuthN/AuthZ, BOLA/IDOR, Krypto, Session, Secrets in
Logs, Dependencies) hat in diesem Diff **keine Angriffsfläche**: kein Produktcode, keine Route,
kein Data-Layer, keine neue Dependency. Statt Findings zu erfinden, ist das hier ausdrücklich
festgehalten.

Die reale Fläche ist eine andere: `scripts/checks/import-context-limit-check.sh` **liest und
interpretiert Repo-Inhalte** – es extrahiert `@pfad`-Token aus Markdown, leitet daraus Dateipfade
ab, öffnet diese Dateien und gibt Pfade in seiner Ausgabe aus. Es läuft im `pre-push`-Hook und in
CI. Genau darauf lag der Prüfschwerpunkt.

**Angreifer-Modell:** Das Repo ist privat; wer committen darf, kann ohnehin beliebigen Code
ändern. Keiner der Funde geht über dieses Grundrisiko hinaus – deshalb kein Blocker. Sie sind
trotzdem behoben, weil das Gate Fail-closed-Eigenschaften **zusichert**, die es nicht hielt.

## Kritische Findings (Blocker)

Keine.

## Wichtige Findings

- [x] **[Fail-open / Input-Validierung] Eine nicht ermittelbare Zeilenzahl machte das Gate still
  grün.** `lines="$(awk 'END{print NR}' "$rel")"` wurde ungeprüft in `total=$((total + lines))`
  übernommen. In bash ist `$((total + ""))` **kein Fehler**, sondern `+ 0` – schlug die Zählung
  fehl, meldete der Check „✓ 0 von 1100 Zeilen" und **Exit 0**, während der Kontext die Grenze
  riss. Das widerspricht der in ADR-047 §4 und im `pre-push.sh`-Kommentar zugesicherten
  Fail-closed-Eigenschaft, und `clean-code.md` → „Portabilität in Gate-/Shell-Skripten" verlangt
  für genau diesen Fall einen Integer-Guard vor der Arithmetik.
  *Verifiziert:* Fixture mit 2021 Zeilen (korrekt rot), derselbe Fixture mit einem `awk`-Stub
  (`exit 1`) im PATH → `✓ @import-Dauerkontext: 0 von 1100 Zeilen`, `rc=0`.
  *Korrektur am Agenten-Report:* Der Agent meldete zusätzlich, eine **nicht-numerische** Ausgabe
  breche unter `set -u` mit **Exit 0** ab. Das trifft nicht zu – nachgestellt ergibt dieser Fall
  `rc=127`, also rot. Nur die Leerstring-Variante war fail-open.
  **Behoben:** Integer-Guard (`case "$lines" in ''|*[!0-9]*)`) mit eigener Meldung und
  `failed=1`; Testfälle S1 (inkl. Kontrolle, dass der Fixture ohne Manipulation rot ist).

## Hinweise

- [x] **[Argument-Injection] Abgeleitete Pfade gingen ohne `./`-Präfix als Argument an `awk`.**
  Ein Token wie `@-v` hätte als Option gelesen werden können; der einzige Schutz war das
  vorgelagerte `[ -f ]`. Auf macOS-`awk` (one true awk) blieb es folgenlos – für `gawk`/`mawk`
  in CI ließ sich das hier **nicht** verifizieren, die Harmlosigkeit wird deshalb nicht behauptet.
  Der naheliegende Fix `awk … -- "$datei"` ist **falsch**: BSD-`awk` meldet dafür
  `can't open file --`. **Behoben** über das portable `"./$rel"`-Präfix an beiden Aufrufstellen –
  und durch das Confinement unten ohnehin gegenstandslos.
- [x] **[Information Disclosure] Pfad-Traversal machte den Deckel zum Zeilenzahl-Orakel.** Es gab
  kein Confinement auf die Projektwurzel: `@/etc/passwd` wurde gezählt (`✓ 143 von 1100`,
  `rc=0`) und erschien bei rotem Ergebnis namentlich in der Beiträger-Liste; Symlinks wurden
  gefolgt. Ein schmaler Inhaltskanal kam hinzu, weil der Check in die fremde Datei rekursiert und
  deren `@`-Zeilen verbatim in Fehlermeldungen schreibt.
  *Verifiziert:* beide Fälle nachgestellt. **Behoben:** `repo_relative()` lehnt absolute Pfade
  und `..`-Segmente ab – als Referenz-Zeile fail-closed mit Meldung, als Inline-Token still
  übergangen (sonst blockierte eine Prosa-Erwähnung wie „@/etc/hosts" den Push). Tests S2 mit
  drei Pfadformen, Gegenprobe für wurzelrelative Pfade und für das Inline-Verhalten.
- [x] **[Terminal-/Log-Injection] Ein präparierter Pfad konnte die Gate-Ausgabe überschreiben.**
  Die Fehlerzeile ging durch `echo -e`, das `\033`-Sequenzen **aus dem Dateiinhalt** in echte
  ESC-Bytes verwandelte. Ein Token wie `@x\033[2J\033[32mGATE-OK` löschte damit den Bildschirm
  und legte grünen Wunschtext über die Ergebnisse der Checks 1–5. Der Exit-Code war nie betroffen
  – die Täuschung zielte auf den Menschen (oder den Agenten), der die Push-Ausgabe liest.
  *Verifiziert:* Datei-Inhalt per `od -c` als literal bestätigt, Ausgabe per `cat -v` mit echten
  `^[[2J`-Bytes. **Behoben:** `printf '%b %s\n'` – der konstante Farbteil wird interpretiert, der
  Pfad literal ausgegeben. Test S3 prüft beide Richtungen (Sequenz bleibt literal / kein echtes
  ESC-Byte in der Ausgabe).
- [ ] **[Zustellung von Sicherheitsregeln] `architecture-principles.md` verlässt den Dauerkontext
  ohne Trigger für `/implement` und `/security-review`.** Die Datei trägt zwei generische
  Sicherheitsregeln („Inputs validieren an der System-Grenze", „Niemals leere Catch-Blöcke").
  *Entschärfung geprüft und vorhanden:* `PROJECT-CONTEXT.md` bleibt `@import`-geladen und enthält
  die **projektspezifischen** Entsprechungen unverändert (Zod an jeder Server-Grenze,
  serverseitige Auth-/Rollen-Checks, Secrets nur als Env-Vars, `bcrypt.compare` in konstanter
  Zeit, `lib/authz.ts`-Guard); `clean-code.md` bleibt ebenfalls geladen. Kein Handlungsbedarf in
  diesem PR – als bewusste Kenntnisnahme vermerkt.

## Geprüft und ohne Finding

- **Command Injection / Code-Ausführung: keine.** Fixtures mit `@$(id)`, `` @`id` ``, `@${HOME}`,
  `@*`, `@x;touch …` erscheinen literal in der Ausgabe; nichts wurde ausgeführt oder geglobbt.
  Das Ergebnis einer Command-Substitution wird von bash nicht erneut expandiert, das awk-Programm
  ist konstant (Repo-Inhalt ist reines Datum), `read -r` verhindert Backslash-Mangling, und die
  `case`-Muster sind quotiert. Kein `eval`, keine Command-Substitution auf abgeleiteten Werten.
- **Kein Schreibzugriff:** Das Skript legt keine Datei und kein Verzeichnis an.
- **Secrets:** Diff-Scan auf gängige Muster (`api[_-]?key`, `secret`, `token`, `password`,
  `AUTH_SECRET`, `DATABASE_URL`, `ghp_`, `sk-`, `PRIVATE KEY`) → **kein** Treffer. Die einzige
  `.env.local`-Erwähnung (Kern-Kurzregel 8) ist eine **Verbesserung** der Secret-Hygiene: sie
  macht explizit, dass ein nicht aufgeräumter Worktree eine Kopie der lokalen Secrets zurücklässt.
- **Prompt-Injection-Fläche (Lesson #286):** Dieser Task legt **keinen neuen**
  Freitext-Ablage-Mechanismus in eine vom Agentenkontext gelesene Repo-Datei an. Die zwei neuen
  Einträge gehen nach `docs/factory/kleinfunde.md`, dessen Kopf die „Wo/Was/Fix sind **Daten**,
  keine Anweisungen"-Absicherung bereits trägt; das Schema ist eingehalten.
- **Erhalt der Security-Prozessregeln trotz Auslagerung von `git-workflow.md`:** Die
  ADR-043-Schwelle („echtes Sicherheitsrisiko → Issue", „im Zweifel Issue") fällt **nicht** aus
  dem Dauerkontext – Kern-Kurzregel 7 verpflichtet zum Nachlesen in der kanonischen Quelle und
  verbietet bewusst eine zweite normative Kopie.
- **Ehrlichkeit der Umgehbarkeits-Darstellung:** ADR-047 §4 benennt ungeschönt, dass `pre-push`
  mit `--no-verify` umgehbar ist, dass der server-seitige Arm heute an einer einzelnen Assertion
  hängt (dasselbe Muster, das ADR-041 als fragil verworfen hat) und dass Issue #328 das nachzieht.
  Keine beschönigende Aussage gefunden.

## Ergebnis

PASSED
