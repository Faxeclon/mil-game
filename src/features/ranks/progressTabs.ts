export const progressTabs = ["rank", "titles", "achievements"] as const;

export type ProgressTab = (typeof progressTabs)[number];

/** Keeps deep links predictable even when a child is handed an old or unknown URL. */
export function getProgressTabFromHash(hash: string): ProgressTab {
  const value = hash.replace(/^#/, "");
  return progressTabs.includes(value as ProgressTab) ? (value as ProgressTab) : "rank";
}
