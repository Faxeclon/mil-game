# Tutorial content

`packs/introductory-tutorial.json` describes the learning sequence; it contains localization keys and provenance, never child-facing copy. `schemas/tutorial.ts` defines the strict content model and `validators/validateTutorialPack.ts` rejects invalid packs during development and builds.

## Replacing temporary media

The SVGs in `public/media/tutorial/placeholders/` are hand-authored layout placeholders. They are **not** evidence of how AI-generated or camera-captured media looks, and must never be described as either. Every placeholder has `temporary: true` in its provenance. Replace them only with reviewed, age-appropriate images that have either documented usage rights for camera-captured media or documented project creation/licensing for AI-generated media. The project team must review every final media item before publication.

Each choice needs an `origin` (`camera-captured`, `ai-generated`, `digitally-edited`, or `unknown`) and provenance containing source type, source name, license/usage status, the temporary marker, and generation method where useful. Media origin and information reliability are independent: a camera image can mislead, and an AI image can be labelled and used honestly.

## Localization and accessibility

All prompts, feedback, image alternative text, and labels must be localization keys present in both `src/messages/es.json` and `src/messages/en.json`. Use concise, meaningful alternative text that describes what is visible without claiming a placeholder's origin. Recommended final media is square, at least 1200 × 1200 pixels, with the essential subject safely inside the centre area.

Do not use copyrighted characters, brands, celebrities, politicians, identifiable children, memes, frightening material, graphic harm, or content that stereotypes people. Do not embed essential text inside images; it must be available in the interface and translations.

