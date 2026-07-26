# Security Review: Task 228

## Kritische Findings (Blocker)

_Keine._

## Wichtige Findings

_Keine._

## Hinweise
- [ ] [Dependencies] Die npm-Advisory-Bulk-API meldete für die **alten** Versionen
      (`next-auth@5.0.0-beta.31` / `@auth/core@0.41.2`) tatsächlich **vier** offene Advisories,
      nicht nur die zwei in `docs/specs/spec-228-next-auth-verwundbarkeiten-beheben.md`
      genannten: zusätzlich `GHSA-xmf8-cvqr-rfgj` (high, `getToken()` wirft eine ungefangene
      Exception bei fehlgeformten Bearer-Authorization-Headern) und `GHSA-x445-f3h2-j279`
      (moderate, OAuth-State/Nonce/PKCE-Cookies sind nicht an den erzeugenden Provider
      gebunden). Beide sind mit dem in diesem PR durchgeführten Bump auf `5.0.0-beta.32` /
      `@auth/core@0.41.3` ebenfalls behoben (Nachweis unten) – kein zusätzlicher Scope nötig,
      nur ein Hinweis, dass der Bump mehr abdeckt als die Spec ursprünglich dokumentierte.
      Kein eigenes Issue nötig, da bereits durch diesen PR vollständig behoben.

## Verifikation (Nachweis für den erreichbaren `pnpm audit`-Endpoint)

`pnpm audit` scheitert in dieser Sandbox weiterhin mit `ERR_PNPM_AUDIT_BAD_RESPONSE`
(pnpms HTTP-Client dekomprimiert die gzip-Antwort der Registry nicht korrekt – der Server
liefert den Advisory-Bulk-Response ohne `Content-Encoding`-Header, obwohl der Body gzip-
komprimiert ist). Als Ersatznachweis wurde der zugrunde liegende Registry-Endpoint direkt
abgefragt und manuell dekomprimiert:

```bash
curl -s -X POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk \
  -H "Content-Type: application/json" \
  -d '{"next-auth":["5.0.0-beta.31"],"@auth/core":["0.41.2"]}' -o /tmp/audit_old.bin
gunzip -c /tmp/audit_old.bin   # → 4 Advisories (siehe oben)

curl -s -X POST https://registry.npmjs.org/-/npm/v1/security/advisories/bulk \
  -H "Content-Type: application/json" \
  -d '{"next-auth":["5.0.0-beta.32"],"@auth/core":["0.41.3"]}'
# → {}  (unkomprimierte Antwort, 0 Advisories)
```

Ergebnis: **0 offene Advisories** für die im PR gepinnten Zielversionen. Das ist ein
stärkerer Nachweis als das in der Spec vorgesehene Lockfile-Ersatzkriterium und erfüllt das
zugehörige Akzeptanzkriterium vollständig.

## Prüfkatalog

- **Input-Validierung & Injection:** N/A – kein neuer Produktionscode, keine neuen
  Eingabepfade.
- **Authentifizierung & Autorisierung:** Kernstück dieses PRs. `auth.config.ts` unverändert;
  der Fail-open-Fix (GHSA-8fpg-xm3f-6cx3) wirkt library-intern (next-auth liefert bei
  Provider-Fehler jetzt `null` statt Error-Objekt), wurde bereits in `/review` unabhängig
  gegen die installierten Pakete verifiziert. Keine hartkodierten Credentials im Diff
  gefunden (`git diff` auf Passwort-/Secret-/Token-Muster durchsucht – leer). Keine
  `.env*`-Datei im Diff.
- **Daten & Kryptographie:** Keine Änderung. Kein `Math.random()` im Diff.
- **Dependencies:** Ziel-Versionen (`next-auth@5.0.0-beta.32`, `@auth/core@0.41.3`) gegen
  die npm-Advisory-Datenbank direkt geprüft (siehe oben) – 0 Findings. Kein unnötiger neuer
  Dependency-Eintrag; `@auth/core` bleibt korrekt transitiv.
- **Error Handling:** Keine Änderung an Fehlerausgaben/Stack-Traces.

## Ergebnis
PASSED
