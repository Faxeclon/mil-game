# Mirada Digital / Digital Eye

An early bilingual UNESCO Youth Hackathon 2026 Media and Information Literacy prototype for children aged 6–10. It teaches children to **Mira · Pregunta · Comprueba** / **Look · Ask · Check** before believing or sharing digital content.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open `/es/tutorial` or `/en/tutorial`. The tutorial has three rounds and deliberately has no score, profile, persistence, account, PWA cache, camera access, or mascot.

## Checks

```powershell
npm.cmd run test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

## Current scope and next stage

Implemented: bilingual routing, responsive app shell, mission preview, accessibility foundations, reviewed tutorial media contracts, and deterministic in-memory tutorial state.

Recommended next: author and review final media and learning cases, then design the individual post-verification case. Do not add scoring or persistent progress until its educational purpose and privacy model are specified.
