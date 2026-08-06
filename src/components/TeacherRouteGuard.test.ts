import { describe, expect, it } from "vitest";
import type { TeacherAccount } from "@/features/teacher/teacherAccount";
import { getTeacherRouteAccess } from "@/features/teacher/teacherRouteAccess";

const teacher: TeacherAccount = {
  email: "teacher@example.test",
  registeredOn: "2026-08-06",
  syncPending: true
};

describe("teacher card route access", () => {
  it("does not expose card tools until local teacher state is hydrated", () => {
    expect(getTeacherRouteAccess(false, null)).toBe("checking");
    expect(getTeacherRouteAccess(false, teacher)).toBe("checking");
  });

  it("denies a direct cards URL without the existing local teacher state", () => {
    expect(getTeacherRouteAccess(true, null)).toBe("denied");
  });

  it("permits cards only for the existing local teacher state", () => {
    expect(getTeacherRouteAccess(true, teacher)).toBe("allowed");
  });
});
