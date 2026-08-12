import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

const componentPath = join(process.cwd(), "src", "components", "IntroStory.tsx");
const stylesPath = join(process.cwd(), "src", "components", "IntroStory.module.css");

describe("IntroStory", () => {
  it("uses real controls for skipping and completing the same persisted story flow", async () => {
    const component = await readFile(componentPath, "utf8");

    expect(component).toContain('className={styles.skip}');
    expect(component).toContain('onClick={onComplete}');
    expect(component).toContain('className={styles.finish}');
    expect(component).toContain('onClick={advance}');
  });

  it("keeps the story copy complete in Spanish and English", () => {
    for (const messages of [spanishMessages, englishMessages]) {
      expect(messages.introStory.skip).toBeTruthy();
      expect(messages.introStory.scene1).toBeTruthy();
      expect(messages.introStory.scene5Question).toBeTruthy();
      expect(messages.introStory.scene5Ask).toBeTruthy();
      expect(messages.introStory.finish).toBeTruthy();
    }
  });

  it("fills a safe, non-scrolling viewport and honours reduced motion", async () => {
    const styles = await readFile(stylesPath, "utf8");

    expect(styles).toContain("height: 100dvh");
    expect(styles).toContain("overflow: hidden");
    expect(styles).toContain("safe-area-inset-top");
    expect(styles).toContain("safe-area-inset-bottom");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });
});
