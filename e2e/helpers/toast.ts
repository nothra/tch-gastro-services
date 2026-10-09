import type { Locator, Page } from "@playwright/test";

// Erfolgsmeldungen erscheinen app-weit als Toast aus dem Root-Layout (spec-372 AK12, ADR-058),
// nicht mehr am Formular – ein Locator innerhalb einer Zeile oder eines Dialogs findet sie nicht.
// Ein String wird exakt verglichen: `hasText` mit String wäre ein Teilstring-Treffer (Lesson #388).
export function toast(page: Page, text: string | RegExp): Locator {
  const muster = typeof text === "string" ? new RegExp(`^${escapeRegExp(text)}$`) : text;
  return page.getByRole("status").filter({ hasText: muster });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
