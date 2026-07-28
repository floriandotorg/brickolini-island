# AGENTS.md

Web recreation of the 1997 "LEGO Island" game. TypeScript + Three.js + Vite + Tailwind 4 + GLSL shaders.

## Commands

```
npm start        # dev server on :5184 (normally running)
npm run check    # tsc --noEmit
npm run lint     # biome check
```

## Structure

```
src/
  main.ts                # entry
  lib/
    engine.ts            # renderer, scenes, cameras, cutscenes, audio, HD toggle
    assets/              # load.ts entry; wdb.ts, model.ts, mesh.ts, audio.ts, image.ts, animation.ts, texture.ts, binary-reader.ts, dta.ts
    world/               # world.ts base; isle main impl; boundary-manager.ts, actor.ts, actors/, entity.ts, entities/, character.ts, building.ts, plants.ts, dashboard.ts, player-movement.ts
    effect/              # post-processing shaders
    action-types.ts      # cutscene/action format
    locations.ts original-lights.ts save-game.ts settings.ts settings-dialog.ts switch-world.ts
  actions/               # one file per cutscene/area; references assets by numeric ID
  worlds/                # world implementations (isle.ts, race.ts, garage.ts, hospital.ts, ...)
public/
  org/                   # extracted original game assets (required)
  hd/                    # optional HD assets
  fonts/
index.html
biome.json              # 2-space, single quotes, semis as needed, lineWidth 320, useSortedClasses
```

## Conventions

- TypeScript strict, ES2022, ESM with `.ts` import extensions.
- Never use the term "Lego" (copyright) — write "brick" or "island".
- The code should document itself; avoid comments unless necessary.
- Always run `npm run check` and `npm run lint` when finishing a task.
- Do not use Playwright (browser automation). Reason about runtime behavior from the source and ask the user to test in their browser instead.

## Original codebase

When implementing features make it faithful to the original game. You can query the original by using the ask-legacy skill. Try to mimic the old implementation while still using modern TypeScript and software engineering practices.

When getting a spec, implement that spec as faithfully as possible. If the spec is ambiguous, use the ask-legacy skill for clarification.

If the ask-legacy skill does not work, ask the user.

## Coordinate system

The original game uses a left-handed coordinate system; three.js is right-handed. The x-axis is therefore negated on read: `BinaryReader.readVector3()` returns `[-x, y, z]`, so all WDB vectors (positions, directions, up) arrive in three.js space. Action data in `src/actions/*.ts` is transcribed verbatim from the original `.si` files and stays in original coordinates — negate x of `location`, `direction`, and `up` when converting an action transform to three.js (see `World.playAnimation`). 

## Asset pipeline

Rendering: WebGL renderer + post-processing GLSL, separate scenes for world vs cutscenes. Asset loaders under `src/lib/assets/` parse binary formats (`wdb`, `dta`, animation, model, mesh).
