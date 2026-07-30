# UNESCO Youth Hackathon 2026 — Project Specification

## Purpose

This bilingual, offline-oriented educational game helps children aged 6–10 make more careful decisions about digital content. It supports UNESCO Media and Information Literacy (MIL) by encouraging critical inquiry before believing or sharing information. It is not an automatic AI detector.

## Learning model

The child-facing model is **Mira · Pregunta · Comprueba** in Spanish and **Look · Ask · Check** in English. Children learn to observe content, ask about its source, date, context and purpose, recognise uncertainty, and verify before believing or sharing.

The product keeps two separate ideas:

- **Media origin:** camera-captured, AI-generated, digitally edited, or unknown.
- **Information reliability:** supported, misleading, missing context, false context, manipulated, or unverified.

A camera photo may still mislead; a clearly labelled AI image may be used without deception. Visual appearance alone cannot always establish origin or trustworthiness.

## Audience and language

The active experience profile is children aged 6–10, with Spanish as the default and complete English parity. No age is requested. The domain is prepared for a future `ExperienceProfile = "child" | "teen"`; a teen experience would need its own content, language, themes and visual density, not merely a different palette.

## Planned MVP flow

Home → mission map → three-round comparison tutorial → individual post verification case → results. The future tutorial will use “Imagen hecha con IA / Foto tomada con cámara” and “Image made with AI / Photo taken with a camera”, never “real versus AI”. Its rounds introduce visible clues, source/purpose questions, and uncertainty when inspection is insufficient.

This stage provides the home, mission-map preview, localized placeholders, accessibility foundations, and feature contracts only. It deliberately does not implement playable rounds, media, scores, achievements, persistence, PWA/offline caching, or final mascot artwork.

## Accessibility

The interface targets WCAG 2.2 AA where applicable: semantic landmarks, headings, visible focus, keyboard access, descriptive labels, large touch targets, reduced-motion support, no colour-only meaning, no essential hover behaviour, no flashing, autoplaying sound, or forced timers. Future settings include reduced motion, sound, timers, simplified visuals and larger text; no setting is persisted yet.

## Privacy

The prototype requests and stores no personal data. It has no accounts, names, aliases, email, age, school, location, camera/microphone/contacts access, advertising, analytics, tracking, authentication, database, backend, multiplayer, rankings, or classroom rooms. Future classroom participation should favour generated aliases, chosen aliases, anonymous codes and avatars rather than real student names.

## Offline and teacher future

The intended product is offline-oriented, but this stage has no service worker, downloaded educational package, or offline cache. Teacher concepts are future-only: a private online classroom and a one-device offline classroom with printed orientation cards. Teacher authentication and personal data are out of scope.

## Mascot

An original mascot has not been selected. The code exposes a small `MascotSlot` contract and moods for future localized artwork, but no artwork, empty home-screen space, or “coming soon” child-facing messaging is shown. Branded, copyrighted, viral, generic-robot and emoji mascots are prohibited.

## Completion criteria for this stage

- Locale routes `/es` and `/en`, safe unsupported-locale handling, and equivalent-route language switching work.
- Every implemented interface string exists in both message files.
- The responsive home and mission map are complete; only Initial Training links to a placeholder.
- Tutorial, case, results, settings and teacher pages are honest placeholders with safe navigation.
- Linting, strict type checking and a production build succeed after dependencies are installed.

## Explicitly outside this MVP stage

Functional game play; detection claims; media packages; scoring; storage; accounts; personal data; teacher/student registration; camera/QR; analytics; notifications; chatbots; PWA; caching; audio; motion libraries; networking; and final mascot work are not implemented here.

