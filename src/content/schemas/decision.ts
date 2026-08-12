/**
 * Missions that ask what to do, rather than what something is.
 *
 * Every other mission in this game ends at a judgement: made with AI, taken with a camera,
 * impossible to tell. That is half of media literacy. The other half is what a child does
 * next - whether they check who published something before believing it, what they do in
 * the minutes after a faked picture of a classmate reaches them, and whether they say so
 * when a picture they are sharing was made by a machine.
 *
 * The shape is deliberately its own file and its own schema rather than another mode
 * bolted onto the tutorial packs. Those carry an image and ask about its origin; these
 * carry a situation and ask about a choice, and forcing one shape to be both would leave
 * every field optional and meaningless.
 */
export const decisionKinds = ["source", "share", "publish"] as const;

/**
 * What a mission is training.
 *
 * `source`  - which of several origins could actually confirm a claim
 * `share`   - what to do before passing something on, or when it targets somebody
 * `publish` - how to be honest about something you made with AI
 */
export type DecisionKind = (typeof decisionKinds)[number];

export type DecisionOption = {
  id: string;
  /** Message key for the option, under the `decisions` namespace. */
  labelKey: string;
  /**
   * Why this choice helps or does not. Shown after answering, for every option rather
   * than only the right one: a child who chose wrongly needs to know what was wrong with
   * their reasoning, not only that somebody else's was better.
   */
  whyKey: string;
};

export type DecisionRound = {
  id: string;
  order: number;
  /** The situation, in the child's words. */
  situationKey: string;
  /** The question asked about it. */
  questionKey: string;
  options: readonly DecisionOption[];
  /** The id of the option that is right. Exactly one, and it must exist in `options`. */
  answerId: string;
  /** The lesson to carry away, true whether they got it right or not. */
  rememberKey: string;
};

export type DecisionPack = {
  id: string;
  kind: DecisionKind;
  rounds: readonly DecisionRound[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseOption(value: unknown): DecisionOption {
  if (!isRecord(value)) throw new Error("A decision option must be an object.");
  const { id, labelKey, whyKey } = value;
  if (!isNonEmptyString(id)) throw new Error("A decision option needs an id.");
  if (!isNonEmptyString(labelKey)) throw new Error(`Option ${id} needs a labelKey.`);
  if (!isNonEmptyString(whyKey)) throw new Error(`Option ${id} needs a whyKey.`);
  return { id, labelKey, whyKey };
}

function parseRound(value: unknown, index: number): DecisionRound {
  if (!isRecord(value)) throw new Error(`Round ${index + 1} must be an object.`);
  const { id, order, situationKey, questionKey, options, answerId, rememberKey } = value;

  if (!isNonEmptyString(id)) throw new Error(`Round ${index + 1} needs an id.`);
  if (typeof order !== "number" || order !== index + 1) {
    throw new Error(`Round ${id} must declare order ${index + 1}.`);
  }
  if (!isNonEmptyString(situationKey)) throw new Error(`Round ${id} needs a situationKey.`);
  if (!isNonEmptyString(questionKey)) throw new Error(`Round ${id} needs a questionKey.`);
  if (!isNonEmptyString(rememberKey)) throw new Error(`Round ${id} needs a rememberKey.`);
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error(`Round ${id} needs at least two options.`);
  }

  const parsed = options.map(parseOption);
  const ids = new Set(parsed.map((option) => option.id));
  if (ids.size !== parsed.length) throw new Error(`Round ${id} repeats an option id.`);
  if (!isNonEmptyString(answerId) || !ids.has(answerId)) {
    throw new Error(`Round ${id} must answer with one of its own options.`);
  }

  return {
    id,
    order,
    situationKey,
    questionKey,
    options: parsed,
    answerId,
    rememberKey
  };
}

/**
 * Reads a pack, refusing anything malformed rather than shipping it half-built.
 *
 * Content is the part of this game most likely to be edited by somebody in a hurry the
 * night before a deadline, so the failure is loud and at build time: a round that answers
 * with an option it does not offer would otherwise be a mission nobody can ever pass.
 */
export function validateDecisionPack(value: unknown): DecisionPack {
  if (!isRecord(value)) throw new Error("A decision pack must be an object.");
  const { id, kind, rounds } = value;

  if (!isNonEmptyString(id)) throw new Error("A decision pack needs an id.");
  if (!decisionKinds.includes(kind as DecisionKind)) {
    throw new Error(`Pack ${id} declares an unknown kind.`);
  }
  if (!Array.isArray(rounds) || rounds.length === 0) {
    throw new Error(`Pack ${id} has no rounds.`);
  }

  return { id, kind: kind as DecisionKind, rounds: rounds.map(parseRound) };
}
