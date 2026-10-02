import path from "node:path";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { gastHinzufuegen } from "./helpers/detailseite";

// Oberflächen-Nachweis für die aufgeräumte Kassieren-Seite und den Abschluss im Kopf der
// Detailseite (#371, spec-371, ADR-055). Prüft gegen einen echten Server, was jsdom nicht belegen
// kann: die Live-Spende beim echten Tippen, die Rückmeldung nach dem Server-Action-Roundtrip, das
// native `<details>` per Tastatur, die Server-Ablehnung im Bestätigungsdialog und das Layout bei
// 375 px (AK11/AK24).
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: die Spec legt Daten an, der Standardlauf
// fährt in CI gegen die persistente INT-Umgebung und ist dort rein lesend – dieselbe Begründung wie
// bei veranstaltung-detailseite.spec.ts. Nur mit gesetztem E2E_KASSIEREN_371=1 aktiv:
//   pnpm db:up && pnpm db:seed
//   E2E_KASSIEREN_371=1 pnpm exec dotenv -e .env.local -- playwright test e2e/kassieren-summe-abschluss.spec.ts
//
// Kassierte Veranstaltungen lassen sich nicht löschen (#352 AK6) – sie bleiben als `__test__`-
// präfixierter Bestand in der geteilten Dev-DB liegen (#346), wie die angelegten Gäste.

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

const LAUF = String(process.env.E2E_KASSIEREN_371_SUFFIX ?? Date.now().toString(36));
const PREFIX = "__test__E2E371";

// Ablage der Nachweise: `test-results/` ist gitignoret (Lesson #67/#324) – die Screenshots werden
// von Hand an den PR gehängt (Lesson #368), nicht committet.
const NACHWEIS_KASSIEREN = path.resolve(process.cwd(), "test-results/371-kassieren-375.png");
const NACHWEIS_KOPF = path.resolve(process.cwd(), "test-results/371-detailseite-kopf-375.png");

const MIN_TIPP_HOEHE = 44;

// Das Dev-Overlay von Next.js („Rendering …" unten links) läge sonst über dem Nachweis.
const OHNE_DEV_OVERLAY = "nextjs-portal { display: none !important; }";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

// Legt eine frische Veranstaltung an und liefert ihren Detail-Pfad – Identifikation über den
// Link-Zuwachs (Muster aus veranstaltung-detailseite.spec.ts).
async function createVeranstaltung(page: Page, bezeichnung: string): Promise<string> {
  await page.goto("/veranstaltung");
  const anlegen = page.locator("form").filter({ has: page.getByLabel("Bezeichnung") });
  await anlegen.getByLabel("Bezeichnung").fill(bezeichnung);
  await anlegen.getByLabel("Datum").fill("2026-10-05");
  await anlegen.getByLabel("Kasse").selectOption({ label: "Montagsrunde" });

  const links = page.getByRole("link", { name: bezeichnung });
  const before = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  await anlegen.getByRole("button", { name: "Anlegen" }).click();
  await expect(page.getByText("Veranstaltung angelegt.")).toBeVisible();
  await expect(links).toHaveCount(before.length + 1);
  const after = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  const neu = after.find((href) => href && !before.includes(href));
  expect(neu, "neue Veranstaltung im Listen-Link gefunden").toBeTruthy();
  return neu as string;
}

// Ein Getränk für die Person erfassen – irgendein Artikel des Standardkatalogs (Migration 0004);
// der Betrag wird danach von der Kassieren-Seite gelesen, nicht hier angenommen.
async function erfasseEinGetraenk(page: Page, detailPfad: string, name: string) {
  await page.goto(`${detailPfad}/verzehr`);
  await page
    .getByRole("group", { name: "Teilnehmer auswählen" })
    .getByRole("button", { name, exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(name);
  await page
    .getByRole("group", { name: "Kategorie wählen" })
    .getByRole("button", { name: "Getränke" })
    .click();
  const erhoehen = page.getByRole("button", { name: "Menge erhöhen" }).first();
  await erhoehen.click();
  await expect(page.locator("form > span").first()).toHaveText("1");
}

function summenKarte(page: Page) {
  return page.getByRole("region", { name: "Kassenstand" });
}

function kassierZeile(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name }).first();
}

