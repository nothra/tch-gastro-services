import path from "node:path";
import { test, expect, type Locator, type Page } from "@playwright/test";

// Oberflächen-Nachweis für die neu geordnete Detailseite (#369, spec-369). Prüft gegen einen
// echten Server, was jsdom nicht belegen kann: das native modale `<dialog>` (Escape, Fokus-
// Rücksprung), die echte Mehrfach-Anlage über den Server-Action-Roundtrip, das bestätigte
// Entfernen, den Umzug von Abschließen/Wieder öffnen und das Layout bei 375 px (AK27/AK28).
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: die Spec legt Daten an, der Standardlauf
// fährt in CI gegen die persistente INT-Umgebung und ist dort rein lesend – dieselbe Begründung wie
// bei veranstaltung-bearbeiten-loeschen.spec.ts. Nur mit gesetztem E2E_DETAILSEITE_369=1 aktiv:
//   pnpm db:up && pnpm db:seed
//   E2E_DETAILSEITE_369=1 pnpm exec dotenv -e .env.local -- playwright test e2e/veranstaltung-detailseite.spec.ts
//
// Jeder Test räumt seine Veranstaltung am Ende über den Lösch-Weg wieder ab. Alle angelegten Namen
// tragen das `__test__`-Präfix der DB-Integrationstests, weil die Spec in dieselbe geteilte Dev-DB
// schreibt (#346); angelegte Stammteilnehmer und Gäste bleiben als präfixierter Bestand liegen.

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

// Lauf-Suffix: trennt wiederholte AUSFÜHRUNGEN auf derselben DB. Die Tests untereinander trennen
// sich über ihre Basisnamen.
const LAUF = String(process.env.E2E_DETAILSEITE_369_SUFFIX ?? Date.now().toString(36));
const PREFIX = "__test__E2E369";

// Ablage des AK27-Nachweises: `test-results/` ist gitignoret (Lesson #67/#324) – der Screenshot
// wird von Hand an den PR gehängt (Lesson #368), nicht committet. Playwright leert das Verzeichnis
// zu Beginn jedes Laufs; den Nachweis also direkt nach einem Lauf dieser Spec abholen.
const NACHWEIS = path.resolve(process.cwd(), "test-results/369-detailseite-375.png");

const MIN_TIPP_HOEHE = 44;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

// Legt eine frische Veranstaltung an und liefert ihren Detail-Pfad – Identifikation über den
// Link-Zuwachs (Muster aus veranstaltung-bearbeiten-loeschen.spec.ts).
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

