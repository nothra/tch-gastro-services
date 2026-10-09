import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Teilnehmer } from "@/db/schema";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db/teilnehmer", () => ({ listTeilnehmer: vi.fn() }));
vi.mock("./actions", () => ({
  createTeilnehmerAction: vi.fn(),
  updateTeilnehmerAction: vi.fn(),
  setTeilnehmerActiveAction: vi.fn(),
}));

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

beforeEach(() => vi.resetAllMocks());

describe("TeilnehmerPage", () => {
  it("should_denyAccess_when_userIsNotVerwalter", async () => {
    authMock.mockResolvedValue(session(["veranstalter"]));

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

  it("should_showTitleInPageHeaderWithoutBackLink_when_verwalter", async () => {
    // spec-374 AK4.2: Top-Level-Bereich – Seitenkopf ohne Zurück-Link (Navigation reicht).
    authMock.mockResolvedValue(session(["verwalter"]));
    listTeilnehmerMock.mockResolvedValue([]);

    render(await TeilnehmerPage());

    const kopf = screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
    expect(kopf).not.toBeNull();
    expect(within(kopf).queryByRole("link")).not.toBeInTheDocument();
  });

  it("should_showNeuButtonInHeaderAndNoFormOnLoad_when_verwalter", async () => {
    // spec-373 AK1.1/AK8.1: Anlegen über „+ Neu", das Formular ist beim Laden nicht sichtbar.
    authMock.mockResolvedValue(session(["verwalter"]));
    listTeilnehmerMock.mockResolvedValue([familie]);

    render(await TeilnehmerPage());

    const kopf = screen.getByRole("heading", { level: 1 }).closest("header") as HTMLElement;
    expect(within(kopf).getByRole("button", { name: "+ Neu" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("should_notShowNeuButton_when_userIsNotVerwalter", async () => {
    // AK1.6
    authMock.mockResolvedValue(session(["veranstalter"]));

    render(await TeilnehmerPage());

    expect(screen.queryByRole("button", { name: "+ Neu" })).not.toBeInTheDocument();
  });

  it("should_showEmptyMessageWithAnlegenButton_when_noTeilnehmer", async () => {
    // AK6.1
    authMock.mockResolvedValue(session(["verwalter"]));
    listTeilnehmerMock.mockResolvedValue([]);

    render(await TeilnehmerPage());

    expect(screen.getByText(/Noch keine Teilnehmer erfasst/)).toBeInTheDocument();
    expect(screen.getByText(/Teilnehmer \(0\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Teilnehmer anlegen" }));
    expect(screen.getByRole("dialog", { name: "Teilnehmer anlegen" })).toBeInTheDocument();
  });
});
