# Mission content

Each pack in `packs/*.json` describes one mission's learning sequence; it contains localization keys and provenance, never child-facing copy. `schemas/tutorial.ts` defines the strict content model and `validators/validateTutorialPack.ts` rejects invalid packs during development and builds.

## The two pack shapes

| Shape | File | What a round holds |
|---|---|---|
| Comparison | `animals-compare.json`, … | Two images; the player picks the AI one |
| Single image | `animals-single.json`, `creators-uncertain.json` | One image; the player judges it alone |

A single-image pack declares `allowsUncertain`. When it is true, "you cannot tell by looking" is offered as a third answer **and at least one round must actually answer `unknown`**; when it is false the answer may not appear at all. Offering a button that can never be right would teach a child that doubting is a mistake, which is the opposite of the lesson, so `validateSinglePack` refuses both mismatches.

## Adding a mission's content

1. Write `packs/<name>.json` with exactly three rounds.
2. Register it in `packs/packRegistry.ts` under the id the pack declares.
3. Point the mission at that id with `packId` in `src/features/levels/levelModel.ts`.

A mission whose `packId` does not resolve stays "coming soon" and gets no route, so a typo can never make one mission play another's rounds. No screen or component changes are involved.

Two missions must not share a pack: the map shows them as separate missions, so playing the same rounds twice would be a broken promise. `packs/packRegistry.test.ts` enforces this, along with the rule that the answer is not always on the same side.

## Replacing temporary media

The SVGs in `public/media/tutorial/placeholders/` are hand-authored layout placeholders. They are **not** evidence of how AI-generated or camera-captured media looks, and must never be described as either. Every placeholder has `temporary: true` in its provenance. Replace them only with reviewed, age-appropriate images that have either documented usage rights for camera-captured media or documented project creation/licensing for AI-generated media. The project team must review every final media item before publication.

Each choice needs an `origin` (`camera-captured`, `ai-generated`, `digitally-edited`, or `unknown`) and provenance containing source type, source name, license/usage status, the temporary marker, and generation method where useful. Media origin and information reliability are independent: a camera image can mislead, and an AI image can be labelled and used honestly.

## Localization and accessibility

All prompts, feedback, image alternative text, and labels must be localization keys present in both `src/messages/es.json` and `src/messages/en.json`. Use concise, meaningful alternative text that describes what is visible without claiming a placeholder's origin. Recommended final media is square, at least 1200 × 1200 pixels, with the essential subject safely inside the centre area.

Do not use copyrighted characters, brands, celebrities, politicians, identifiable children, memes, frightening material, graphic harm, or content that stereotypes people. Do not embed essential text inside images; it must be available in the interface and translations.

