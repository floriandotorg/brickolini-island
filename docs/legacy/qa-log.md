
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

## Confirm unit 19 engine input behavior: exact sticky drag synthesis, Escape per-world cleanup and global return/quit query, Z and numpad plus/minus spawn. Summarize APIs and guards from the original; do not change files.
_2026-11-07T18:21:06+07:00_

I have everything needed. No files were modified. Here's the confirmation of the three input behaviors in the original LEGO Island (ISLE/LEGO1) engine.

## 1. Sticky drag synthesis — `LegoInputManager`

File: `LEGO1/lego/legoomni/src/input/legoinputmanager.cpp`, `LEGO1/.../include/legoinputmanager.h`

**State fields (ctor defaults):**
- `m_unk0x74 = 0x19` — the drag distance threshold (squared pixels); `0x19` = 25. This is the "unit 19."
- `m_autoDragTime = 1000` — auto-drag timer fires after 1000 ms of no movement.
- `m_unk0x195` — "sticky" mode flag, toggled by the **Shift** key.
- `m_unk0x80` (dragging now) / `m_unk0x81` (button held, not yet dragged).
- `m_unk0x335` / `m_unk0x336` — alternate modes; see guards below.

**`QueueEvent` / `ProcessOneEvent` gate (`0x1005c740`):** events are dropped when `m_inputProcessingDisabled`, except a `c_notificationButtonDown` while `m_unk0x335`, or `VK_SPACE` while `m_unk0x336`. On `VK_SHIFT`, `ProcessOneEvent` toggles `m_unk0x195` (and, when leaving sticky, clears `m_unk0x80` and dispatches `c_notificationDragEnd` to the camera).

**`FUN_1005cdf0` (`0x1005cdf0`) — the click/drag state machine:**
- `ButtonDown`: record origin (`m_x`/`m_y`), `m_unk0x80=FALSE`, `m_unk0x81=TRUE`, `StartAutoDragTimer()`.
- `ButtonUp`: `StopAutoDragTimer()`; if `m_unk0x80` → emit `DragEnd`; else if `m_unk0x81` → restore origin and emit `Click`. Reset both flags.
- `MouseMove`: in sticky (`m_unk0x195`) mode, force `c_lButtonState`. While sticky or held, compute `t = dx*dx + dy*dy`; if not yet dragging, emit `DragStart` when `m_unk0x195` (sticky bypasses the threshold) OR `t > m_unk0x74` (0x19); once dragging, emit `Drag`.
- `Timer` (matching `m_autoDragTimerID`): stop timer; if still held (`m_unk0x81`), synthesize `DragStart`; else clear drag.

**APIs:** `QueueEvent`, `ProcessEvents`, `ProcessOneEvent`, `FUN_1005cdf0`, `StartAutoDragTimer`/`StopAutoDragTimer` (Win32 `SetTimer`/`KillTimer` via `LegoOmni::GetWindowHandle()`), `EnableInputProcessing` (re-enables + clears `g_clickedObjectId`/`g_clickedAtom`).

## 2. Escape — per-world cleanup + global return/quit query

File: `LEGO1/.../src/entity/legonavcontroller.cpp` (`LegoNavController::Notify`, `0x10055a60`)

The keypress branch only runs when `!Lego()->IsPaused() || key == VK_PAUSE`.

**`VK_ESCAPE` handler:**
```cpp
LegoWorld* currentWorld = CurrentWorld();
if (currentWorld != NULL) {
  InfocenterState* state = (InfocenterState*) GameState()->GetState("InfocenterState");
  assert(state);
  if (state != NULL && state->m_state != InfocenterState::e_exitQueried && currentWorld->Escape()) {
    BackgroundAudioManager()->Stop();
    TransitionManager()->StartTransition(MxTransitionManager::e_mosaic, 50, FALSE, FALSE);
    state->m_state = InfocenterState::e_exitQueried;
  }
}
```

Guards: world non-null, `InfocenterState` found, **not already `e_exitQueried`** (= 8, `infocenter.h`), and the world's `Escape()` returns `TRUE`.

