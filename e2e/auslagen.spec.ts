import { test, expect, type Page } from "@playwright/test";
import { oeffneLoeschDialog, teilnehmerAnlegenUndHinzufuegen } from "./helpers/detailseite";
import { legeVeranstaltungAn } from "./helpers/listenseiten";
import {
  auslageMenueKnopf,
  erfasseAuslage,
  fuelleAuslage,
  neuImKopf,
  oeffneAuslageErfassen,
  waehleAuslageAktion,
} from "./helpers/auslagen";
import { toast } from "./helpers/toast";

// Oberflächen-Nachweis für die Auslagen-Seite auf der UI-Grundlage (#406, spec-406, ADR-061).
// Prüft gegen einen echten Browser, was jsdom nicht belegen kann: Escape und Außenklick am
// ⋯-Menü, Fokus-Rückgabe nach Dialog und Menü, Escape am nativen `<dialog>` und dass Eingaben
// nach einer Ablehnung im Dialog stehen bleiben.
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: die Spec legt Daten an, der Standardlauf
// fährt in CI gegen die persistente INT-Umgebung und ist dort rein lesend. Nur mit gesetztem
// E2E_406=1 aktiv. Lokal:
//   pnpm db:up && pnpm db:seed
//   E2E_406=1 pnpm exec dotenv -e .env.local -- playwright test e2e/auslagen.spec.ts
//
// Alle Namen tragen das `__test__`-Präfix (geteilte Dev-DB, #346); die Veranstaltung räumt sich
// am Ende selbst ab.

test.skip(!process.env.E2E_406, "legt Daten an – nur mit E2E_406=1 (siehe Kopfkommentar)");

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";
const PREFIX = "__test__E2E406";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function loescheVeranstaltung(page: Page, detailPfad: string) {
  await page.goto(detailPfad);
  await oeffneLoeschDialog(page);
  await page.getByRole("button", { name: "Endgültig löschen" }).click();
  await expect(page).toHaveURL(/\/veranstaltung$/);
}

