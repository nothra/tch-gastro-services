import { useActionState } from "react";
import { meldeErfolg } from "@/app/components/ui/meldung";

// Gemeinsame Hülle der Formulare mit Server Action (ADR-053 D1, ADR-058 D2): reagiert auf den
// Erfolg der Action – Dialog schließen (`onErfolg`) und Erfolgsrückmeldung als Toast
// (`erfolgsMeldung`) – ohne `useEffect` auf den Rückgabe-State (Lesson
// `react-hooks/set-state-in-effect`, ADR-053 Implementierungs-Hinweise). Ein Hook statt je einer
// Kopie im Konsumenten, damit Erfolgsregel und Signatur nicht auseinanderlaufen; auch Inline-
// Formulare ohne Dialog nutzen ihn, damit es genau einen Weg zur Rückmeldung gibt. Der Text
// entsteht hier beim Konsumenten, nicht auf dem Server: nur er kennt Auslöser und Objekt.
//
// `onLaeuftChange` meldet den Lauf an den Dialog, der Escape währenddessen sperrt – `pending`
// selbst sieht nur der Bereich, der den Hook benutzt. Die Action meldet nur das ENDE: ein
// `setState` an ihrem Anfang gehört zur Transition und würde erst mit ihrem Ende sichtbar. Den
// Start meldet der gelieferte `meldeStart` – er gehört als `onSubmit` ans Formular, das
// dringliche Ereignis davor. Beide Hälften stehen so an einer Stelle und sind dort erklärt;
// `meldeStart` als `onSubmit` zu verdrahten bleibt Sache des Konsumenten. Wie `formAction` ans
// Formular kommt, entscheidet ebenfalls der Konsument (`<form action>` oder `startTransition` in
// `onSubmit`, siehe `FormularDialog.tsx`).

export type FormAction<State> = (
  prevState: State | undefined,
  formData: FormData,
) => Promise<State>;

export interface AktionsOptionen<State> {
  /** Läuft nach einem Erfolg, z. B. um den Dialog zu schließen. */
  onErfolg?: () => void;
  onLaeuftChange?: (laeuft: boolean) => void;
  /** Toast-Text nach dem Glossar; als Funktion, wenn er Werte aus dem Ergebnis braucht. */
  erfolgsMeldung?: string | ((ergebnis: State) => string);
}

export function useSchliessendeAction<State extends { ok?: boolean }>(
  action: FormAction<State>,
  { onErfolg, onLaeuftChange, erfolgsMeldung }: AktionsOptionen<State> = {},
) {
  const [state, formAction, pending] = useActionState(
    async (prevState: State | undefined, formData: FormData) => {
      try {
        const result = await action(prevState, formData);
        if (result.ok) {
          onErfolg?.();
          // Im Wrapper nach dem `await`, nicht in einem Effekt auf den State: so meldet jeder
          // Erfolg genau einmal, auch unter dem StrictMode-Doppelaufruf.
          if (erfolgsMeldung) {
            meldeErfolg(
              typeof erfolgsMeldung === "string" ? erfolgsMeldung : erfolgsMeldung(result),
            );
          }
        }
        return result;
      } finally {
        onLaeuftChange?.(false);
      }
    },
    undefined,
  );

  const meldeStart = () => onLaeuftChange?.(true);
  return [state, formAction, pending, meldeStart] as const;
}
