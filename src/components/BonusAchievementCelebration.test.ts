import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

describe("Bonus achievement celebration", () => {
  it("groups simultaneous achievements in one accessible, reduced-motion-aware overlay", async () => {
    const component = await readFile(join(process.cwd(), "src", "components", "BonusAchievementCelebration.tsx"), "utf8");
    const css = await readFile(join(process.cwd(), "src", "components", "BonusAchievementCelebration.module.css"), "utf8");
    expect(component).toContain("ids.map");
    expect(component).toContain('role="dialog"');
    expect(component).toContain("useAccessibility");
    expect(component).toContain("event.key === \"Escape\"");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("evaluates achievements on normal Rush completion before navigation", async () => {
    const client = await readFile(join(process.cwd(), "src", "components", "RushClient.tsx"), "utf8");
    expect(client).toContain("getBonusRunAchievementIds");
    expect(client).toContain("unlockAchievements(");
    expect(client).toContain("<BonusAchievementCelebration ids={newAchievementIds}");
    expect(client).toContain("onContinue={leaveBonus}");
    expect(client).toContain("setNewAchievementIds(unlocked)");
  });

  it("has complete localized names for every stable achievement ID", () => {
    expect(spanishMessages.achievements.names).toEqual({
      starCadet: "⭐ Cadete Estrella", detailHunter: "🔎 Cazador de Detalles", sourceSleuth: "🕵️ Detective de Fuentes", directorsEye: "🎬 Ojo de Director", eggspert: "🥚 Eggperto"
    });
    expect(englishMessages.achievements.names).toEqual({
      starCadet: "⭐ Star Cadet", detailHunter: "🔎 Detail Hunter", sourceSleuth: "🕵️ Source Sleuth", directorsEye: "🎬 Director’s Eye", eggspert: "🥚 Eggspert"
    });
  });
});
