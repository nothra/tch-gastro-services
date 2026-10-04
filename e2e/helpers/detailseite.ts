import { expect, type Page } from "@playwright/test";

// Gemeinsame Bedienschritte der Detailseite `/veranstaltung/[id]` (#369, #391) für alle E2E-Specs,
// die sie brauchen – vorher lagen sie viermal (Gast) bzw. zweimal in unterschiedlicher Form
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

// Der Seitenkopf (`PageHeader`) der Detailseite. Über die Struktur statt `getByRole("banner")`:
// ein `<header>` innerhalb von `<main>` ist für Browser keine Banner-Landmarke.
export function seitenkopf(page: Page) {
  return page.locator("main > header");
}

// Die Symbol-Schaltflächen im Seitenkopf (spec-391 AK2/AK3) – über ihren zugänglichen Namen.
// `exact`, weil „Einstellungen" sonst auch andere Beschriftungen mit diesem Wortteil träfe.
export function kopfAktion(page: Page, name: string) {
  return seitenkopf(page).getByRole("button", { name, exact: true });
}

export function einstellungenDialog(page: Page) {
  return page.getByRole("dialog", { name: "Einstellungen" });
}

// Öffnet den Dialog „Einstellungen" über das Zahnrad im Seitenkopf (spec-391 AK4).
export async function oeffneEinstellungen(page: Page) {
  await kopfAktion(page, "Einstellungen").click();
  await expect(einstellungenDialog(page)).toBeVisible();
}

// Schließt ihn über „Schließen" – nötig, bevor eine andere Kopfaktion getippt wird: der modale
// Dialog macht die Seite dahinter inert.
export async function schliesseEinstellungen(page: Page) {
  await einstellungenDialog(page).getByRole("button", { name: "Schließen" }).click();
  await expect(einstellungenDialog(page)).toBeHidden();
}

// Löschen bis zum offenen Bestätigungsdialog über den Papierkorb im Kopf (spec-391 AK11) – der
// erste Tipp darf noch nichts entfernen (#352 AK8).
export async function oeffneLoeschDialog(page: Page) {
  await kopfAktion(page, "Veranstaltung löschen").click();
  await expect(page.getByRole("dialog", { name: "Veranstaltung löschen?" })).toBeVisible();
}
