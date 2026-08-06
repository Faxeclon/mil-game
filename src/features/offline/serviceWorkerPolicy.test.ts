import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const worker = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

describe("service-worker manifest policy", () => {
  it("keeps the manifest in the shell precache and refreshes it network-first", () => {
    expect(worker).toContain('"/manifest.webmanifest"');
    expect(worker).toContain("async function handleManifest(request)");
    expect(worker).toContain("await shell.put(request, response.clone())");
    expect(worker).toContain("await shell.match(request)");
  });

  it("retains strict RSC/prefetch bypasses and excludes music", () => {
    for (const indicator of ["_rsc", "next-router-prefetch", "text/x-component", 'request.headers.has("range")']) {
      expect(worker).toContain(indicator);
    }
    expect(worker).not.toContain("kikiria-background.mp3");
  });
});
