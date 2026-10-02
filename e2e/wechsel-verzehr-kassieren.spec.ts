import { test, expect, type Page } from "@playwright/test";
import { gastHinzufuegen } from "./helpers/detailseite";

// Oberflächen-Nachweis für den personenbezogenen Wechsel zwischen Verzehrerfassung und Kassieren
// (#308, spec-308). Prüft gegen einen echten Server, was jsdom nicht belegen kann: dass der
// Personenbezug den echten Router-Übergang und ein Neuladen übersteht, dass die Hervorhebung am
// echten DOM ankommt und dass der Tastaturfokus real im `Erhalten`-Feld der Zielzeile landet.
//
// Bewusst NICHT Teil des Standard-`pnpm test:e2e`-Laufs: die Spec legt Daten an (Veranstaltung +
// Teilnehmer), und der Standardlauf fährt in CI gegen die persistente INT-Umgebung
// (deploy-gate.yml) – die übrigen Specs sind dort rein lesend. Nur mit gesetztem
// E2E_WECHSEL_308=1 aktiv. Lokal ausführen:
//   pnpm db:up && pnpm db:seed
//   E2E_WECHSEL_308=1 pnpm exec dotenv -e .env.local -- playwright test e2e/wechsel-verzehr-kassieren.spec.ts

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";

