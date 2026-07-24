import path from "node:path";
import { mkdirSync } from "node:fs";
import { test, expect, type Page, type Locator } from "@playwright/test";

// Capture-Spec für die Veranstalter-Bedienungsanleitung (#221). Fährt den kompletten
// Veranstalter-Workflow gegen den lokalen Dev-Server durch, legt dabei die Demo-Daten live über
// die Oberfläche an (der Seed-Admin trägt beide Rollen) und speichert je Schritt einen echten
// Screenshot nach docs/anleitung/veranstalter/bilder/. Die Assertions machen die Capture zugleich
// zu einem End-to-End-Smoke des Veranstalter-Flows.
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: sie schreibt Bilder ins Repo und legt
// Daten an. Nur mit gesetztem CAPTURE_ANLEITUNG=1 aktiv (sonst übersprungen). Neu erzeugen:
//   pnpm db:up && pnpm db:seed
//   CAPTURE_ANLEITUNG=1 pnpm exec dotenv -e .env.local -- playwright test e2e/anleitung-veranstalter.spec.ts

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

const BILDER_DIR = path.resolve(process.cwd(), "docs/anleitung/veranstalter/bilder");

// Demo-Katalog (bewusst ohne Größe → schlichte Labels; Namen ≠ Kategorie-Labels, damit die
// Idempotenz-Prüfung per sichtbarem Text nicht auf die Select-Optionen anspringt).
const KATALOG = [
  { name: "Bier", preis: "2,50", kategorie: "Getränk" },
  { name: "Alkoholfreies", preis: "2,00", kategorie: "Getränk" },
  { name: "Filterkaffee", preis: "1,50", kategorie: "Kaffee" },
  { name: "Schnitzel mit Pommes", preis: "9,00", kategorie: "Essen" },
] as const;

const STAMMTEILNEHMER = [
  { name: "Anna Becker", typ: "Person", mitglied: true },
  { name: "Bernd Wagner", typ: "Person", mitglied: true },
  { name: "Familie Klein", typ: "Familie", mitglied: true },
] as const;

const VERANSTALTUNG = { bezeichnung: "Montagsrunde", datum: "2026-07-27", kasse: "Montagsrunde" };

// Füllt nur die Zugangsdaten (kein Klick) – der „Anmelden"-Klick erfolgt bewusst erst nach dem
// Screenshot des leeren Formulars.
async function fillLoginForm(page: Page) {
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
}

