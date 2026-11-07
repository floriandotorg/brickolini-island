
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

## Verify the score history stable ordering and replacement rule, player ID allocation, and player switching reset behavior in legogamestate.cpp. Give concise implementation facts and flag any differences from docs/feature-complete/01-game-state-and-saves.md if that doc is accessible.
_2026-11-07T13:25:48+07:00_

The doc `docs/feature-complete/01-game-state-and-saves.md` does not exist in this repo, so no doc comparison can be made. Here are the implementation facts from `LEGO1/lego/legoomni/src/common/legogamestate.cpp`:

## Score history - stable ordering and replacement rule

`History::WriteScoreHistory()` (LEGO1 path, the non-BETA10 branch):

- **Lookup**: `FindPlayerInScoreHistory(m_players, m_currentPlayerId, idx)` matches on both the username bytes (`memcmp`) AND `m_playerId`. Returns the existing `ScoreItem*` or `NULL`; `idx` is set to the match index or `m_count` if not found.
- **Existing player**: only updates `m_totalScore`, copies the new `scores` grid. Name and playerId are NOT refreshed (left as previously stored).
- **New player, room available** (`m_count < sizeOfArray(m_scores)`, which is 20): appends at `m_scores[m_count]`, fills name + playerId, then `m_count++`.
- **New player, full** (`m_count >= 20`): only replaces if `m_scores[19].m_totalScore <= totalScore`. It overwrites slot 19 (the last slot after sorting), name and playerId included. Note: this uses `<=`, so an equal score to the current lowest still replaces it - a tie does not preserve the older entry.
- **Sorting**: after insert/update, a full bubble sort runs over all `m_count` entries (`for i = m_count-1; i >= 0; i--` with inner `j` from 1..i), swapping adjacent entries when `m_scores[j].m_totalScore > m_scores[j-1].m_totalScore`.
  - **Stability**: the comparison is strict `>`, so equal scores are NOT swapped, making the sort stable. New entries appended at the end therefore retain their position relative to existing equal-score entries.

Net ordering: descending by total score, ties broken by insertion order (stable). Replacement of the lowest slot is allowed on a tie (`<=`), which would displace a prior same-score player at rank 19.

## Player ID allocation

