import { test, expect, type Page } from "@playwright/test";

// Oberflächen-Nachweis für Kopfzeile und Startseite (#374, spec-374, ADR-056). Prüft im echten
// Browser, was jsdom nicht kann: das native Popover des Konto-Menüs (Öffnen, Escape, Klick
// außerhalb, Fokus-Rücksprung – ADR-056 D1) und das Layout bei 375 px (AK1.6). Rein lesend bis
// auf das Abmelden, daher Teil des Standardlaufs (wie auth.spec.ts).

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

function kontoKnopf(page: Page) {
  return page.getByRole("button", { name: "Konto" });
}

// `aria-expanded` setzt der Browser nicht als DOM-Attribut, sondern leitet es aus `popovertarget`
// ab (ADR-056 D1); Playwrights eigene ARIA-Berechnung kennt das nicht. Deshalb der echte
// Accessibility-Baum von Chromium über CDP.
async function kontoKnopfExpanded(page: Page): Promise<boolean | undefined> {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  const knopf = nodes.find((n) => n.role?.value === "button" && n.name?.value === "Konto");
  return knopf?.properties?.find((p) => p.name === "expanded")?.value.value as boolean | undefined;
}

function abmelden(page: Page) {
  return page.getByRole("button", { name: "Abmelden" });
}

test.describe("Kopfzeile und Startseite (#374)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");
    await login(page);
  });

  test("AK1.1: Wortmarke führt auf die Startseite", async ({ page }) => {
    await page.goto("/veranstaltung");
    await page.getByRole("link", { name: "TCH Gastro Services" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("AK1.2/AK1.3: Konto-Menü öffnet mit E-Mail, Escape schließt, Fokus zurück", async ({
    page,
  }) => {
    // AK1.2: die E-Mail steht nicht dauerhaft im Header.
    await expect(page.getByText(email, { exact: true })).toBeHidden();
    await expect(abmelden(page)).toBeHidden();

    await kontoKnopf(page).click();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await expect(abmelden(page)).toBeVisible();
    expect(await kontoKnopfExpanded(page)).toBe(true);

    await page.keyboard.press("Escape");
    await expect(abmelden(page)).toBeHidden();
    await expect(kontoKnopf(page)).toBeFocused();
    expect(await kontoKnopfExpanded(page)).toBe(false);
  });

  test("AK1.3: Klick außerhalb schließt das Konto-Menü", async ({ page }) => {
    await kontoKnopf(page).click();
    await expect(abmelden(page)).toBeVisible();

    await page.getByRole("main").click({ position: { x: 5, y: 5 } });
    await expect(abmelden(page)).toBeHidden();
  });

  test("AK1.2/AK1.6: bei 375 px kein horizontaler Überlauf, Knöpfe ≥ 44 px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const ueberlauf = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(ueberlauf, "Seite breiter als der Viewport").toBe(false);

    for (const knopf of [
      page.getByRole("button", { name: "Navigation öffnen" }),
      kontoKnopf(page),
    ]) {
      await expect(knopf).toBeInViewport({ ratio: 1 });
      const box = await knopf.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByRole("link", { name: "TCH Gastro Services" })).toBeVisible();

    // Das geöffnete Menü bleibt im Viewport (fixe Position oben rechts).
    await kontoKnopf(page).click();
    await expect(abmelden(page)).toBeInViewport({ ratio: 1 });
  });

  test("AK2.1/AK2.5: Startseite zeigt offene Veranstaltungen über den Bereichs-Kacheln", async ({
    page,
  }) => {
    // Der Seed-Admin trägt die Rolle `veranstalter` → Abschnitt (Liste oder Leer-Hinweis) erscheint.
    const abschnitt = page.getByRole("region", { name: "Offene Veranstaltungen" });
    await expect(abschnitt).toBeVisible();
    const bereiche = page.getByRole("navigation", { name: "Bereiche" });
    const abschnittUnten = (await abschnitt.boundingBox())!;
    const bereicheOben = (await bereiche.boundingBox())!;
    expect(abschnittUnten.y + abschnittUnten.height).toBeLessThanOrEqual(bereicheOben.y);
  });

  test("AK1.4: Abmelden aus dem Konto-Menü beendet die Sitzung", async ({ page }) => {
    await kontoKnopf(page).click();
    await abmelden(page).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
