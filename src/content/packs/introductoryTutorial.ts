import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import tutorialPackJson from "./introductory-tutorial.json";
import type { TutorialPack } from "@/content/schemas/tutorial";
import { validateTutorialPack } from "@/content/validators/validateTutorialPack";

function hasNestedKey(messages: object, key: string): boolean {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

function hasTutorialLocalizationKey(key: string): boolean {
  return hasNestedKey(spanishMessages.tutorial, key) && hasNestedKey(englishMessages.tutorial, key);
}

export const introductoryTutorialPack: TutorialPack = validateTutorialPack(
  tutorialPackJson,
  hasTutorialLocalizationKey
);