- `History::m_nextPlayerId` starts at 0 (`History()` ctor).
- `AddPlayer` sets `m_currentPlayerId = m_history.m_nextPlayerId`, then increments `m_history.m_nextPlayerId = m_currentPlayerId + 1`, then calls `m_history.WriteScoreHistory()`.
- So IDs are monotonically increasing across registrations; each new player gets the next sequential ID.
- `History::Serialize` persists/restores `m_nextPlayerId` first, then `m_count`, then each `ScoreItem` (writing a leading index `i` that is discarded on read - it's just the position marker).
- `FindPlayerInScoreHistory` keys on the playerId, so two players with the same username but different IDs are treated as distinct history entries.

## Player switching reset behavior

`SwitchPlayer(MxS16 p_playerId)`:

- Only reorders if `p_playerId > 0` (selecting anyone but the already-front player):
  1. Moves the selected player's save file (`G{p_playerId}.GS`) to a temp slot `G36.GS`.
  2. Shifts players at indices `0..p_playerId-1` down by one (both the in-memory `m_players[]` array and the on-disk save files `G{i-1}.GS -> G{i}.GS`).
  3. Places the selected name at `m_players[0]` and moves the temp file back to `G0.GS`.
- Then unconditionally calls `Load(0)`. If `Load(0) != SUCCESS`, it calls `Init()`.
- `Load(0)` itself does: read version (must be `0x1000c`), restore `m_currentPlayerId`, `SetCurrentAct`, restore `m_actorId` and call `SetActor` if nonzero, reload variables, re-read CharacterManager/PlantManager/BuildingManager, `DeleteState()` (which calls each state's `Reset()` and deletes non-resetting serializable states), then re-creates and re-serializes saved states, and resets `m_savedPreviousArea` based on the act (act1 -> `e_undefined`).
- `Init()` (the failure/reset path) resets background color and light position, re-inits Plant/Building/Character managers, resets AnimationManager, calls `RemoveActor()` (deletes user actor, sets `m_actorId = 0`), calls `DeleteState()`, clears `m_isDirty`, recomputes `m_loadedAct`, sets `SetCurrentAct(e_act1)`, and on act1 removes/deletes the copter, dunebuggy, jetski, and racecar actors from the Isle world, then sets `m_savedPreviousArea = e_undefined`.

Note: `SwitchPlayer` does not itself touch `m_actorId`, `m_currentAct`, or the act states directly - it relies on `Load(0)` to restore them from the selected player's save. The "reset" only happens via `Init()` if the load fails.

## Doc comparison

`docs/feature-complete/01-game-state-and-saves.md` is **not present** in this repository (the `docs/` directory contains only KSY specs, README, and samples). No diff against that doc could be performed. If you have it elsewhere, point me at the path and I'll cross-check.

## How many actual entries are in g_plantInfoInit and serialized by PlantManager? The TypeScript port src/lib/world/plants.ts table has 82 entries but roadmap says 81. Check source array size and final interior plant coordinates and report exact count.
_2026-11-07T13:34:15+07:00_

## Answer

Your premise has two errors: there is **no `src/lib/world/plants.ts` TypeScript port** in this repo (the only plants source is the C++ original in `LEGO1/lego/legoomni/`), and the roadmap's count of **81 is correct**, not 82.

### Source array size

`LEGO1/lego/legoomni/include/legoplants.h:57`:
```c
extern LegoPlantInfo g_plantInfoInit[81];
```

`LEGO1/lego/legoomni/src/common/legoplants.cpp:6`:
```c
LegoPlantInfo g_plantInfoInit[81] = { ... };
```

Counting the initializer: exactly **81** entries. Verified two ways:
- `grep -c '{NULL,' legoplants.cpp` → `81`
- awk count of `{NULL,` up to the closing `};` at line 1951 → `81`

The runtime copy is `LegoPlantInfo g_plantInfo[81];` (`legoplantmanager.cpp:60`). `sizeOfArray(g_plantInfo)` therefore evaluates to 81.

### What PlantManager serializes

`LegoPlantManager::Write` (`legoplantmanager.cpp:269`) and `Read` (`:302`) each loop `i < sizeOfArray(g_plantInfo)`, i.e. **81 iterations**, writing/reading 6 fields per entry:

| field | size |
|---|---|
| m_variant (MxU8) | 1 |
| m_sound (MxU32) | 4 |
| m_move (MxU32) | 4 |
| m_mood (MxU8) | 1 |
| m_color (MxU8) | 1 |
| m_initialCounter / m_counter (MxS8) | 1 |

= 12 bytes/entry × 81 = **972 bytes total**, matching `docs/savegame.ksy` ("Plant manager data (81 plants)", "12 bytes per plant"). `Init()` (`:80`) copies all 81 entries from `g_plantInfoInit` into `g_plantInfo` before any load/save.

### Final interior plant coordinates

Interior plants are those whose `m_boundaryName` begins with `int`. The last one in array order is `int48` (legoplants.cpp around line 1686), a tree (variant `e_tree`, color `e_green`):

| field | value |
|---|---|
| m_boundaryName | `"int48"` |
| m_unk0x1c | `4` |
| m_x (shot loc) | `87.9875` |
| m_y (shot loc) | `9.0` |
| m_z (shot loc) | `-1.125` |
| m_boundary | `NULL` (resolved at runtime) |
| m_position[0..2] | `88.75, 8.75, 0.875` |
| m_direction[0..2] | `0.259, 0.0, 0.966` |
| m_up[0..2] | `0.0, 1.0, 0.0` |

### Bottom line

- Source array `g_plantInfoInit` holds **81** entries (matches the declared `[81]`), not 82.
- PlantManager serializes all **81** entries (972 bytes).
- The roadmap/spec count of 81 is correct. If a TypeScript port somewhere claims 82, it has an off-by-one bug; but no such file exists in this repository to check.
