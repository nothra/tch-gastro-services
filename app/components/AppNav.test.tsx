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

  it("should_renderAreaLinksAndSignOut_when_itemsGiven", () => {
    renderNav();
    expect(screen.getByRole("link", { name: "Veranstaltungen" })).toHaveAttribute(
      "href",
      "/veranstaltung",
    );
    expect(screen.getByRole("link", { name: "Katalog" })).toHaveAttribute(
      "href",
      "/verwaltung/katalog",
    );
    expect(screen.getByRole("button", { name: /Abmelden/i })).toBeInTheDocument();
    expect(screen.getByText("verwalter@tch.de")).toBeInTheDocument();
  });

  it("should_keepSignOut_when_noAreaItems", () => {
    // fail-closed: keine Bereiche, aber Abmelden bleibt erreichbar.
    renderNav({ items: [] });
    expect(screen.getByRole("button", { name: /Abmelden/i })).toBeInTheDocument();
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
});
