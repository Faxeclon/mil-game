import { describe, expect, it } from "vitest";
import { MAX_LOCAL_NICKNAME_LENGTH, normalizeLocalNickname } from "./localNickname";

describe("local nickname normalization", () => {
  it("trims a nickname while preserving normal Unicode and Spanish accents", () => {
    expect(normalizeLocalNickname("  María Ñandú  ")).toBe("María Ñandú");
  });

  it("rejects empty, whitespace-only, and non-string values", () => {
    expect(normalizeLocalNickname("")).toBeUndefined();
    expect(normalizeLocalNickname(" \t\n ")).toBeUndefined();
    expect(normalizeLocalNickname(42)).toBeUndefined();
  });

  it("removes control characters and line breaks", () => {
    expect(normalizeLocalNickname("  Pía\n\t\u0007Detective  ")).toBe("PíaDetective");
  });

  it("limits the display nickname to 24 Unicode characters", () => {
    const nickname = "abcdefghijklmnopqrstuvwxyñ";
    expect(normalizeLocalNickname(nickname)).toBe("abcdefghijklmnopqrstuvwx");
    expect(Array.from(normalizeLocalNickname(nickname) ?? "")).toHaveLength(MAX_LOCAL_NICKNAME_LENGTH);
  });
});
