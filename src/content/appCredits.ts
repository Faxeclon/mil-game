/**
 * Credits for resources used by the application as a whole rather than by one mission.
 * They stay separate from pack media: a background track is not an answer asset.
 */
export type ApplicationCredit = {
  id: string;
  groupKey: "music";
  titleKey: "backgroundMusic";
  descriptionKey: "createdWithTool";
  tool: { name: string; url: string };
  creationMethod: "ai-generated" | "project-created";
};

export const applicationCredits: readonly ApplicationCredit[] = [
  {
    id: "kikiria-background-music",
    groupKey: "music",
    titleKey: "backgroundMusic",
    descriptionKey: "createdWithTool",
    tool: { name: "Suno", url: "https://suno.com/" },
    creationMethod: "ai-generated"
  }
];
