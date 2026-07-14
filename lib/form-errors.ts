// Zentraler Seam für die Fehlerextraktion an der Zod-Formulargrenze (#105): Server
// Actions übersetzen ein fehlgeschlagenes safeParse in genau eine Nutzermeldung. Der
// Parametertyp ist bewusst strukturell minimal (nur `issues[].message`) statt an
// `ZodError` gebunden – so bleibt der Helfer ohne Zod-Aufbau testbar und deckt jede
// safeParse-Fehlerform ab.
export function firstIssueMessage(error: {
  issues: { message: string }[];
}): string {
  return error.issues[0]?.message ?? "Ungültige Eingabe.";
}
