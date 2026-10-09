import { test, expect, type Locator, type Page } from "@playwright/test";
import { teilnehmerAnlegenUndHinzufuegen, kopfAktion } from "./helpers/detailseite";
import { legeVeranstaltungAn } from "./helpers/listenseiten";

// Oberflächen-Nachweis der Verzehr-Einzelansicht (#370, spec-370, ADR-054). Prüft gegen einen
// echten Server, was jsdom nicht kann (ADR-054 D5): gemessene Touch-Ziele (AK4.1/AK4.2), den
// Kopf bei 375 px mit langem Namen (AK1.2), sticky Kopf und fixierte Fußleiste (AK1.3/AK5.1,
// AK7.2), kein horizontaler Seiten-Scroll in hell und dunkel (AK7.2) – und beide Zugangswege.
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: die Spec legt Daten an (Veranstaltung +
// Gäste), und der Standardlauf fährt in CI gegen die persistente INT-Umgebung. Nur mit gesetztem
// E2E_VERZEHR_370=1 aktiv. Lokal startet Playwright den Dev-Server dieses Checkouts selbst
// (webServer auf localhost:3000) – vorher sicherstellen, dass dort kein fremder Server läuft, sonst
// wird er still mitbenutzt (Lesson #368). Nicht über `127.0.0.1` ausweichen: `next dev` sperrt
// seine Dev-Ressourcen für fremde Hosts, die Seite hydriert nicht und Client-Knöpfe bleiben stumm.
//   pnpm db:up && pnpm db:seed
//   E2E_VERZEHR_370=1 pnpm test:e2e e2e/verzehr-einzelansicht.spec.ts
// Die Nachweis-Screenshots landen unter test-results/ (gitignoriert).

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

// Lauf-Suffix, damit wiederholte Läufe auf derselben lokalen DB nicht auf Altbestand matchen; das
// Präfix `__test__` kennzeichnet die Daten als Wegwerf-Daten (Lesson #346).
const LAUF = String(process.env.E2E_VERZEHR_370_SUFFIX ?? Date.now());
const LANGER_NAME = `__test__ Familie Müller-Lüdenscheidt-Hoffmann ${LAUF}`;
const ZWEITE = `__test__ Zweite ${LAUF}`;

const TOUCH_MIN_PX = 44;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

// Legt eine Veranstaltung an und liefert den Detail-Pfad (Link-Zuwachs, wie in
// wechsel-verzehr-kassieren.spec.ts – eindeutig auch bei gleichnamigem Altbestand).
function createVeranstaltung(page: Page, bezeichnung: string): Promise<string> {
  return legeVeranstaltungAn(page, bezeichnung, "2026-10-02");
}

function chips(page: Page) {
  return page.getByRole("group", { name: "Teilnehmer auswählen" });
}

function umschalter(page: Page) {
  return page.getByRole("group", { name: "Kategorie wählen" });
}

function naechstePerson(page: Page) {
  return page.getByRole("button", { name: "Nächste Person →" });
}

// Auto-wiederholende Assertion statt einmaligem `innerText()`: direkt nach Laden/Neuladen rendert
// die Theke serverseitig Schritt 1 des Gates mit zwei h2 („Wer bist du?" + „Bisher erfasst"), erst
// nach der Hydrierung steht der Kopf der Einzelansicht allein da.
async function expectAktivePerson(page: Page, name: string) {
  await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(1);
}

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error("Element ohne Layout-Box");
  return rect;
}

// Gemessene Mindestmaße (AK4.1/AK4.2, „gemessen, nicht nur Klasse").
async function expectMindestmass(locator: Locator, { breite }: { breite: boolean }) {
  const anzahl = await locator.count();
  expect(anzahl, "mindestens ein Element zu messen").toBeGreaterThan(0);
  for (let i = 0; i < anzahl; i++) {
    const rect = await box(locator.nth(i));
    expect(rect.height).toBeGreaterThanOrEqual(TOUCH_MIN_PX);
    if (breite) expect(rect.width).toBeGreaterThanOrEqual(TOUCH_MIN_PX);
  }
}

// AK1a.3/AK7.2: kein horizontaler Seiten-Scroll – die Chip-Leiste scrollt in sich selbst.
async function expectKeinHorizontalerSeitenScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

