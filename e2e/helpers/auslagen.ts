import type { Locator, Page } from "@playwright/test";
import { oeffneAnlegeDialog, schickeAnlegeDialogAb } from "./listenseiten";

// Bedienwege der Auslagen-Seite (spec-406): Erfassen per „+ Neu"-Dialog, Erstatten/Bearbeiten/
// Löschen über das ⋯-Menü der Zeile. Namen exakt, weil `name` sonst ein Teilstring-Treffer ist
// (Lesson #372/#388).

interface AuslageEingabe {
  teilnehmer: string;
  kategorie: string;
  betrag: string;
  notiz?: string;
}

export function oeffneAuslageErfassen(page: Page): Promise<Locator> {
  return oeffneAnlegeDialog(page, "+ Neu", "Auslage erfassen");
}

/** Füllt die Felder eines geöffneten Dialogs „Auslage erfassen"/„Auslage bearbeiten". */
export async function fuelleAuslage(dialog: Locator, eingabe: AuslageEingabe) {
  await dialog.getByLabel("Teilnehmer").selectOption({ label: eingabe.teilnehmer });
  await dialog.getByLabel("Kategorie").selectOption({ label: eingabe.kategorie });
  await dialog.getByLabel("Betrag (€)").fill(eingabe.betrag);
  if (eingabe.notiz !== undefined) await dialog.getByLabel("Notiz (optional)").fill(eingabe.notiz);
}

/** Erfasst eine Auslage über „+ Neu" und wartet, bis der Dialog nach dem Erfolg zu ist. */
export async function erfasseAuslage(page: Page, eingabe: AuslageEingabe) {
  const dialog = await oeffneAuslageErfassen(page);
  await fuelleAuslage(dialog, eingabe);
  await schickeAnlegeDialogAb(dialog, "Erfassen");
}

/** Der ⋯-Knopf der Auslagenzeile dieses Teilnehmers. */
export function auslageMenueKnopf(page: Page, teilnehmer: string): Locator {
  return page.getByRole("button", { name: `Aktionen für ${teilnehmer}`, exact: true });
}

/** Öffnet das ⋯-Menü der Zeile und wählt den Eintrag. */
export async function waehleAuslageAktion(page: Page, teilnehmer: string, eintrag: string) {
  await auslageMenueKnopf(page, teilnehmer).click();
  await page
    .getByRole("menu", { name: `Aktionen für ${teilnehmer}`, exact: true })
    .getByRole("menuitem", { name: eintrag, exact: true })
    .click();
}
