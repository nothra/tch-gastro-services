import { test, expect, type Locator, type Page } from "@playwright/test";
import { oeffneTeilnehmerAnlegen, schickeAnlegeDialogAb } from "./helpers/listenseiten";
import { toast } from "./helpers/toast";

// Oberflächen-Nachweis für die Teilnehmer-Verwaltung im Artikel-Muster (#405, spec-405) gegen
// einen echten Browser und Server: natives `<dialog>` (Escape, Fokus-Rückgabe), der Umzug einer
// Zeile zwischen den Aufklappern „Aktiv"/„Deaktiviert" nach der Revalidierung samt Fokus (AK3.5)
// und die Tipp-Höhe – was jsdom nicht belegen kann.
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: die Spec legt Daten an. Nur mit E2E_405=1:
//   pnpm db:up && pnpm db:seed
//   E2E_405=1 pnpm exec dotenv -e .env.local -- playwright test e2e/teilnehmer-verwaltung.spec.ts
// Der angelegte Teilnehmer trägt das `__test__`-Präfix (geteilte Dev-DB, #346) und bleibt
// deaktiviert liegen – Teilnehmer lassen sich nicht löschen.

test.skip(!process.env.E2E_405, "legt Daten an – nur mit E2E_405=1 (siehe Kopfkommentar)");

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";
const NAME = `__test__E2E405 ${Date.now().toString(36)}`;
const MIN_TIPP_HOEHE = 44;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

function gruppe(page: Page, titel: "Aktiv" | "Deaktiviert"): Locator {
  return page.getByRole("region", { name: new RegExp(`^${titel} \\(\\d+\\)$`) });
}

// Der Name allein ist Teilstring eines Badges/Untertitels nicht – trotzdem verankert (Lesson #388).
function zeile(page: Page): Locator {
  return page.getByRole("button", { name: new RegExp(`^${NAME}`) });
}

function bearbeitenDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Teilnehmer bearbeiten" });
}

test.describe("Teilnehmer-Verwaltung im Artikel-Muster (#405)", () => {
  test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");
  test.use({ viewport: { width: 375, height: 812 } });

  test("AK1–AK3: Zeile, Dialog, Gruppenwechsel mit Fokus", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto("/verwaltung/teilnehmer");
    const anlegen = await oeffneTeilnehmerAnlegen(page);
    await anlegen.getByLabel("Name", { exact: true }).fill(NAME);
    await schickeAnlegeDialogAb(anlegen);

    // AK1: Button-Zeile in „Aktiv", Untertitel, Tipp-Höhe ≥ 44 px.
    await expect(gruppe(page, "Aktiv")).toContainText(NAME);
    await expect(zeile(page)).toContainText("Person · kein Mitglied");
    const box = await zeile(page).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);

    // AK2.5: Escape schließt ohne Änderung, Fokus zurück auf die Zeile.
    await zeile(page).click();
    await expect(bearbeitenDialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(bearbeitenDialog(page)).toBeHidden();
    await expect(zeile(page)).toBeFocused();

    // AK1.3: Tastatur öffnet; AK2.6/AK2.8: Deaktivieren wirkt ohne Bestätigung.
    await page.keyboard.press("Enter");
    await expect(bearbeitenDialog(page)).toBeVisible();
    await bearbeitenDialog(page).getByRole("button", { name: "Deaktivieren", exact: true }).click();
    await expect(bearbeitenDialog(page)).toBeHidden();
    await expect(toast(page, "Teilnehmer deaktiviert")).toBeVisible();

    // AK3.2/AK3.5: „Deaktiviert" ist zugeklappt, die umgezogene Zeile darin nicht fokussierbar –
    // der Fokus steht auf dem Kopf dieser Gruppe statt auf <body>. Der Toast bleibt offen: sein
    // „×" anzuklicken zöge den Fokus selbst weg.
    const kopfDeaktiviert = gruppe(page, "Deaktiviert").locator("summary");
    await expect(kopfDeaktiviert).toBeFocused();
    await expect(zeile(page)).toBeHidden();

    // AK3.3: aufgeklappt per Tastatur – Zeile mit Badge „deaktiviert".
    await page.keyboard.press("Enter");
    await expect(zeile(page)).toBeVisible();
    await expect(zeile(page)).toContainText("deaktiviert");

    // Rückweg: Aktivieren – die Zeile wandert ins aufgeklappte „Aktiv" und behält den Fokus.
    await zeile(page).click();
    await bearbeitenDialog(page).getByRole("button", { name: "Aktivieren", exact: true }).click();
    await expect(toast(page, "Teilnehmer aktiviert")).toBeVisible();
    await expect(gruppe(page, "Aktiv")).toContainText(NAME);
    await expect(zeile(page)).toBeFocused();

    // Aufräumen auf „deaktiviert", damit der Testteilnehmer nicht in Auswahllisten auftaucht.
    await zeile(page).click();
    await bearbeitenDialog(page).getByRole("button", { name: "Deaktivieren", exact: true }).click();
    await expect(bearbeitenDialog(page)).toBeHidden();
  });
});
