import { RuleTester } from "eslint";
import { describe, it, expect } from "vitest";
import rule from "./no-raw-color-classes.mjs";

// RuleTester nutzt `describe`/`it`, wenn sie als statische Felder gesetzt sind. Ohne
// `globals: true` (vitest.config.ts) stehen sie nicht global zur Verfügung und müssen
// explizit verdrahtet werden – sonst liefe jeder Fall außerhalb der Vitest-Berichterstattung.
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run("no-raw-color-classes", rule, {
  valid: [
    // Token-Klassen sind der erwünschte Normalfall (AK6.3).
    { code: 'const c = <div className="bg-surface text-muted border-line-subtle" />;' },
    { code: 'const c = <div className="bg-accent text-on-accent hover:bg-accent-hover" />;' },
    // Klassen ohne Farbbezug (AK6.3).
    { code: 'const c = <div className="text-sm border-2 bg-transparent bg-current" />;' },
    { code: 'const c = <div className="divide-y ring-2 outline-none shadow-lg" />;' },
    // Wortgrenze: ein längerer Bezeichner, der eine Farbklasse nur enthält (AK6.3).
    { code: 'const c = "mein-bg-red-500-wrapper";' },
    { code: 'const c = "datenbank-text-blue-700-legacy";' },
    // Kein Farb-Utility vor der Palettenfarbe.
    { code: 'const c = "gap-red-500";' },
    // Freitext, der zufällig eine Farbe nennt.
    { code: 'const c = "Der Hintergrund ist bg-red-500.";' },
    // Nicht-String-Literale (Zahl, Boolean, RegExp) tragen keine Klassen.
    { code: "const n = 42; const b = true; const r = /bg-red-500/;" },
  ],
  invalid: [
    {
      code: 'const c = <div className="bg-cyan-700" />;',
      errors: [{ messageId: "rawColorClass", data: { className: "bg-cyan-700" } }],
    },
    {
      code: 'const c = <div className="text-red-600" />;',
      errors: [{ messageId: "rawColorClass", data: { className: "text-red-600" } }],
    },
    {
      code: 'const c = <div className="border-zinc-300" />;',
      errors: [{ messageId: "rawColorClass", data: { className: "border-zinc-300" } }],
    },
    // Varianten-Präfixe umgehen die Regel nicht (AK6.1).
    {
      code: 'const c = <div className="dark:border-zinc-700" />;',
      errors: [{ messageId: "rawColorClass", data: { className: "dark:border-zinc-700" } }],
    },
    {
      code: 'const c = <div className="hover:bg-blue-700" />;',
      errors: [{ messageId: "rawColorClass", data: { className: "hover:bg-blue-700" } }],
    },
    {
      code: 'const c = <div className="dark:hover:bg-zinc-600" />;',
      errors: [{ messageId: "rawColorClass", data: { className: "dark:hover:bg-zinc-600" } }],
    },
    // Opazitäts-Suffix.
    {
      code: 'const c = <div className="bg-black/50" />;',
      errors: [{ messageId: "rawColorClass", data: { className: "bg-black/50" } }],
    },
    // `white`/`black` umgehen den Dunkelmodus und fallen deshalb ebenfalls darunter (ADR-052 D3).
    {
      code: 'const c = <div className="bg-white text-black" />;',
      errors: [
        { messageId: "rawColorClass", data: { className: "bg-white" } },
        { messageId: "rawColorClass", data: { className: "text-black" } },
      ],
    },
    // Arbitrary-Farbwert.
    {
      code: 'const c = <div className="bg-[#1e293b]" />;',
      errors: [{ messageId: "rawColorClass", data: { className: "bg-[#1e293b]" } }],
    },
    {
      code: 'const c = <div className="text-[rgb(10,20,30)]" />;',
      errors: [{ messageId: "rawColorClass", data: { className: "text-[rgb(10,20,30)]" } }],
    },
    // Fehlerszenario der Spec: über mehrere Zeilen verteilter Template-String.
    {
      code: ["const c = `flex flex-col", "  ${base} bg-emerald-50 p-3", "  rounded`;"].join("\n"),
      errors: [{ messageId: "rawColorClass", data: { className: "bg-emerald-50" } }],
    },
    // Fehlerszenario der Spec: Klasse in einer Hilfskonstante statt direkt im `className`.
    {
      code: 'const inputClass = "rounded border border-zinc-300 px-3";',
      errors: [{ messageId: "rawColorClass", data: { className: "border-zinc-300" } }],
    },
    // Getaggtes Template mit ungültiger Escape-Sequenz: `cooked` ist dann `null`, geprüft wird
    // der Rohtext – sonst schlüpfte die Klasse durch.
    {
      code: "const c = String.raw`\\u bg-red-500`;",
      errors: [{ messageId: "rawColorClass", data: { className: "bg-red-500" } }],
    },
  ],
});

// AK6.1 verlangt, dass die Meldung die Fundstelle nennt: die konkrete Klasse plus die
// Position, die ESLint aus dem gemeldeten Knoten übernimmt.
describe("no-raw-color-classes – Meldung", () => {
  it("should_nameTheOffendingClass_when_messageIsRendered", () => {
    expect(rule.meta?.messages?.rawColorClass).toContain("{{className}}");
  });
});
