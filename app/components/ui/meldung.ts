import { toast } from "react-hot-toast";

// Route-neutraler Baustein (ADR-058 D1): der einzige Weg, eine Erfolgsrückmeldung als Toast
// auszugeben. Neben `Toaster.tsx` die einzige Datei, die `react-hot-toast` kennt – ein Austausch
// der Bibliothek bleibt so auf zwei Dateien begrenzt, und Tests mocken dieses Modul statt der
// Bibliothek. Ein `meldeFehler` gibt es bewusst nicht: Fehler bleiben `Notice kind="fehler"` am
// Ort der Aktion (spec-372 AK16).

/** Zeigt eine Erfolgsmeldung nach dem Glossar („Gespeichert", „Auslage gelöscht"). */
export function meldeErfolg(text: string): void {
  toast.success(text);
}