**`LegoWorld::Escape()`** — virtual at vtable+0x64, base returns `FALSE` (`legoworld.h`). Each world overrides it to do its own cleanup, e.g.:
- `Isle::Escape` (`isle.cpp:1221`): `m_radio.Stop()`, `BackgroundAudioManager()->Stop()`, then per-`Act1State` cleanup (pizza/towtrack/etc.).
- `Hospital::Escape`: `DeleteObjects(...)`, set state `e_exitToClose`, `m_destLocation = e_infomain`.
- `CarRace::Escape`: stop action wavs, `DeleteObjects(500,999)`, reset act1 state, clear variable table, restore dead zone + track default.
- `Infocenter::Escape`: branches on `m_state` — `StopCutscene()` (→ `e_introCancelled`), `StopCredits()`, or other handling; respects `e_exitQueried`.

Net effect: Escape delegates cleanup to the active world; on success it stops background audio, starts the mosaic transition, and latches `e_exitQueried` so the global "return to Infocenter" query is fired exactly once.

## 3. Z and numpad plus/minus "spawn"

File: same `LegoNavController::Notify`

**`'Z'` — nearby plants dance:** guarded by `omni->GetCurrentWorld() != NULL && GetWorldId() == LegoOmni::e_act1`. Iterates `LegoPlantManager`, `CreatePlant(i, NULL, e_act1)`, and for visible, frustum-culled, in-range plants (`roiPosition.LenSquared() < 2000.0` or `lodLevel > 0`) calls `entity->ClickAnimation()`.

**`VK_ADD` / `VK_SUBTRACT` (numpad +/-) — cycle & spawn a character in front of the camera:**
- Global `g_nextCharacter` (init to -1 → 0 on first press).
- On subsequent presses: `CharacterManager()->ReleaseActor(GetActorName(g_nextCharacter))`, then wrap-increment (`VK_ADD`) or wrap-decrement (`VK_SUBTRACT`) across `GetNumActors()`.
- `GetActorROI(name, TRUE)` then place it via `CalcLocalTransform(position, direction, up, mat)` and `mat.TranslateBy(direction[0]*2.0f, direction[1]-1.0, direction[2]*2.0f)`, applied with `roi->UpdateTransformationRelativeToParent(mat)`.

Note: these are reachable because the switch falls through the password-gated debug section only for keys not explicitly cased; `Z`/`VK_ADD`/`VK_SUBTRACT`/`VK_F12` are handled as top-level cases before the `!*g_currentInput` debug block (which gates `VK_TAB` FPS toggle and the digit-key light/location/animation shortcuts).

### Cross-cutting guards summary
- Input manager: events dropped when `m_inputProcessingDisabled`, except `m_unk0x335` (button-down re-routed as `VK_SPACE`) and `m_unk0x336` (`VK_SPACE` passthrough).
- Nav controller keypresses: skipped while paused unless `VK_PAUSE`.
- Escape: single-shot via `e_exitQueried` latch; per-world cleanup via the virtual `LegoWorld::Escape()`.
- Debug shortcuts: gated behind `!*g_currentInput` (debug password).

No files were changed.

## Verify docs/savegame.ksy players.ksy history.ksy against retail serialization for implementing a TypeScript importer. List exact per-state payload layouts including playlist serialization flags and the Act1State planes/texture skipping, and character 16-byte entry field order and actor ordering. Identify any Kaitai schema inaccuracies. Focus on a concise implementable format, unknown states must reject a file. Do not edit files.
_2026-11-07T22:28:55+07:00_

Verification complete. I cross-referenced every `Serialize`/`Write`/`Read` path against the schemas. Below is the implementable spec and the schema discrepancies.

## File layout (`*.gs`), little-endian

