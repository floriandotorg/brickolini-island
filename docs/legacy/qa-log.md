
## How is the JukeBox entity placed and oriented in the isle world? Specifically, is there any special rotation handling for the JukeBoxEntity initial placement vs. when it's clicked/used? Look at JukeBoxEntity creation, the entity action location/direction/up vectors, and any SetupLocalTransform or similar rotation code for the 'juke' model. Why might the jukebox appear rotated 180 degrees at startup but correct after use?
_2026-07-28T20:40:35+02:00_

## How the jukebox is placed and oriented

There are two distinct objects near the jukebox prop in the Isle world, and **neither has any source-level rotation handling**:

1. **The visible `juke` model** — a static 3D ROI created by `LegoModelPresenter::CreateROI()` (`LEGO1/lego/legoomni/src/video/legomodelpresenter.cpp:162-176`). Its transform comes straight from the action stream:
   ```cpp
   CalcLocalTransform(
       Mx3DPointFloat(m_action->GetLocation()[0], ...),
       Mx3DPointFloat(m_action->GetDirection()[0], ...),
       Mx3DPointFloat(m_action->GetUp()[0], ...),
       mat);
   m_roi->UpdateTransformationRelativeToParent(mat);
   ```
2. **`JukeBoxEntity`** — the invisible clickable trigger, created by `LegoObjectFactory` (`legoobjectfactory.cpp:485`) and placed by `LegoEntityPresenter::ReadyTickle()` (`legoentitypresenter.cpp:54-62`):
   ```cpp
   m_entity->SetLocation(m_action->GetLocation(), m_action->GetDirection(), m_action->GetUp(), TRUE);
   ```

`JukeBoxEntity` itself (`jukeboxentity.cpp`) **overrides nothing transform-related** — no `Create`, `SetROI`, `SetLocation`, `SetWorldTransform`. It inherits `LegoEntity::SetLocation` verbatim (`legoentity.cpp:163-194`), which just calls `CalcLocalTransform(location, direction, up, mat)` and `m_roi->UpdateTransformationRelativeToParent(mat)`. No jukebox-specific code touches the matrix.

`CalcLocalTransform` (`realtime/realtime.cpp`) builds a right-handed basis: `z = dir`, `y = up`, `x = y × z`. Orientation is fully determined by the `direction`/`up` vectors in the `.si` action data.

## Initial placement vs. clicked/used — is there special rotation handling?

**No.** I searched the entire `LEGO1` tree: there is no `SetupLocalTransform`-style code, no `SetROIVisible("juke", ...)`, no `GetActorROI("juke", ...)`, no rotation patch anywhere referencing the jukebox model or `JukeBoxEntity`. `grep` for `"juke"` / `SetROIVisible.*juke` / `GetActorROI.*juke` returns zero matches.

The click handler (`JukeBoxEntity::Notify`, `jukeboxentity.cpp:36-52`) only does `CanExit()` → exit vehicle → `SetDestLocation(e_jukeboxw)` → mosaic transition. It never touches the ROI or its transform.

The return path (`Isle::HandleTransitionEnd`, `isle.cpp:829-841`) does:
```cpp
case Act1State::e_jukebox:
    m_act1state->m_state = Act1State::e_none;
    ((IslePathActor*) UserActor())->SpawnPlayer(e_jukeboxExterior, TRUE, ...);
    GameState()->m_currentArea = e_vehicleExited;
    EnableAnimations(TRUE);
    m_jukebox->StartAction();
```
`SpawnPlayer` repositions the **player actor**, not the jukebox. `StartAction()` plays the band anim + music; it does not rotate the jukebox ROI.

## Why it could appear 180° off at startup but correct after use

Since the source applies the **same** placement code on both the initial Isle load and the post-jukebox reload (`e_jukeboxExterior` → `LoadIsle()` rebuilds the world from the same action stream), a 180° discrepancy is **not** explained by C++ logic. The two placement paths are identical. Possible real causes:

- **The `direction` vector in the Isle `.si` action data for the `juke` model points the wrong way** (e.g. `+Z` vs `-Z`). `CalcLocalTransform` will faithfully build a 180°-rotated basis from it. This is a data bug in the decompiled/rebuilt `.si`, not a code bug.
- **A `SetEntityDirection`/`SetEntityUp` action in the Isle script stream that fires only on the return transition** (post-use), correcting the orientation. The C++ never calls these for the jukebox, but the script action stream can carry `SetEntityLocation`/`SetEntityDirection`/`SetEntityUp` actions dispatched by `LegoWorldPresenter` (`legoworldpresenter.cpp:136, 375, 383` all call `SetEntityLocation`). If such a corrective action is sequenced after the `LoadIsle` on the return path but was missing/ordered-differently on the initial boot, you'd see exactly this symptom.
- **ROI parenting / `UpdateTransformationRelativeToParent` interaction**: the model's local transform is relative to its parent ROI's world transform. If the parent's world transform differs between initial load and reload (e.g. a parent ROI placed by a later-arriving chunk on first load vs. already-cached on reload), the composed orientation can flip.

The actionable next step is to inspect the Isle `.si` action stream for the `juke` model's `direction`/`up` vectors and any `SetEntity*` actions targeting it — the C++ source has no jukebox-specific rotation to inspect.
