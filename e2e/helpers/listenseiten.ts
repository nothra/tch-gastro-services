import { expect, type Locator, type Page } from "@playwright/test";

// Anlege-Wege der Listenseiten (spec-373): „+ Neu"/„+ Artikel" im Seitenkopf öffnet einen Dialog,
// Erfolg schließt ihn. Gemeinsam für alle Specs, die Testdaten über die Oberfläche anlegen.

/** Öffnet den Anlege-Dialog über die Seitenkopf-Aktion und liefert ihn. */
export async function oeffneAnlegeDialog(
  page: Page,
  ausloeser: string,
  titel: string,
): Promise<Locator> {
  // Der Seitenkopf (`PageHeader`) liegt in `main` – der App-Header darüber ist ein anderes `header`.
  await page.locator("main header").getByRole("button", { name: ausloeser, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: titel });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Schickt den Dialog ab und wartet, bis er sich nach dem Erfolg schließt (AK1.3). */
export async function schickeAnlegeDialogAb(dialog: Locator, label = "Anlegen") {
  await dialog.getByRole("button", { name: label, exact: true }).click();
  await expect(dialog).toBeHidden();
}

export function oeffneVeranstaltungAnlegen(page: Page): Promise<Locator> {
  return oeffneAnlegeDialog(page, "+ Neu", "Veranstaltung anlegen");
}

export function oeffneTeilnehmerAnlegen(page: Page): Promise<Locator> {
  return oeffneAnlegeDialog(page, "+ Neu", "Teilnehmer anlegen");
}

export function oeffneArtikelAnlegen(page: Page): Promise<Locator> {
  return oeffneAnlegeDialog(page, "+ Artikel", "Artikel anlegen");
}

export async function fuelleVeranstaltung(dialog: Locator, bezeichnung: string, datum: string) {
  await dialog.getByLabel("Bezeichnung").fill(bezeichnung);
  await dialog.getByLabel("Datum").fill(datum);
  await dialog.getByLabel("Kasse").selectOption({ label: "Montagsrunde" });
}

/**
 * Legt eine Veranstaltung an und liefert ihren Detail-Pfad – Identifikation über den Link-Zuwachs
 * in der Liste, weil gleiche Bezeichnungen aus früheren Läufen stehen bleiben können.
 */
export async function legeVeranstaltungAn(
  page: Page,
  bezeichnung: string,
  datum: string,
): Promise<string> {
  await page.goto("/veranstaltung");
  const dialog = await oeffneVeranstaltungAnlegen(page);
  await fuelleVeranstaltung(dialog, bezeichnung, datum);
  return neuerListenLink(page, bezeichnung, () => schickeAnlegeDialogAb(dialog));
}

/** Führt `aktion` aus und liefert den einen Listen-Link namens `name`, der dadurch neu dazukam. */
export async function neuerListenLink(
  page: Page,
  name: string,
  aktion: () => Promise<void>,
): Promise<string> {
  const links = page.getByRole("link", { name });
  const hrefs = () => links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  const before = await hrefs();
  await aktion();
  await expect(links).toHaveCount(before.length + 1);
  const neu = (await hrefs()).find((href) => href && !before.includes(href));
  expect(neu, "neue Veranstaltung im Listen-Link gefunden").toBeTruthy();
  return neu as string;
}
