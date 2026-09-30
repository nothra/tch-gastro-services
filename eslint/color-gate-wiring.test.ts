import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

// Verhaltensbasierter Nachweis gegen das ECHTE Gate (AK6.5, Lesson aus #172): Nicht die
// Config-Struktur wird geprüft, sondern dass `pnpm lint` für eine gelistete Datei rot und
// für eine nicht gelistete grün ist. Gelintet wird übergebener Text unter einem Dateipfad –
// die Datei auf der Platte bleibt unangetastet.

const RULE_ID = "tch/no-raw-color-classes";

// Eine rohe Farbklasse, wie sie vor der Umstellung im Katalog stand.
const CODE_WITH_RAW_COLOR = `export default function Page() {
  return <div className="bg-cyan-700 text-white">Hallo</div>;
}
`;

const CODE_WITH_TOKENS = `export default function Page() {
  return <div className="bg-accent text-on-accent">Hallo</div>;
}
`;

describe("Farb-Gate im Lint-Check (AK6.1, AK6.2)", () => {
  const eslint = new ESLint();

  async function rawColorMessages(code: string, filePath: string) {
    const [result] = await eslint.lintText(code, { filePath });
    return result.messages.filter((message) => message.ruleId === RULE_ID);
  }

  // Erster lintText-Aufruf löst die teure Flat-Config-Resolution aus (#238): vorab in einem
  // eigenen, endlichen Timeout aufwärmen, statt das Timeout des ersten Testfalls zu dehnen.
  beforeAll(async () => {
    await eslint.lintText(CODE_WITH_TOKENS, { filePath: "app/login/page.tsx" });
  }, 60_000);

  it("should_reportRawColorClass_when_fileIsOnTheList", async () => {
    const messages = await rawColorMessages(CODE_WITH_RAW_COLOR, "app/login/page.tsx");

    expect(messages).toHaveLength(2);
    expect(messages[0].message).toContain("bg-cyan-700");
    expect(messages[0].line).toBe(2);
  });

  it("should_stayGreen_when_listedFileUsesOnlyTokens", async () => {
    const messages = await rawColorMessages(CODE_WITH_TOKENS, "app/login/page.tsx");

    expect(messages).toEqual([]);
  });

  it("should_reportRawColorClass_when_fileIsInListedDirectory", async () => {
    const messages = await rawColorMessages(
      CODE_WITH_RAW_COLOR,
      "app/verwaltung/katalog/[id]/page.tsx",
    );

    expect(messages.length).toBeGreaterThan(0);
  });

  // Diskriminierungs-Kontrolle mit einem ÄHNLICHEN Nachbarpfad, nicht einem entfernten
  // (Lesson aus #172/#297): `app/verwaltung/teilnehmer/` liegt direkt neben dem gelisteten
  // `app/verwaltung/katalog/` und ist bis #369–#374 bewusst nicht umgestellt.
  it("should_notReport_when_fileIsNotOnTheList", async () => {
    const messages = await rawColorMessages(
      CODE_WITH_RAW_COLOR,
      "app/verwaltung/teilnehmer/page.tsx",
    );

    expect(messages).toEqual([]);
  });

  // Test-Dateien sind ausgenommen: sie nennen rohe Klassen in Negativ-Assertions (ADR-052 D3).
  it("should_notReport_when_fileIsATestFileInAListedDirectory", async () => {
    const messages = await rawColorMessages(CODE_WITH_RAW_COLOR, "app/login/page.test.tsx");

    expect(messages).toEqual([]);
  });
});
