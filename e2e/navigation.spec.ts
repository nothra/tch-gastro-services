import { test, expect } from "@playwright/test";

// Zugangsdaten kommen aus der geladenen .env (dotenv je Stage), analog auth.spec.ts.
const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe("Navigation (RBAC / PWA)", () => {
  test("Dashboard-Hub zeigt Bereichs-Kacheln nach dem Login", async ({ page }) => {
    test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");
    await login(page);
    // Der Seed-Admin trägt mindestens eine Rolle → mindestens eine Bereichs-Kachel.
    const areas = page.getByRole("navigation", { name: "Bereiche" });
    await expect(areas.getByRole("link")).not.toHaveCount(0);
  });

  test("Mobiler Drawer: öffnen, navigieren, schließt beim Wechsel", async ({ page }) => {
    test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    const toggle = page.getByRole("button", { name: /Navigation öffnen/i });
    await expect(toggle).toBeVisible();
    await toggle.click();

    const drawer = page.getByRole("dialog", { name: /Navigation/i });
    await expect(drawer).toBeVisible();

    const firstArea = drawer.getByRole("link").first();
    await firstArea.click();

    // Nach der Navigation ist kein hängendes Overlay mehr sichtbar.
    await expect(page.getByRole("dialog", { name: /Navigation/i })).toHaveCount(0);
  });

  test("Mobiler Drawer: Escape schließt", async ({ page }) => {
    test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    await page.getByRole("button", { name: /Navigation öffnen/i }).click();
    await expect(page.getByRole("dialog", { name: /Navigation/i })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /Navigation/i })).toHaveCount(0);
  });
});
