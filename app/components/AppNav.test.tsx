import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NavItem } from "@/lib/navigation";
import { AppNav } from "./AppNav";

// usePathname bestimmt die aktive Markierung – variabel je Test.
const pathnameMock = vi.fn<() => string>(() => "/");
vi.mock("next/navigation", () => ({ usePathname: () => pathnameMock() }));

const items: NavItem[] = [
  { label: "Veranstaltungen", href: "/veranstaltung", requiredRole: "veranstalter" },
  { label: "Katalog", href: "/verwaltung/katalog", requiredRole: "verwalter" },
];

const signOutAction = vi.fn(async () => {});

function renderNav(overrides: Partial<Parameters<typeof AppNav>[0]> = {}) {
  return render(
    <AppNav items={items} label="verwalter@tch.de" signOutAction={signOutAction} {...overrides} />,
  );
}

describe("AppNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue("/");
  });

  it("should_renderAreaLinks_when_itemsGiven", () => {
    renderNav();
    expect(screen.getByRole("link", { name: "Veranstaltungen" })).toHaveAttribute(
      "href",
      "/veranstaltung",
    );
    expect(screen.getByRole("link", { name: "Katalog" })).toHaveAttribute(
      "href",
      "/verwaltung/katalog",
    );
  });

  it("should_linkWortmarkeToStartseite_when_rendered", () => {
    // spec-374 AK1.1: die Wortmarke ist der Weg zur Startseite.
    renderNav();
    expect(screen.getByRole("link", { name: "TCH Gastro Services" })).toHaveAttribute("href", "/");
  });

  it("should_placeWortmarkeBeforeNavigationAndKontoLast_when_rendered", () => {
    // AK1.1/ADR-056 D2: Hamburger · Wortmarke · Navigation · Konto-Knopf, in einer Zeile.
    renderNav();
    const header = screen.getByRole("banner");
    const reihenfolge = [
      screen.getByRole("button", { name: "Navigation öffnen" }),
      screen.getByRole("link", { name: "TCH Gastro Services" }),
      screen.getByRole("navigation", { name: "Hauptnavigation" }),
      screen.getByRole("button", { name: "Konto" }),
    ].map((element) => Array.from(header.querySelectorAll("*")).indexOf(element));

    expect(reihenfolge).not.toContain(-1);
    expect(reihenfolge).toEqual([...reihenfolge].sort((a, b) => a - b));
  });

  it("should_letWortmarkeTruncateButNotTheButtons_when_viewportIsNarrow", () => {
    // AK1.6: auf 375 px kürzt nur die Wortmarke; Hamburger und Konto-Knopf schrumpfen nie.
    renderNav();
    expect(screen.getByRole("link", { name: "TCH Gastro Services" })).toHaveClass(
      "min-w-0",
      "truncate",
    );
    expect(screen.getByRole("button", { name: "Navigation öffnen" })).toHaveClass("shrink-0");
    expect(screen.getByRole("button", { name: "Konto" })).toHaveClass("shrink-0");
  });

  it("should_showEmailOnlyInKontoMenu_when_rendered", () => {
    // AK1.2: die E-Mail steht nicht dauerhaft im Header, sondern im (geschlossenen) Konto-Menü.
    renderNav();
    const kontoMenue = document.getElementById("konto-menue") as HTMLElement;

    expect(screen.getByText("verwalter@tch.de")).toBeInTheDocument();
    expect(kontoMenue).toContainElement(screen.getByText("verwalter@tch.de"));
    expect(
      within(kontoMenue).getByRole("button", { name: "Abmelden", hidden: true }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abmelden" })).not.toBeInTheDocument();
  });

  it("should_keepSignOut_when_noAreaItems", () => {
    // fail-closed: keine Bereiche, aber Abmelden bleibt im Konto-Menü erreichbar.
    renderNav({ items: [] });
    expect(screen.getByRole("button", { name: "Konto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abmelden", hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Veranstaltungen" })).not.toBeInTheDocument();
  });

  it("should_markActiveArea_when_pathnameMatches", () => {
    pathnameMock.mockReturnValue("/verwaltung/katalog");
    renderNav();
    // Jede gerenderte Instanz des aktiven Eintrags trägt aria-current="page".
    const active = screen.getAllByRole("link", { name: "Katalog" });
    expect(active.length).toBeGreaterThan(0);
    active.forEach((link) => expect(link).toHaveAttribute("aria-current", "page"));
    screen
      .getAllByRole("link", { name: "Veranstaltungen" })
      .forEach((link) => expect(link).not.toHaveAttribute("aria-current"));
  });

  it("should_markActiveArea_when_pathnameIsSubroute", () => {
    pathnameMock.mockReturnValue("/veranstaltung/123");
    renderNav();
    screen
      .getAllByRole("link", { name: "Veranstaltungen" })
      .forEach((link) => expect(link).toHaveAttribute("aria-current", "page"));
  });

  it("should_openDrawer_when_toggleClicked", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /Navigation öffnen/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: /Navigation/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveFocus();
  });

  it("should_closeDrawerAndRestoreFocus_when_escapePressed", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /Navigation öffnen/i });
    await user.click(toggle);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("should_closeDrawer_when_areaLinkClicked", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: /Navigation öffnen/i }));
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getByRole("link", { name: "Veranstaltungen" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should_closeDrawer_when_closeButtonClicked", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: /Navigation öffnen/i }));

    await user.click(screen.getByRole("button", { name: /Navigation schließen/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Fokus-Trap: aria-modal="true" sagt der assistiven Technik zu, dass Fokus den Dialog
  // nicht verlässt – also muss Tab am Rand im Drawer umlaufen, nicht auf verdeckte
  // Header-Bedienelemente (Hamburger, Abmelden) hinter dem Overlay springen.
  it("should_wrapFocusToCloseButton_when_tabAtLastDrawerLink", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: /Navigation öffnen/i }));
    const dialog = screen.getByRole("dialog");
    const links = within(dialog).getAllByRole("link");
    const lastLink = links[links.length - 1];
    lastLink.focus();
    expect(lastLink).toHaveFocus();

    await user.keyboard("{Tab}");

    expect(within(dialog).getByRole("button", { name: /Navigation schließen/i })).toHaveFocus();
  });

  it("should_wrapFocusToLastLink_when_shiftTabAtFirstDrawerElement", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: /Navigation öffnen/i }));
    const dialog = screen.getByRole("dialog");
    const closeButton = within(dialog).getByRole("button", { name: /Navigation schließen/i });
    closeButton.focus();
    expect(closeButton).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");

    const links = within(dialog).getAllByRole("link");
    expect(links[links.length - 1]).toHaveFocus();
  });

  it("should_wrapFocusToLastLink_when_shiftTabPressedRightAfterOpen", async () => {
    // Beim Öffnen erhält der Drawer-Container selbst den Fokus (tabIndex=-1) – Shift+Tab
    // von dort muss ebenso ans Ende umlaufen wie vom ersten fokussierbaren Kind aus.
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: /Navigation öffnen/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");

    const links = within(dialog).getAllByRole("link");
    expect(links[links.length - 1]).toHaveFocus();
  });

  it("should_returnFocusToFirstDrawerElement_when_tabPressedWhileFocusEscapedDrawer", async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole("button", { name: /Navigation öffnen/i });
    await user.click(toggle);
    const dialog = screen.getByRole("dialog");
    // Fokus ist (z. B. per Screenreader-Navigation) auf ein verdecktes Header-Element
    // entwichen, während der Drawer noch offen ist.
    toggle.focus();
    expect(toggle).toHaveFocus();

    await user.keyboard("{Tab}");

    expect(within(dialog).getByRole("button", { name: /Navigation schließen/i })).toHaveFocus();
  });
});
