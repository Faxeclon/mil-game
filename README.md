# Kikiria

Kikiria is a bilingual, gamified Media and Information Literacy (MIL) learning experience, developed in the context of the UNESCO Youth Hackathon 2026. It is designed primarily for young people around ages 8–16.

Rather than acting as an AI detector, Kikiria helps players practise how to look carefully, distinguish clues from proof, check context and provenance, recognise uncertainty, and make better choices before believing or sharing content.

## Experience

The current learning path has four islands:

1. **Training / Entrenamiento** — learning the game’s core observation and checking habits.
2. **Clue Hunt / Caza de pistas** — comparing visual content across themes such as animals and sports.
3. **Frame by Frame / Cuadro a cuadro** — applying critical viewing to video.
4. **Deciding well / Decidir bien** — choosing responsible actions around checking, influence, uncertainty and sharing.

The experience includes child profiles, a home screen, an island map, a skippable narrative introduction, mission-level feedback with Roqui, local progression, stars and records, ranks, titles and achievements. Eligible islands also offer a one-time Bonus/Rush challenge after a valid section completion.

Kikiria supports Spanish and English throughout. Sources, authors and licences for audited media are available in **Settings → Sources & credits**.

## Teacher mode

Teacher Mode is a separate, device-local classroom flow. It can create printable QR answer cards, use physical A/B responses, scan cards with a teacher device, and show class response and result summaries.

It does not claim account-to-account or cross-device classroom synchronisation. Card sets and the classroom session are stored on the teacher’s device.

## Technology

- Next.js 16
- React 19
- TypeScript
- CSS Modules and global CSS tokens
- Structured JSON content packs and ES/EN message catalogues
- Vitest, ESLint and TypeScript checks
- `qrcode` and `zxing-wasm` for the teacher card and scanning flow

## Architecture

- **Frontend:** a Next.js client-side web application.
- **Content-driven learning:** missions, rounds, media metadata and educational feedback are authored as validated structured packs.
- **Local progression:** profiles, progress, achievements, settings and Bonus state persist locally on the device.
- **Media provenance:** structured metadata drives the in-app Sources & credits view without exposing gameplay answers.
- **Teacher experience:** printable cards and QR scanning live in a distinct teacher flow.

The core game does not require a dedicated backend or database. Local persistence is not the same as a fully offline product; Kikiria does not claim to be fully offline-first.

## Media and credits

Kikiria uses audited camera-captured media with source and licence metadata, as well as material created or AI-generated for the project. It also includes videos and background music created for Kikiria with Suno. Consult **Settings → Sources & credits** for the relevant authors, sources and licences.

## Repository structure

```text
src/
  app/          Next.js routes and layouts
  components/   UI and gameplay clients
  content/      packs, schemas, validators and credit metadata
  features/     game-domain state and behaviour
  messages/     Spanish and English catalogues

public/
  media/        mission and UI assets
  audio/        background music and narration clips
```

## Development

Requirements: Node.js and npm.

```powershell
npm.cmd install
npm.cmd run dev
```

For a production build:

```powershell
npm.cmd run build
npm.cmd run start
```

The core experience has no required environment variables.

## Quality checks

```powershell
npm.cmd run test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

The suite includes unit and content-validation coverage alongside checks for progression, credits, accessibility-sensitive behaviour and the teacher flow.

## Possible future directions

- More MIL learning content and classroom tools.
- Optional cross-device persistence backed by a future architecture.
- Broader offline support where it can be implemented and validated honestly.
