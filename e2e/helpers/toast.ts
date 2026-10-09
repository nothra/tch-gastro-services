import { expect, type Locator, type Page } from "@playwright/test";

// Erfolgsmeldungen erscheinen app-weit als Toast aus dem Root-Layout (spec-372 AK12, ADR-058),
// nicht mehr am Formular – ein Locator innerhalb einer Zeile oder eines Dialogs findet sie nicht.
// Ein String wird exakt verglichen: `hasText` mit String wäre ein Teilstring-Treffer (Lesson #388).
export function toast(page: Page, text: string | RegExp): Locator {
  const muster = typeof text === "string" ? new RegExp(`^${escapeRegExp(text)}$`) : text;
  return page.getByRole("status").filter({ hasText: muster });
}

/**
 * Schließt den Toast mit genau diesem Text per „×" und wartet, bis er weg ist. Nötig, bevor dieselbe
 * Meldung innerhalb der Standzeit (5 s) ein zweites Mal erwartet wird – sonst träfe `toast()` zwei
 * Elemente und scheiterte im Strict Mode.
 */
export async function schliesseToast(page: Page, text: string): Promise<void> {
  await page
    .getByRole("group", { name: text, exact: true })
    .getByRole("button", { name: "Meldung schließen" })
    .click();
  await expect(toast(page, text)).toHaveCount(0);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
