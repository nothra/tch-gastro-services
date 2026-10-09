import path from "node:path";
import { test, expect, type Browser, type Locator, type Page } from "@playwright/test";
import { gastHinzufuegen } from "./helpers/detailseite";
import { legeVeranstaltungAn } from "./helpers/listenseiten";

// Oberflächen-Nachweis für die Bausteine `Aufklapper` und `ListenZeile` (#403, spec-403,
// ADR-059). Prüft gegen einen echten Browser, was jsdom nicht belegen kann: dass `group-open:` den
// Pfeil dreht und den Hinweis „Anzeigen"/„Ausblenden" wechselt – auch ohne JavaScript (F1) –, die
// berechnete Abblendung der verblassten Zeile (AK2.5) und die Tastaturbedienung (AK1.5, F4).
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: die Spec legt Daten an (Begründung wie
// in kassieren-summe-abschluss.spec.ts). Nur mit gesetztem E2E_BAUSTEINE_403=1 aktiv:
//   pnpm db:up && pnpm db:seed
//   E2E_BAUSTEINE_403=1 pnpm exec dotenv -e .env.local -- playwright test e2e/bausteine-listenzeile-aufklapper.spec.ts
//
// Die abgeschlossene Veranstaltung bleibt als `__test__`-präfixierter Bestand in der geteilten
// Dev-DB liegen (#346), wie bei den übrigen datenanlegenden Specs.

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

const LAUF = Date.now().toString(36);
const PREFIX = "__test__E2E403";

// `test-results/` ist gitignoret – Screenshots werden von Hand an den PR gehängt (Lesson #368).
const NACHWEIS_LISTE = path.resolve(process.cwd(), "test-results/403-veranstaltungsliste-375.png");

const MIN_TIPP_HOEHE = 44;
const KEINE_DREHUNG = "none";

// Das Dev-Overlay von Next.js („Rendering …" unten links) läge sonst über dem Nachweis.
const OHNE_DEV_OVERLAY = "nextjs-portal { display: none !important; }";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function schliesseAb(page: Page, detailPfad: string) {
  await page.goto(detailPfad);
  await page.getByRole("button", { name: "Veranstaltung abschließen" }).click();
  const dialog = page.getByRole("dialog", { name: "Veranstaltung abschließen?" });
  await dialog.getByRole("button", { name: "Abschließen", exact: true }).click();
  await expect(dialog).toBeHidden();
}

/** Das `<details>` des Aufklappers einer Gruppe der Veranstaltungsliste. */
function gruppe(page: Page, name: RegExp) {
  return page.getByRole("region", { name }).locator("details");
}

function zusammenfassung(details: Locator) {
  return details.locator("summary").first();
}

/** Der Pfeil eines Aufklappers: der Rahmen des ersten Symbols im `<summary>`. */
function pfeil(details: Locator) {
  return zusammenfassung(details).locator("svg").first().locator("xpath=..");
}

async function drehung(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).transform);
}

async function deckkraft(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).opacity);
}

async function hoehe(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  expect(box, "Element hat eine Box").not.toBeNull();
  return box!.height;
}

