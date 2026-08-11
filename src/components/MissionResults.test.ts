import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

async function source(file: string): Promise<string> {
  return readFile(join(process.cwd(), "src", "components", file), "utf8");
}

describe("section-completion Bonus offer", () => {
  it("uses pass status to offer either the sequential next level or a same-level retry", async () => {
    const screen = await source("MissionResults.tsx");
    expect(screen).toContain("result.passed ? getNextLevelInSection(result.levelId) : null");
    expect(screen).toContain("getReplayPath(nextLevel.id as LevelId)");
    expect(screen).not.toContain("getContinuePath");
    expect(screen).toContain('className={styles.nextLevelAction}');
    expect(screen).toContain('<p className={styles.nextLevelPreview}>');
    expect(screen).toContain('t("levelIdentity", {');
    expect(screen).not.toContain('t("nextLevelPreview"');
    expect(screen).toContain('t("nextLevel")');
    expect(screen).toContain('t("tryAgain")');
    expect(screen).toContain('t("backToMap")');
    expect(screen).not.toContain('t("replay")');
  });

  it("keeps the next-level destination as muted microcopy below the CTA with room before the map link", async () => {
    const css = await source("MissionResults.module.css");

    expect(css).toContain(".nextLevelAction");
    expect(css).toContain("gap: clamp(.375rem, 2vw, .6rem)");
    expect(css).toContain("gap: clamp(1.25rem, 4vw, 1.75rem)");
    expect(css).toContain("color: var(--r-ink-soft)");
    expect(css).toContain("text-align: center");
    expect(css).toContain("margin-top: clamp(.75rem, 3vw, 1rem)");
  });

  it("does not render the learning-method recap on any mission result", async () => {
    const screen = await source("MissionResults.tsx");
    expect(screen).not.toContain("LookAskCheck");
    expect(screen).not.toContain("Mira");
    expect(screen).not.toContain("Pregunta");
    expect(screen).not.toContain("Comprueba");
  });

  it("uses the one-time local medal toast instead of a keepsake card or guardian CTA", async () => {
    const screen = await source("MissionResults.tsx");
    const settings = await source("SettingsClient.tsx");

    expect(screen).toContain("<LocalMedalToast onPresented={markLocalMedalNoticePresented}");
    expect(screen).toContain("localMedalToastCandidateKey");
    expect(screen).toContain("setLocalMedalToastKey(localMedalToastCandidateKey)");
    expect(screen).not.toContain("styles.keepsake");
    expect(screen).not.toContain('href="/guardian"');
    expect(settings).toContain('href="/guardian"');
  });

  it("keeps pass and retry actions fully localized", () => {
    expect(spanishMessages.results).toMatchObject({
      notPassedTitle: "¡Casi lo tienes!", nextLevel: "Siguiente nivel", tryAgain: "Intentar otra vez", backToMap: "Volver al mapa"
    });
    expect(englishMessages.results).toMatchObject({
      notPassedTitle: "Almost there!", nextLevel: "Next level", tryAgain: "Try again", backToMap: "Back to map"
    });
  });

  it("persists the event ticket before opening the second dialog", async () => {
    const screen = await source("MissionResults.tsx");
    expect(screen).toContain("getBonusOpportunityId(celebration.categoryKey, celebration.completionAttemptId)");
    expect(screen).toContain("createBonusOpportunity({");
    expect(screen).toContain("setBonusOfferOpen(true)");
    expect(screen).toContain("celebration && !bonusOfferOpen");
    expect(screen).toContain("bonusOfferOpen && bonus?.status === \"pending\"");
  });

  it("makes accepting active, and declining or Escape consume and follow the saved destination", async () => {
    const screen = await source("MissionResults.tsx");
    expect(screen).toContain("activateBonusOpportunity(bonus.id)");
    expect(screen).toContain("router.push(`/island/${bonus.islandKey}/rush`)");
    expect(screen).toContain("consumeBonusOpportunity(bonus.id)");
    expect(screen).toContain("router.push(getBonusDestinationPath(bonus.destination))");
    expect(screen).toContain('event.key === "Escape"');
    expect(screen).toContain("declineBonus();");
  });

  it("does not reopen a consumed or active ticket and traps focus in the choice dialog", async () => {
    const screen = await source("MissionResults.tsx");
    expect(screen).toContain('bonus?.status !== "consumed" && bonus?.status !== "active"');
    expect(screen).toContain("querySelectorAll<HTMLButtonElement>(\"button:not([disabled])\")");
  });
});
