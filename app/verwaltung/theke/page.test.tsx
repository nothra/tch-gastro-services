import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/app/veranstaltung/actions", () => ({ ensureThekeAction: vi.fn() }));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { auth } from "@/auth";
import ThekePage from "./page";

const authMock = vi.mocked(auth);

function session(roles: string[]) {
  return { user: { roles }, expires: "" } as never;
}

beforeEach(() => vi.resetAllMocks());

describe("ThekePage (spec-373 AK3.2/AK3.3)", () => {
  it("should_showThekeSetupWithBackLinkToStart_when_verwalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));

    render(await ThekePage());

    const kopf = screen.getByRole("heading", { level: 1, name: "Theke" }).closest("header")!;
    expect(within(kopf as HTMLElement).getByRole("link", { name: /Startseite/ })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("button", { name: "Einrichten" })).toBeInTheDocument();
  });

  it("should_denyAccess_when_onlyVeranstalter", async () => {
    // AK3.3: die Action erlaubt weiter auch Veranstalter – die Seite gehört aber zur Verwaltung.
    authMock.mockResolvedValue(session(["veranstalter"]));

    render(await ThekePage());

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Einrichten" })).not.toBeInTheDocument();
  });

  it("should_denyAccess_when_noSession", async () => {
    authMock.mockResolvedValue(null as never);

    render(await ThekePage());

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
  });
});
