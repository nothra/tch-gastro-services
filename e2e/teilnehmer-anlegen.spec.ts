import { test, expect, type Page } from "@playwright/test";
import {
  anlegeSchritt,
  oeffneLoeschDialog,
  oeffneTeilnehmerDialog,
  teilnehmerAusloeser,
  teilnehmerDialog,
} from "./helpers/detailseite";
import {
  legeVeranstaltungAn,
  oeffneTeilnehmerAnlegen,
  schickeAnlegeDialogAb,
} from "./helpers/listenseiten";
import { toast } from "./helpers/toast";

// Oberflächen-Nachweis für „Teilnehmer anlegen statt Neuer Gast" (#404, spec-404). Prüft gegen
// einen echten Browser und Server, was jsdom nicht belegen kann: den Schrittwechsel im nativen
// `<dialog>`, den Server-Action-Roundtrip mit Anlegen + Hinzufügen und die Duplikat-Warnung gegen
// die echte DB (ADR-022).
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: die Spec legt Daten an, der Standardlauf
// fährt in CI gegen die persistente INT-Umgebung und ist dort rein lesend (wie
// veranstaltung-detailseite.spec.ts). Nur mit gesetztem E2E_404=1 aktiv:
//   pnpm db:up && pnpm db:seed
//   E2E_404=1 pnpm exec dotenv -e .env.local -- playwright test e2e/teilnehmer-anlegen.spec.ts
//
// Die Veranstaltung räumt sich am Ende über den Lösch-Weg ab; angelegte Teilnehmer bleiben mit dem
// `__test__`-Präfix der DB-Integrationstests liegen (geteilte Dev-DB, #346).

test.skip(!process.env.E2E_404, "legt Daten an – nur mit E2E_404=1 (siehe Kopfkommentar)");

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

