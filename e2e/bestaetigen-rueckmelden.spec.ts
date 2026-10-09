import { test, expect, type Page } from "@playwright/test";
import {
  einstellungenDialog,
  gastHinzufuegen,
  oeffneEinstellungen,
  oeffneLoeschDialog,
  schliesseEinstellungen,
} from "./helpers/detailseite";
import { legeVeranstaltungAn } from "./helpers/listenseiten";
import { schliesseToast, toast } from "./helpers/toast";

// Oberflächen-Nachweis für das einheitliche Bestätigen und Rückmelden (#372, spec-372, ADR-058).
// Prüft gegen einen echten Browser, was jsdom nicht belegen kann: dass Escape und der inerte
// Hintergrund des nativen `<dialog>` wirken (AK2/AK5), dass der Fokus nach dem Schließen wirklich
// auf dem Auslöser steht und dass ein Toast über einem offen bleibenden modalen Dialog bedienbar
// ist, statt verdeckt darunter zu liegen (FS6).
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: die Spec legt Daten an, der Standardlauf
// fährt in CI gegen die persistente INT-Umgebung und ist dort rein lesend (wie
// veranstaltung-bearbeiten-loeschen.spec.ts). Nur mit gesetztem E2E_372=1 aktiv. Lokal:
//   pnpm db:up && pnpm db:seed
//   E2E_372=1 pnpm exec dotenv -e .env.local -- playwright test e2e/bestaetigen-rueckmelden.spec.ts
//
// Alle Namen tragen das `__test__`-Präfix der DB-Integrationstests (geteilte Dev-DB, #346). Die
// Veranstaltungen räumen sich selbst ab; einen Katalog kann die App nicht löschen – der Test
// hinterlässt ihn deaktiviert, mit Lauf-Zeitstempel im Namen, damit Läufe nicht kollidieren.

test.skip(!process.env.E2E_372, "legt Daten an – nur mit E2E_372=1 (siehe Kopfkommentar)");

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";
const PREFIX = "__test__E2E372";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function loescheVeranstaltung(page: Page, detailPfad: string) {
  await page.goto(detailPfad);
  await oeffneLoeschDialog(page);
  await page.getByRole("button", { name: "Endgültig löschen" }).click();
  await expect(page).toHaveURL(/\/veranstaltung$/);
}

