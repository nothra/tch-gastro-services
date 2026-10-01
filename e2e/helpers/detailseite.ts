import { expect, type Page } from "@playwright/test";

// Gemeinsame Bedienschritte der Detailseite `/veranstaltung/[id]` (#369) für alle E2E-Specs, die
// sie brauchen – vorher lagen sie viermal (Gast) bzw. zweimal in unterschiedlicher Form
// (Einstellungen) kopiert in den Specs. Keine `*.spec.ts`-Datei: Playwright sammelt sie nicht als
// Test ein.

export function teilnehmerDialog(page: Page) {
  return page.getByRole("dialog", { name: "Teilnehmer hinzufügen" });
}

export async function oeffneTeilnehmerDialog(page: Page) {
  await page.getByRole("button", { name: "+ Teilnehmer" }).click();
  await expect(teilnehmerDialog(page)).toBeVisible();
}

// „Neuer Gast" im „+ Teilnehmer"-Dialog (spec-369 AK13, früher Walk-in-Formular). Erfolgreich ist
// der Schritt erst, wenn der Dialog zu ist und der Gast als Link in der Liste steht (AK17).
export async function gastHinzufuegen(page: Page, name: string) {
  await oeffneTeilnehmerDialog(page);
  const gast = teilnehmerDialog(page).getByRole("group", { name: "Neuer Gast" });
  await gast.getByLabel("Name").fill(name);
  await gast.getByRole("button", { name: "Gast hinzufügen" }).click();
  await expect(teilnehmerDialog(page)).toBeHidden();
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
}

function einstellungen(page: Page) {
  return page.locator("details").filter({ hasText: "Einstellungen" });
}

async function istEingeklappt(page: Page): Promise<boolean> {
  // Ein offenes `<details>` trägt `open=""` – geprüft wird die Anwesenheit, nicht der Wert.
  return (await einstellungen(page).getAttribute("open")) === null;
}

// Klappt „Einstellungen" (spec-369 AK21) auf oder zu. Ein Klick auf die Zusammenfassung schaltet
// nur um – ohne Prüfung des Ist-Zustands kehrte er einen bereits passenden Zustand um.
async function setzeEinstellungen(page: Page, offen: boolean) {
  if ((await istEingeklappt(page)) === offen) {
    await einstellungen(page).getByText("Einstellungen", { exact: true }).click();
  }
}

export function oeffneEinstellungen(page: Page) {
  return setzeEinstellungen(page, true);
}

export function schliesseEinstellungen(page: Page) {
  return setzeEinstellungen(page, false);
}