// Lauf-Suffix: trennt wiederholte Ausführungen auf derselben DB – sonst griffe die
// Duplikat-Warnung schon beim ersten Anlegen.
const LAUF = Date.now().toString(36);
const PREFIX = "__test__E2E404";
const MIN_TIPP_HOEHE = 44;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function legeInVerwaltungAn(page: Page, name: string) {
  await page.goto("/verwaltung/teilnehmer");
  const dialog = await oeffneTeilnehmerAnlegen(page);
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await schickeAnlegeDialogAb(dialog);
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

test.describe("Teilnehmer anlegen aus der Veranstaltung (#404)", () => {
  test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");

  test("AK1–AK7: Auswahl, Absprung, Zurück, Anlegen und Duplikat-Warnung", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    const suchbegriff = `Auswahl-${LAUF}`;
    const vorhanden = `${PREFIX} Vorhanden ${suchbegriff}`;
    const neu = `${PREFIX} Neu ${suchbegriff}x`;
    await legeInVerwaltungAn(page, vorhanden);
    const detailPfad = await legeVeranstaltungAn(page, `${PREFIX} Anlegen ${LAUF}`, "2026-10-12");
    await page.goto(detailPfad);

    // ── AK7: Auslöser heißt „Teilnehmer hinzufügen", Tipp-Ziel ≥ 44 px ─────────────────────
    const box = await teilnehmerAusloeser(page).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TIPP_HOEHE);

    // ── AK2/AK1/AK5: nur Suche, Auswahl, Absprung und Aktionen; kein „Gast" ───────────────
    await oeffneTeilnehmerDialog(page);
    const auswahl = teilnehmerDialog(page);
    // Ohne Namensfilter: auch ein zurückkehrendes „Anzeigename" fiele auf (die Suche ist `searchbox`).
    await expect(auswahl.getByRole("textbox")).toHaveCount(0);
    await expect(auswahl.getByRole("combobox", { name: "Typ" })).toHaveCount(0);
    // Erst nach dem Filtern prüfen: die geteilte Dev-DB enthält Teilnehmernamen mit „Gast" aus
    // älteren E2E-Läufen – das sind Daten, keine UI-Texte.
    await auswahl.getByRole("searchbox", { name: "Suchen" }).fill(suchbegriff);
    await expect(auswahl).not.toContainText(/Gast|Stammteilnehmer/);

    // ── AK3.1/AK3.2: Absprung und Zurück behalten Suche und Auswahl ────────────────────────
    await auswahl.getByRole("checkbox", { name: vorhanden }).check();
    await auswahl.getByRole("button", { name: "Teilnehmer anlegen", exact: true }).click();
    await expect(anlegeSchritt(page)).toBeVisible();
    // Der Schrittwechsel hängt den getippten Knopf aus – der Fokus muss ein neues Ziel finden.
    await expect(anlegeSchritt(page).getByLabel("Name", { exact: true })).toBeFocused();
    await anlegeSchritt(page).getByRole("button", { name: "← Zur Auswahl", exact: true }).click();
    await expect(auswahl.getByRole("searchbox", { name: "Suchen" })).toHaveValue(suchbegriff);
    await expect(auswahl.getByRole("checkbox", { name: vorhanden })).toBeChecked();
    await expect(
      auswahl.getByRole("button", { name: "Teilnehmer anlegen", exact: true }),
    ).toBeFocused();

    // ── AK3.3: ohne Treffer übernimmt der Absprung den Suchtext ────────────────────────────
    await auswahl.getByRole("searchbox", { name: "Suchen" }).fill(neu);
    await expect(
      auswahl.getByText(`Kein Teilnehmer passt zu „${neu}“.`, { exact: true }),
    ).toBeVisible();
    await auswahl
      .getByRole("button", { name: `„${neu}“ als Teilnehmer anlegen`, exact: true })
      .click();
    const schritt = anlegeSchritt(page);
    await expect(schritt.getByLabel("Name", { exact: true })).toHaveValue(neu);

    // ── AK4.1: Felder der Verwaltung + Hinweis ─────────────────────────────────────────────
    await expect(schritt.getByLabel("Typ")).toHaveValue("person");
    await expect(schritt.getByLabel("Mitglied")).not.toBeChecked();
    await expect(
      schritt.getByText(
        "Der Teilnehmer wird angelegt und direkt zu dieser Veranstaltung hinzugefügt.",
      ),
    ).toBeVisible();
    await expect(schritt).not.toContainText(/Gast|Stammteilnehmer/);

    // ── AK4.2: anlegen + hinzufügen, Dialog zu, Meldung ────────────────────────────────────
    await schritt.getByRole("button", { name: "Anlegen", exact: true }).click();
    await expect(schritt).toBeHidden();
    await expect(toast(page, "Teilnehmer angelegt und hinzugefügt")).toBeVisible();
    await expect(page.getByRole("link", { name: neu, exact: true })).toBeVisible();

    // ── AK4.3: Duplikat-Warnung „Trotzdem anlegen", erst der Zweitversuch legt an ──────────
    await oeffneTeilnehmerDialog(page);
    await teilnehmerDialog(page)
      .getByRole("button", { name: "Teilnehmer anlegen", exact: true })
      .click();
    await anlegeSchritt(page).getByLabel("Name", { exact: true }).fill(vorhanden);
    await anlegeSchritt(page).getByRole("button", { name: "Anlegen", exact: true }).click();
    // Über den Text, nicht `getByRole("status")`: der Toast des vorigen Anlegens ist noch sichtbar
    // und hängt im offenen Dialog (Portal, #372) – zwei Status-Elemente.
    await expect(
      anlegeSchritt(page).getByText("Ein aktiver Teilnehmer mit diesem Namen existiert bereits."),
    ).toBeVisible();
    await expect(anlegeSchritt(page).getByLabel("Name", { exact: true })).toHaveValue(vorhanden);
    await expect(page.getByRole("link", { name: vorhanden, exact: true })).toHaveCount(0);
    await anlegeSchritt(page)
      .getByRole("button", { name: "Trotzdem anlegen", exact: true })
      .click();
    await expect(anlegeSchritt(page)).toBeHidden();
    await expect(page.getByRole("link", { name: vorhanden, exact: true })).toBeVisible();

    await oeffneLoeschDialog(page);
    await page.getByRole("button", { name: "Endgültig löschen", exact: true }).click();
    await expect(page).toHaveURL(/\/veranstaltung$/);
  });
});
