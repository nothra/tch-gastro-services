// Pfad der Veranstaltungs-Übersicht (ADR-024) – geteilt von Server Actions und Client: eine
// "use server"-Datei darf nur async Funktionen exportieren, die Konstante steht deshalb hier.
export const VERANSTALTUNG_LISTE_PATH = "/veranstaltung";