// Verzehr-Gesamt einer Zeile in Cent – aus der Anzeige gelesen („3,50 €").
async function verzehrGesamtCents(zeile: Locator): Promise<number> {
  const text = await zeile
    .locator("dt", { hasText: "Verzehr-Gesamt" })
    .locator("xpath=following-sibling::dd")
    .innerText();
  const [euro, cent] = text.replace(/[^\d,]/g, "").split(",");
  return Number(euro) * 100 + Number(cent);
}

function alsEuroEingabe(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;
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

function abrechnungImDetail(page: Page) {
  return page.locator("details").filter({ hasText: "Abrechnung im Detail" });
}

test.describe("Kassieren: Summe oben, Spende live, Abschluss im Kopf (#371)", () => {
  test.skip(!process.env.E2E_KASSIEREN_371, "nur mit E2E_KASSIEREN_371=1 (legt Daten an)");
  test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");

  test("AK1/AK6/AK8/AK9/AK11/AK12/AK14/AK15/AK17: Kassieren-Seite bei 375 px", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);

    const gast = `${PREFIX} Gast ${LAUF}`;
    const ohneVerzehr = `${PREFIX} Ohne ${LAUF}`;
    const detailPfad = await createVeranstaltung(page, `${PREFIX} Kassieren ${LAUF}`);
    await page.goto(detailPfad);
    await gastHinzufuegen(page, gast);
    await gastHinzufuegen(page, ohneVerzehr);
    await erfasseEinGetraenk(page, detailPfad, gast);

    await page.goto(`${detailPfad}/kassieren`);

    // ── AK1/AK6: Summenkarte über der Teilnehmerliste, eine Zeile offen ────────────────────
    const karte = summenKarte(page);
    await expect(karte).toBeVisible();
    const karteOben = (await karte.boundingBox())!.y;
    const listeOben = (await page.getByRole("heading", { name: /^Teilnehmer \(/ }).boundingBox())!
      .y;
    expect(karteOben).toBeLessThan(listeOben);
    await expect(karte).toContainText("1 von 2 bezahlt");
    await expect(karte).toContainText("Noch 1 offen");

    // ── AK17: kein Statuswechsel auf der Kassieren-Seite ──────────────────────────────────
    await expect(page.getByRole("button", { name: /abschließen|Wieder öffnen/i })).toHaveCount(0);

    // ── AK8/AK9: Spende live beim Tippen, unlesbare Eingabe → 0,00 € ohne Fehler ──────────
    const zeile = kassierZeile(page, gast);
    const verzehr = await verzehrGesamtCents(zeile);
    const feld = zeile.getByLabel("Erhalten (EUR)");
    const spende = zeile.getByTestId("spende-live");
    await feld.fill(alsEuroEingabe(verzehr + 100));
    await expect(spende).toHaveText(/^1,00\s€$/);
    await feld.fill("abc");
    await expect(spende).toHaveText(/^0,00\s€$/);
    await expect(zeile.getByRole("alert")).toHaveCount(0);

    // ── AK12: Rückmeldung mit Betrag und Spende, Summenkarte folgt ────────────────────────
    await feld.fill(alsEuroEingabe(verzehr + 100));
    await zeile.getByRole("button", { name: "Kassieren" }).click();
    await expect(zeile.getByRole("status")).toHaveText(/erhalten, davon 1,00\s€ Spende/);
    await expect(karte).toContainText("2 von 2 bezahlt");
    await expect(karte).toContainText("Alles bezahlt");

    // ── AK14/AK15: „Abrechnung im Detail" eingeklappt, per Tastatur aufklappbar ───────────
    const tagessummen = page.getByRole("heading", { name: "Tagessummen" });
    await expect(tagessummen).toBeHidden();
    const zusammenfassung = abrechnungImDetail(page).locator("summary");
    await zusammenfassung.focus();
    await page.keyboard.press("Enter");
    await expect(tagessummen).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(tagessummen).toBeHidden();

    // ── AK11: kein horizontaler Scroll, Tipp-Ziele ≥ 44 px ────────────────────────────────
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: NACHWEIS_KASSIEREN,
      animations: "disabled",
      style: OHNE_DEV_OVERLAY,
    });
    expect(await horizontalerUeberstand(page)).toBe(0);
    expect(await hoehe(zeile.getByRole("button", { name: "Kassieren" }))).toBeGreaterThanOrEqual(
      MIN_TIPP_HOEHE,
    );
    expect(await hoehe(feld)).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
    expect(await hoehe(zusammenfassung)).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
    expect(
      await hoehe(karte.getByRole("link", { name: "Abschluss auf der Veranstaltungsseite" })),
    ).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);

    // ── AK6: der Link führt zur Detailseite; AK24: Kopf bricht bei 375 px um ──────────────
    await karte.getByRole("link", { name: "Abschluss auf der Veranstaltungsseite" }).click();
    await expect(page).toHaveURL(new RegExp(`${detailPfad}$`));
    const ausloeser = page.getByRole("button", { name: "Veranstaltung abschließen" });
    await expect(ausloeser).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: NACHWEIS_KOPF, animations: "disabled", style: OHNE_DEV_OVERLAY });
    expect(await horizontalerUeberstand(page)).toBe(0);
  });

  test("AK10/AK18–AK22/FS1: Abschließen und Wieder öffnen mit Bestätigung", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    const gast = `${PREFIX} Abschluss ${LAUF}`;
    const detailPfad = await createVeranstaltung(page, `${PREFIX} Abschluss ${LAUF}`);
    await page.goto(detailPfad);
    await gastHinzufuegen(page, gast);
    await erfasseEinGetraenk(page, detailPfad, gast);

    // ── AK18/AK20/FS1: Dialog nennt die offene Zeile, der Server lehnt trotzdem ab ─────────
    await page.goto(detailPfad);
    const ausloeser = page.getByRole("button", { name: "Veranstaltung abschließen" });
    await ausloeser.click();
    const abschluss = page.getByRole("dialog", { name: "Veranstaltung abschließen?" });
    await expect(abschluss).toContainText(/1 Zeile noch offen, zusammen \d+,\d{2}\s€/);
    await abschluss.getByRole("button", { name: "Abschließen", exact: true }).click();
    await expect(abschluss.getByRole("alert")).toHaveText(/Abschluss nicht möglich: 1 Zeile/);
    await expect(abschluss).toBeVisible();

    // ── AK19: Abbrechen ändert nichts ─────────────────────────────────────────────────────
    await abschluss.getByRole("button", { name: "Abbrechen" }).click();
    await expect(abschluss).toBeHidden();
    await expect(ausloeser).toBeFocused();

    // Zeile kassieren – danach ist nichts mehr offen.
    await page.goto(`${detailPfad}/kassieren`);
    const zeile = kassierZeile(page, gast);
    await zeile.getByLabel("Erhalten (EUR)").fill(alsEuroEingabe(await verzehrGesamtCents(zeile)));
    await zeile.getByRole("button", { name: "Kassieren" }).click();
    await expect(summenKarte(page)).toContainText("Alles bezahlt");

    // ── AK21: ohne offene Zeile kein Offen-Hinweis; AK19: erst die Bestätigung schließt ab ─
    await page.goto(detailPfad);
    await ausloeser.click();
    await expect(abschluss).toBeVisible();
    await expect(abschluss).not.toContainText("noch offen");
    await abschluss.getByRole("button", { name: "Abschließen", exact: true }).click();
    await expect(abschluss).toBeHidden();
    const wiederOeffnen = page.getByRole("button", { name: "Wieder öffnen", exact: true });
    await expect(wiederOeffnen).toBeVisible();
    await expect(page.getByRole("heading", { name: "Abschlussbericht" })).toBeVisible();

    // ── AK10: die Kassieren-Seite ist jetzt schreibgeschützt ──────────────────────────────
    await page.goto(`${detailPfad}/kassieren`);
    await expect(page.getByLabel("Erhalten (EUR)")).toHaveCount(0);
    await expect(summenKarte(page)).toBeVisible();

    // ── AK22: Wieder öffnen mit Bestätigung, protokolliert ───────────────────────────────
    await page.goto(detailPfad);
    await wiederOeffnen.click();
    const oeffnen = page.getByRole("dialog", { name: "Veranstaltung wieder öffnen?" });
    await oeffnen.getByRole("button", { name: "Wieder öffnen", exact: true }).click();
    await expect(oeffnen).toBeHidden();
    await expect(ausloeser).toBeVisible();

    await page.goto(`${detailPfad}/kassieren`);
    await abrechnungImDetail(page).getByText("Abrechnung im Detail", { exact: true }).click();
    const protokoll = page
      .getByRole("heading", { name: "Protokoll" })
      .locator("xpath=..")
      .getByRole("listitem");
    // Das Protokoll listet den jüngsten Eintrag zuerst.
    await expect(protokoll).toHaveCount(2);
    await expect(protokoll.nth(0)).toContainText("Wiedereröffnet");
    await expect(protokoll.nth(1)).toContainText("Abgeschlossen");
  });
});
