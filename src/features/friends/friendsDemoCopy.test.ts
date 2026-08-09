import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import english from "@/messages/en.json";
import spanish from "@/messages/es.json";
import { seededPlayers } from "./friendsDirectory";
import { emptyFriendsDocument, requestByCode } from "./friendsModel";

describe("friends as an honest local demo", () => {
  it("shows the local-demo notice in the screen and both languages", async () => {
    const screen = await readFile(new URL("../../components/FriendsClient.tsx", import.meta.url), "utf8");

    expect(screen).toContain('t("demoTitle")');
    expect(screen).toContain('t("demoLead")');
    expect(spanish.friends.demoLead).toContain("no envían solicitudes a otros teléfonos");
    expect(english.friends.demoLead).toContain("do not send requests to other phones");
  });

  it("does not leave remote-request claims in active friends copy", () => {
    const active = `${Object.values(spanish.friends).flat(Infinity).join(" ")} ${Object.values(english.friends).flat(Infinity).join(" ")}`
      .toLowerCase();

    for (const phrase of ["solicitud enviada", "cuando acepte", "request sent", "once they accept", "used your code"]) {
      expect(active).not.toContain(phrase);
    }
  });

  it("resolves a seeded code by changing only the local friends document", () => {
    const before = { ...emptyFriendsDocument, code: "ZZZZZZ" };
    const outcome = requestByCode(before, seededPlayers[0].code, seededPlayers);

    expect(outcome.result).toBe("requested");
    expect(outcome.document.requestedIds).toEqual([seededPlayers[0].id]);
    expect(before.requestedIds).toEqual([]);
  });

  it("keeps the local port free of network requests", async () => {
    const port = await readFile(new URL("./friendsPort.ts", import.meta.url), "utf8");

    expect(port).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket/);
  });
});
