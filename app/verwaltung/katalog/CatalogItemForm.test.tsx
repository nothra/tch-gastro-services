import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { CatalogFormState } from "./actions";

// Externe Grenze: Server Action aus derselben Feature-Schicht.
vi.mock("./actions", () => ({ createCatalogItemAction: vi.fn() }));

// useActionState steuert Fehlerzustand/Pending direkt (etablierter Ansatz, Codify #49).
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: vi.fn() };
});

import { useActionState } from "react";
import { CatalogItemForm } from "./CatalogItemForm";

const useActionStateMock = vi.mocked(useActionState);

function withState(state: CatalogFormState | undefined, pending = false) {
  useActionStateMock.mockImplementation(() => [state, vi.fn(), pending] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  withState(undefined);
});

afterEach(() => cleanup());

describe("CatalogItemForm", () => {
  it("should_offerAnlegenAsSubmitWithoutNotice_when_renderedFresh", () => {
    render(<CatalogItemForm catalogId="cat-1" />);

    expect(screen.getByRole("heading", { level: 2, name: "Artikel anlegen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anlegen" })).toHaveAttribute("type", "submit");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should_sendCatalogIdAsHiddenField_when_rendered", () => {
    const { container } = render(<CatalogItemForm catalogId="cat-1" />);

    const hidden = container.querySelector('input[name="catalogId"]') as HTMLInputElement;
    expect(hidden.value).toBe("cat-1");
  });

  it("should_showDisabledSpeichernLabel_when_pending", () => {
    withState(undefined, true);
    render(<CatalogItemForm catalogId="cat-1" />);

    expect(screen.getByRole("button", { name: "Speichern …" })).toBeDisabled();
  });

  it("should_showErrorAsAlert_when_createFailed", () => {
    withState({ error: "Artikel existiert bereits" });
    render(<CatalogItemForm catalogId="cat-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Artikel existiert bereits");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should_showSuccessAsStatus_when_createSucceeded", () => {
    withState({ ok: true });
    render(<CatalogItemForm catalogId="cat-1" />);

    expect(screen.getByRole("status")).toHaveTextContent("Artikel angelegt.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
