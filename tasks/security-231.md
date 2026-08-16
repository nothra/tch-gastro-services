# Security Review: Task 231

## Kritische Findings (Blocker)
- (keine)

## Wichtige Findings
- (keine)

## Hinweise
- [x] [Dependency Security] `pnpm audit` meldet 2 High-Findings für `brace-expansion`
      (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895) über den Pfad
      `eslint-config-next > … > minimatch@3.1.5 > brace-expansion@1.1.18`. Verifiziert als
      **False Positive der Audit-Anzeige, nicht als echtes Risiko**:
      - `pnpm why brace-expansion` bestätigt: aufgelöste Version ist `1.1.18`.
      - Volle GHSA-Advisory-Daten (per `curl` gegen die GitHub-Advisory-API abgefragt, da
        beide CVEs mehrere parallel gepflegte Major-Linien von `brace-expansion` betreffen)
        zeigen: für die `1.x`-Linie ist GHSA-rgw5-rvv9-x895 ab `1.1.18` gepatcht und
        GHSA-mh99-v99m-4gvg bereits ab `1.1.17` – `1.1.18` erfüllt beide Patch-Grenzen.
        `pnpm audit` zeigt in der Terminal-Ausgabe nur die `4.0.0–5.0.8/5.0.9`-Range-Gruppe
        (die „latest"-Major-Linie des Pakets), nicht die zutreffende `1.x`-Gruppe – daher der
        irreführende Eindruck einer offenen Schwachstelle.
      - Der bestehende `pnpm-workspace.yaml`-Override
        (`"brace-expansion@<1.1.18": "^1.1.18"` /
        `"brace-expansion@>=2.0.0 <2.1.4": "^2.1.4"`, aus #291) wurde bereits gezielt für
        genau diese beiden CVEs gesetzt (siehe Kommentar dort) – **unverändert** in diesem
        Diff (`git diff origin/main...HEAD -- pnpm-workspace.yaml` ist leer), und die
        aufgelöste Version im Lockfile-Diff dieses Tasks bleibt ebenfalls unverändert
        (`brace-expansion` taucht im `pnpm-lock.yaml`-Diff dieses Tasks nicht auf).
      - Kein Bezug zu den acht in diesem Task gebumpten Paketen (`react`, `react-dom`,
        `prettier`, `tailwindcss`, `@tailwindcss/postcss`, `tsx`, `@vitejs/plugin-react`,
        `@playwright/test`) – der Pfad läuft ausschließlich über `eslint-config-next`, das
        in diesem Task bewusst unverändert bleibt (AK-2).
      - Kein Issue/Sammeldatei-Eintrag nötig: kein herstellbarer Auslöser, da der Zustand
        bereits gepatcht ist – reine Dokumentation der Verifikation.

## Ergebnis
PASSED