// Zwei Teilnehmer genügen für den Personenbezug: einer ist Ziel, einer ist Gegenprobe. Namen mit
// Lauf-Suffix, damit wiederholte Läufe auf derselben lokalen DB nicht auf Altbestand matchen.
const LAUF = String(process.env.E2E_WECHSEL_308_SUFFIX ?? "a");
const ZIEL = `Zielperson ${LAUF}`;
const ANDERE = `Andere Person ${LAUF}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("E-Mail").fill(email);
  await page.getByPlaceholder("Passwort").fill(password);
  await page.getByRole("button", { name: /Anmelden/i }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

// Legt eine frische Veranstaltung an und liefert ihren Detail-Pfad. Die neue Veranstaltung wird
// über den Link-Zuwachs identifiziert (wie in anleitung-veranstalter.spec.ts), nicht über den
// Namen – so bleibt der Helper auch bei gleichnamigem Altbestand eindeutig.
// `bezeichnung` kommt vom Aufrufer und muss je Test eindeutig sein: die Tests laufen parallel, und
// zwei gleichnamige Anlagen ließen den Link-Zuwachs um 2 statt um 1 steigen (beobachtet im
// Erstlauf) – dann wäre der Fehlschlag ein Fixture-Artefakt und kein Produktbefund.
async function createVeranstaltung(page: Page, bezeichnung: string): Promise<string> {
  await page.goto("/veranstaltung");
  const anlegen = page.locator("form").filter({ has: page.getByLabel("Bezeichnung") });
  await anlegen.getByLabel("Bezeichnung").fill(bezeichnung);
  await anlegen.getByLabel("Datum").fill("2026-08-31");
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

// Person über die sticky Chip-Leiste der Einzelansicht wählen (#370, ADR-054).
async function waehlePerson(page: Page, name: string) {
  await page
    .getByRole("group", { name: "Teilnehmer auswählen" })
    .getByRole("button", { name })
    .click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(name);
}

// Kassieren-Weg der aktiven Person – seit #370 in der Fußleiste der Einzelansicht (spec-370 AK5.5).
function kassierenInFussleiste(page: Page) {
  return page.getByRole("navigation", { name: "Weiter" }).getByRole("link", { name: /Kassieren/ });
}

// Die Kassierzeile eines Teilnehmers: das Listenelement, das seinen Namen trägt.
function kassierZeile(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name }).first();
}

test.describe("Personenbezogener Wechsel Verzehr ↔ Kassieren (#308)", () => {
  test.skip(!process.env.E2E_WECHSEL_308, "nur mit E2E_WECHSEL_308=1 (legt Daten an)");
  test.skip(!email || !password, "SEED_ADMIN_* nicht gesetzt");

  test("Hin- und Rückweg tragen den Personenbezug – über echten Router und Neuladen", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await login(page);

    const detailPfad = await createVeranstaltung(page, `Wechsel-Hin-Rueck ${LAUF}`);
    await page.goto(detailPfad);
    await gastHinzufuegen(page, ZIEL);
    await gastHinzufuegen(page, ANDERE);

    // ── AK7 (seit #370): genau eine Wechsel-Aktion – die der aktiven Person ─────────────────
    await page.goto(`${detailPfad}/verzehr`);
    await expect(page.getByRole("heading", { name: /^Verzehr · / })).toBeVisible();
    await waehlePerson(page, ANDERE);
    await waehlePerson(page, ZIEL);
    const kassierenLink = page.getByRole("link", { name: /Kassieren/ });
    await expect(kassierenLink).toHaveCount(1);
    await expect(kassierenInFussleiste(page)).toBeVisible();

    // ── AK1: der Klick führt personenbezogen in die Kassieransicht ──────────────────────────
    await kassierenLink.click();
    await expect(page).toHaveURL(/\/kassieren\?zeile=/);
    const zeileId = new URL(page.url()).searchParams.get("zeile") ?? "";
    expect(zeileId).not.toBe("");

    // ── AK2: genau die Zielzeile ist hervorgehoben ──────────────────────────────────────────
    const hervorgehoben = page.locator('li[aria-current="true"]');
    await expect(hervorgehoben).toHaveCount(1);
    await expect(hervorgehoben).toContainText(ZIEL);
    await expect(hervorgehoben).not.toContainText(ANDERE);

    // ── AK2: sie liegt im Sichtbereich ──────────────────────────────────────────────────────
    await expect(hervorgehoben).toBeInViewport();

    // ── AK3: der Tastaturfokus steht im `Erhalten`-Feld DIESER Zeile ────────────────────────
    await expect(kassierZeile(page, ZIEL).getByLabel("Erhalten (EUR)")).toBeFocused();

    // ── AK11: der Personenbezug übersteht ein echtes Neuladen ───────────────────────────────
    await page.reload();
    const nachReload = page.locator('li[aria-current="true"]');
    await expect(nachReload).toHaveCount(1);
    await expect(nachReload).toContainText(ZIEL);

    // ── AK5: jede Kassierzeile bietet den Rückweg an ────────────────────────────────────────
    await expect(page.getByRole("link", { name: /Verzehr erfassen/ })).toHaveCount(2);

    // ── AK5/AK6: der Rückweg der Zielzeile macht genau diese Person aktiv ───────────────────
    // Gegenprobe zuerst: ANDERE steht in der Verzehr-Liste hinter ZIEL, ist also nicht die
    // Rückfall-Person ohne Personenbezug – erst der Bezug auf ANDERE belegt, dass er wirkt. Vor der
    // Überschrift auf die Verzehr-URL warten: die Kassier-Seite trägt selbst mehrere `h2`, und eine
    // Strict-Mode-Verletzung bricht sofort ab, statt auf die Navigation zu warten.
    await kassierZeile(page, ANDERE)
      .getByRole("link", { name: /Verzehr erfassen/ })
      .click();
    await expect(page).toHaveURL(/\/verzehr\?zeile=/);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(ANDERE);
    await page.goBack();
    await kassierZeile(page, ZIEL)
      .getByRole("link", { name: /Verzehr erfassen/ })
      .click();
    await expect(page).toHaveURL(new RegExp(`/verzehr\\?zeile=${zeileId}`));
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(ZIEL);
    // Genau eine Wechsel-Aktion – die der aktiven Person, in der Fußleiste (AK6/AK7).
    await expect(page.getByRole("link", { name: /Kassieren/ })).toHaveCount(1);
    await expect(kassierenInFussleiste(page)).toBeVisible();

    // ── AK8: der Wechsel gelingt beliebig oft in beide Richtungen ───────────────────────────
    for (let runde = 0; runde < 2; runde++) {
      await page.getByRole("link", { name: /Kassieren/ }).click();
      await expect(page).toHaveURL(new RegExp(`/kassieren\\?zeile=${zeileId}`));
      await expect(page.locator('li[aria-current="true"]')).toContainText(ZIEL);
      await expect(kassierZeile(page, ZIEL).getByLabel("Erhalten (EUR)")).toBeFocused();

      await kassierZeile(page, ZIEL)
        .getByRole("link", { name: /Verzehr erfassen/ })
        .click();
      await expect(page).toHaveURL(new RegExp(`/verzehr\\?zeile=${zeileId}`));
      await expect(page.getByRole("link", { name: /Kassieren/ })).toHaveCount(1);
    }
  });

  test("F1: unbekannter Personenbezug lädt beide Seiten im Standardzustand", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);

    const detailPfad = await createVeranstaltung(page, `Wechsel-Fremdbezug ${LAUF}`);
    await page.goto(detailPfad);
    await gastHinzufuegen(page, ZIEL);

    // Zufallswert, der in dieser Veranstaltung keine Zeile ist – fail-soft, kein 404, keine Meldung.
    const fremd = "00000000-0000-4000-8000-000000000000";

    await page.goto(`${detailPfad}/kassieren?zeile=${fremd}`);
    await expect(page.getByRole("heading", { name: /^Kassieren · / })).toBeVisible();
    await expect(page.locator('li[aria-current="true"]')).toHaveCount(0);
    await expect(kassierZeile(page, ZIEL).getByLabel("Erhalten (EUR)")).not.toBeFocused();

    await page.goto(`${detailPfad}/verzehr?zeile=${fremd}`);
    await expect(page.getByRole("heading", { name: /^Verzehr · / })).toBeVisible();
    // Standardzustand seit #370 (spec-370 AK1a.5): die erste Person ist aktiv, ihr Kassieren-Weg
    // steht in der Fußleiste – keine Fehlermeldung, kein Bezug auf den fremden Wert.
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(ZIEL);
    await expect(page.getByRole("link", { name: /Kassieren/ })).toHaveCount(1);
    await expect(page.getByText(fremd)).toHaveCount(0);
  });
});