// Zeilenzahl eines Text-Elements aus Höhe und berechneter Zeilenhöhe.
async function zeilenzahl(locator: Locator) {
  return locator.evaluate((el) => {
    const zeilenhoehe = parseFloat(getComputedStyle(el).lineHeight);
    return Math.round(el.getBoundingClientRect().height / zeilenhoehe);
  });
}

test.describe("Verzehr-Einzelansicht (#370)", () => {
  test.skip(!process.env.E2E_VERZEHR_370, "nur mit E2E_VERZEHR_370=1 (legt Daten an)");
  test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");
  test.use({ viewport: { width: 375, height: 667 }, locale: "de-DE" });
  // Seriell: unter `fullyParallel` liefe `beforeAll` je Worker und legte die Veranstaltung mehrfach
  // gleichnamig an.
  test.describe.configure({ mode: "serial" });

  let detailPfad = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);
    detailPfad = await createVeranstaltung(page, `__test__ Einzelansicht ${LAUF}`);
    await page.goto(detailPfad);
    await teilnehmerAnlegenUndHinzufuegen(page, LANGER_NAME);
    await teilnehmerAnlegenUndHinzufuegen(page, ZWEITE);
    await page.close();
  });

  test("Veranstalter: Maße, Kopf, sticky Block, Fußleiste und Umlauf bei 375 px", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto(`${detailPfad}/verzehr`);
    await expect(page.getByRole("heading", { name: /^Verzehr · / })).toBeVisible();

    // ── AK1a.1/AK1a.5: ohne Personenbezug ist die erste Person aktiv ───────────────────────
    await expectAktivePerson(page, LANGER_NAME);
    await expect(chips(page).getByRole("button", { pressed: true })).toHaveCount(1);

    // ── AK4.1/AK4.2: gemessene Touch-Ziele ─────────────────────────────────────────────────
    await expectMindestmass(page.getByRole("button", { name: "Menge erhöhen" }), { breite: true });
    await expectMindestmass(page.getByRole("button", { name: "Menge verringern" }), {
      breite: true,
    });
    await expectMindestmass(chips(page).getByRole("button"), { breite: true });
    await expectMindestmass(umschalter(page).getByRole("button"), { breite: false });

    // ── AK4.3: „−" bei Menge 0 deaktiviert ─────────────────────────────────────────────────
    const erstesMinus = page.getByRole("button", { name: "Menge verringern" }).first();
    await expect(erstesMinus).toBeDisabled();

    // ── AK1.2: langer Name höchstens zweizeilig, Gesamt einzeilig ──────────────────────────
    const name = page.getByRole("heading", { level: 2 });
    expect(await zeilenzahl(name)).toBeLessThanOrEqual(2);
    // Auf den Kopf begrenzt (Elternblock der Namens-Überschrift), nicht auf die Artikelpreise.
    const gesamt = name.locator("..").getByText(/^\d+,\d{2} €$/);
    expect(await zeilenzahl(gesamt)).toBe(1);

    // ── AK1.4: Kopf zeigt nach Server-Bestätigung den neuen Wert; „−" wird aktiv ───────────
    const gesamtVorher = await gesamt.innerText();
    await page.getByRole("button", { name: "Menge erhöhen" }).first().click();
    await expect(gesamt).not.toHaveText(gesamtVorher);
    await expect(erstesMinus).toBeEnabled();
    // AK1a.4: Marke „hat Verzehr" am Chip, mit Textalternative.
    await expect(
      chips(page).getByRole("button", { name: `${LANGER_NAME}, Verzehr erfasst` }),
    ).toBeVisible();

    await expectKeinHorizontalerSeitenScroll(page);
    await page.screenshot({ path: "test-results/370-veranstalter-hell.png" });

    // ── AK1.3: nach dem Scrollen bleiben Chips, Kopf und Umschalter oben stehen ────────────
    const scrollbar = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight,
    );
    expect(scrollbar, "Vorbedingung: Liste länger als der Bildschirm").toBe(true);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }));
    for (const sticky of [chips(page), name, umschalter(page)]) {
      await expect(sticky).toBeInViewport();
    }

    // ── AK5.1/AK7.2: Fußleiste fixiert, verdeckt am Seitenende keine Zeile ──────────────────
    const fussleiste = page.getByRole("navigation", { name: "Weiter" });
    await expect(naechstePerson(page)).toBeInViewport();
    const letzterStepper = await box(page.getByRole("button", { name: "Menge erhöhen" }).last());
    expect(letzterStepper.y + letzterStepper.height).toBeLessThanOrEqual((await box(fussleiste)).y);
    // AK5.5: Kassieren-Weg in der Fußleiste, als Touch-Ziel.
    await expectMindestmass(fussleiste.getByRole("link", { name: "Kassieren" }), {
      breite: false,
    });

    // ── AK2.4/AK5.1/AK5.3: Kategorie bleibt, nächste Person beginnt oben ───────────────────
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await umschalter(page).getByRole("button", { name: "Kaffee" }).click();
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }));
    await naechstePerson(page).click();
    await expectAktivePerson(page, ZWEITE);
    await expect(umschalter(page).getByRole("button", { name: "Kaffee" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    // ── AK5.2: Umlauf von der letzten zur ersten Person ────────────────────────────────────
    await naechstePerson(page).click();
    await expectAktivePerson(page, LANGER_NAME);

    // ── AK7.2: dunkel ebenfalls ohne Seiten-Scroll ─────────────────────────────────────────
    await page.emulateMedia({ colorScheme: "dark" });
    await expectKeinHorizontalerSeitenScroll(page);
    await page.screenshot({ path: "test-results/370-veranstalter-dunkel.png" });
  });

  test("Veranstalter: unbekannter Personenbezug fällt auf die erste Person (AK1a.5, FS3)", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${detailPfad}/verzehr?zeile=00000000-0000-4000-8000-000000000000`);
    await expectAktivePerson(page, LANGER_NAME);
  });

  test("Theke: Nur-Lese-Liste vor der Namenswahl, danach Einzelansicht ohne Kassieren", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);
    await page.goto(detailPfad);
    await kopfAktion(page, "Link & QR teilen").click();
    const link = await page
      .getByRole("dialog", { name: "Link & QR teilen" })
      .getByLabel("Selbstbedienungs-Link", { exact: true })
      .inputValue();

    // Theke ohne Anmeldung: frischer Kontext ohne Session und ohne gemerkte Identität.
    const theke = await page
      .context()
      .browser()!
      .newPage({ viewport: { width: 375, height: 667 } });
    await theke.goto(new URL(link).pathname);

    // ── AK6.3: Wahl-Frage führt, darunter Name + Gesamt, keine Erfassung ───────────────────
    await expect(theke.getByRole("combobox", { name: "Wer bist du?" })).toBeVisible();
    const liste = theke.getByRole("list", { name: "Bisher erfasst" });
    await expect(liste.getByRole("listitem")).toHaveCount(2);
    await expect(theke.getByRole("button", { name: "Menge erhöhen" })).toHaveCount(0);

    // ── AK1a.6: nach „Wer?" und „Für wen?" ist das Ziel aktiv ──────────────────────────────
    await theke.getByRole("combobox", { name: "Wer bist du?" }).selectOption({ label: ZWEITE });
    await theke
      .getByRole("combobox", { name: "Für wen möchtest du einen Verzehr erfassen?" })
      .selectOption({ label: `Für mich (${ZWEITE})` });
    await expectAktivePerson(theke, ZWEITE);

    // ── AK5.5/AK6.1: dieselbe Einzelansicht, aber ohne Kassieren-Weg ───────────────────────
    await expect(naechstePerson(theke)).toBeVisible();
    await expect(theke.getByRole("link", { name: /Kassieren/ })).toHaveCount(0);
    await expectMindestmass(theke.getByRole("button", { name: "Menge erhöhen" }), {
      breite: true,
    });
    await expectKeinHorizontalerSeitenScroll(theke);
    await theke.screenshot({ path: "test-results/370-theke-hell.png" });

    // ── AK1a.2: Wechsel merkt das Ziel geräte-lokal (übersteht Neuladen) ───────────────────
    await naechstePerson(theke).click();
    await expectAktivePerson(theke, LANGER_NAME);
    await theke.reload();
    await expectAktivePerson(theke, LANGER_NAME);

    await theke.emulateMedia({ colorScheme: "dark" });
    await expectKeinHorizontalerSeitenScroll(theke);
    await theke.screenshot({ path: "test-results/370-theke-dunkel.png" });
    await theke.close();
  });
});
