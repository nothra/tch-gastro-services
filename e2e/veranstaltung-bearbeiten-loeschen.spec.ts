import { test, expect, type Page } from "@playwright/test";
import {
  gastHinzufuegen,
  kopfAktion,
  oeffneEinstellungen,
  oeffneLoeschDialog,
  schliesseEinstellungen,
} from "./helpers/detailseite";
import { legeVeranstaltungAn } from "./helpers/listenseiten";
import { toast } from "./helpers/toast";

// Oberflächen-Nachweis für das Bearbeiten und Löschen einer Veranstaltung (#352, spec-352).
// Prüft gegen einen echten Server, was jsdom nicht belegen kann: dass die geänderten Metadaten
// den Server-Action-Roundtrip wirklich erreichen und ein Neuladen überstehen (AK1), dass der
// Bestätigungsdialog erst beim zweiten Schritt löscht (AK8), dass der Hard-Delete die Route
// tatsächlich verschwinden lässt (AK4) und dass die Weiterleitung zur Übersicht ein echter
// Dokumentwechsel ist (AK9) – jsdom meldet an dieser Stelle nur „Not implemented: navigation to
// another Document".
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: die Spec legt Daten an, der
// Standardlauf fährt in CI gegen die persistente INT-Umgebung (deploy-gate.yml) und ist dort rein
// lesend – dieselbe Begründung wie bei wechsel-verzehr-kassieren.spec.ts. Nur mit gesetztem
// E2E_VERANSTALTUNG_352=1 aktiv. Lokal ausführen:
//   pnpm db:up && pnpm db:seed
//   E2E_VERANSTALTUNG_352=1 pnpm exec dotenv -e .env.local -- playwright test e2e/veranstaltung-bearbeiten-loeschen.spec.ts
//
// Alle drei Tests räumen ihre Veranstaltung am Ende selbst wieder ab (der Lösch-Weg ist ohnehin Teil
// des Prüfgegenstands). Alle angelegten Namen tragen das `__test__`-Präfix der
// DB-Integrationstests: die Spec schreibt in dieselbe geteilte Dev-DB, und ein Name ohne Präfix
// bliebe als Fremdbestand liegen, den eine spätere DB-Regressionsannahme mitzählt (#346).

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

// Lauf-Suffix, damit wiederholte Läufe auf derselben lokalen DB nicht auf Altbestand matchen –
// er trennt parallel laufende AUSFÜHRUNGEN dieser Datei, nicht die drei Tests untereinander
// (die trennen ihre Basisnamen selbst: "Bearbeiten", "Loeschen", "Kassiert").
const LAUF = String(process.env.E2E_VERANSTALTUNG_352_SUFFIX ?? "a");
const PREFIX = "__test__E2E352";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

// Legt eine frische Veranstaltung an und liefert ihren Detail-Pfad. Die neue Veranstaltung wird
// über den Link-Zuwachs identifiziert (wie in wechsel-verzehr-kassieren.spec.ts), nicht über den
// Namen – so bleibt der Helper auch bei gleichnamigem Altbestand eindeutig. `bezeichnung` muss je
// Test eindeutig sein, sonst stiege der Zuwachs um 2 statt um 1.
function createVeranstaltung(page: Page, bezeichnung: string): Promise<string> {
  return legeVeranstaltungAn(page, bezeichnung, "2026-09-14");
}

// Das Bearbeiten-Formular der Detailseite – über seinen Absende-Button identifiziert, weil der
// Dialog „Einstellungen" (#391) zwei Formulare trägt (Katalogwechsel, Bearbeiten).
function metaForm(page: Page) {
  return page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Änderungen speichern" }) });
}

// Die Kassierzeile eines Teilnehmers (Muster aus wechsel-verzehr-kassieren.spec.ts).
function kassierZeile(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name }).first();
}

