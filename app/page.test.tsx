import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import type { UserRole } from "@/db/schema";
import { auth } from "@/auth";
import Home from "./page";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
const authMock = vi.mocked(auth as unknown as () => Promise<Session | null>);

function loginWithRoles(roles: UserRole[]) {
  authMock.mockResolvedValue({
    user: { email: "person@tch.de", roles },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session);
}

describe("Home (Dashboard-Hub)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("zeigt den Projekttitel als Überschrift", async () => {
    loginWithRoles(["verwalter"]);
    render(await Home());
    expect(screen.getByRole("heading", { name: /TCH Gastro Services/i })).toBeInTheDocument();
  });

  it("should_showAllTiles_when_bothRoles", async () => {
    loginWithRoles(["verwalter", "veranstalter"]);
    render(await Home());
    expect(screen.getByRole("link", { name: "Veranstaltungen" })).toHaveAttribute(
      "href",
      "/veranstaltung",
    );
    expect(screen.getByRole("link", { name: "Katalog" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Teilnehmer" })).toBeInTheDocument();
  });

  it("should_showOnlyVeranstalterTile_when_roleIsVeranstalter", async () => {
    loginWithRoles(["veranstalter"]);
    render(await Home());
    expect(screen.getByRole("link", { name: "Veranstaltungen" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Katalog" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Teilnehmer" })).not.toBeInTheDocument();
  });

  it("should_showNoTiles_when_rolesEmpty", async () => {
    loginWithRoles([]);
    render(await Home());
    expect(screen.queryByRole("link", { name: "Veranstaltungen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Katalog" })).not.toBeInTheDocument();
  });
});