async function createStammteilnehmer(page: Page, name: string) {
  await page.goto("/verwaltung/teilnehmer");
  await expect(page.getByLabel("Anzeigename")).toHaveValue("");
  await page.getByLabel("Anzeigename").fill(name);
  await page.getByRole("button", { name: "Anlegen" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

function teilnehmerDialog(page: Page) {
  return page.getByRole("dialog", { name: "Teilnehmer hinzufügen" });
}

async function oeffneTeilnehmerDialog(page: Page) {
  await page.getByRole("button", { name: "+ Teilnehmer" }).click();
  await expect(teilnehmerDialog(page)).toBeVisible();
}

// „Neuer Gast" im „+ Teilnehmer"-Dialog (AK13).
async function gastHinzufuegen(page: Page, name: string) {
  await oeffneTeilnehmerDialog(page);
  const gast = teilnehmerDialog(page).getByRole("group", { name: "Neuer Gast" });
  await gast.getByLabel("Name").fill(name);
  await gast.getByRole("button", { name: "Gast hinzufügen" }).click();
  await expect(teilnehmerDialog(page)).toBeHidden();
  await expect(teilnehmerZeile(page, name)).toBeVisible();
}

function teilnehmerListe(page: Page) {
  return page.getByRole("region", { name: /^Teilnehmer \(/ });
}

function teilnehmerZeile(page: Page, name: string) {
  return teilnehmerListe(page).getByRole("listitem").filter({ hasText: name });
}

async function oeffneEinstellungen(page: Page) {
  await page.getByText("Einstellungen", { exact: true }).click();
}

// Aufräumen über die bestehende Lösch-Funktion (AK23) – nur ohne Verzehr/Kassiertes möglich.
async function loescheVeranstaltung(page: Page, detailPfad: string) {
  await page.goto(detailPfad);
  await oeffneEinstellungen(page);
  await page.getByRole("button", { name: "Veranstaltung löschen", exact: true }).click();
  await page.getByRole("button", { name: "Endgültig löschen" }).click();
  await expect(page).toHaveURL(/\/veranstaltung$/);
}

async function hoehe(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  expect(box, "Element hat eine Box").not.toBeNull();
  return box!.height;
}

test.describe("Veranstaltungs-Detailseite neu geordnet (#369)", () => {
  test.skip(!process.env.E2E_DETAILSEITE_369, "nur mit E2E_DETAILSEITE_369=1 (legt Daten an)");
  test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");

  test("AK27/AK28: bei 375 × 812 px Kopf, Kacheln und erste Zeile ohne Scrollen", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);

    const detailPfad = await createVeranstaltung(page, `${PREFIX} Mobil ${LAUF}`);
    await page.goto(detailPfad);
    for (const nummer of [1, 2, 3]) await gastHinzufuegen(page, `${PREFIX} Gast${nummer} ${LAUF}`);

    await page.reload();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: NACHWEIS, animations: "disabled" });

    // ── AK27: Kopf, alle drei kompletten Kacheln, mindestens eine vollständige Zeile ────────
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport({ ratio: 1 });
    const kacheln = page.getByRole("navigation", { name: "Arbeitsschritte" }).getByRole("link");
    await expect(kacheln).toHaveCount(3);
    for (const kachel of await kacheln.all()) await expect(kachel).toBeInViewport({ ratio: 1 });
    await expect(teilnehmerListe(page).getByRole("listitem").first()).toBeInViewport({ ratio: 1 });

    // ── AK28: kein horizontaler Scroll ─────────────────────────────────────────────────────
    const ueberstand = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(ueberstand).toBe(0);

    // ── AK28: Tipp-Ziele mindestens 44 px hoch ─────────────────────────────────────────────
    for (const kachel of await kacheln.all()) {
      expect(await hoehe(kachel)).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
    }
    expect(await hoehe(page.getByRole("button", { name: "+ Teilnehmer" }))).toBeGreaterThanOrEqual(
      MIN_TIPP_HOEHE,
    );
    const menue = page.getByRole("button", { name: `Aktionen für ${PREFIX} Gast1 ${LAUF}` });
    const menueBox = await menue.boundingBox();
    expect(menueBox!.height).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
    expect(menueBox!.width).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);

    await oeffneTeilnehmerDialog(page);
    for (const knopf of await teilnehmerDialog(page).getByRole("button").all()) {
      expect(await hoehe(knopf)).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
    }
    await page.keyboard.press("Escape");

    await loescheVeranstaltung(page, detailPfad);
  });

  test("AK10–AK16: ein Dialog für Stammteilnehmer (Mehrfachauswahl) und neuen Gast", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);

    // Eigener Suchbegriff: die parallel laufenden Tests legen Gäste (= aktive Stammteilnehmer) mit
    // demselben Lauf-Suffix an – eine Suche nur nach LAUF fände auch sie.
    const suchbegriff = `Auswahl-${LAUF}`;
    const anna = `${PREFIX} Anna ${suchbegriff}`;
    const bernd = `${PREFIX} Bernd ${suchbegriff}`;
    await createStammteilnehmer(page, anna);
    await createStammteilnehmer(page, bernd);
    const detailPfad = await createVeranstaltung(page, `${PREFIX} Dialog ${LAUF}`);
    await page.goto(detailPfad);

    // ── AK8: die alten Formulare sind verschwunden ─────────────────────────────────────────
    await expect(page.getByRole("button", { name: "Anlegen & erfassen" })).toHaveCount(0);

    // ── AK14: Hinzufügen ohne Auswahl → Dialog bleibt offen, nennt den Grund ───────────────
    await oeffneTeilnehmerDialog(page);
    const auswahl = teilnehmerDialog(page).getByRole("group", { name: "Stammteilnehmer" });
    await auswahl.getByRole("button", { name: "Hinzufügen" }).click();
    await expect(auswahl.getByRole("alert")).toHaveText(/Bitte mindestens einen Teilnehmer wählen/);
    await expect(teilnehmerDialog(page)).toBeVisible();

    // ── AK15: Escape schließt ohne Änderung, Fokus zurück auf „+ Teilnehmer" ───────────────
    await page.keyboard.press("Escape");
    await expect(teilnehmerDialog(page)).toBeHidden();
    await expect(page.getByRole("button", { name: "+ Teilnehmer" })).toBeFocused();
    await expect(page.getByRole("heading", { name: "Teilnehmer (0)" })).toBeVisible();

    // ── AK11/AK12: suchen, beide anhaken, gemeinsam hinzufügen ─────────────────────────────
    await oeffneTeilnehmerDialog(page);
    await auswahl.getByRole("searchbox", { name: "Suchen" }).fill(suchbegriff.toUpperCase());
    await expect(auswahl.getByRole("checkbox")).toHaveCount(2);
    await auswahl.getByRole("checkbox", { name: anna }).check();
    await auswahl.getByRole("checkbox", { name: bernd }).check();
    await auswahl.getByRole("button", { name: "Hinzufügen" }).click();
    await expect(teilnehmerDialog(page)).toBeHidden();
    await expect(page.getByRole("heading", { name: "Teilnehmer (2)" })).toBeVisible();
    await expect(teilnehmerZeile(page, anna)).toBeVisible();
    await expect(teilnehmerZeile(page, bernd)).toBeVisible();

    // ── AK11: kein Treffer → Leerzustand; bereits Erfasste stehen nicht mehr zur Wahl ──────
    await oeffneTeilnehmerDialog(page);
    await auswahl.getByRole("searchbox", { name: "Suchen" }).fill(suchbegriff);
    await expect(auswahl.getByText(/Kein Stammteilnehmer passt zu/)).toBeVisible();
    await page.getByRole("button", { name: "Abbrechen" }).click();

    // ── AK13: neuer Gast über denselben Dialog ─────────────────────────────────────────────
    await gastHinzufuegen(page, `${PREFIX} Gast ${LAUF}`);
    await expect(page.getByRole("heading", { name: "Teilnehmer (3)" })).toBeVisible();

    await loescheVeranstaltung(page, detailPfad);
  });

  test("AK17–AK20: Name führt in die Verzehr-Erfassung, Entfernen erst nach Bestätigung", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);

    const gast = `${PREFIX} Entfernen ${LAUF}`;
    const detailPfad = await createVeranstaltung(page, `${PREFIX} Zeile ${LAUF}`);
    await page.goto(detailPfad);
    await gastHinzufuegen(page, gast);

    // ── AK18/AK19: Menü → Entfernen öffnet die Bestätigung mit dem Namen ───────────────────
    const bestaetigung = page.getByRole("dialog", { name: "Teilnehmer entfernen?" });
    async function oeffneBestaetigung() {
      await page.getByRole("button", { name: `Aktionen für ${gast}` }).click();
      await page.getByRole("menuitem", { name: "Entfernen" }).click();
      await expect(bestaetigung).toBeVisible();
      await expect(bestaetigung).toContainText(gast);
    }

    // ── AK19: Abbrechen und Escape ändern nichts – auch nach einem echten Neuladen ─────────
    await oeffneBestaetigung();
    await bestaetigung.getByRole("button", { name: "Abbrechen" }).click();
    await expect(bestaetigung).toBeHidden();
    await oeffneBestaetigung();
    await page.keyboard.press("Escape");
    await expect(bestaetigung).toBeHidden();
    await page.reload();
    await expect(teilnehmerZeile(page, gast)).toBeVisible();

    // ── AK17: Tipp auf den Namen → Verzehr-Seite mit Personenbezug ─────────────────────────
    await teilnehmerZeile(page, gast).getByRole("link", { name: gast }).click();
    await expect(page).toHaveURL(/\/verzehr\?zeile=/);
    await page.goto(detailPfad);

    // ── AK19: erst die Bestätigung entfernt ────────────────────────────────────────────────
    await oeffneBestaetigung();
    await bestaetigung.getByRole("button", { name: "Entfernen" }).click();
    await expect(bestaetigung).toBeHidden();
    await expect(teilnehmerZeile(page, gast)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Teilnehmer (0)" })).toBeVisible();

    await loescheVeranstaltung(page, detailPfad);
  });

  test("AK21/AK22/AK24–AK26: Einstellungen eingeklappt, Link & QR im Dialog, Abschließen bei Kassieren", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);

    const detailPfad = await createVeranstaltung(page, `${PREFIX} Einstellungen ${LAUF}`);
    await page.goto(detailPfad);

    // ── AK24: weder Abschließen noch Wieder öffnen auf der Detailseite ─────────────────────
    await expect(page.getByRole("button", { name: /Abschließen|Wieder öffnen/ })).toHaveCount(0);

    // ── AK21/AK22: eingeklappt; Link & QR erst im Dialog sichtbar ──────────────────────────
    const link = page.getByRole("textbox", { name: "Selbstbedienungs-Link" });
    await expect(page.getByRole("button", { name: "Link & QR teilen" })).toBeHidden();
    await oeffneEinstellungen(page);
    await expect(link).toHaveCount(0);
    await page.getByRole("button", { name: "Link & QR teilen" }).click();
    const zugang = page.getByRole("dialog", { name: "Link & QR teilen" });
    await expect(zugang.getByRole("textbox", { name: "Selbstbedienungs-Link" })).toHaveValue(
      /\/theke\//,
    );
    await expect(zugang.getByRole("img", { name: /QR-Code/ })).toBeVisible();
    await zugang.getByRole("button", { name: "Schließen" }).click();
    await expect(zugang).toBeHidden();

    // ── AK25: Abschließen steht am Ende der Kassieren-Seite ────────────────────────────────
    await page.goto(`${detailPfad}/kassieren`);
    const abschliessen = page.getByRole("button", { name: "Abschließen" });
    await expect(abschliessen).toBeVisible();
    const istLetzterBlock = await abschliessen.evaluate(
      (knopf) => document.querySelector("main")?.lastElementChild?.contains(knopf) ?? false,
    );
    expect(istLetzterBlock).toBe(true);
    await abschliessen.click();

    // ── AK26: Wieder öffnen am selben Platz ────────────────────────────────────────────────
    const wiederOeffnen = page.getByRole("button", { name: "Wieder öffnen" });
    await expect(wiederOeffnen).toBeVisible();

    // ── AK6/AK7: Detailseite zeigt den Bericht, keine Einstellungen ────────────────────────
    await page.goto(detailPfad);
    await expect(page.getByRole("heading", { name: "Abschlussbericht" })).toBeVisible();
    await expect(page.getByText("Einstellungen", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Teilnehmer" })).toHaveCount(0);

    // Aufräumen: wieder öffnen, dann löschen.
    await page.goto(`${detailPfad}/kassieren`);
    await wiederOeffnen.click();
    await expect(abschliessen).toBeVisible();
    await loescheVeranstaltung(page, detailPfad);
  });
});
