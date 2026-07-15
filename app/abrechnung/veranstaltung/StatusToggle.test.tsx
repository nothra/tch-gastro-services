import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ setStatusAction: vi.fn() }));

import { StatusToggle } from "./StatusToggle";

beforeEach(() => vi.clearAllMocks());

describe("StatusToggle", () => {
  it("should_showAbschliessenButton_when_statusOffen", () => {
    render(<StatusToggle id="v-1" status="offen" />);

    expect(screen.getByRole("button", { name: "Abschließen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Wieder öffnen" })).not.toBeInTheDocument();
  });

  it("should_showWiederOeffnenButton_when_statusAbgeschlossen", () => {
    render(<StatusToggle id="v-1" status="abgeschlossen" />);

    expect(screen.getByRole("button", { name: "Wieder öffnen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abschließen" })).not.toBeInTheDocument();
  });

  it("should_haveAbgeschlossenAsHiddenStatus_when_offen", () => {
    render(<StatusToggle id="v-1" status="offen" />);

    // Zielbstatus ist der entgegengesetzte Wert: offen → abgeschlossen.
    expect(screen.getByDisplayValue("abgeschlossen")).toHaveAttribute("name", "status");
  });

  it("should_haveOffenAsHiddenStatus_when_abgeschlossen", () => {
    render(<StatusToggle id="v-1" status="abgeschlossen" />);

    // Zielstatus ist der entgegengesetzte Wert: abgeschlossen → offen.
    expect(screen.getByDisplayValue("offen")).toHaveAttribute("name", "status");
  });

  it("should_includeHiddenId_when_rendered", () => {
    render(<StatusToggle id="v-42" status="offen" />);

    expect(screen.getByDisplayValue("v-42")).toHaveAttribute("name", "id");
  });
});
