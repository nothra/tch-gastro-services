import path from "node:path";
import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  einstellungenDialog,
  gastHinzufuegen,
  kopfAktion,
  oeffneEinstellungen,
  oeffneLoeschDialog,
  oeffneTeilnehmerDialog,
  seitenkopf,
  teilnehmerDialog,
} from "./helpers/detailseite";
import {
  legeVeranstaltungAn,
  oeffneTeilnehmerAnlegen,
  schickeAnlegeDialogAb,
} from "./helpers/listenseiten";

// Oberflächen-Nachweis für die neu geordnete Detailseite (#369, spec-369) und ihre Kopfaktionen
// (#391, spec-391). Prüft gegen einen echten Server, was jsdom nicht belegen kann: das native
// modale `<dialog>` (Escape, Fokus-Rücksprung), die echte Mehrfach-Anlage über den
// Server-Action-Roundtrip, das bestätigte Entfernen, und das Layout bei 375 px (spec-369 AK27/AK28, spec-391 AK16).
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
const NACHWEIS_391 = path.resolve(process.cwd(), "test-results/391-kopfaktionen-375.png");

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
function createVeranstaltung(page: Page, bezeichnung: string): Promise<string> {
  return legeVeranstaltungAn(page, bezeichnung, "2026-10-05");
}