// Setzt `Erhalten` einer Zeile auf den übergebenen Wert; `""` nimmt das Kassieren zurück
// (`kassiereSchema` mappt den Leerstring auf `null`).
async function kassiere(page: Page, detailPfad: string, name: string, betrag: string) {
  await page.goto(`${detailPfad}/kassieren`);
  const zeile = kassierZeile(page, name);
  await zeile.getByLabel("Erhalten (EUR)").fill(betrag);
  await zeile.getByRole("button", { name: "Kassieren" }).click();
  // Rückmeldung mit Betrag (#371), seit #372 als Toast: „… erhalten" bzw. „Betrag entfernt".
  await expect(toast(page, betrag === "" ? "Betrag entfernt" : /€ erhalten/)).toBeVisible();
}

test.describe("Veranstaltung bearbeiten und löschen (#352)", () => {
  test.skip(!process.env.E2E_VERANSTALTUNG_352, "nur mit E2E_VERANSTALTUNG_352=1 (legt Daten an)");
  test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");

  test("AK1: geänderte Metadaten überstehen den Roundtrip und ein echtes Neuladen", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);

    const alt = `${PREFIX} Bearbeiten ${LAUF}`;
    const neu = `${PREFIX} Bearbeitet ${LAUF}`;
    const detailPfad = await createVeranstaltung(page, alt);
    await page.goto(detailPfad);
    await oeffneEinstellungen(page);

    // Ausgangszustand: das Formular ist mit den Ist-Werten vorbelegt – insbesondere das Datum im
    // "YYYY-MM-DD"-Format, das <input type="date"> allein akzeptiert (AK1, `formatDatumInput`).
    await expect(metaForm(page).getByLabel("Bezeichnung")).toHaveValue(alt);
    await expect(metaForm(page).getByLabel("Datum")).toHaveValue("2026-09-14");

    // ── AK1: alle drei Felder auf einmal ändern ─────────────────────────────────────────────
    await metaForm(page).getByLabel("Bezeichnung").fill(neu);
    await metaForm(page).getByLabel("Datum").fill("2026-09-21");
    await metaForm(page).getByLabel("Kasse").selectOption({ label: "Vereinskasse" });
    await metaForm(page).getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(toast(page, "Gespeichert")).toBeVisible();

    // Die Seite selbst zeigt den neuen Stand – nicht nur das Formular (revalidatePath wirkt). Der
    // Dialog bleibt dabei offen (ADR-056 D3, spec-391 AK7); der Kopf dahinter ist aktualisiert.
    await expect(metaForm(page)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: neu })).toBeVisible();
    await expect(page.getByText("21.09.2026 · Vereinskasse", { exact: true })).toBeVisible();
    await schliesseEinstellungen(page);

    // ── AK1: und der Stand ist wirklich persistiert, nicht nur im Client-State ──────────────
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: neu })).toBeVisible();
    await oeffneEinstellungen(page);
    await expect(metaForm(page).getByLabel("Bezeichnung")).toHaveValue(neu);
    await expect(metaForm(page).getByLabel("Datum")).toHaveValue("2026-09-21");
    await expect(metaForm(page).getByLabel("Kasse")).toHaveValue("vereinskasse");
    await schliesseEinstellungen(page);

    // Aufräumen: die Veranstaltung hat keinen Verzehr, der Lösch-Weg ist also offen.
    await oeffneLoeschDialog(page);
    await page.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page).toHaveURL(/\/veranstaltung$/);
  });

  test("AK4/AK7/AK8/AK9: Abbrechen löscht nichts, Bestätigen entfernt endgültig", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);

    const bezeichnung = `${PREFIX} Loeschen ${LAUF}`;
    const detailPfad = await createVeranstaltung(page, bezeichnung);
    await page.goto(detailPfad);

    // ── AK7: eine Teilnehmer-Zeile ohne jeden Verzehr darf das Löschen NICHT sperren ────────
    await gastHinzufuegen(page, `${PREFIX} Gast ${LAUF}`);

    // ── AK8: der erste Klick öffnet nur den Dialog ──────────────────────────────────────────
    await oeffneLoeschDialog(page);
    await expect(page.getByText(`„${bezeichnung}“`)).toBeVisible();

    // ── AK8: Abbrechen schließt den Dialog und löscht nichts; Fokus zurück (spec-391 AK11) ──
    await page.getByRole("button", { name: "Abbrechen" }).click();
    await expect(page.getByRole("heading", { name: "Veranstaltung löschen?" })).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${detailPfad}$`));
    await expect(
      page.getByRole("button", { name: "Veranstaltung löschen", exact: true }),
    ).toBeFocused();

    // Serverseitiger Gegenbeweis: nach einem echten Neuladen ist die Veranstaltung noch da –
    // „Abbrechen" hat also nicht bloß den Dialog versteckt, sondern nie eine Action ausgelöst.
    const nochDa = await page.reload();
    expect(nochDa?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: bezeichnung })).toBeVisible();

    // ── AK4/AK9: erst die Bestätigung löscht – und leitet zur Übersicht weiter ──────────────
    await oeffneLoeschDialog(page);
    await page.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page).toHaveURL(/\/veranstaltung$/);
    // spec-372 AK13: der Toast überlebt den Seitenwechsel und steht auf der Übersicht.
    await expect(toast(page, "Veranstaltung gelöscht")).toBeVisible();
    await expect(page.getByRole("heading", { name: "404" })).toHaveCount(0);

    // ── AK4: die Veranstaltung ist aus der Übersicht verschwunden ───────────────────────────
    await expect(page.locator(`a[href="${detailPfad}"]`)).toHaveCount(0);

    // ── AK4: und die Detailroute existiert nicht mehr (Hard-Delete, kein Soft-Delete) ───────
    const weg = await page.goto(detailPfad);
    expect(weg?.status()).toBe(404);
  });

  test("AK12/FS6: kassiertes Geld ohne Verzehr sperrt das Löschen – bis es zurückgenommen wird", async ({
    page,
  }) => {
    // Belegt die Prämisse des Review-Funds auf der echten Oberfläche: eine reine Spende ist über
    // die normale UI erreichbar (Kassieren verlangt keinen Verzehr) und hinterlässt WEDER eine
    // Position mit `menge > 0` NOCH eine Auslage. Vor AK12 wäre diese Veranstaltung löschbar
    // gewesen und die 10,00 € wären lautlos aus der Kasse verschwunden.
    test.setTimeout(120_000);
    await login(page);

    const bezeichnung = `${PREFIX} Kassiert ${LAUF}`;
    const gast = `${PREFIX} Spender ${LAUF}`;
    const detailPfad = await createVeranstaltung(page, bezeichnung);
    await page.goto(detailPfad);
    await gastHinzufuegen(page, gast);

    // ── Reine Spende: Geld kassiert, kein einziger Strich erfasst ───────────────────────────
    await kassiere(page, detailPfad, gast, "10,00");

    // ── AK12 + spec-372 AK9: der Grund steht schon beim Öffnen im Dialog, ohne Bestätigung ───
    await page.goto(detailPfad);
    await kopfAktion(page, "Veranstaltung löschen").click();
    const sperrDialog = page.getByRole("dialog", { name: "Löschen nicht möglich" });
    await expect(sperrDialog).toContainText(`Für „${bezeichnung}“ ist bereits Geld kassiert.`);
    await expect(sperrDialog.getByRole("button", { name: "Endgültig löschen" })).toHaveCount(0);
    await sperrDialog.getByRole("button", { name: "Schließen", exact: true }).click();
    await expect(sperrDialog).toBeHidden();

    // Gegenbeweis nach echtem Neuladen: die Veranstaltung existiert noch (keine 404-Route).
    const nochDa = await page.goto(detailPfad);
    expect(nochDa?.status()).toBe(200);

    // ── FS6: das Kassieren zurücknehmen (Leerstring → `null`) gibt das Löschen wieder frei ──
    await kassiere(page, detailPfad, gast, "");
    await page.goto(detailPfad);
    await oeffneLoeschDialog(page);
    await page.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page).toHaveURL(/\/veranstaltung$/);

    const weg = await page.goto(detailPfad);
    expect(weg?.status()).toBe(404);
  });
});
