import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Teilnehmer } from "@/db/schema";
import type { VeranstaltungFormState } from "./actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ addZeileAction: vi.fn() }));

// useActionState steuert Fehlerzustand und Pending-Anzeige.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { AddTeilnehmerForm } from "./AddTeilnehmerForm";

const useActionStateMock = vi.mocked(useActionState);
const noopDispatch = vi.fn();

function withState(state: VeranstaltungFormState | undefined, isPending = false) {
  useActionStateMock.mockReturnValue([state, noopDispatch, isPending] as never);
}

const teilnehmerA: Teilnehmer = {
  id: "t-1",
  name: "Anna Müller",
  typ: "person",
  mitglied: false,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const teilnehmerB: Teilnehmer = {
  id: "t-2",
  name: "Familie Schulz",
  typ: "familie",
  mitglied: true,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  withState(undefined);
});

describe("AddTeilnehmerForm", () => {
  it("should_showAlleErfasstMessage_when_verfuegbarIsEmpty", () => {
    render(<AddTeilnehmerForm veranstaltungId="v-1" verfuegbar={[]} />);

    expect(screen.getByText("Alle aktiven Teilnehmer sind bereits erfasst.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should_showTeilnehmerDropdownAndButton_when_verfuegbarNotEmpty", () => {
    render(<AddTeilnehmerForm veranstaltungId="v-1" verfuegbar={[teilnehmerA, teilnehmerB]} />);

    expect(screen.getByRole("option", { name: "Anna Müller" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Familie Schulz" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hinzufügen" })).toBeInTheDocument();
  });

  it("should_includeHiddenVeranstaltungId_when_rendered", () => {
    render(<AddTeilnehmerForm veranstaltungId="v-42" verfuegbar={[teilnehmerA]} />);

    expect(screen.getByDisplayValue("v-42")).toHaveAttribute("name", "veranstaltungId");
  });

  it("should_showErrorMessage_when_stateHasError", () => {
    withState({ error: "Teilnehmer nicht gefunden." });
    render(<AddTeilnehmerForm veranstaltungId="v-1" verfuegbar={[teilnehmerA]} />);

    expect(screen.getByText("Teilnehmer nicht gefunden.")).toBeInTheDocument();
  });

  it("should_showDisabledButtonWithHinzufuegenPendingText_when_pending", () => {
    withState(undefined, true);
    render(<AddTeilnehmerForm veranstaltungId="v-1" verfuegbar={[teilnehmerA]} />);

    const button = screen.getByRole("button", { name: "Hinzufügen …" });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
