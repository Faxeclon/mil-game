import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

describe("Bonus achievement toast", () => {
  it("groups simultaneous achievements in one non-blocking, reduced-motion-aware toast", async () => {
    const component = await readFile(join(process.cwd(), "src", "components", "BonusAchievementCelebration.tsx"), "utf8");
    const css = await readFile(join(process.cwd(), "src", "components", "BonusAchievementCelebration.module.css"), "utf8");
    expect(component).toContain("visibleIds.map");
    expect(component).toContain('role="status"');
    expect(component).toContain('aria-live="polite"');
    expect(component).toContain("useAccessibility");
    expect(component).toContain("AUTO_DISMISS_MS = 4500");
    expect(component).toContain("onPresented(visibleIds)");
    expect(component).toContain("onDismissed?.()");
    expect(component).toContain('aria-label={t("dismiss")}');
    expect(component).toContain("createPortal");
    expect(component).toContain("document.body.append(root)");
    expect(component).not.toContain('role="dialog"');
    expect(component).not.toContain("document.body.style.overflow");
    expect(component).not.toContain("element.inert");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("position: fixed");
    expect(css).toContain(".overlay");
    expect(css).toContain("z-index: 1100");
    expect(css).toContain("inset: 0");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("top: calc(env(safe-area-inset-top, 0px) + 8px)");
    expect(css).toContain("pointer-events: auto");
    expect(css).toContain("overflow: auto");
  });

  it("presents a pending toast once without blocking the Bonus result destination", async () => {
    const client = await readFile(join(process.cwd(), "src", "components", "RushClient.tsx"), "utf8");
    expect(client).toContain("getBonusRunAchievementIds");
    expect(client).toContain("unlockAchievements(");
    expect(client).toContain("setAchievementToastIds");
    expect(client).toContain("<BonusAchievementCelebration ids={achievementToastIds} onPresented={markAchievementToastPresented}");
    expect(client).toContain("pendingAchievementCelebrationIds");
    expect(client).toContain("acknowledgeAchievementCelebration(ids)");
    expect(client).toContain("const finishBonus = () => {");
    expect(client).toContain("leaveBonus();");
    expect(client).not.toContain("onContinue={finishBonus}");
  });

  it("has complete localized names for every stable achievement ID", () => {
    expect(spanishMessages.achievements.names).toEqual({
      starCadet: "⭐ Cadete Estrella", detailHunter: "🔎 Cazador de Detalles", directorsEye: "🎬 Ojo de Director", steadyHand: "🕵️ Cabeza Fría", eggspert: "🥚 Eggperto"
    });
    expect(englishMessages.achievements.names).toEqual({
      starCadet: "⭐ Star Cadet", detailHunter: "🔎 Detail Hunter", directorsEye: "🎬 Director’s Eye", steadyHand: "🕵️ Cool Head", eggspert: "🥚 Eggspert"
    });
    expect(spanishMessages.achievements).toMatchObject({ twoUnlocked: "¡2 logros desbloqueados!", dismiss: "Cerrar notificación" });
    expect(englishMessages.achievements).toMatchObject({ twoUnlocked: "2 achievements unlocked!", dismiss: "Dismiss notification" });
  });
});
