import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, ButtonLink, BUTTON_VARIANTS, BUTTON_SIZES } from "./Button";

// Touch-Mindesthöhe aus spec AK2.1: 44 px = 11 × 0.25rem → Tailwind-Klasse `min-h-11`.
const TOUCH_HEIGHT_CLASS = "min-h-11";

describe("Button – Varianten und Größen (AK2.1)", () => {
  it("should_renderDistinctClasses_when_variantsCompared", () => {
    const classLists = BUTTON_VARIANTS.map((variant) => {
      const { unmount } = render(<Button variant={variant}>Aktion</Button>);
      const className = screen.getByRole("button").className;
      unmount();
      return className;
    });

    expect(new Set(classLists).size).toBe(BUTTON_VARIANTS.length);
  });

  it.each(BUTTON_SIZES)("should_keepTouchHeight_when_sizeIs%s", (size) => {
    render(<Button size={size}>Aktion</Button>);

    expect(screen.getByRole("button")).toHaveClass(TOUCH_HEIGHT_CLASS);
  });

  it("should_appendLayoutClassName_when_classNameGiven", () => {
    render(<Button className="w-full">Aktion</Button>);

    expect(screen.getByRole("button")).toHaveClass("w-full");
  });
});

describe("Button – Zustände (AK2.2)", () => {
  it("should_beDisabledAndNotFire_when_disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Aktion
      </Button>,
    );
    const button = screen.getByRole("button");

    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should_showVisibleFocusRing_when_focusedByKeyboard", () => {
    render(<Button>Aktion</Button>);

    expect(screen.getByRole("button").className).toMatch(/focus-visible:outline-accent/);
  });

  it.each(BUTTON_VARIANTS)("should_defineHoverState_when_variantIs%s", (variant) => {
    render(<Button variant={variant}>Aktion</Button>);

    expect(screen.getByRole("button").className).toMatch(/\bnot-disabled:hover:/);
  });

  // Ein deaktivierter Button darf keine Hover-Farbe zeigen, sonst wirkt er bedienbar.
  it.each(BUTTON_VARIANTS)("should_notHoverWhileDisabled_when_variantIs%s", (variant) => {
    render(<Button variant={variant}>Aktion</Button>);

    expect(screen.getByRole("button").className).not.toMatch(/(^|\s)hover:/);
  });

  // Klassen-Kontrakt: Die Deaktiviert-Optik hängt an der CSS-Pseudoklasse `:disabled`, nicht
  // am Prop – sie steht deshalb auf jedem Button und greift erst, wenn er deaktiviert ist.
  it("should_carryDisabledStyling_when_rendered", () => {
    render(<Button>Aktion</Button>);

    expect(screen.getByRole("button")).toHaveClass("disabled:opacity-60");
  });
});

describe("Button – Formularverhalten (AK2.4)", () => {
  it("should_defaultToTypeButton_when_noTypeGiven", () => {
    render(<Button>Aktion</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("should_useSubmitType_when_explicitlyGiven", () => {
    render(<Button type="submit">Speichern</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("should_notSubmitForm_when_buttonHasNoType", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Aktion</Button>
      </form>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // Fehlerszenario aus der Spec: ein deaktivierter Button löst das Formular nicht aus.
  it("should_notSubmitForm_when_submitButtonIsDisabled", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" disabled>
          Speichern
        </Button>
      </form>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("ButtonLink – Navigation im Button-Stil (AK2.3)", () => {
  it("should_renderAnchor_when_usedForNavigation", () => {
    render(<ButtonLink href="/veranstaltung">Zur Übersicht</ButtonLink>);

    const link = screen.getByRole("link", { name: "Zur Übersicht" });
    expect(link).toHaveAttribute("href", "/veranstaltung");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should_shareButtonStyling_when_sameVariantAndSizeUsed", () => {
    const { unmount } = render(<Button variant="secondary">Aktion</Button>);
    const buttonClassName = screen.getByRole("button").className;
    unmount();

    render(
      <ButtonLink href="/x" variant="secondary">
        Aktion
      </ButtonLink>,
    );

    expect(screen.getByRole("link").className).toBe(buttonClassName);
  });

  it.each(BUTTON_SIZES)("should_keepTouchHeight_when_linkSizeIs%s", (size) => {
    render(
      <ButtonLink href="/x" size={size}>
        Aktion
      </ButtonLink>,
    );

    expect(screen.getByRole("link")).toHaveClass(TOUCH_HEIGHT_CLASS);
  });

  it("should_appendLayoutClassName_when_classNameGiven", () => {
    render(
      <ButtonLink href="/x" className="w-full">
        Aktion
      </ButtonLink>,
    );

    expect(screen.getByRole("link")).toHaveClass("w-full");
  });
});
