import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("RoundMedia", () => {
  it("keeps video playback silent and inline while exposing a minimal loading state", async () => {
    const component = await readFile(join(process.cwd(), "src", "components", "RoundMedia.tsx"), "utf8");

    expect(component).toContain("autoPlay");
    expect(component).toContain("muted");
    expect(component).toContain("playsInline");
    expect(component).toContain("onLoadedData={() => setReadyVideoSrc(src)}");
    expect(component).toContain("aria-busy={!videoReady}");
  });
});
