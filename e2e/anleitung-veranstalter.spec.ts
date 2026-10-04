import path from "node:path";
import { mkdirSync } from "node:fs";
import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  gastHinzufuegen,
  oeffneEinstellungen,
  oeffneTeilnehmerDialog,
  schliesseEinstellungen,
  teilnehmerDialog,
} from "./helpers/detailseite";

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

// Anzahl der Artikel im Katalog, aus der Überschrift „Artikel (n)" der Katalog-Seite.
async function artikelAnzahl(page: Page): Promise<number> {
  const text = await page.getByRole("heading", { name: /^Artikel \(\d+\)$/ }).innerText();
  return Number(/\((\d+)\)/.exec(text)?.[1]);
}

// Setzt eine frisch geseedete DB voraus (siehe Header) und legt die Demo-Stammdaten deterministisch
// an – bewusst ohne „existiert schon"-Sprung: das wäre bei Fehlläufen die Quelle inkonsistenter
// Daten. Neu erzeugen ⇒ DB vorher zurücksetzen (Kommando im Datei-Header).
async function createKatalogArtikel(page: Page) {
  await page.goto("/verwaltung/katalog");
  await expect(page.getByRole("heading", { name: "Katalog" })).toBeVisible();
  // Die frisch migrierte DB bringt schon die Preisliste des Standardkatalogs mit (Migration 0004); gezählt
  // wird deshalb relativ zum Startwert, nicht ab 1.
  const startAnzahl = await artikelAnzahl(page);
  for (let i = 0; i < KATALOG.length; i++) {
    const artikel = KATALOG[i];
    // Erst wenn das Formular vom vorherigen Erfolg zurückgesetzt ist, befüllen – sonst leert der
    // key-Remount die frische Eingabe (Race). Erfolg über die wachsende Listen-Zählung prüfen,
    // nicht über die stehenbleibende Toast-Meldung.
    await expect(page.getByLabel("Bezeichnung")).toHaveValue("");
    await page.getByLabel("Bezeichnung").fill(artikel.name);
    await page.getByLabel("Preis (EUR)").fill(artikel.preis);
    await page.getByLabel("Kategorie").selectOption({ label: artikel.kategorie });
    // exact: seit #345 steht daneben „+ Katalog anlegen".
    await page.getByRole("button", { name: "Anlegen", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: `Artikel (${startAnzahl + i + 1})` }),
    ).toBeVisible();
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

// Alle Stammteilnehmer in einem Schwung anhaken; der Screenshot zeigt den Dialog mit der Auswahl.
async function addStammTeilnehmer(page: Page, namen: readonly string[]) {
  await oeffneTeilnehmerDialog(page);
  const auswahl = teilnehmerDialog(page).getByRole("group", { name: "Stammteilnehmer" });
  for (const name of namen) await auswahl.getByRole("checkbox", { name }).check();
  await shotEl(page, "06-teilnehmer-hinzufuegen.png", teilnehmerDialog(page));
  await auswahl.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(teilnehmerDialog(page)).toBeHidden();
}

// „Link & QR teilen" liegt im eingeklappten Bereich „Einstellungen" (#369 AK21/AK22).
async function shotZugang(page: Page) {
  await oeffneEinstellungen(page);
  await page.getByRole("button", { name: "Link & QR teilen" }).click();
  const dialog = page.getByRole("dialog", { name: "Link & QR teilen" });
  // Das native `<dialog>` fokussiert beim Öffnen das erste Bedienelement – das Link-Feld. Es
  // scrollt dabei ans Ende der URL und trägt einen Fokusring; fürs Bild zeigt es den Anfang
  // („http://…/theke/…") ohne Fokus, wie es ein Nutzer vor dem Antippen sieht.
  await dialog
    .getByLabel("Selbstbedienungs-Link", { exact: true })
    .evaluate((feld: HTMLInputElement) => {
      feld.blur();
      feld.scrollLeft = 0;
    });
  await shotEl(page, "07-zugang-teilen.png", dialog);
  await dialog.getByRole("button", { name: "Schließen" }).click();
  await schliesseEinstellungen(page);
}

// Zeile eines Demo-Artikels in der Einzelansicht (#370): die Gruppe mit EXAKT diesem Namen als
// Überschrift (Teilstring-Treffer wie „Bier" in „Weizenbier" ausgeschlossen, Lesson #388), darin
// die Zeile „ohne Größe" – der Standardkatalog (Migration 0004) bringt „Bier" schon in zwei Größen
// mit, die Demo-Artikel haben keine Größe.
function demoArtikelZeile(page: Page, artikel: string) {
  return page
    .getByRole("heading", { level: 3, name: artikel, exact: true })
    .locator("xpath=..")
    .getByRole("listitem")
    .filter({ hasText: "ohne Größe" });
}

async function verzehrPlus(page: Page, kategorie: string, artikel: string, anzahl: number) {
  await page
    .getByRole("group", { name: "Kategorie wählen" })
    .getByRole("button", { name: kategorie })
    .click();
  const row = demoArtikelZeile(page, artikel);
  for (let i = 1; i <= anzahl; i++) {
    await row.getByRole("button", { name: "Menge erhöhen" }).click();
    // Der Mengen-Span ist das einzige `span`-Kind des Stepper-Formulars (der Fehler steht daneben).
    await expect(row.locator("form > span")).toHaveText(String(i));
  }
}

async function waehlePerson(page: Page, name: string) {
  await page
    .getByRole("group", { name: "Teilnehmer auswählen" })
    .getByRole("button", { name })
    .click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(name);
}

// Bild 08 (#370): Einzelansicht mit erfasstem Bier, in der schmalen Handy-Breite der Spec
// (spec-370 AK7.5: 375 px) statt der Capture-Breite. Ab dem Zurück-Link, damit sticky Block und
// Bier-Gruppe ganz im Bild stehen. Das Dev-Overlay von Next.js („N" unten links) wird
// ausgeblendet: es läge sonst über „Kassieren" in der Fußleiste.
async function shotVerzehr(page: Page) {
  const captureViewport = page.viewportSize();
  await page.setViewportSize({ width: 375, height: 812 });
  await page
    .getByRole("link", { name: "Zur Veranstaltung" })
    .evaluate((node) => node.scrollIntoView({ block: "start" }));
  await page.evaluate(() => window.scrollBy(0, -12));
  await page.screenshot({
    path: path.join(BILDER_DIR, "08-verzehr.png"),
    animations: "disabled",
    style: "nextjs-portal { display: none !important; }",
  });
  if (captureViewport) await page.setViewportSize(captureViewport);
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

    // Schritt 3 – führen: Zugang teilen (Dialog aus den Einstellungen), Teilnehmer über den
    // „+ Teilnehmer"-Dialog erfassen, dann die Übersicht oben aufnehmen.
    await shotZugang(page);
    await addStammTeilnehmer(
      page,
      STAMMTEILNEHMER.map((person) => person.name),
    );
    await gastHinzufuegen(page, "Gastspieler");
    await shot(page, "05-veranstaltung-fuehren.png");

    // Schritt 4 – Verzehr erfassen
    await page.goto(`${detailPfad}/verzehr`);
    await expect(page.getByRole("heading", { name: /^Verzehr · / })).toBeVisible();
    await waehlePerson(page, "Anna Becker");
    await verzehrPlus(page, "Kaffee", "Filterkaffee", 1);
    await verzehrPlus(page, "Getränke", "Bier", 2);
    await shotVerzehr(page);
    await waehlePerson(page, "Bernd Wagner");
    await verzehrPlus(page, "Getränke", "Alkoholfreies", 1);
    await verzehrPlus(page, "Essen", "Schnitzel mit Pommes", 1);
    await waehlePerson(page, "Familie Klein");
    await verzehrPlus(page, "Getränke", "Bier", 1);
    await verzehrPlus(page, "Essen", "Schnitzel mit Pommes", 1);

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
    await expect(page.getByText("Alles bezahlt", { exact: true })).toBeVisible();
    // Tagessummen und Gesamtabrechnung liegen eingeklappt unter „Abrechnung im Detail" (#371).
    await page.getByText("Abrechnung im Detail", { exact: true }).click();
    await shot(page, "11-abrechnung.png", page.getByRole("heading", { name: "Tagessummen" }));
    // Abschließen sitzt im Kopf der Detailseite und wirkt erst nach der Bestätigung (#371).
    await page.goto(detailPfad);
    await page.getByRole("button", { name: "Veranstaltung abschließen" }).click();
    const bestaetigung = page.getByRole("dialog", { name: "Veranstaltung abschließen?" });
    await bestaetigung.getByRole("button", { name: "Abschließen" }).click();
    await expect(page.getByRole("button", { name: "Wieder öffnen" })).toBeVisible();

    // Schritt 7 – Abschlussbericht
    await expect(page.getByRole("heading", { name: "Abschlussbericht" })).toBeVisible();
    await shot(
      page,
      "12-abschluss-bericht.png",
      page.getByRole("heading", { name: "Abschlussbericht" }),
    );
  });
});
