// Eigenes Modul statt Export aus `AuslageRow.tsx`: die Auslagen-Seite ist ein Server Component,
// und ein Wert aus einem `"use client"`-Modul käme dort nur als Client-Referenz an, nicht als Text.

/**
 * Id der Überschrift über der Auslagen-Liste – Fokus-Ersatzziel, wenn nach dem Löschen die Zeile
 * samt Auslöser verschwindet (spec-372 AK1, Lesson #371).
 */
export const AUSLAGEN_LISTE_ID = "auslagen-liste";
