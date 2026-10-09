import { expect, type Page } from "@playwright/test";

// Gemeinsame Bedienschritte der Detailseite `/veranstaltung/[id]` (#369, #391) für alle E2E-Specs,
// die sie brauchen – vorher lagen sie viermal (Teilnehmer anlegen) bzw. zweimal in
// unterschiedlicher Form (Einstellungen) kopiert in den Specs. Keine `*.spec.ts`-Datei:
// Playwright sammelt sie nicht als Test ein.

// Auslöser und Dialogtitel lauten gleich („Teilnehmer hinzufügen", spec-404 AK7) – Rolle und
// `exact` halten sie auseinander.
export function teilnehmerAusloeser(page: Page) {
  return page.getByRole("button", { name: "Teilnehmer hinzufügen", exact: true });
}

export function teilnehmerDialog(page: Page) {
  return page.getByRole("dialog", { name: "Teilnehmer hinzufügen" });
}

// Zweiter Schritt desselben Dialogs (spec-404 AK3.1): der Titel wechselt.
export function anlegeSchritt(page: Page) {
  return page.getByRole("dialog", { name: "Teilnehmer anlegen" });
}

export async function oeffneTeilnehmerDialog(page: Page) {
  await teilnehmerAusloeser(page).click();
  await expect(teilnehmerDialog(page)).toBeVisible();
}

// „Teilnehmer anlegen" aus dem Dialog (spec-404 AK4.2, früher „Neuer Gast"/Walk-in). Erfolgreich
// ist der Schritt erst, wenn der Dialog zu ist und der Teilnehmer als Link in der Liste steht
// (spec-369 AK17). Die Namen der Specs sind je Lauf eindeutig – eine Duplikat-Warnung (AK4.3)
// wäre hier ein Fehler, kein Fall zum Überstimmen.
export async function gastHinzufuegen(page: Page, name: string) {
  await oeffneTeilnehmerDialog(page);
  await teilnehmerDialog(page)
    .getByRole("button", { name: "Teilnehmer anlegen", exact: true })
    .click();
  const schritt = anlegeSchritt(page);
  await schritt.getByLabel("Name", { exact: true }).fill(name);
  await schritt.getByRole("button", { name: "Anlegen", exact: true }).click();
  await expect(schritt).toBeHidden();
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
// Dialog macht die Seite dahinter inert. `exact`, weil ein Toast im offenen Dialog
// „Meldung schließen" mitbringt (spec-372 FS6).
export async function schliesseEinstellungen(page: Page) {
  await einstellungenDialog(page).getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(einstellungenDialog(page)).toBeHidden();
}

// Löschen bis zum offenen Bestätigungsdialog über den Papierkorb im Kopf (spec-391 AK11) – der
// erste Tipp darf noch nichts entfernen (#352 AK8).
export async function oeffneLoeschDialog(page: Page) {
  await kopfAktion(page, "Veranstaltung löschen").click();
  await expect(page.getByRole("dialog", { name: "Veranstaltung löschen?" })).toBeVisible();
}