```
S32  version            // MUST equal 0x1000c (65548); reject otherwise
S16  player_id
U16  current_act        // 0=act1,1=act2,2=act3  (written U16, read S16)
U8   actor_id           // 1=pepper..5=laura (0=none)
variables...            // U8 namelen, name, U8 vallen, value; repeated
end_marker              // U8 namelen, "END_OF_VARIABLES"  (no value)
characters[66]           // 66 x 16 bytes
plants[81]               // 81 x 12 bytes
buildings[16]            // 16 x 10 bytes
U8   building_next_variant
S16 state_count
states[state_count]     // each: S16 namelen, name, then payload
U16 previous_area       // ALWAYS present; 0 for act1
```
Strings here are `MxString`: `S16 length` then `length` raw bytes (no NUL). Variable `END_OF_VARIABLES` is the terminator (only name written).

## Character entry (16 bytes), order verified from `LegoCharacterManager::Write`

```
S32 sound
S32 move
U8  mood
U8  hat_part_name_index   // index into that actor's hat-part array
U8  hat_name_index        // hat color
U8  infogron_name_index   // torso color
U8  armlft_name_index     // L arm color
U8  armrt_name_index      // R arm color
U8  leglft_name_index     // L leg color
U8  legrt_name_index      // R leg color
```
All 66 entries share this identical 16-byte layout; the pepper/infoman/ghost/standard KSY split only changes the *enum interpretation* of `hat_part_name_index` (pepper_hat vs standard_hat vs infoman/ghost single), not the bytes.

### Actor ordering (`g_actorInfoInit`, 66 entries)
```
pepper mama papa nick laura
infoman
brickstr studs rhoda valerie snap pt mg bu ml nu na cl en re ro
d1 d2 d3 d4 l1 l2 l3 l4 l5 l6 b1 b2 b3 b4
cm gd rd pg bd sy gn df bs lt st bm jk
ghost ghost01..ghost05
hg pntgy pep cop01 actor_01..actor_05 btmncycl cboycycl boatman
```
Entry-type grouping (hat-part array): `pepper`(idx1), `pep`(idx57) = pepper; `infoman`(6) = infoman; `ghost..ghost05`(49-54) = ghost; all others = standard. KSY order and grouping match exactly.

## Plant entry (12 bytes) / Building entry (10 bytes)

Plant: `U8 variant, U32 sound, U32 move, U8 mood, U8 color, S8 initialCounter`
Building: `U32 sound, U32 move, U8 mood, S8 initialCounter`; then one trailing `U8 m_nextVariant`.
Counts 81 / 16 confirmed via `g_plantInfo[81]`, `g_buildingInfo[16]`. KSY matches (note: KSY labels the last byte `counter`; on-disk it is `m_initialCounter`, the seed copied into `m_counter` on load).

## Per-state payloads

Every state is preceded by `S16 namelen + name`. `LegoState::Serialize` writes only the class name in write mode; the 15 states below are exactly the ones with `IsSerializable()==TRUE` that add a data payload. The other `*State` classes (`JukeBoxState`, `RadioState`, `ScoreState`, `LegoAct2State`, `Act3State`, `HelicopterState`, `InfocenterState`) override `IsSerializable()` to FALSE and are never written, so the 15-case set is complete.

| name | payload | layout |
|---|---|---|
| `PizzeriaState` | 10 B | 5 x S16 `nextIndex` (pepper, mama, papa, nick, laura) |
| `PizzaMissionState` | 40 B | 5 x [S16 unused2, S16 counter, S16 score, S16 hiScore] |
| `TowTrackMissionState` | 20 B | 5 x S16 score, 5 x S16 high (pepper..laura) |
| `AmbulanceMissionState` | 20 B | same as TowTrack |
| `HospitalState` | 12 B | S16 actor, S16 pepper, mama, papa, nick, laura |
| `GasStationState` | 10 B | 5 x S16 action (pepper..laura) |
| `PoliceState` | 4 B | S32 police_script |
| `JetskiRaceState` | 25 B | 5 x [U8 id, S16 lastScore, S16 highScore] |
| `CarRaceState` | 25 B | same as Jetski |
| `LegoJetskiBuildState` | 4 B | U8 introCount, U8 finished, U8 playedExit, U8 placedParts |
| `LegoCopterBuildState` | 4 B | same |
| `LegoDuneCarBuildState` | 4 B | same |
| `LegoRaceCarBuildState` | 4 B | same |
| `AnimState` | var | U32 extraCharId, U32 animCount, animCount x U16, U32 locFlagsCount, locFlagsCount x U8 |
| `Act1State` | var | see below |