async function horizontalerUeberstand(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** Prüft Pfeil und Hinweis eines Aufklappers (`<details>`) im Zustand `offen` (AK1.2/AK1.3). */
async function erwarteZustand(details: Locator, offen: boolean) {
  const summary = zusammenfassung(details);
  if (offen) {
    await expect(details).toHaveAttribute("open", "");
    expect(await drehung(pfeil(details))).not.toBe(KEINE_DREHUNG);
    await expect(summary.getByText("Ausblenden", { exact: true })).toBeVisible();
    await expect(summary.getByText("Anzeigen", { exact: true })).toBeHidden();
  } else {
    await expect(details).not.toHaveAttribute("open");
    expect(await drehung(pfeil(details))).toBe(KEINE_DREHUNG);
    await expect(summary.getByText("Anzeigen", { exact: true })).toBeVisible();
    await expect(summary.getByText("Ausblenden", { exact: true })).toBeHidden();
  }
}

/** Neue Seite mit der Sitzung von `page`, aber ohne JavaScript (F1). */
async function seiteOhneJavaScript(browser: Browser, page: Page): Promise<Page> {
  const kontext = await browser.newContext({
    storageState: await page.context().storageState(),
    javaScriptEnabled: false,
  });
  return kontext.newPage();
}

test.describe("Bausteine ListenZeile und Aufklapper (#403)", () => {
  test.skip(!process.env.E2E_BAUSTEINE_403, "nur mit E2E_BAUSTEINE_403=1 (legt Daten an)");
  test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");

  test("AK1/AK2/AK3/F1/F2: Veranstaltungsliste bei 375 px", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);

    const offeneBezeichnung = `${PREFIX} Offen ${LAUF}`;
    const abgeschlosseneBezeichnung = `${PREFIX} Abgeschlossen ${"Sehr-Lange-Bezeichnung-".repeat(3)}${LAUF}`;
    await legeVeranstaltungAn(page, offeneBezeichnung, "2026-10-09");
    const abgeschlossenPfad = await legeVeranstaltungAn(
      page,
      abgeschlosseneBezeichnung,
      "2026-10-08",
    );
    await schliesseAb(page, abgeschlossenPfad);

    await page.goto("/veranstaltung");
    const offen = gruppe(page, /^Offen \(/);
    const abgeschlossen = gruppe(page, /^Abgeschlossen \(/);

    // ── AK3.2 + AK1.2/AK1.3: Offen auf (Pfeil gedreht, „Ausblenden"), Abgeschlossen zu ───────
    await erwarteZustand(offen, true);
    await erwarteZustand(abgeschlossen, false);
    await expect(offen.getByRole("link", { name: new RegExp(`^${offeneBezeichnung}`) })).toBeVisible();

    // ── AK1.5: per Tastatur öffnen, Fokusring sichtbar ───────────────────────────────────
    const summary = zusammenfassung(abgeschlossen);
    await summary.focus();
    await page.keyboard.press("Enter");
    await erwarteZustand(abgeschlossen, true);
    await expect(summary).toBeFocused();
    expect(await summary.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");

    // ── AK3.3 / AK2.5: verblasste Zeile mit unabgeblendetem Badge ──────────────────────────
    const link = abgeschlossen.locator(`a[href="${abgeschlossenPfad}"]`);
    const zeile = link.locator("xpath=..");
    const badge = zeile.getByText("abgeschlossen", { exact: true });
    await expect(badge).toBeVisible();
    expect(await deckkraft(link.locator("span").first())).toBe("0.6");
    expect(await deckkraft(badge)).toBe("1");
    expect(await deckkraft(zeile)).toBe("1");

    // ── F2 / AK2.8: kein horizontaler Überlauf, Tippflächen ≥ 44 px ─────────────────────────
    expect(await horizontalerUeberstand(page)).toBe(0);
    expect(await hoehe(summary)).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
    expect(await hoehe(link)).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: NACHWEIS_LISTE,
      fullPage: true,
      animations: "disabled",
      style: OHNE_DEV_OVERLAY,
    });

    await page.keyboard.press("Enter");
    await erwarteZustand(abgeschlossen, false);

    // ── F1: ohne JavaScript klappt das native <details> samt Hinweiswechsel trotzdem ──────
    const ohneJs = await seiteOhneJavaScript(browser, page);
    await ohneJs.goto("/veranstaltung");
    const abgeschlossenOhneJs = gruppe(ohneJs, /^Abgeschlossen \(/);
    await erwarteZustand(abgeschlossenOhneJs, false);
    await zusammenfassung(abgeschlossenOhneJs).click();
    await erwarteZustand(abgeschlossenOhneJs, true);
    await ohneJs.context().close();
  });

  test("AK4.3/AK5.1/AK5.2/F4: Detail-Teilnehmerzeile und Kassieren", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    const gast = `${PREFIX} Gast ${LAUF}`;
    const detailPfad = await legeVeranstaltungAn(page, `${PREFIX} Kassieren ${LAUF}`, "2026-10-09");
    await page.goto(detailPfad);
    await gastHinzufuegen(page, gast);

    // ── F4 / AK2.4: ⋯-Knopf per Tastatur, ohne die Zeilen-Navigation auszulösen ────────────
    const menueKnopf = page.getByRole("button", { name: `Aktionen für ${gast}` });
    await page.getByRole("link", { name: gast, exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(menueKnopf).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu", { name: `Aktionen für ${gast}` })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${detailPfad}$`));
    await page.keyboard.press("Escape");

    // ── AK5.1: „Abrechnung im Detail" ist ein Aufklapper, zu ─────────────────────────────
    await page.goto(`${detailPfad}/kassieren`);
    const abrechnung = page.locator("details").filter({ hasText: "Abrechnung im Detail" });
    await erwarteZustand(abrechnung, false);
    await zusammenfassung(abrechnung).click();
    await erwarteZustand(abrechnung, true);
    await expect(page.getByRole("heading", { name: "Tagessummen" })).toBeVisible();

    // ── AK5.2: Verzehr-Aufschlüsselung als Aufklapper, Leertext unverändert ────────────────
    const verzehr = page.getByRole("listitem").filter({ hasText: gast }).locator("details");
    await erwarteZustand(verzehr, false);
    await zusammenfassung(verzehr).click();
    await erwarteZustand(verzehr, true);
    await expect(verzehr.getByText("Kein Verzehr erfasst")).toBeVisible();
  });
});
