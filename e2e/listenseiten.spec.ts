import { test, expect, type Page } from "@playwright/test";
import { oeffneLoeschDialog } from "./helpers/detailseite";
import { toast } from "./helpers/toast";
import {
  legeVeranstaltungAn,
  oeffneArtikelAnlegen,
  oeffneTeilnehmerAnlegen,
  oeffneVeranstaltungAnlegen,
} from "./helpers/listenseiten";

// Oberflächen-Nachweis für die Listenseiten (#373, spec-373) gegen einen echten Server: natives
// modales `<dialog>` (Escape, Fokus-Rückgabe), `<details>`-Einklappen, echte Navigation der
// Katalogwahl und das Layout bei 375 px – was jsdom nicht belegen kann.
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: ein Test legt eine Veranstaltung an (in CI
// liefe der Standardlauf gegen die rein lesende INT-Umgebung). Nur mit E2E_LISTENSEITEN_373=1:
//   pnpm db:up && pnpm db:seed
//   E2E_LISTENSEITEN_373=1 pnpm exec dotenv -e .env.local -- playwright test e2e/listenseiten.spec.ts
// Die angelegte Veranstaltung trägt das `__test__`-Präfix (geteilte Dev-DB, #346) und wird am
// Testende über den Lösch-Weg wieder entfernt.

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";
const LAUF = Date.now().toString(36);

const HANDY = { width: 375, height: 812 };
const MIN_TIPP_HOEHE = 44;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function ohneHorizontalenUeberlauf(page: Page) {
  const ueberlauf = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(ueberlauf, "kein horizontaler Überlauf bei 375 px").toBeLessThanOrEqual(0);
}

test.describe("Listenseiten – Liste zuerst, Anlegen per Dialog (#373)", () => {
  test.skip(!process.env.E2E_LISTENSEITEN_373, "nur mit E2E_LISTENSEITEN_373=1 (legt Daten an)");
  test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");
  test.use({ viewport: HANDY });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Veranstaltungen: Liste zuerst, Dialog mit Escape/Fokus, neue Zeile unter Offen", async ({
    page,
  }) => {
    await page.goto("/veranstaltung");

    // AK1.1/AK3.1: kein Formular und keine Theke beim Laden.
    await expect(page.getByLabel("Bezeichnung")).toHaveCount(0);
    await expect(page.getByText("Stehende Theke")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: /^Offen \(\d+\)$/ })).toBeVisible();

    // AK1.5: Escape schließt ohne Anlage, Fokus zurück auf „+ Neu", erneutes Öffnen ist leer.
    const dialog = await oeffneVeranstaltungAnlegen(page);
    await dialog.getByLabel("Bezeichnung").fill("verworfen");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "+ Neu", exact: true })).toBeFocused();
    await oeffneVeranstaltungAnlegen(page);
    await expect(dialog.getByLabel("Bezeichnung")).toHaveValue("");
    await dialog.getByRole("button", { name: "Abbrechen" }).click();
    await expect(dialog).toBeHidden();

    // AK2.2: „Abgeschlossen" ist eingeklappt, sofern vorhanden.
    const abgeschlossen = page.locator("details").filter({ hasText: /Abgeschlossen \(\d+\)/ });
    if ((await abgeschlossen.count()) > 0) {
      await expect(abgeschlossen).not.toHaveAttribute("open");
    }

    // AK1.3 + AK7.1: Erfolg schließt den Dialog, die Zeile steht unter „Offen" mit Katalog + Kasse.
    const bezeichnung = `__test__E2E373 Liste ${LAUF}`;
    const pfad = await legeVeranstaltungAn(page, bezeichnung, "2026-10-07");
    const offen = page.getByRole("region", { name: /^Offen \(/ });
    const zeile = offen.locator(`a[href="${pfad}"]`);
    await expect(zeile).toContainText("Montagsrunde · Montagsrunde");
    await ohneHorizontalenUeberlauf(page);

    await page.goto(pfad);
    await oeffneLoeschDialog(page);
    await page.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page).toHaveURL(/\/veranstaltung$/);
  });

  test("Katalog: Auswahlliste, kompakte Zeilen nach Kategorie, Bearbeiten-Dialog", async ({
    page,
  }) => {
    await page.goto("/verwaltung/katalog");
    await expect(page).toHaveURL(/\/verwaltung\/katalog\/[^/]+$/);

    // AK5.1: Auswahlliste statt Radiobuttons, aktueller Katalog vorgewählt.
    const auswahl = page.getByRole("combobox", { name: "Katalog" });
    await expect(auswahl).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
    const aktuelleId = page.url().split("/").pop() as string;
    await expect(auswahl).toHaveValue(aktuelleId);

    // AK1.1: „+ Artikel" im Kopf, kein Anlege-Formular beim Laden.
    await expect(page.getByLabel("Bezeichnung")).toHaveCount(0);

    // AK4.1: Gruppen-Überschriften in CATEGORY_LABEL-Reihenfolge.
    const gruppen = await page
      .locator('main section[aria-labelledby^="kategorie-"] h2')
      .allInnerTexts();
    const reihenfolge = ["Getränk", "Kaffee", "Essen"];
    const namen = gruppen.map((text) => text.replace(/ \(\d+\)$/, ""));
    expect(namen).toEqual(reihenfolge.filter((name) => namen.includes(name)));

    // AK4.2/AK4.6: kompakte Zeilen ohne eigene Buttons, Tipp-Ziel ≥ 44 px, kein Überlauf.
    const zeilen = page.locator('main section[aria-labelledby^="kategorie-"] li > button');
    const anzahl = await zeilen.count();
    expect(anzahl).toBeGreaterThan(0);
    const hoehe = (await zeilen.first().boundingBox())?.height ?? 0;
    expect(hoehe).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
    await ohneHorizontalenUeberlauf(page);
    const listenHoehe = await page
      .locator('main section[aria-labelledby^="kategorie-"]')
      .evaluateAll((sections) => sections.reduce((summe, s) => summe + s.clientHeight, 0));
    test.info().annotations.push({
      type: "AK4.6",
      description: `${anzahl} Artikel belegen ${listenHoehe} px = ${(listenHoehe / HANDY.height).toFixed(2)} Bildschirmhöhen`,
    });
    // Richtwert ≤ 2 Bildschirmhöhen für 24 Artikel. Bei mehr Artikeln wächst die Grenze anteilig
    // mit, bei weniger bleibt sie bei 2 Höhen (lockerer, nie strenger als der Richtwert).
    expect(listenHoehe).toBeLessThanOrEqual((2 * HANDY.height * Math.max(anzahl, 24)) / 24);

    // AK4.3/AK1.5: Tippen öffnet den Bearbeiten-Dialog, Abbrechen gibt den Fokus zurück.
    await zeilen.first().click();
    const bearbeiten = page.getByRole("dialog", { name: "Artikel bearbeiten" });
    await expect(bearbeiten).toBeVisible();
    await expect(
      bearbeiten.getByRole("button", { name: /^(Deaktivieren|Aktivieren)$/ }),
    ).toBeVisible();
    await bearbeiten.getByRole("button", { name: "Abbrechen" }).click();
    await expect(bearbeiten).toBeHidden();
    await expect(zeilen.first()).toBeFocused();

    // AK1.2: „+ Artikel" öffnet den Anlege-Dialog mit den bisherigen Feldern.
    const anlegen = await oeffneArtikelAnlegen(page);
    await expect(anlegen.getByLabel("Preis (EUR)")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(anlegen).toBeHidden();

    // AK5.2: ein anderer Katalog navigiert zu dessen Seite (nur mit mehr als einem Katalog prüfbar).
    const ids = await auswahl
      .locator("option")
      .evaluateAll((optionen) => optionen.map((option) => (option as HTMLOptionElement).value));
    const andere = ids.find((id) => id !== aktuelleId);
    if (andere) {
      await auswahl.selectOption(andere);
      await expect(page).toHaveURL(new RegExp(`/verwaltung/katalog/${andere}$`));
      await expect(page.getByRole("combobox", { name: "Katalog" })).toHaveValue(andere);
    }
  });

  test("Teilnehmer: Liste zuerst, Anlegen per Dialog", async ({ page }) => {
    await page.goto("/verwaltung/teilnehmer");
    await expect(page.getByLabel("Anzeigename")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 2, name: /^Teilnehmer \(\d+\)$/ }),
    ).toBeVisible();

    const dialog = await oeffneTeilnehmerAnlegen(page);
    await expect(dialog.getByLabel("Anzeigename")).toHaveValue("");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "+ Neu", exact: true })).toBeFocused();
    await ohneHorizontalenUeberlauf(page);
  });

  test("Theke: eigene Verwaltungsseite mit Nav-Eintrag", async ({ page }) => {
    // AK3.4: der Navigationseintrag führt zur Seite.
    await page.goto("/");
    await page.getByRole("button", { name: "Navigation öffnen" }).click();
    // Auf die Navigation eingegrenzt – die Startseite führt „Theke" zusätzlich als Kachel.
    await page
      .getByLabel("Navigation", { exact: true })
      .getByRole("link", { name: "Theke", exact: true })
      .click();
    await expect(page).toHaveURL(/\/verwaltung\/theke$/);

    // AK3.2: bisheriges Formular, idempotentes Einrichten mit Erfolgsmeldung.
    await expect(page.getByLabel("Kasse")).toBeVisible();
    await page.getByRole("button", { name: "Einrichten" }).click();
    await expect(toast(page, "Theke angelegt")).toBeVisible();
  });
});