test("spec-406: Auslagen erfassen, bearbeiten, erstatten und löschen", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  // Zeitstempel: der Teilnehmer überlebt die Veranstaltung (spec-404 AK4.3).
  const gast = `${PREFIX}Teilnehmer${Date.now()}`;
  const detailPfad = await legeVeranstaltungAn(page, `${PREFIX}Auslagen`, "2026-10-15");
  await page.goto(`${detailPfad}/auslagen`);

  // ── spec-420 AK1.1: Übersicht vor der Liste, kein Formular, Leerzustand ohne eigenen Button ─
  await expect(page.getByRole("heading", { name: "Übersicht" })).toBeVisible();
  await expect(page.getByText("Noch keine Auslagen erfasst.")).toBeVisible();
  await expect(page.locator("main").getByRole("button")).toHaveCount(1);
  await expect(neuImKopf(page)).toBeVisible();
  await expect(page.locator("main").getByRole("combobox")).toHaveCount(0);

  // ── spec-420 AK3: ohne Teilnehmer Hinweis, „Abbrechen" + deaktiviertes „Erfassen" ───────
  const ohneTeilnehmer = await oeffneAuslageErfassen(page);
  await expect(ohneTeilnehmer.getByText(/^Zuerst Teilnehmer/)).toBeVisible();
  await expect(ohneTeilnehmer.getByRole("combobox")).toHaveCount(0);
  await expect(
    ohneTeilnehmer.getByRole("button", { name: "Erfassen", exact: true }),
  ).toBeDisabled();
  await ohneTeilnehmer.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(ohneTeilnehmer).toBeHidden();
  await expect(neuImKopf(page)).toBeFocused();
  await oeffneAuslageErfassen(page);
  await page.keyboard.press("Escape");
  await expect(ohneTeilnehmer).toBeHidden();
  await expect(neuImKopf(page)).toBeFocused();

  await page.goto(detailPfad);
  await teilnehmerAnlegenUndHinzufuegen(page, gast);
  await page.goto(`${detailPfad}/auslagen`);

  // ── AK1.5: Ablehnung lässt den Dialog offen, die Eingaben bleiben stehen ────────────────
  const erfassen = await oeffneAuslageErfassen(page);
  await fuelleAuslage(erfassen, { teilnehmer: gast, kategorie: "Essen", betrag: "0" });
  await erfassen.getByRole("button", { name: "Erfassen", exact: true }).click();
  await expect(erfassen.getByRole("alert")).toBeVisible();
  await expect(erfassen.getByLabel("Betrag (€)")).toHaveValue("0");
  await expect(erfassen.getByLabel("Teilnehmer")).toHaveValue(/.+/);

  // ── AK1.6: Escape schließt ohne Speichern, Fokus zurück auf „+ Neu" ─────────────────────
  await page.keyboard.press("Escape");
  await expect(erfassen).toBeHidden();
  await expect(neuImKopf(page)).toBeFocused();

  // ── AK1.4: Erfassen schließt den Dialog, Toast, Zeile mit Badge „offen" ─────────────────
  await erfasseAuslage(page, {
    teilnehmer: gast,
    kategorie: "Essen",
    betrag: "12,50",
    notiz: "Grillfleisch",
  });
  await expect(toast(page, "Auslage erfasst")).toBeVisible();
  const tippZiel = page.getByRole("listitem").getByRole("button", { name: new RegExp(`^${gast}`) });
  await expect(tippZiel).toContainText("Essen · Grillfleisch");
  await expect(tippZiel).toContainText("12,50 €");
  await expect(tippZiel.getByText("offen", { exact: true })).toBeVisible();

  // ── AK2.3/AK2a.4: Tipp öffnet „Auslage bearbeiten", Abbrechen gibt den Fokus an die Zeile ─
  await tippZiel.click();
  const bearbeiten = page.getByRole("dialog", { name: "Auslage bearbeiten" });
  await expect(bearbeiten.getByLabel("Betrag (€)")).toHaveValue("12,50");
  await bearbeiten.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(bearbeiten).toBeHidden();
  await expect(tippZiel).toBeFocused();

  // ── AK2a.2: Speichern übernimmt den neuen Betrag ────────────────────────────────────────
  await tippZiel.click();
  await bearbeiten.getByLabel("Betrag (€)").fill("14,00");
  await bearbeiten.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(bearbeiten).toBeHidden();
  await expect(toast(page, "Gespeichert")).toBeVisible();
  await expect(tippZiel).toContainText("14,00 €");

  // ── AK3.5: Menü schließt per Escape und Außenklick, Fokus zurück am ⋯-Knopf ─────────────
  const menueKnopf = auslageMenueKnopf(page, gast);
  const menue = page.getByRole("menu", { name: `Aktionen für ${gast}`, exact: true });
  await menueKnopf.click();
  await expect(menue.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menue).toBeHidden();
  await expect(menueKnopf).toBeFocused();
  await menueKnopf.click();
  await page.getByRole("heading", { name: "Übersicht" }).click();
  await expect(menue).toBeHidden();

  // ── AK3.3: Erstatten ohne Bestätigung, Badge wechselt, Toast ────────────────────────────
  await waehleAuslageAktion(page, gast, "Als erstattet markieren");
  await expect(toast(page, "Auslage erstattet")).toBeVisible();
  await expect(tippZiel.getByText("erstattet", { exact: true })).toBeVisible();
  await waehleAuslageAktion(page, gast, "Erstattung zurücknehmen");
  await expect(toast(page, "Erstattung zurückgenommen")).toBeVisible();
  await expect(tippZiel.getByText("offen", { exact: true })).toBeVisible();

  // ── AK3.5: „Bearbeiten" im Menü öffnet denselben Dialog ─────────────────────────────────
  await waehleAuslageAktion(page, gast, "Bearbeiten");
  await expect(bearbeiten).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(bearbeiten).toBeHidden();

  // ── AK4: Löschen mit Rückfrage, Fokus nach dem Erfolg auf der Listen-Überschrift ────────
  await waehleAuslageAktion(page, gast, "Löschen");
  const loeschen = page.getByRole("dialog", { name: "Auslage löschen?" });
  await loeschen.getByRole("button", { name: "Löschen", exact: true }).click();
  await expect(loeschen).toBeHidden();
  await expect(toast(page, "Auslage gelöscht")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Auslagen (0)" })).toBeFocused();

  await loescheVeranstaltung(page, detailPfad);
});
