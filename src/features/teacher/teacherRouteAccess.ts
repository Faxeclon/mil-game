import type { TeacherAccount } from "@/features/teacher/teacherAccount";

export type TeacherRouteAccess = "checking" | "denied" | "allowed";

export function getTeacherRouteAccess(
  hydrated: boolean,
  account: TeacherAccount | null
): TeacherRouteAccess {
  if (!hydrated) return "checking";
  return account ? "allowed" : "denied";
}
