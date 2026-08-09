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
    expect(component).toContain("createPortal");
    expect(component).toContain("document.body.append(root)");
    expect(component).toContain("element.inert = true");
    expect(component).toContain('document.body.style.overflow = "hidden"');
    expect(component).toContain("continueLockRef.current");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("position: fixed");
    expect(css).toContain("z-index: 1000");
    expect(css).toContain("max-height: 100%");
    expect(css).toContain("overflow: auto");
  });

  it("evaluates achievements on normal Rush completion before navigation", async () => {
    const client = await readFile(join(process.cwd(), "src", "components", "RushClient.tsx"), "utf8");
    expect(client).toContain("getBonusRunAchievementIds");
    expect(client).toContain("unlockAchievements(");
    expect(client).toContain("<BonusAchievementCelebration ids={pendingAchievementIds}");
    expect(client).toContain("onContinue={finishBonus}");
    expect(client).toContain("pendingAchievementCelebrationIds");
    expect(client).toContain("acknowledgeAchievementCelebration(pendingAchievementIds)");
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
