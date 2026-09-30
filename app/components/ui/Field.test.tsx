import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field, SelectField } from "./Field";

describe("Field – Label- und Hinweis-Verknüpfung (AK2.5)", () => {
  it("should_focusInput_when_labelIsClicked", async () => {
    const user = userEvent.setup();
    render(<Field label="E-Mail" name="email" />);

    await user.click(screen.getByText("E-Mail"));

    expect(screen.getByLabelText("E-Mail")).toHaveFocus();
  });

  it("should_bindHintViaAriaDescribedby_when_hintGiven", () => {
    render(<Field label="Preis" name="price" hint="In Euro, z. B. 2,10" />);

    const input = screen.getByLabelText("Preis");
    expect(input).toHaveAccessibleDescription("In Euro, z. B. 2,10");
  });

  it("should_bindErrorViaAriaDescribedby_when_errorGiven", () => {
    render(<Field label="Preis" name="price" error="Preis fehlt" />);

    expect(screen.getByLabelText("Preis")).toHaveAccessibleDescription("Preis fehlt");
  });

  it("should_bindHintAndError_when_bothGiven", () => {
    render(<Field label="Preis" name="price" hint="In Euro" error="Preis fehlt" />);

    expect(screen.getByLabelText("Preis")).toHaveAccessibleDescription("In Euro Preis fehlt");
  });

  it("should_useGivenId_when_idProvided", () => {
    render(<Field label="E-Mail" name="email" id="login-email" />);

    expect(screen.getByLabelText("E-Mail")).toHaveAttribute("id", "login-email");
  });

  // Fehlerszenario aus der Spec: mehrere Felder ohne `id` auf derselben Seite (z. B. mehrere
  // Katalog-Zeilen im Bearbeiten-Modus) müssen trotzdem eindeutig verknüpft bleiben.
  it("should_generateUniqueIds_when_multipleFieldsRenderedWithoutId", () => {
    render(
      <>
        <Field label="Bezeichnung" name="a" hint="erste Zeile" />
        <Field label="Bezeichnung" name="b" hint="zweite Zeile" />
      </>,
    );

    const [first, second] = screen.getAllByLabelText("Bezeichnung");
    expect(first.id).not.toBe(second.id);
    expect(first).toHaveAccessibleDescription("erste Zeile");
    expect(second).toHaveAccessibleDescription("zweite Zeile");
  });
});

describe("Field – Fehlerzustand (AK2.6)", () => {
  it("should_markInvalidAndUseDangerToken_when_errorGiven", () => {
    render(<Field label="Preis" name="price" error="Preis fehlt" />);

    const input = screen.getByLabelText("Preis");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("border-danger");
  });

  it("should_omitAriaInvalid_when_noError", () => {
    render(<Field label="Preis" name="price" />);

    const input = screen.getByLabelText("Preis");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveClass("border-line");
  });
});

describe("Field – Eingabearten und native Attribute (AK2.7)", () => {
  it.each(["text", "password", "number"] as const)(
    "should_renderNativeInput_when_typeIs%s",
    (type) => {
      render(<Field label="Wert" name="value" type={type} />);

      expect(screen.getByLabelText("Wert")).toHaveAttribute("type", type);
    },
  );

  it("should_passThroughNativeAttributes_when_given", () => {
    render(
      <Field
        label="Preis"
        name="priceCents"
        required
        inputMode="decimal"
        autoComplete="off"
        placeholder="z. B. 2,10"
        defaultValue="2,10"
      />,
    );

    const input = screen.getByLabelText("Preis") as HTMLInputElement;
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("name", "priceCents");
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("placeholder", "z. B. 2,10");
    expect(input.value).toBe("2,10");
  });

  it("should_applyLayoutClassNameToWrapper_when_classNameGiven", () => {
    const { container } = render(<Field label="Wert" name="value" className="w-24" />);

    expect(container.firstElementChild).toHaveClass("w-24");
  });
});

describe("SelectField – Auswahl (AK2.7)", () => {
  it("should_renderSelectWithOptions_when_childrenGiven", () => {
    render(
      <SelectField label="Kategorie" name="category" defaultValue="essen">
        <option value="getraenk">Getränk</option>
        <option value="essen">Essen</option>
      </SelectField>,
    );

    const select = screen.getByLabelText("Kategorie") as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.value).toBe("essen");
    expect(screen.getByRole("option", { name: "Getränk" })).toBeInTheDocument();
  });

  it("should_markInvalid_when_errorGiven", () => {
    render(
      <SelectField label="Kategorie" name="category" error="Kategorie fehlt">
        <option value="essen">Essen</option>
      </SelectField>,
    );

    const select = screen.getByLabelText("Kategorie");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription("Kategorie fehlt");
  });

  it("should_omitAriaInvalid_when_noError", () => {
    render(
      <SelectField label="Kategorie" name="category">
        <option value="essen">Essen</option>
      </SelectField>,
    );

    expect(screen.getByLabelText("Kategorie")).not.toHaveAttribute("aria-invalid");
  });

  it("should_useGivenId_when_idProvided", () => {
    render(
      <SelectField label="Kategorie" name="category" id="cat-select">
        <option value="essen">Essen</option>
      </SelectField>,
    );

    expect(screen.getByLabelText("Kategorie")).toHaveAttribute("id", "cat-select");
  });

  it("should_bindHint_when_hintGiven", () => {
    render(
      <SelectField label="Kategorie" name="category" hint="Bestimmt die Summenspalte">
        <option value="essen">Essen</option>
      </SelectField>,
    );

    expect(screen.getByLabelText("Kategorie")).toHaveAccessibleDescription(
      "Bestimmt die Summenspalte",
    );
  });

  it("should_applyLayoutClassNameToWrapper_when_classNameGiven", () => {
    const { container } = render(
      <SelectField label="Kategorie" name="category" className="col-span-2">
        <option value="essen">Essen</option>
      </SelectField>,
    );

    expect(container.firstElementChild).toHaveClass("col-span-2");
  });
});
