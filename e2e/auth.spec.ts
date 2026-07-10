import { test, expect } from "@playwright/test";

// Zugangsdaten + erwartete Stage kommen aus der geladenen .env (dotenv je Stage):
//   lokal: .env.local (SEED_ADMIN_*, NEXT_PUBLIC_STAGE=dev)
//   INT:   .env.int   (SEED_ADMIN_*, NEXT_PUBLIC_STAGE=int)
const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";
const stage = process.env.NEXT_PUBLIC_STAGE ?? "dev";

test.describe("Auth & Stage-Oberfläche", () => {
  test("unangemeldet → Redirect auf /login mit Formular", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /Anmelden/i })).toBeVisible();
    await expect(page.getByPlaceholder("E-Mail")).toBeVisible();
    await expect(page.getByPlaceholder("Passwort")).toBeVisible();
  });

  test("Stage-Banner: DEV/INT sichtbar, PRD ohne Banner", async ({ page }) => {
    await page.goto("/login");
    if (stage === "prd") {
      await expect(page.getByText(/keine Produktionsumgebung/i)).toHaveCount(0);
    } else {
      const banner = page.getByRole("status");
      await expect(banner).toContainText(/keine Produktionsumgebung/i);
      await expect(banner).toContainText(stage === "int" ? /INT/i : /DEV/i);
    }
  });

  test("Login mit Admin führt zur Startseite", async ({ page }) => {
    test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");
    await page.goto("/login");
    await page.getByPlaceholder("E-Mail").fill(email);
    await page.getByPlaceholder("Passwort").fill(password);
    await page.getByRole("button", { name: /Anmelden/i }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /TCH Gastro Services/i })).toBeVisible();
  });

  test("falsche Zugangsdaten → Fehlermeldung, bleibt auf /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("E-Mail").fill("nobody@example.com");
    await page.getByPlaceholder("Passwort").fill("falsch-falsch");
    await page.getByRole("button", { name: /Anmelden/i }).click();
    await expect(page.getByText(/Ungültige E-Mail oder Passwort/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
