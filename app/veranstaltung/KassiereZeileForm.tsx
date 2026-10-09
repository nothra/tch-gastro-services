"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Field } from "@/app/components/ui/Field";
import { Notice } from "@/app/components/ui/Notice";
import { useSchliessendeAction } from "@/app/components/useSchliessendeAction";
import { EURO_INPUT_RE, formatCents, parseEuroToCents } from "@/lib/money";
import type { VeranstaltungFormState } from "./actions";
import { spendeCents } from "./kassierSummen";

// Erfassungs-Formular des bar kassierten Betrags (`Erhalten`) einer Teilnehmerzeile (F8, #55,
// ADR-033 D6). Client-Komponente, damit Fehler/Pending über useActionState sichtbar werden
// (Codify #49 – kein useEffect). `action` ist die bereits scope-gebundene Server-Action
// (`kassiereZeileAction.bind(null, veranstaltungId)`); der Client liefert die veranstaltungId nie
// im Formular (IDOR-Schutz sitzt serverseitig). Kein Feld-Reset: `Erhalten` ist ein persistenter
// Zeilenwert (Korrektur in-place).
//
// Die Spende erscheint schon beim Tippen (spec-371 AK8) – aus derselben Formel wie serverseitig
// (`spendeCents`, ADR-055 D1). Sie ist nur Vorschau: gespeichert wird `Erhalten`, abgelehnt wird
// eine unlesbare Eingabe allein vom Server (FS3).

type BoundKassiereAction = (
  prevState: VeranstaltungFormState | undefined,
  formData: FormData,
) => Promise<VeranstaltungFormState>;

export function KassiereZeileForm({
  action,
  zeileId,
  initialErhalten,
  verzehrGesamtCents,
  autoFocusErhalten = false,
}: {
  action: BoundKassiereAction;
  zeileId: string;
  initialErhalten: string;
  verzehrGesamtCents: number;
  autoFocusErhalten?: boolean;
}) {
  // Betrag und Spende meldet ein Toast (spec-372 AK12/AK17); der Inhalt bleibt der aus spec-371.
  const [state, formAction, pending] = useSchliessendeAction(action, {
    erfolgsMeldung: (ergebnis) => erfolgsMeldung(ergebnis, verzehrGesamtCents),
  });
  const [eingabe, setEingabe] = useState(initialErhalten);
  const spendeVorschau = spendeCents(verzehrGesamtCents, lesbarerBetragCents(eingabe));

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="zeileId" value={zeileId} />
      <div className="flex flex-wrap items-end gap-2">
        <Field
          label="Erhalten (EUR)"
          name="erhalten"
          type="text"
          inputMode="decimal"
          value={eingabe}
          onChange={(event) => setEingabe(event.target.value)}
          // Tastaturfokus nur, wenn die Seite personenbezogen auf GENAU diese Zeile aufgerufen
          // wurde (#308 AK3): der Betrag ist ohne weiteren Tap eingebbar. Ohne Personenbezug bleibt
          // der Fokus, wo er ist – sonst zöge ihn jede der vielen Zeilen an sich.
          autoFocus={autoFocusErhalten}
          placeholder="0,00"
          className="w-32"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern …" : "Kassieren"}
        </Button>
      </div>
      <p className="text-sm text-muted">
        Spende:{" "}
        <span data-testid="spende-live" className="tabular-nums">
          {formatCents(spendeVorschau)}
        </span>
      </p>
      <Notice kind="fehler">{state?.error}</Notice>
    </form>
  );
}

// Derselbe Parser wie an der Zod-Grenze (`lib/money`); was er nicht liest, zählt als 0 Spende
// (spec-371 AK9) – ohne Fehler, die Ablehnung bleibt Sache des Servers.
function lesbarerBetragCents(eingabe: string): number | null {
  const betrag = eingabe.trim();
  return EURO_INPUT_RE.test(betrag) ? parseEuroToCents(betrag) : null;
}

// Die Spende der Meldung rechnet der Client aus dem gespeicherten Betrag der Action und dem
// bekannten Verzehr-Gesamt – keine Zusatzabfrage in der Action (ADR-055 D2).
function erfolgsMeldung(state: VeranstaltungFormState, verzehrGesamtCents: number): string {
  if (state.erhaltenCents == null) return "Betrag entfernt";
  const erhalten = `${formatCents(state.erhaltenCents)} erhalten`;
  const spende = spendeCents(verzehrGesamtCents, state.erhaltenCents);
  return spende > 0 ? `${erhalten}, davon ${formatCents(spende)} Spende` : erhalten;
}
