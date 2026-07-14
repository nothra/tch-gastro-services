import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Teilnehmer } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/teilnehmer", () => ({ listTeilnehmer: vi.fn() }));

import { auth } from "@/auth";
import { listTeilnehmer } from "@/db/teilnehmer";
import TeilnehmerPage from "./page";

const authMock = vi.mocked(auth);
const listTeilnehmerMock = vi.mocked(listTeilnehmer);

function session(roles: string[]) {
  return { user: { roles }, expires: "" } as never;
}

const familie: Teilnehmer = {
  id: "1",
  name: "Familie Müller",
  typ: "familie",
  mitglied: true,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("TeilnehmerPage", () => {
  it("should_denyAccess_when_userIsNotVerwalter", async () => {
    authMock.mockResolvedValue(session(["abrechner"]));

    render(await TeilnehmerPage());

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
    expect(listTeilnehmerMock).not.toHaveBeenCalled();
  });

  it("should_denyAccess_when_noSession", async () => {
    authMock.mockResolvedValue(null as never);

    render(await TeilnehmerPage());

    expect(screen.getByText(/Kein Zugriff/)).toBeInTheDocument();
  });

  it("should_renderTeilnehmer_when_verwalter", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listTeilnehmerMock.mockResolvedValue([familie]);

    render(await TeilnehmerPage());

    expect(screen.getByRole("heading", { name: "Teilnehmer", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Familie Müller")).toBeInTheDocument();
    expect(screen.getByText(/Familie · Mitglied/)).toBeInTheDocument();
  });

  it("should_showEmptyMessage_when_noTeilnehmer", async () => {
    authMock.mockResolvedValue(session(["verwalter"]));
    listTeilnehmerMock.mockResolvedValue([]);

    render(await TeilnehmerPage());

    expect(screen.getByText(/Noch keine Teilnehmer erfasst/)).toBeInTheDocument();
    expect(screen.getByText(/Teilnehmer \(0\)/)).toBeInTheDocument();
  });
});