test.describe("Bestätigen und Rückmelden (#372)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("AK1/AK2/AK7: Auslage löschen fragt nach, Abbrechen und Escape lassen sie stehen", async ({
    page,
  }) => {
    const gast = `${PREFIX}Gast`;
    const detailPfad = await legeVeranstaltungAn(page, `${PREFIX}Auslage`, "2026-09-14");
    await page.goto(detailPfad);
    await gastHinzufuegen(page, gast);

    await page.goto(`${detailPfad}/auslagen`);
    await page.getByLabel("Teilnehmer").selectOption({ label: gast });
    await page.getByLabel("Kategorie").selectOption({ label: "Getränke" });
    await page.getByLabel("Betrag (EUR)").fill("12,50");
    await page.getByRole("button", { name: "Auslage erfassen" }).click();
    await expect(toast(page, "Auslage erfasst")).toBeVisible();

    const ausloeser = page.getByRole("listitem").getByRole("button", { name: "Löschen" });
    const dialog = page.getByRole("dialog", { name: "Auslage löschen?" });

    // ── AK1: Dialog nennt Teilnehmer, Kategorie, Betrag – AK7: Gefahr-Variante ──────────────
    await ausloeser.click();
    await expect(dialog).toContainText(gast);
    await expect(dialog).toContainText("Getränke");
    await expect(dialog).toContainText("12,50 €");

    // ── AK2: Abbrechen und Escape lassen die Auslage stehen, Fokus zurück am Auslöser ───────
    await dialog.getByRole("button", { name: "Abbrechen" }).click();
    await expect(dialog).toBeHidden();
    await expect(ausloeser).toBeFocused();

    await ausloeser.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(ausloeser).toBeFocused();
    await expect(page.getByRole("listitem").filter({ hasText: "12,50 €" })).toHaveCount(1);

    // ── AK1/AK12: erst „Löschen" im Dialog entfernt sie, ein Toast meldet es ────────────────
    await ausloeser.click();
    await dialog.getByRole("button", { name: "Löschen" }).click();
    await expect(dialog).toBeHidden();
    await expect(toast(page, "Auslage gelöscht")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "12,50 €" })).toHaveCount(0);

    // Aufräumen: ohne Auslage, Verzehr und Kassiertes ist die Veranstaltung wieder löschbar.
    await loescheVeranstaltung(page, detailPfad);
  });

  test("FS6: Toast über dem offen bleibenden Dialog „Einstellungen“ ist bedienbar", async ({
    page,
  }) => {
    const detailPfad = await legeVeranstaltungAn(page, `${PREFIX}Toast`, "2026-09-14");
    await page.goto(detailPfad);
    await oeffneEinstellungen(page);

    await einstellungenDialog(page).getByRole("button", { name: "Änderungen speichern" }).click();

    // Der Dialog bleibt offen (ADR-056 D3); der Toast muss trotzdem erreichbar sein – ein Element
    // unter dem inerten Hintergrund ließe sich nicht anklicken.
    await expect(toast(page, "Gespeichert")).toBeVisible();
    await expect(einstellungenDialog(page)).toBeVisible();
    await page.getByRole("button", { name: "Meldung schließen" }).click();
    await expect(toast(page, "Gespeichert")).toHaveCount(0);

    await schliesseEinstellungen(page);
    await loescheVeranstaltung(page, detailPfad);
  });

  test("AK3/AK4/AK5: Katalog-Dialoge auf der Dialog-Grundlage, Deaktivieren fragt nach", async ({
    page,
  }) => {
    const name = `${PREFIX}Katalog${Date.now()}`;
    await page.goto("/verwaltung/katalog");

    // ── AK5: Anlegen-Dialog – verknüpfte Beschriftung, Escape schließt, Fokus zurück ────────
    const anlegen = page.getByRole("button", { name: "+ Katalog anlegen" });
    const anlegeDialog = page.getByRole("dialog", { name: "Neuen Katalog anlegen" });
    await anlegen.click();
    await expect(anlegeDialog.getByLabel("Katalogname")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(anlegeDialog).toBeHidden();
    await expect(anlegen).toBeFocused();

    await anlegen.click();
    await anlegeDialog.getByLabel("Katalogname").fill(name);
    await anlegeDialog.getByRole("button", { name: "Anlegen", exact: true }).click();
    await expect(anlegeDialog).toBeHidden();
    await expect(toast(page, "Katalog angelegt")).toBeVisible();

    // Die Auswahl führt auf die Seite des neuen Katalogs (CatalogSwitcher).
    const vorher = page.url();
    // `exact`: die Toast-Karte „Katalog angelegt" trägt ihren Text als Namen (Lesson #388).
    await page.getByLabel("Katalog", { exact: true }).selectOption({ label: name });
    await page.waitForURL((url) => url.href !== vorher);

    // ── AK5: Umbenennen-Dialog mit verknüpftem Feld, Escape schließt ────────────────────────
    const umbenennen = page.getByRole("button", { name: "Umbenennen", exact: true });
    await umbenennen.click();
    const umbenennDialog = page.getByRole("dialog", { name: "Katalog umbenennen" });
    await expect(umbenennDialog.getByLabel("Neuer Name")).toHaveValue(name);
    await page.keyboard.press("Escape");
    await expect(umbenennDialog).toBeHidden();
    await expect(umbenennen).toBeFocused();

    // ── AK3: Deaktivieren fragt nach, nennt Namen und Folge; Abbrechen ändert nichts ────────
    const schalter = page.getByRole("button", { name: "Deaktivieren", exact: true });
    const bestaetigung = page.getByRole("dialog", { name: "Katalog deaktivieren?" });
    await schalter.click();
    await expect(bestaetigung).toContainText(
      `„${name}“ ist danach für neue Veranstaltungen nicht mehr wählbar.`,
    );
    await bestaetigung.getByRole("button", { name: "Abbrechen" }).click();
    await expect(bestaetigung).toBeHidden();
    await expect(schalter).toBeFocused();

    await schalter.click();
    await bestaetigung.getByRole("button", { name: "Deaktivieren" }).click();
    await expect(bestaetigung).toBeHidden();
    await expect(toast(page, "Katalog deaktiviert")).toBeVisible();
    // Das Aufräumen unten meldet dasselbe noch einmal – innerhalb der Standzeit stünden sonst zwei
    // gleiche Toasts (Review-372 W5).
    await schliesseToast(page, "Katalog deaktiviert");

    // ── AK4: Aktivieren wirkt sofort, ohne Dialog ───────────────────────────────────────────
    await page.getByRole("button", { name: "Aktivieren", exact: true }).click();
    await expect(toast(page, "Katalog aktiviert")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Deaktivieren", exact: true })).toBeVisible();

    // Aufräumen: deaktiviert zurücklassen (Löschen gibt es nicht).
    await page.getByRole("button", { name: "Deaktivieren", exact: true }).click();
    await bestaetigung.getByRole("button", { name: "Deaktivieren" }).click();
    await expect(toast(page, "Katalog deaktiviert")).toBeVisible();
  });
});
