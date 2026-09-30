import { useActionState } from "react";

// Gemeinsame Hülle der Dialog-Formulare dieses Bereichs (ADR-053 D1): schließt den Dialog, sobald
// die Action Erfolg meldet – ohne `useEffect` auf den Rückgabe-State (Lesson
// `react-hooks/set-state-in-effect`, ADR-053 Implementierungs-Hinweise). Ein Hook statt je einer
// Kopie im Konsumenten, damit Erfolgsregel und Signatur nicht auseinanderlaufen. `onLaeuftChange`
// meldet den Lauf an den Dialog, der Escape währenddessen sperrt – `pending` selbst sieht nur der
// Bereich, der den Hook benutzt. Hier wird nur das ENDE gemeldet: ein `setState` am Anfang der
// Action gehört zur Transition und würde erst mit ihrem Ende sichtbar. Den Start meldet der
// Bereich deshalb aus dem `onSubmit` des Formulars, dem dringlichen Ereignis davor.

type FormAction<State> = (prevState: State | undefined, formData: FormData) => Promise<State>;

export function useSchliessendeAction<State extends { ok?: boolean }>(
  action: FormAction<State>,
  onErfolg: () => void,
  onLaeuftChange?: (laeuft: boolean) => void,
) {
  return useActionState(async (prevState: State | undefined, formData: FormData) => {
    try {
      const result = await action(prevState, formData);
      if (result.ok) onErfolg();
      return result;
    } finally {
      onLaeuftChange?.(false);
    }
  }, undefined);
}
