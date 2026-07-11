import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { AppHeader } from "./AppHeader";

// auth() liefert die Session; signOut wird nur beim Klick genutzt (hier nicht ausgelöst).
// auth ist überladen → auf die reine Session-Resolver-Signatur casten.
vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);

describe("AppHeader", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should_showSignOutButton_when_userLoggedIn", async () => {
    authMock.mockResolvedValue({
      user: { email: "verwalter@tch.de", roles: ["verwalter"] },
      expires: "2099-01-01T00:00:00.000Z",
    } as Session);

    render(await AppHeader());

    expect(screen.getByRole("button", { name: /Abmelden/i })).toBeInTheDocument();
    expect(screen.getByText(/verwalter@tch\.de/)).toBeInTheDocument();
  });

  it("should_renderNothing_when_visitorNotLoggedIn", async () => {
    authMock.mockResolvedValue(null);

    const { container } = render((await AppHeader()) ?? <></>);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: /Abmelden/i })).not.toBeInTheDocument();
  });
});
