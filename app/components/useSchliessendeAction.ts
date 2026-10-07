import { useActionState } from "react";

// Gemeinsame Hülle der Dialog-Formulare (ADR-053 D1): schließt den Dialog, sobald die Action
// Erfolg meldet – ohne `useEffect` auf den Rückgabe-State (Lesson
// `react-hooks/set-state-in-effect`, ADR-053 Implementierungs-Hinweise). Ein Hook statt je einer
// Kopie im Konsumenten, damit Erfolgsregel und Signatur nicht auseinanderlaufen. `onLaeuftChange`
// meldet den Lauf an den Dialog, der Escape währenddessen sperrt – `pending` selbst sieht nur der
// Bereich, der den Hook benutzt. Die Action meldet nur das ENDE: ein `setState` an ihrem Anfang
// gehört zur Transition und würde erst mit ihrem Ende sichtbar. Den Start meldet der gelieferte
// `meldeStart` – er gehört als `onSubmit` ans Formular, das dringliche Ereignis davor. Beide
// Hälften stehen so an einer Stelle und sind dort erklärt; `meldeStart` als `onSubmit` zu
// verdrahten bleibt Sache des Konsumenten. Wie `formAction` ans Formular kommt, entscheidet
// ebenfalls der Konsument (`<form action>` oder `startTransition` in `onSubmit`, siehe
// `FormularDialog.tsx`).

type FormAction<State> = (prevState: State | undefined, formData: FormData) => Promise<State>;

export function useSchliessendeAction<State extends { ok?: boolean }>(
  action: FormAction<State>,
  onErfolg: () => void,
  onLaeuftChange?: (laeuft: boolean) => void,
) {
  const [state, formAction, pending] = useActionState(
    async (prevState: State | undefined, formData: FormData) => {
      try {
        const result = await action(prevState, formData);
        if (result.ok) onErfolg();
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
