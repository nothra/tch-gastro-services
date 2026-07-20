// Geräte-lokale Persistenz der Selbstbedienungs-Identität (F7, #183, ADR-035 D1/D4/D6).
// Gemerkt werden je Token zwei ZEILEN-IDs: der Erfasser (wer bedient) und der Ziel-Teilnehmer
// (für wen gebucht wird). IDs statt Namen, weil sie stabil/eindeutig sind (robust gegen
// gleichnamige/umbenannte Teilnehmer); der Anzeigename wird zur Laufzeit aus `zeilen` aufgelöst.
//
// Alles ausschließlich clientseitig (localStorage) – nichts wird server-seitig gespeichert, die
// Erfassung bleibt anonym (spec-52/ADR-034 D4). Jeder Speicherzugriff ist fail-open (try/catch):
// ist localStorage nicht verfügbar (privater Modus), funktioniert der Ablauf weiter, es wird nur
// bei jedem Laden erneut gefragt (kein Absturz).

const ERFASSER_PREFIX = "tch:sb:erfasser:";
const ZIEL_PREFIX = "tch:sb:ziel:";
// Alt-Schlüssel aus #54 (enthält einen NAMEN, keine ID) – einmalig als Erfasser adoptiert (D6).
const LEGACY_NAME_PREFIX = "tch:sb:name:";

// Eigenes Event, um denselben Tab nach setItem/removeItem neu zu rendern: das native
// `storage`-Event feuert nur in ANDEREN Tabs, nicht im schreibenden Dokument.
export const IDENTITAET_CHANGED_EVENT = "tch:sb:identitaet-changed";

export type IdentitaetZeile = { id: string; anzeigename: string };

const erfasserKey = (token: string) => `${ERFASSER_PREFIX}${token}`;
const zielKey = (token: string) => `${ZIEL_PREFIX}${token}`;
const legacyKey = (token: string) => `${LEGACY_NAME_PREFIX}${token}`;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // fail-open: ohne Speicher wird beim nächsten Laden erneut gefragt.
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // fail-open: siehe safeSet.
  }
}

function dispatchChange(): void {
  try {
    window.dispatchEvent(new Event(IDENTITAET_CHANGED_EVENT));
  } catch {
    // fail-open: kein window/Event (z. B. SSR) – die Snapshots lesen ohnehin bei jedem Render.
  }
}

// Löst eine gemerkte ID gegen die aktuelle Teilnehmerliste auf. Ist nichts gemerkt oder zeigt die
// ID nicht (mehr) auf eine aktuelle Zeile (Stale-Fallback, D4), kommt `null` zurück – der Aufrufer
// stellt dann die betreffende Frage erneut. PURE (kein Schreibzugriff), damit als Snapshot in
// useSyncExternalStore nutzbar (kein set-state-in-effect, Codify #49).
function readValidId(key: string, zeilen: readonly IdentitaetZeile[]): string | null {
  const stored = safeGet(key);
  if (stored === null) return null;
  return zeilen.some((zeile) => zeile.id === stored) ? stored : null;
}

export function readErfasserId(token: string, zeilen: readonly IdentitaetZeile[]): string | null {
  return readValidId(erfasserKey(token), zeilen);
}

export function readZielId(token: string, zeilen: readonly IdentitaetZeile[]): string | null {
  return readValidId(zielKey(token), zeilen);
}

export function writeErfasserId(token: string, id: string): void {
  safeSet(erfasserKey(token), id);
  dispatchChange();
}

export function writeZielId(token: string, id: string): void {
  safeSet(zielKey(token), id);
  dispatchChange();
}

// „Erfasser wechseln": beide Werte verwerfen, damit der geführte Zweischritt (Erfasser → Ziel)
// erneut durchlaufen wird.
export function clearIdentitaet(token: string): void {
  safeRemove(erfasserKey(token));
  safeRemove(zielKey(token));
  dispatchChange();
}

// Einmalige Adoption des #54-Alt-Schlüssels (D6): fehlt der Erfasser, aber ein gemerkter NAME
// existiert, wird er auf eine aktuelle Zeile gemappt und deren ID als Erfasser übernommen; der
// Alt-Schlüssel wird danach in jedem Fall entfernt (Match → adoptiert, kein Match → verworfen).
// Idempotent: ist bereits ein Erfasser gesetzt, passiert nichts.
export function adoptLegacyErfasser(token: string, zeilen: readonly IdentitaetZeile[]): void {
  if (safeGet(erfasserKey(token)) !== null) return;

  const name = safeGet(legacyKey(token));
  if (name === null) return;

  const treffer = zeilen.find((zeile) => zeile.anzeigename === name);
  if (treffer) safeSet(erfasserKey(token), treffer.id);
  safeRemove(legacyKey(token));
  dispatchChange();
}
