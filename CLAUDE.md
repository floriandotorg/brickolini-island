# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Lego Island Remastered (formerly Brickolini Island) is a web-based recreation of the 1997 game LEGO Island, using TypeScript, Three.js, and Vite. The project aims to recreate the original game with graphical and gameplay enhancements.

## Development Commands

### Running the Project
```bash
npm start        # Start development server on port 5174
npm run build    # Build for production (TypeScript + Vite build)
npm run preview  # Preview production build
```

### Code Quality
```bash
npm run check    # Type checking (tsc --noEmit)
npm run lint     # Linting with Biome
```

## Architecture

### Core Components

- **Engine** (`src/lib/engine.ts`): Main game engine handling rendering, cutscenes, world management, and audio
  - Manages Three.js renderer, scenes, and cameras
  - Handles transitions between cutscenes and gameplay
  - Controls background music with fade transitions
  - Supports HD rendering mode toggle

- **World System** (`src/lib/world/`): Game world management
  - `world.ts`: Base world class interface
  - `isle.ts`: Main LEGO Island world implementation
  - `boundary-manager.ts`: Collision detection and boundaries
  - `plants.ts`: Vegetation system
  - `dashboard.ts`: UI dashboard system

- **Asset System** (`src/lib/assets/`): Resource loading and management
  - `index.ts`: Main asset loading interface
  - `wdb.ts`: World database file parser
  - `audio.ts`: Audio loading and playback
  - `image.ts`: Image/texture loading
  - `animation.ts`: Animation file handling
  - `model.ts`: 3D model loading
  - `mesh.ts`: Mesh generation and management
  - `binary-reader.ts`: Binary file parsing utilities

- **Actions** (`src/actions/`): Game cutscenes and interactive sequences
  - Each file represents a different game area or cutscene
  - Uses a standardized action format with file references
  - Supports various media types: audio (M4A), images (PNG), animations (ANI), videos (MP4)

### Asset Organization

The project requires extracted game assets in `public/org/` (original assets) and optionally `public/hd/` (HD assets). Assets are organized by game area/action in subdirectories.

### Rendering Pipeline

1. Three.js WebGL renderer with post-processing shader support
2. Separate scenes for game world and cutscenes
3. Custom GLSL shaders for post-processing effects
4. Support for both standard and HD rendering modes

## Code Conventions

- **TypeScript**: Strict mode enabled with ES2022 target
- **Module System**: ES modules with `.ts` extensions in imports
- **Formatting**: Biome formatter with 2-space indentation, single quotes, semicolons as needed
- **Line Length**: 320 characters (configured in Biome)
- **Styling**: Tailwind CSS via Vite plugin
- **GLSL Shaders**: Imported using vite-plugin-glsl

## Important Notes

- Development server auto-starts the game and skips intro cutscenes
- Production build plays full intro sequence (LEGO, Mindscape, Intro movies)
- HD rendering mode can be toggled via `engine.hdRender`
- All file paths in actions use numeric IDs that map to extracted assets

# Rules

## General
- write code concise and without comments
- always use brackets for if statements
- don't insert unnecessary try/catches
- use n as counter in for loops 
- use prefix increment when possible (++n)
- never use the term Lego (copyright)
- use descriptive variable names

## TypeScript
- use 2 spaces for indentation
- avoid using `as` in TypeScript
- prefer ?? over ||
- always use JS/TS arrow functions
- avoid using any, prever using unknown or generics

## Third party
- use tailwind 4 syntax