Scores are `ScoreColor` (0=grey,1=yellow,2=blue,3=red), range 0-3. KSY matches all of these.

### PizzeriaState playlist "serialization flags"
The `Playlist` struct has `m_objectIds`, `m_length`, `m_mode` (`e_loop`/`e_once`/`e_random`/`e_loopSkipFirst`), `m_nextIndex`. **Only `m_nextIndex` (S16) per playlist is persisted**; mode/length/objectIds are never serialized. So the payload is exactly 5 x S16 and there are no serialized "mode flags." KSY is correct here.

### Act1State planes/texture skipping
```
7 x named_plane:   [motocycle, bike, skateboard, helicopter, jetski, dunebuggy, racecar]
named_plane = S16 namelen + name + 3 x f32 position + 3 x f32 direction + 3 x f32 up  (name+36 B)
```
Then, **gated by `<plane>.name_length > 0`** (retail: `strcmp(plane.m_name, "") != 0`), the following textures appear — and only these four planes ever carry textures:
- `helicopterPlane` named -> 3 x texture (windshield `chwind.gif`, jetLeft `chjetl.gif`, jetRight `chjetr.gif`)
- `jetskiPlane` named -> 2 x texture (front `jsfrnt.gif`, windshield `jswnsh.gif`)
- `dunebuggyPlane` named -> 1 x texture (front `dbfrfn.gif`)
- `racecarPlane` named -> 3 x texture (front `rcfrnt.gif`, back `rcback.gif`, tail `rctail.gif`)

motocycle/bike/skateboard planes never have a texture block. Each texture = `S16 namelen + name` then `LegoImage`: `U32 w, U32 h, U32 count, count x {U8 r,U8 g,U8 b}, w*h bytes bitmap`. KSY `act1_texture` matches (ReadNamedTexture returns NULL => load fails, so a corrupt texture must reject the file).
Final two fields: `S16 cpt_click_dialogue_next_index`, `U8 played_exit_explanation`. KSY matches.

## `History.gsi` and `Players.gsi`

Players.gsi: `S16 count`, `count x username` where `username` = 7 x S16 letter index (0-25 A-Z, 29/30/31/32 intl, -1 empty). Max 9. KSY matches.

History.gsi: `S16 next_player_id`, `S16 count`, then `count x` entry:
`S16 index, S16 total_score, 25 x U8 scores[5 missions x 5 actors], 14-byte username, S16 player_id` = 45 bytes. Mission order: car_race, jetski_race, pizza_delivery, tow_track, ambulance; actor order pepper, mama, papa, nick, laura. KSY matches exactly.

## Kaitai schema inaccuracies / gaps to fix in the importer

1. **`previous_area` typed `s2`; retail writes `U16`** (and reads `S16`). Byte-identical for all valid `Area` values (<0x8000); cosmetic, but the KSY type is technically wrong (`u2`).

2. **No rejection of unknown state names.** `game_state` uses `switch-on: name` with 15 cases and no `default`; Kaitai silently consumes 0 bytes for an unmatched name. The retail load rejects the file when `ObjectFactory::Create(name)` returns NULL (unknown name). The importer must explicitly validate `name` against the 15-state set and throw. (The 15 states are the complete serializable set; the `IsSerializable()==FALSE` states never occur, so accepting only these 15 is correct.)

3. **No `version` enforcement.** KSY reads `s4` but doesn't require `0x1000c`; retail rejects with "Saved game version mismatch." Importer must assert equality.

4. **Minor: `actor` enum omits `c_brickster` (6).** Harmless for saves (player/race actor ids are 1-5) but technically incomplete; also `c_none=0` is present.

5. **Minor label: plant/building `counter`** is actually `m_initialCounter` (1 signed byte, same position).

Everything else (field types, offsets, counts, ordering, the Act1State plane/texture gating, the playlist nextIndex-only rule) matches the retail serialization exactly.
