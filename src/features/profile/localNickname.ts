/** A private display label that is stored only in this browser on this device. */
export const MAX_LOCAL_NICKNAME_LENGTH = 24;

function removeControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

/**
 * Normalizes the device-only nickname while preserving ordinary Unicode letters,
 * numbers, spaces, and accents. It intentionally does not check uniqueness or use
 * any network service.
 */
export function normalizeLocalNickname(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const nickname = Array.from(removeControlCharacters(value).trim())
    .slice(0, MAX_LOCAL_NICKNAME_LENGTH)
    .join("");
  return nickname.length > 0 ? nickname : undefined;
}
