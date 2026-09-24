import { test, expect, type Page } from "@playwright/test";

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
// Beide Tests räumen ihre Veranstaltung am Ende selbst wieder ab (der Lösch-Weg ist ohnehin Teil
// des Prüfgegenstands). Alle angelegten Namen tragen das `__test__`-Präfix der
// DB-Integrationstests: die Spec schreibt in dieselbe geteilte Dev-DB, und ein Name ohne Präfix
// bliebe als Fremdbestand liegen, den eine spätere DB-Regressionsannahme mitzählt (#346).

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

// Lauf-Suffix, damit wiederholte Läufe auf derselben lokalen DB nicht auf Altbestand matchen –
// und damit die beiden parallel laufenden Tests sich nicht gegenseitig die Namen wegnehmen.
const LAUF = String(process.env.E2E_VERANSTALTUNG_352_SUFFIX ?? "a");
const PREFIX = `__test__E2E352`;

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
async function createVeranstaltung(page: Page, bezeichnung: string): Promise<string> {
  await page.goto("/veranstaltung");
  const anlegen = page.locator("form").filter({ has: page.getByLabel("Bezeichnung") });
  await anlegen.getByLabel("Bezeichnung").fill(bezeichnung);
  await anlegen.getByLabel("Datum").fill("2026-09-14");
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

// Das Bearbeiten-Formular der Detailseite – über seinen Absende-Button identifiziert, weil die
// Seite mehrere Formulare trägt (Katalogwechsel, Teilnehmer erfassen, Status).
function metaForm(page: Page) {
  return page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Änderungen speichern" }) });
}

// Löschen bis zum offenen Bestätigungsdialog – der erste Klick darf noch nichts entfernen (AK8).
async function oeffneLoeschDialog(page: Page) {
  await page.getByRole("button", { name: "Veranstaltung löschen", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Veranstaltung löschen?" })).toBeVisible();
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

    // Ausgangszustand: das Formular ist mit den Ist-Werten vorbelegt – insbesondere das Datum im
    // "YYYY-MM-DD"-Format, das <input type="date"> allein akzeptiert (AK1, `formatDatumInput`).
    await expect(metaForm(page).getByLabel("Bezeichnung")).toHaveValue(alt);
    await expect(metaForm(page).getByLabel("Datum")).toHaveValue("2026-09-14");

    // ── AK1: alle drei Felder auf einmal ändern ─────────────────────────────────────────────
    await metaForm(page).getByLabel("Bezeichnung").fill(neu);
    await metaForm(page).getByLabel("Datum").fill("2026-09-21");
    await metaForm(page).getByLabel("Kasse").selectOption({ label: "Vereinskasse" });
    await metaForm(page).getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(page.getByText("Änderungen gespeichert.")).toBeVisible();

    // Die Seite selbst zeigt den neuen Stand – nicht nur das Formular (revalidatePath wirkt).
    await expect(page.getByRole("heading", { level: 1, name: neu })).toBeVisible();
    await expect(page.getByText("21.09.2026 · Vereinskasse · offen")).toBeVisible();

    // ── AK1: und der Stand ist wirklich persistiert, nicht nur im Client-State ──────────────
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: neu })).toBeVisible();
    await expect(metaForm(page).getByLabel("Bezeichnung")).toHaveValue(neu);
    await expect(metaForm(page).getByLabel("Datum")).toHaveValue("2026-09-21");
    await expect(metaForm(page).getByLabel("Kasse")).toHaveValue("vereinskasse");

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
    const walkIn = page
      .locator("form")
      .filter({ has: page.getByRole("button", { name: "Anlegen & erfassen" }) });
    await walkIn.getByLabel("Anzeigename").fill(`${PREFIX} Gast ${LAUF}`);
    await walkIn.getByRole("button", { name: "Anlegen & erfassen" }).click();
    await expect(page.getByText("Teilnehmer angelegt und erfasst.")).toBeVisible();

    // ── AK8: der erste Klick öffnet nur den Dialog ──────────────────────────────────────────
    await oeffneLoeschDialog(page);
    await expect(page.getByText(`„${bezeichnung}“`)).toBeVisible();

    // ── AK8: Abbrechen schließt den Dialog und löscht nichts ────────────────────────────────
    await page.getByRole("button", { name: "Abbrechen" }).click();
    await expect(page.getByRole("heading", { name: "Veranstaltung löschen?" })).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${detailPfad}$`));

    // Serverseitiger Gegenbeweis: nach einem echten Neuladen ist die Veranstaltung noch da –
    // „Abbrechen" hat also nicht bloß den Dialog versteckt, sondern nie eine Action ausgelöst.
    const nochDa = await page.reload();
    expect(nochDa?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: bezeichnung })).toBeVisible();

    // ── AK4/AK9: erst die Bestätigung löscht – und leitet zur Übersicht weiter ──────────────
    await oeffneLoeschDialog(page);
    await page.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page).toHaveURL(/\/veranstaltung$/);

    // ── AK4: die Veranstaltung ist aus der Übersicht verschwunden ───────────────────────────
    await expect(page.locator(`a[href="${detailPfad}"]`)).toHaveCount(0);

    // ── AK4: und die Detailroute existiert nicht mehr (Hard-Delete, kein Soft-Delete) ───────
    const weg = await page.goto(detailPfad);
    expect(weg?.status()).toBe(404);
  });
});
