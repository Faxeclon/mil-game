import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

const componentPath = join(process.cwd(), "src", "components", "HomeLanding.tsx");
const stylesPath = join(process.cwd(), "src", "components", "HomeLanding.module.css");
const settingsPath = join(process.cwd(), "src", "components", "SettingsClient.tsx");

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

  it("groups title, island, percentage, and mission count in one progress unit", async () => {
    const component = await readFile(componentPath, "utf8");
    const styles = await readFile(stylesPath, "utf8");

    expect(component).toContain('className={styles.progressHeading}');
    expect(component).toContain('className={styles.progressOverview}');
    expect(component).toContain('className={styles.progressIsland}');
    expect(component).not.toContain('className={styles.hubIsland}');
    expect(styles).toContain(".hubStatCardLink");
    expect(component).toContain('aria-label={tRank("seeLadder")}');
    expect(component).not.toContain('className={styles.hubStatDetail}');
  });

  it("keeps the child hub focused while adult and guardian entry remain available from settings", async () => {
    const component = await readFile(componentPath, "utf8");
    const settings = await readFile(settingsPath, "utf8");
    const childHub = component.slice(
      component.indexOf("if (!grownUpAtHome"),
      component.indexOf("if (needsLocalNicknameCompletion")
    );

    expect(childHub).not.toContain("styles.guestNotice");
    expect(childHub).not.toContain("styles.adultDoor");
    expect(settings).toContain('href="/adult/join"');
    expect(settings).toContain('href="/guardian"');
  });

  it("aligns Roqui with the speech-bubble tail without changing the hero structure", async () => {
    const styles = await readFile(stylesPath, "utf8");

    expect(styles).toContain(".hub .mascotRow");
    expect(styles).toContain("align-items: end;");
  });
});
