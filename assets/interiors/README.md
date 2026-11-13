# 3D interiors

The optional `interiors3d` setting is independent of graphics presets and defaults to off. Its UI label is **3D interiors** so future building interiors can share the same preference. The bike and the motorcycle are implemented. Changes take effect on the next vehicle entry.

## Fidelity rule

The interiors are the original dashboards rebuilt in 3D, not reinterpretations. Every part comes from the original bitmaps (bike: `public/org/isle/11.png`, `260.png`, `261.png`, `264.png`; motorcycle: `151.png`, `257.png`, `258.png`, `154.png`, `155.png`). Parts are placed by back-projecting measured pixel positions through the game camera (50° vertical FOV, 640x480), so a 4:3 render lines up with the original overlay. Parts that the original cut off at the 640x480 frame edge, such as the rider's arms and the handlebar ends, continue naturally for widescreen.

## Files

- Shared generator kit: `assets/interiors/interior_kit.py` (`screen(x, y, depth)` back-projection, lathe/sweep/extrude/sphere-letter helpers, rider hands and arms, export and previews)
- Bike: `build-bike.py`, `bike.blend`, `bike-preview.png` (4:3), `bike-wide-preview.png` (16:9), runtime `public/models/interiors/bike.glb`
- Motorcycle: `build-moto.py`, `moto.blend`, `moto-preview.png`, `moto-wide-preview.png`, runtime `public/models/interiors/moto.glb`
- Enlarged original hand reference: `original-bike-hand.png`

Rebuild from a fresh Blender session:

```sh
blender --background --python assets/interiors/build-bike.py
blender --background --python assets/interiors/build-moto.py
```

For layout work, `INTERIOR_DRAFT=/tmp/draft.png` renders a fast 640x480 Workbench draft without exporting. `INTERIOR_DRAFT_WIDTH=853` renders the widescreen framing. Compare the draft against the original by compositing the bitmaps at their action locations (bike dashboard at y 330, arms at y 341, horn at 289,281, info at 296,388; motorcycle dashboard at y 292, arms at y 298, info at 291,402).

GLB export includes only the model hierarchy, with modifiers applied. Preview cameras and lights are not exported.

## Runtime metadata

Control groups carry `interiorAction` glTF extras:

- `Horn` (bike only): existing bike horn toggle.
- `Information`: existing Information Center action.
- `LeftHand`, `RightHand`: dismount.

Gauge fills carry `interiorMeter` (`speed` or `fuel`). Each fill mesh grows along its local X axis. At runtime it is revealed with a clipping plane, so it matches the original meters: speed fills the arrow left to right in red, fuel fills the bar bottom to top in yellow.

`src/lib/interiors/vehicle-interior.ts` handles asset selection, cancellable loading, mesh hit testing, button depression, gauge clipping, the turn lean, framing, and disposal. Unsupported vehicles and failed model loads keep the original dashboard.

`src/lib/interiors/interior-render.ts` renders the cockpit into a transparent, multisampled layer after the island and before the 2D HUD. It uses the island's environment map (or a generated sky environment when the preset has none) rotated into rider space for reflections. It also uses the island's active sun, transformed into rider space, plus a hemisphere fill and a 1024-pixel shadow map. Interior shadows and local clipping are enabled only for this pass, and renderer state is restored afterward.

When turning, the cockpit rolls up to 2.5° into the turn around a pivot near the ground, damped so it eases in and out. This comes on top of the original game's camera lean.

## Manual browser check

1. Open Settings, enable **Interiors > 3D interiors**, then enter the bike and the motorcycle.
2. Compare with the original dashboards in 4:3. In widescreen, the arms should continue toward the lower corners.
3. Ride and turn. The cockpit should lean slightly into the turn, and the motorcycle speed and fuel gauges should fill.
4. Click the bell, click a hand to dismount, re-enter, and click the information button.
5. Disable the setting and re-enter. The original overlay should return.
