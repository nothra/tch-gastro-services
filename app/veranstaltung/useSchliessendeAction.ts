import { useActionState } from "react";

// Gemeinsame Hülle der Dialog-Formulare dieses Bereichs (ADR-053 D1): schließt den Dialog, sobald
// die Action Erfolg meldet – ohne `useEffect` auf den Rückgabe-State (Lesson
// `react-hooks/set-state-in-effect`, ADR-053 Implementierungs-Hinweise). Ein Hook statt je einer
// Kopie im Konsumenten, damit Erfolgsregel und Signatur nicht auseinanderlaufen.

type FormAction<State> = (prevState: State | undefined, formData: FormData) => Promise<State>;

export function useSchliessendeAction<State extends { ok?: boolean }>(
  action: FormAction<State>,
  onErfolg: () => void,
) {
  return useActionState(async (prevState: State | undefined, formData: FormData) => {
    const result = await action(prevState, formData);
    if (result.ok) onErfolg();
    return result;
  }, undefined);
}