async function createStammteilnehmer(page: Page, name: string) {
  await page.goto("/verwaltung/teilnehmer");
  const dialog = await oeffneTeilnehmerAnlegen(page);
  await dialog.getByLabel("Anzeigename").fill(name);
  await schickeAnlegeDialogAb(dialog);
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

function teilnehmerListe(page: Page) {
  return page.getByRole("region", { name: /^Teilnehmer \(/ });
}

function teilnehmerZeile(page: Page, name: string) {
  return teilnehmerListe(page).getByRole("listitem").filter({ hasText: name });
}

// Aufräumen über die bestehende Lösch-Funktion (Papierkorb im Kopf, spec-391 AK11) – nur ohne
// Verzehr/Kassiertes möglich.
async function loescheVeranstaltung(page: Page, detailPfad: string) {
  await page.goto(detailPfad);
  await oeffneLoeschDialog(page);
  await page.getByRole("button", { name: "Endgültig löschen" }).click();
  await expect(page).toHaveURL(/\/veranstaltung$/);
}

// Statuswechsel im Kopf der Detailseite – wirkt erst nach der Bestätigung (spec-371, ADR-055 D3).
async function bestaetigeStatuswechsel(page: Page, ausloeser: string, bestaetigen: string) {
  await page.getByRole("button", { name: ausloeser, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: bestaetigen, exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function groesse(locator: Locator): Promise<{ width: number; height: number }> {
  const box = await locator.boundingBox();
  expect(box, "Element hat eine Box").not.toBeNull();
  return box!;
}

async function hoehe(locator: Locator): Promise<number> {
  return (await groesse(locator)).height;
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
    const menueBox = await groesse(menue);
    expect(menueBox.height).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
    expect(menueBox.width).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);

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

  test("spec-391 AK16: bei 375 px und langem Titel bleiben alle Kopfaktionen sichtbar und tippbar", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);

    const lang = `${PREFIX} Sehr lange Bezeichnung der Sommer-Dorfmeisterschaften mit Grillabend ${LAUF}`;
    const detailPfad = await createVeranstaltung(page, lang);
    await page.goto(detailPfad);
    await page.screenshot({ path: NACHWEIS_391, animations: "disabled" });

    // Titel bricht um, statt die Aktionen hinauszuschieben; kein horizontales Scrollen.
    await expect(page.getByRole("heading", { level: 1, name: lang })).toBeInViewport({ ratio: 1 });
    const ueberstand = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(ueberstand).toBe(0);

    // AK2/AK3/AK16: Badge, Abschluss-Aktion und drei Symbol-Schaltflächen vollständig sichtbar,
    // die Symbole je ≥ 44 × 44 px.
    await expect(seitenkopf(page).getByText("offen", { exact: true })).toBeInViewport({ ratio: 1 });
    // Die Abschluss-Aktion aus #371 steht mit im Kopf (spec-391 Q5, spec-371 AK24) – eine
    // Text-Schaltfläche, daher nur Sichtbarkeit, keine 44-px-Breitenprüfung.
    await expect(kopfAktion(page, "Veranstaltung abschließen")).toBeInViewport({ ratio: 1 });
    for (const name of ["Link & QR teilen", "Einstellungen", "Veranstaltung löschen"]) {
      const knopf = kopfAktion(page, name);
      await expect(knopf).toBeInViewport({ ratio: 1 });
      const box = await groesse(knopf);
      expect(box.width, name).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
      expect(box.height, name).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);
    }

    await loescheVeranstaltung(page, detailPfad);
  });

  test("spec-391 FS2: in anderer Sitzung abgeschlossen → Schreibaktion im Dialog abgelehnt", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await login(page);

    const detailPfad = await createVeranstaltung(page, `${PREFIX} Parallel ${LAUF}`);
    await page.goto(detailPfad);
    await oeffneEinstellungen(page);

    // Zweiter Tab derselben Sitzung schließt die Veranstaltung ab, während der Dialog offen ist.
    const zweiterTab = await context.newPage();
    await zweiterTab.goto(detailPfad);
    await bestaetigeStatuswechsel(zweiterTab, "Veranstaltung abschließen", "Abschließen");
    const wiederOeffnen = zweiterTab.getByRole("button", { name: "Wieder öffnen" });
    await expect(wiederOeffnen).toBeVisible();

    // Kein stiller Erfolg: die bestehende Meldung der Action steht im noch offenen Dialog.
    await einstellungenDialog(page).getByRole("button", { name: "Katalog wechseln" }).click();
    await expect(einstellungenDialog(page).getByRole("alert")).toHaveText(
      /Die Veranstaltung ist abgeschlossen und schreibgeschützt\./,
    );
    await expect(einstellungenDialog(page)).toBeVisible();

    // Aufräumen: wieder öffnen, dann löschen.
    await bestaetigeStatuswechsel(zweiterTab, "Wieder öffnen", "Wieder öffnen");
    await expect(
      zweiterTab.getByRole("button", { name: "Veranstaltung abschließen" }),
    ).toBeVisible();
    await zweiterTab.close();
    await loescheVeranstaltung(page, detailPfad);
  });

  test("spec-391 AK1–AK10/AK14: Kopfaktionen, Dialoge, Bericht nach Abschluss", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);

    const detailPfad = await createVeranstaltung(page, `${PREFIX} Einstellungen ${LAUF}`);
    await page.goto(detailPfad);

    // ── AK1: kein eingeklappter Bereich „Einstellungen" mehr am Seitenende ─────────────────
    await expect(page.locator("details")).toHaveCount(0);

    // ── AK9/AK10: „Link & QR teilen" mit einem Tap aus dem Kopf; Fokus zurück ──────────────
    const teilen = kopfAktion(page, "Link & QR teilen");
    await expect(page.getByRole("textbox", { name: "Selbstbedienungs-Link" })).toHaveCount(0);
    await teilen.click();
    const zugang = page.getByRole("dialog", { name: "Link & QR teilen" });
    await expect(zugang.getByRole("textbox", { name: "Selbstbedienungs-Link" })).toHaveValue(
      /\/theke\//,
    );
    await expect(zugang.getByRole("img", { name: /QR-Code/ })).toBeVisible();
    await zugang.getByRole("button", { name: "Schließen" }).click();
    await expect(zugang).toBeHidden();
    await expect(teilen).toBeFocused();

    // ── AK4/AK5: Zahnrad öffnet „Einstellungen" – Katalog, Bearbeiten; kein Teilen/Löschen ──
    const zahnrad = kopfAktion(page, "Einstellungen");
    await expect(page.getByRole("button", { name: "Katalog wechseln" })).toHaveCount(0);
    await oeffneEinstellungen(page);
    const dialog = einstellungenDialog(page);
    await expect(dialog.getByLabel("Katalog")).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Veranstaltung bearbeiten" })).toBeVisible();
    await expect(dialog.getByText(/Link & QR teilen|Veranstaltung löschen/)).toHaveCount(0);

    // ── FS3: Pflichtfeld leer → Dialog bleibt offen, Eingabe bleibt erhalten ───────────────
    await dialog.getByLabel("Datum").fill("");
    await dialog.getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Datum")).toHaveValue("");

    // ── AK8: Escape schließt, Fokus zurück aufs Zahnrad ────────────────────────────────────
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(zahnrad).toBeFocused();

    // ── Abschluss im Seitenkopf (spec-371) ─────────────────────────────────────────────────
    await bestaetigeStatuswechsel(page, "Veranstaltung abschließen", "Abschließen");

    // ── spec-369 AK6/AK7 + spec-391 AK14: Bericht, keine Kopfaktionen ──────────────────────
    await expect(page.getByRole("heading", { name: "Abschlussbericht" })).toBeVisible();
    for (const name of ["Link & QR teilen", "Einstellungen", "Veranstaltung löschen"]) {
      await expect(kopfAktion(page, name), name).toHaveCount(0);
    }
    await expect(page.getByRole("button", { name: "+ Teilnehmer" })).toHaveCount(0);

    // Aufräumen: wieder öffnen, dann löschen.
    await bestaetigeStatuswechsel(page, "Wieder öffnen", "Wieder öffnen");
    await expect(page.getByRole("button", { name: "Veranstaltung abschließen" })).toBeVisible();
    await loescheVeranstaltung(page, detailPfad);
  });
});
