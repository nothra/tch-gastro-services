/** Fügt Klassen-Strings zusammen und überspringt leere Teile (z. B. ein fehlendes `className`). */
export function joinClasses(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
