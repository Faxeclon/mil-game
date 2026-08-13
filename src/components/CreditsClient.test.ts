import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";

describe("credits screen", () => {
  it("uses centralized audited media metadata without game thumbnails or answer data", async () => {
    const source = await readFile(join(process.cwd(), "src", "components", "CreditsClient.tsx"), "utf8");
    expect(source).toContain("getCreditedMedia()");
    expect(source).not.toContain("<Image");
    expect(source).not.toContain("correctChoiceId");
    expect(source).not.toContain('packId === "introductory-tutorial-v1"');
    expect(source).toContain("creditedPackPresentationKeys");
    expect(source).toContain('target="_blank"');
    expect(source).toContain('rel="noreferrer"');
    expect(source).toContain('credit.creationMethod === "ai-generated"');
    expect(source).toContain('credit.creationMethod === "project-created"');
    expect(source).not.toContain('credit.license === "project-generated"');
  });

  it("has complete Spanish and English interface copy", () => {
    for (const messages of [spanishMessages, englishMessages]) {
      expect(messages.settings.credits).toBeTruthy();
      expect(messages.credits.title).toBeTruthy();
      expect(messages.credits.viewSource).toBeTruthy();
      expect(messages.credits.viewLicense).toBeTruthy();
      expect(messages.credits.projectGenerated).toBeTruthy();
      expect(messages.credits.projectCreated).toBeTruthy();
      expect(messages.credits.packs.basics1).toBeTruthy();
      expect(messages.credits.packs.basics2).toBeTruthy();
    }
  });

  it("does not repeat a generic heading above AI-generated credits", async () => {
    const source = await readFile(join(process.cwd(), "src", "components", "CreditsClient.tsx"), "utf8");
    expect(source).toContain('credit.creationMethod !== "ai-generated"');
  });

  it("keeps the credits entry accessible from the information section near the end of Settings", async () => {
    const settings = await readFile(join(process.cwd(), "src", "components", "SettingsClient.tsx"), "utf8");
    expect(settings).toContain("function CreditsSection()");
    expect(settings).toContain('href="/settings/credits"');
    expect(settings.indexOf("<CreditsSection />")).toBeGreaterThan(settings.indexOf("<ResetSection />"));
  });
});
