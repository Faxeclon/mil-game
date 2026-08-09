import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

async function source(file: string): Promise<string> {
  return readFile(join(here, file), "utf8");
}

describe("ImageZoom timed and accessible contract", () => {
  it("shows a supplied game-clock snapshot without owning a timer", async () => {
    const zoom = await source("ImageZoom.tsx");

    expect(zoom).toContain("timer?: ZoomTimer");
    expect(zoom).toContain("{timer.label}");
    expect(zoom).not.toMatch(/setInterval|createRoundDeadline|Date\.now/);
  });

  it("contains keyboard focus and restores it only to a connected trigger", async () => {
    const zoom = await source("ImageZoom.tsx");

    expect(zoom).toContain('event.key !== "Tab"');
    expect(zoom).toContain("dialogRef.current?.querySelectorAll");
    expect(zoom).toContain("closeRef.current?.focus()");
    expect(zoom).toContain("triggerRef.current?.isConnected");
  });

  it("lets timeout dismiss the overlay without restoring stale focus", async () => {
    const zoom = await source("ImageZoom.tsx");
    const tutorial = await source("TutorialClient.tsx");
    const rush = await source("RushClient.tsx");

    expect(zoom).toContain("close(false)");
    expect(tutorial).toContain('closeSignal={announcementForRound === "expired" ? round.order : 0}');
    expect(tutorial).toContain("countdownForRound && isRoundTimed");
    expect(rush).toContain("closeSignal={secondsLeft === 0 ? 1 : 0}");
  });
});
