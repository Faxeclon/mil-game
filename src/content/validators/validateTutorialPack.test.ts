import { describe, expect, it } from "vitest";
import englishMessages from "@/messages/en.json";
import spanishMessages from "@/messages/es.json";
import tutorialPackJson from "@/content/packs/introductory-tutorial.json";
import { collectTutorialLocalizationKeys, TutorialPackValidationError, validateTutorialPack } from "./validateTutorialPack";

function hasNestedKey(messages: object, key: string): boolean {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

const hasLocalizationKey = (key: string) => hasNestedKey(spanishMessages.tutorial, key) && hasNestedKey(englishMessages.tutorial, key);
const clonePack = () => structuredClone(tutorialPackJson);

describe("validateTutorialPack", () => {
  it("accepts the introductory pack and its Spanish and English keys", () => {
    expect(validateTutorialPack(clonePack(), hasLocalizationKey).rounds).toHaveLength(3);
  });

  it("uses tutorial-namespace-relative keys and resolves every dynamic key in both languages", () => {
    const pack = validateTutorialPack(clonePack(), hasLocalizationKey);
    for (const key of collectTutorialLocalizationKeys(pack)) {
      expect(key.startsWith("tutorial.")).toBe(false);
      expect(hasNestedKey(spanishMessages.tutorial, key)).toBe(true);
      expect(hasNestedKey(englishMessages.tutorial, key)).toBe(true);
    }
  });

  it("rejects an accidental duplicate tutorial namespace prefix", () => {
    const pack = clonePack();
    pack.rounds[0].promptKey = "tutorial.question";
    expect(() => validateTutorialPack(pack, hasLocalizationKey)).toThrow(/relative to the tutorial namespace/);
  });

  it("rejects a correct-choice ID that does not exist", () => {
    const pack = clonePack();
    pack.rounds[0].correctChoiceId = "missing-choice";
    expect(() => validateTutorialPack(pack, hasLocalizationKey)).toThrow(TutorialPackValidationError);
  });

  it("rejects duplicate round IDs", () => {
    const pack = clonePack();
    pack.rounds[1].id = pack.rounds[0].id;
    expect(() => validateTutorialPack(pack, hasLocalizationKey)).toThrow(/duplicate round id/);
  });

  it("rejects a round without exactly two choices", () => {
    const pack = clonePack();
    pack.rounds[0].choices.pop();
    expect(() => validateTutorialPack(pack, hasLocalizationKey)).toThrow(/exactly two choices/);
  });

  it("rejects an invalid media origin", () => {
    const pack = clonePack();
    const input = pack as unknown as { rounds: Array<{ choices: Array<{ media: { origin: string } }> }> };
    input.rounds[0].choices[0].media.origin = "real";
    expect(() => validateTutorialPack(input, hasLocalizationKey)).toThrow(/origin is invalid/);
  });

  it("requires provenance and temporary markings for placeholder assets", () => {
    const missingProvenance = clonePack();
    const missingProvenanceInput = missingProvenance as unknown as { rounds: Array<{ choices: Array<{ media: { provenance?: unknown } }> }> };
    delete missingProvenanceInput.rounds[0].choices[0].media.provenance;
    expect(() => validateTutorialPack(missingProvenanceInput, hasLocalizationKey)).toThrow(/provenance is required/);

    const unmarkedPlaceholder = clonePack();
    unmarkedPlaceholder.rounds[0].choices[0].media.src = "/media/tutorial/placeholders/test.svg";
    unmarkedPlaceholder.rounds[0].choices[0].media.provenance.temporary = false;
    expect(() => validateTutorialPack(unmarkedPlaceholder, hasLocalizationKey)).toThrow(/temporary must be true/);
  });
});
