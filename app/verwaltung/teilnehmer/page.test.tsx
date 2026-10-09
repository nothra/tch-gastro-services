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

  it("should_showEmptyMessageWithAnlegenButtonAndNoGroups_when_noTeilnehmer", async () => {
    // spec-405 AK5.1/AK5.2 (Glossar-Verb „anlegen", spec-375).
    authMock.mockResolvedValue(session(["verwalter"]));
    listTeilnehmerMock.mockResolvedValue([]);

    render(await TeilnehmerPage());

    expect(screen.getByText("Noch keine Teilnehmer angelegt.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    expect(document.querySelector("details")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Teilnehmer anlegen" }));
    expect(screen.getByRole("dialog", { name: "Teilnehmer anlegen" })).toBeInTheDocument();
  });
});

describe("TeilnehmerPage – Aktiv/Deaktiviert (spec-405 AK3)", () => {
  const aktivA: Teilnehmer = { ...familie, id: "a", name: "Anton", typ: "person" };
  const aktivB: Teilnehmer = { ...familie, id: "b", name: "Berta", typ: "person" };
  const inaktivC: Teilnehmer = { ...familie, id: "c", name: "Cäsar", active: false };

  function abschnitt(name: RegExp) {
    return screen.getByRole("region", { name });
  }

  beforeEach(() => authMock.mockResolvedValue(session(["verwalter"])));

  it("should_splitIntoNamedSectionsWithCounters_when_bothStatesPresent", async () => {
    // AK3.1/AK3.7: Aufklapper mit Zähler, Gruppen als benannte Abschnitte mit Überschrift.
    listTeilnehmerMock.mockResolvedValue([aktivA, inaktivC, aktivB]);

    render(await TeilnehmerPage());

    expect(screen.getByRole("heading", { level: 2, name: "Aktiv (2)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Deaktiviert (1)" })).toBeInTheDocument();
    expect(within(abschnitt(/^Aktiv/)).getAllByRole("listitem")).toHaveLength(2);
    expect(within(abschnitt(/^Deaktiviert/)).getByText("Cäsar")).toBeInTheDocument();
    expect(within(abschnitt(/^Aktiv/)).queryByText("Cäsar")).not.toBeInTheDocument();
  });

  it("should_openAktivAndCollapseDeaktiviert_when_pageLoads", async () => {
    // AK3.2
    listTeilnehmerMock.mockResolvedValue([aktivA, inaktivC]);

    render(await TeilnehmerPage());

    expect(abschnitt(/^Aktiv/).querySelector("details")).toHaveAttribute("open");
    expect(abschnitt(/^Deaktiviert/).querySelector("details")).not.toHaveAttribute("open");
  });

  it("should_keepListOrderWithinGroups_when_rendered", async () => {
    // AK3.6: Reihenfolge aus listTeilnehmer, hier nur aufgeteilt.
    listTeilnehmerMock.mockResolvedValue([aktivB, inaktivC, aktivA]);

    render(await TeilnehmerPage());

    const namen = within(abschnitt(/^Aktiv/))
      .getAllByRole("listitem")
      .map((zeile) => zeile.querySelector(".font-semibold")?.textContent);
    expect(namen).toEqual(["Berta", "Anton"]);
  });

  it("should_omitDeaktiviertGroup_when_noInactiveTeilnehmer", async () => {
    // AK3.4
    listTeilnehmerMock.mockResolvedValue([aktivA]);

    render(await TeilnehmerPage());

    expect(screen.getByRole("heading", { level: 2, name: "Aktiv (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Deaktiviert/ })).not.toBeInTheDocument();
  });

  it("should_omitAktivGroup_when_onlyInactiveTeilnehmer", async () => {
    // AK3.4 Gegenrichtung (Lesson #211): kein „Aktiv (0)".
    listTeilnehmerMock.mockResolvedValue([inaktivC]);

    render(await TeilnehmerPage());

    expect(screen.getByRole("heading", { level: 2, name: "Deaktiviert (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Aktiv/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Noch keine Teilnehmer angelegt.")).not.toBeInTheDocument();
  });

  it("should_notShowOldTotalHeading_when_teilnehmerPresent", async () => {
    // Entschiedene Annahme: „Teilnehmer (n)" entfällt zugunsten der Zähler.
    listTeilnehmerMock.mockResolvedValue([aktivA]);

    render(await TeilnehmerPage());

    expect(screen.queryByRole("heading", { name: /^Teilnehmer \(/ })).not.toBeInTheDocument();
  });
});
