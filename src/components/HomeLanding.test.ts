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
    expect(component).toContain('className={styles.hubDialogContent}');
    expect(component).toContain('className={`${styles.primaryAction} ${styles.hubContinueAction}`}');
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
    expect(styles).toContain("padding: clamp(1.125rem, 4.5vw, 1.25rem)");
    expect(styles).toContain("margin: .7rem auto 0");
    expect(styles).toContain("bottom: clamp(2.25rem, 30%, 3.4rem)");
    expect(styles).toContain(".hub .bubble");
    expect(styles).toContain("text-align: left");
    expect(styles).toContain("min-height: 2.75rem");
    expect(styles).toContain("padding: 0.5rem 1.1rem");
    expect(styles).toContain("align-items: start");
    expect(styles).toContain("flex-direction: column");
    expect(styles).toContain("align-items: flex-start");
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

  it("links the compact title chip to the titles collection while the rank card still opens the rank page", async () => {
    const component = await readFile(componentPath, "utf8");
    const styles = await readFile(stylesPath, "utf8");

    expect(component).toContain('href="/ranks#titles"');
    expect(component).toContain('className={`${styles.identity} ${styles.identityLink}`}');
    expect(component).toContain('href="/ranks"');
    expect(styles).toContain(".identityLink:focus-visible");
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

  it("keeps profile creation on Home; Islands owns the voluntary narrative entry", async () => {
    const component = await readFile(componentPath, "utf8");

    expect(component).not.toContain("IntroStory");
    expect(component).not.toContain('router.replace("/worlds")');
  });
});