// Viewport-Screenshot (wie ein echtes Handy-Bild): Ziel-Element an den oberen Rand scrollen, dann
// den sichtbaren Ausschnitt aufnehmen. `top` weglassen = Seitenanfang.
async function shot(page: Page, name: string, top?: Locator) {
  if (top) {
    const el = top.first();
    await el.scrollIntoViewIfNeeded();
    await el.evaluate((node) => node.scrollIntoView({ block: "start" }));
    await page.evaluate(() => window.scrollBy(0, -12));
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.screenshot({ path: path.join(BILDER_DIR, name), animations: "disabled" });
}

// Element-Screenshot: sauber zugeschnitten auf genau eine Sektion (kein Scroll-Rand-Problem).
async function shotEl(page: Page, name: string, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({ path: path.join(BILDER_DIR, name), animations: "disabled" });
}

// Setzt eine frisch geseedete DB voraus (siehe Header) und legt die Demo-Stammdaten deterministisch
// an – bewusst ohne „existiert schon"-Sprung: das wäre bei Fehlläufen die Quelle inkonsistenter
// Daten. Neu erzeugen ⇒ DB vorher zurücksetzen (Kommando im Datei-Header).
async function createKatalogArtikel(page: Page) {
  await page.goto("/verwaltung/katalog");
  await expect(page.getByRole("heading", { name: "Katalog" })).toBeVisible();
  for (let i = 0; i < KATALOG.length; i++) {
    const artikel = KATALOG[i];
    // Erst wenn das Formular vom vorherigen Erfolg zurückgesetzt ist, befüllen – sonst leert der
    // key-Remount die frische Eingabe (Race). Erfolg über die wachsende Listen-Zählung prüfen,
    // nicht über die stehenbleibende Toast-Meldung.
    await expect(page.getByLabel("Bezeichnung")).toHaveValue("");
    await page.getByLabel("Bezeichnung").fill(artikel.name);
    await page.getByLabel("Preis (EUR)").fill(artikel.preis);
    await page.getByLabel("Kategorie").selectOption({ label: artikel.kategorie });
    await page.getByRole("button", { name: "Anlegen" }).click();
    await expect(page.getByRole("heading", { name: `Artikel (${i + 1})` })).toBeVisible();
  }
}

async function createStammTeilnehmer(page: Page) {
  await page.goto("/verwaltung/teilnehmer");
  await expect(page.getByRole("heading", { name: "Teilnehmer", exact: true })).toBeVisible();
  for (let i = 0; i < STAMMTEILNEHMER.length; i++) {
    const person = STAMMTEILNEHMER[i];
    await expect(page.getByLabel("Anzeigename")).toHaveValue("");
    await page.getByLabel("Anzeigename").fill(person.name);
    await page.getByLabel("Typ").selectOption({ label: person.typ });
    if (person.mitglied) await page.getByLabel("Mitglied").check();
    await page.getByRole("button", { name: "Anlegen" }).click();
    await expect(page.getByRole("heading", { name: `Teilnehmer (${i + 1})` })).toBeVisible();
  }
}

// Neu angelegte Veranstaltung eindeutig identifizieren: Links vor/nach dem Anlegen vergleichen.
async function createVeranstaltung(page: Page): Promise<string> {
  await page.goto("/veranstaltung");
  await expect(page.getByRole("heading", { name: "Veranstaltungen", exact: true })).toBeVisible();
  const anlegen = page.locator("form").filter({ has: page.getByLabel("Bezeichnung") });
  await anlegen.getByLabel("Bezeichnung").fill(VERANSTALTUNG.bezeichnung);
  await anlegen.getByLabel("Datum").fill(VERANSTALTUNG.datum);
  await anlegen.getByLabel("Kasse").selectOption({ label: VERANSTALTUNG.kasse });
  await shot(page, "03-veranstaltung-anlegen.png", anlegen);

  const links = page.getByRole("link", { name: VERANSTALTUNG.bezeichnung });
  const before = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  await anlegen.getByRole("button", { name: "Anlegen" }).click();
  await expect(page.getByText("Veranstaltung angelegt.")).toBeVisible();
  await expect(links).toHaveCount(before.length + 1);
  const after = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  const neu = after.find((href) => href && !before.includes(href));
  expect(neu, "neue Veranstaltung im Listen-Link gefunden").toBeTruthy();
  await shot(
    page,
    "04-veranstaltung-liste.png",
    page.getByRole("heading", { name: "Veranstaltungen" }),
  );
  return neu as string;
}

async function addStammTeilnehmer(page: Page, name: string) {
  await page.getByLabel("Teilnehmer hinzufügen").selectOption({ label: name });
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(page.getByLabel("Teilnehmer hinzufügen").getByRole("option", { name })).toHaveCount(
    0,
  );
}

async function walkIn(page: Page, name: string) {
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Anlegen & erfassen" }) });
  await form.getByLabel("Anzeigename").fill(name);
  await form.getByRole("button", { name: "Anlegen & erfassen" }).click();
  await expect(page.getByText("Teilnehmer angelegt und erfasst.")).toBeVisible();
}

async function verzehrPlus(page: Page, artikel: string, anzahl: number) {
  // Zeile des Artikels: das innerste Listenelement, das den Artikelnamen UND die Mengensteuerung
  // enthält. Die aufgeklappte Karte matcht ebenfalls → `.last()` liefert die (tiefer liegende)
  // Positionszeile. Bewusst ohne Layout-Klassen-Selektor, damit ein UI-Umbau den Test nicht ohne
  // Verhaltensänderung bricht.
  const row = page
    .locator("li", { hasText: artikel })
    .filter({ has: page.getByRole("button", { name: "Menge erhöhen" }) })
    .last();
  for (let i = 1; i <= anzahl; i++) {
    await row.getByRole("button", { name: "Menge erhöhen" }).click();
    // Der Mengen-Span steht im DOM vor dem (nur im Fehlerfall gerenderten) Fehler-Span → `.first()`.
    await expect(row.locator("form > span").first()).toHaveText(String(i));
  }
}

async function oeffneKarte(page: Page, name: string) {
  await page
    .getByRole("group", { name: "Teilnehmer auswählen" })
    .getByRole("button", { name })
    .click();
  await expect(page.getByRole("heading", { name: "Getränk" })).toBeVisible();
}

async function kassiere(page: Page, name: string, erhalten: string) {
  const karte = page.getByRole("listitem").filter({ hasText: name }).first();
  await karte.getByLabel("Erhalten (EUR)").fill(erhalten);
  await karte.getByRole("button", { name: "Kassieren" }).click();
  // Auf den server-autoritativen Neustand dieser Karte warten (Badge „bezahlt"), bevor die nächste
  // Zeile befüllt wird – sonst überlagern sich die revalidate-Renders.
  await expect(karte.getByText("bezahlt", { exact: true })).toBeVisible();
}

test.describe("Anleitung Veranstalter – Screenshots", () => {
  test.skip(!process.env.CAPTURE_ANLEITUNG, "nur mit CAPTURE_ANLEITUNG=1 (erzeugt Bilder + Daten)");
  test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");
  test.describe.configure({ mode: "serial" });
  test.use({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
  });

  test("kompletter Workflow inkl. Screenshots", async ({ page }) => {
    test.setTimeout(180_000);
    mkdirSync(BILDER_DIR, { recursive: true });

    // Schritt 1 – Anmelden (Screenshot des leeren Formulars, dann ausfüllen – keine Zugangsdaten im Bild)
    await page.goto("/login");
    await shot(page, "01-anmelden.png");
    await fillLoginForm(page);
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await shot(page, "02-startseite.png");

    // Stammdaten (Verwalter) für aussagekräftige Screenshots
    await createKatalogArtikel(page);
    await createStammTeilnehmer(page);

    // Schritt 2 – Veranstaltung anlegen (Screenshots 03/04 in der Helper)
    const detailPfad = await createVeranstaltung(page);
    await page.goto(detailPfad);
    await expect(page.getByRole("heading", { name: VERANSTALTUNG.bezeichnung })).toBeVisible();

    // Schritt 3 – führen: Zugang teilen + Teilnehmer-Formulare (Element-Shots, solange das Select
    // noch verfügbar ist), dann Teilnehmer erfassen und die Übersicht oben aufnehmen.
    await shotEl(
      page,
      "07-zugang-teilen.png",
      page.locator("section").filter({ has: page.getByRole("heading", { name: "Zugang teilen" }) }),
    );
    await shotEl(
      page,
      "06-teilnehmer-hinzufuegen.png",
      page.locator("section").filter({ has: page.getByLabel("Teilnehmer hinzufügen") }),
    );
    for (const person of STAMMTEILNEHMER) await addStammTeilnehmer(page, person.name);
    await walkIn(page, "Gastspieler");
    await shot(page, "05-veranstaltung-fuehren.png");

    // Schritt 4 – Verzehr erfassen
    await page.goto(`${detailPfad}/verzehr`);
    await expect(page.getByRole("heading", { name: /^Verzehr · / })).toBeVisible();
    await oeffneKarte(page, "Anna Becker");
    await verzehrPlus(page, "Bier", 2);
    await verzehrPlus(page, "Filterkaffee", 1);
    await shot(page, "08-verzehr.png", page.getByRole("group", { name: "Teilnehmer auswählen" }));
    await oeffneKarte(page, "Bernd Wagner");
    await verzehrPlus(page, "Alkoholfreies", 1);
    await verzehrPlus(page, "Schnitzel mit Pommes", 1);
    await oeffneKarte(page, "Familie Klein");
    await verzehrPlus(page, "Bier", 1);
    await verzehrPlus(page, "Schnitzel mit Pommes", 1);

    // Schritt 5 – Auslagen erstatten
    await page.goto(`${detailPfad}/auslagen`);
    await expect(page.getByRole("heading", { name: /^Auslagen · / })).toBeVisible();
    await page.getByLabel("Teilnehmer").selectOption({ label: "Anna Becker" });
    await page.getByLabel("Kategorie").selectOption({ label: "Getränke" });
    await page.getByLabel("Betrag (EUR)").fill("15,00");
    await page.getByLabel("Notiz (optional)").fill("Getränkekiste vorgestreckt");
    await page.getByRole("button", { name: "Auslage erfassen" }).click();
    await expect(page.getByText("Auslage erfasst.")).toBeVisible();
    await shot(page, "09-auslagen.png", page.getByRole("heading", { name: /^Auslagen · / }));
    // Als erstattet markieren (zweiter Teil des Erstattungs-Vorgangs) – erst dann fließt die Auslage
    // in die Gesamtabrechnung (Kassenveränderung = Σ Erhalten − Σ Erstattungen).
    await page.getByRole("button", { name: "Als erstattet markieren" }).click();
    await expect(page.getByRole("button", { name: "Erstattung zurücknehmen" })).toBeVisible();

    // Schritt 6 – Kassieren & Abschluss
    await page.goto(`${detailPfad}/kassieren`);
    await expect(page.getByRole("heading", { name: /^Kassieren · / })).toBeVisible();
    await shot(page, "10-kassieren.png", page.getByRole("heading", { name: "Teilnehmer" }));
    await kassiere(page, "Anna Becker", "7,00");
    await kassiere(page, "Bernd Wagner", "11,00");
    await kassiere(page, "Familie Klein", "12,00");
    await expect(page.getByText("Offene Zeilen: 0")).toBeVisible();
    await shot(page, "11-abrechnung.png", page.getByRole("heading", { name: "Tagessummen" }));
    await page.getByRole("button", { name: "Abschließen" }).click();
    await expect(page.getByRole("button", { name: "Wieder öffnen" })).toBeVisible();

    // Schritt 7 – Abschlussbericht
    await page.goto(detailPfad);
    await expect(page.getByRole("heading", { name: "Abschlussbericht" })).toBeVisible();
    await shot(
      page,
      "12-abschluss-bericht.png",
      page.getByRole("heading", { name: "Abschlussbericht" }),
    );
  });
});
