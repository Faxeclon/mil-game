import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

const componentPath = join(process.cwd(), "src", "components", "HomeLanding.tsx");
const stylesPath = join(process.cwd(), "src", "components", "HomeLanding.module.css");

describe("HomeLanding continuation", () => {
  it("puts the existing next-mission link in Roqui's welcome instead of a duplicate child card", async () => {
    const component = await readFile(componentPath, "utf8");

    expect(component).toContain('className={styles.hubContinue}');
    expect(component).toContain('href={`/level/${nextMission.id}`}');
    expect(component).not.toContain("hubNextDestination");
    expect(component).not.toContain('t("hubContinueLabel")');
  });

  it("keeps Roqui's CTA spacious without a duplicated destination", async () => {
    const styles = await readFile(stylesPath, "utf8");

    expect(spanishMessages.home.hubNextHint).toBe("Sigue por {category}.");
    expect(englishMessages.home.hubNextHint).toBe("Carry on with {category}.");
    expect(styles).not.toContain(".hubContinueDestination");
    expect(styles).toContain(".hub .bubble");
    expect(styles).toContain("padding: clamp(1.05rem, 4vw, 1.45rem)");
    expect(styles).toContain("margin: .7rem auto 0");
  });
});
