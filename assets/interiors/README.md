# 3D interiors

The optional `interiors3d` setting is independent of graphics presets and defaults to off. Its UI label is **3D interiors** so future building interiors can share the same preference. Only the bike is implemented currently. Changes take effect on the next vehicle entry.

## Bike

- Editable source: `assets/interiors/bike.blend`
- Generator: `assets/interiors/build-bike.py`
- Blender camera preview: `assets/interiors/bike-preview.png`
- Hand detail views: `assets/interiors/bike-hand-front.png`, `assets/interiors/bike-hand-back.png`
- Enlarged original hand reference: `assets/interiors/original-bike-hand.png`
- Runtime geometry: `public/models/interiors/bike.glb`

Built through Blender MCP using the original bike dashboard (`public/org/isle/11.png`), arm mask (`260.png`), bell (`261.png`), and information button (`264.png`) as visual references. The yellow C-shaped pieces in the arm mask are hands holding the red bar, not rubber grips. The attached sleeves are light grey/white. The hands have a cylindrical bore aligned with the bar and connected wrist stems; there are no separate floating thumb spheres or invented grip ribs.

The model uses geometry and PBR materials, not the original bitmap textures. The preview uses Blender studio lights; the game uses its own lighting.

To rebuild from a fresh Blender session:

```sh
blender --background --factory-startup --python assets/interiors/build-bike.py
```

GLB export includes only the active scene's selected model hierarchy, with modifiers applied. Preview cameras and lights are not exported. Blender's glTF exporter handles the axis conversion; no original-game coordinate conversion applies to this model.

Control groups carry `interiorAction` glTF extras:

- `Horn`: existing bike horn toggle.
- `Information`: existing Information Center action.
- `LeftHand`, `RightHand`: dismount.

`src/lib/interiors/vehicle-interior.ts` handles asset selection, cancellable loading, mesh hit testing, button depression, framing, and disposal. Unsupported vehicles and failed model loads retain the original dashboard.

`src/lib/interiors/interior-render.ts` renders the cockpit into a transparent, multisampled layer after the island and before the 2D HUD. It has PBR lighting, a hemisphere fill, and a 1024-pixel directional shadow map. The island sun is transformed into rider space so highlights and self-shadows change with heading. Interior shadows are enabled for this pass even if world shadows are off; renderer state is restored afterward. The separate depth buffer prevents near-plane clipping and world post-processing from blurring the cockpit.

## Manual browser check

1. Open Settings, enable **Interiors > 3D interiors**, then enter the bike.
2. Confirm the bitmap dashboard is gone and the red bar, yellow hands, light sleeves, silver bell, and information button are 3D.
3. Turn in daylight and check moving highlights and self-shadows. Also check with world shadows off.
4. Click the bell, click a hand to dismount, re-enter, and click the information button.
5. Check standard, widescreen, and narrow windows. Controls should track their visible geometry.
6. Disable the setting and re-enter. The original overlay should return. Other vehicles should remain unchanged.

Automated tests load the actual GLB and cover PBR materials, shadow flags, control raycasts across aspect ratios, original hand/sleeve material assignments, handlebar clearance, setting persistence, stale loads, failure handling, and disposal. Browser automation is intentionally not used, following the project testing instructions.
