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
    expect(component).toContain('t("hubNextDestination", {');
    expect(component).not.toContain('t("hubContinueLabel")');
  });

  it("keeps the compact, localized destination below the primary action", async () => {
    const styles = await readFile(stylesPath, "utf8");

    expect(spanishMessages.home.hubNextDestination).toBe("{category} · Misión {number}");
    expect(englishMessages.home.hubNextDestination).toBe("{category} · Mission {number}");
    expect(styles).toContain(".hubContinueDestination");
    expect(styles).toContain(".hub .bubble");
    expect(styles).toContain("gap: .85rem");
  });
});
