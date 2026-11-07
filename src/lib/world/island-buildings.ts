import type { IsleBase } from '../../worlds/isle-base'
import { advanceClickState, clickAnimationId } from '../customization-rules'
import { engine } from '../engine'
import type { BuildingState } from '../save-game'
import { getSettings } from '../settings'
import { playCustomizationFeedback } from './customization'

export const ISLAND_BUILDINGS = [
  { name: 'infocen', flags: 0, y: 8.99999, boundary: 'edg02_74', shot: [-84.79617, 9, -10.2189], downshift: 5 },
  { name: 'policsta', flags: 0x10, y: 0.999992, boundary: 'int33', shot: [-67.28488, 1, -85.3917], downshift: 5 },
  { name: 'jail', flags: 0x10, y: 0, boundary: 'edg02_50', shot: [-93.245659, 0, -48.7773], downshift: 5 },
  { name: 'races', flags: 0x10, y: 0, boundary: 'int14', shot: [21.7321, 0, 11.23354], downshift: 5 },
  { name: 'medcntr', flags: 0x10, y: 3.99071, boundary: 'edg02_27', shot: [-86.020737, 4, 31.35498], downshift: 3 },
  { name: 'gas', flags: 0x10, y: 0, boundary: 'int24', shot: [-26.32025, 0, -2.28938], downshift: 5 },
  { name: 'beach', flags: 0x10, y: -1.8125, boundary: 'edg00_46', shot: [-14.375, -1.3125, -56.75], downshift: 5 },
  { name: 'racef', flags: 0x10, y: 0, boundary: 'edg03_03', shot: [4.15951, 0, 5.2003198], downshift: 5 },
  { name: 'racej', flags: 0x10, y: 0, boundary: 'edg03_03', shot: [4.15951, 0, 5.2003198], downshift: 3 },
  { name: 'store', flags: 0x3e, y: 2, boundary: 'edg02_60', shot: [49.4744, 2, -56.6276], downshift: 5 },
  { name: 'bank', flags: 0x3e, y: 0, boundary: 'edg02_36', shot: [-18.53531, 0, -16.6053], downshift: 5 },
  { name: 'post', flags: 0x3e, y: 0, boundary: 'edg02_58', shot: [33.5413, 0, -55.1791], downshift: 5 },
  { name: 'haus1', flags: 0x3f, y: 7.0625, boundary: 'int11', shot: [62.7827, 7, -45.2215], downshift: 5 },
  { name: 'haus2', flags: 0x3e, y: 8, boundary: 'int07', shot: [69.2376, 8, -6.8008099], downshift: 5 },
  { name: 'haus3', flags: 0x3e, y: 7, boundary: 'edg01_24', shot: [69.0596, 7, -24.4928], downshift: 5 },
  { name: 'pizza', flags: 0x10, y: 0, boundary: 'int37', shot: [17.9438, 0, -46.827999], downshift: 5 },
] as const

export const HOUSE_VARIANTS = ['haus1', 'haus4', 'haus5', 'haus6', 'haus7'] as const

export const activeHouseVariant = (state: BuildingState): number => (getSettings().islandQuality === 'high' ? state.nextVariant : 0)

export const defaultBuildingState = (): BuildingState => ({ nextVariant: 0, entries: ISLAND_BUILDINGS.map(() => ({ sound: 4, move: 0, mood: 1, counter: -1 })) })

export class IslandBuildings {
  private readonly _animating = new Set<number>()
  constructor(private readonly _world: IsleBase) {}

  public refresh(): void {
    const state = engine.currentSaveGame.buildings ?? defaultBuildingState()
    for (let n = 0; n < ISLAND_BUILDINGS.length; ++n) {
      const info = ISLAND_BUILDINGS[n]
      const roi = this._world.findRoi(info.name)
      if (roi != null) {
        const counter = state.entries[n].counter
        roi.model.position.y = info.y - (counter < 0 ? 0 : (info.downshift - counter) * (n === 0 ? 0 : 1))
        roi.visible = counter !== 0
      }
    }
    for (let n = 0; n < HOUSE_VARIANTS.length; ++n) {
      const roi = this._world.findRoi(HOUSE_VARIANTS[n])
      if (roi != null) {
        roi.visible = state.entries[12].counter !== 0 && n === activeHouseVariant(state)
        roi.model.position.y = ISLAND_BUILDINGS[12].y - (state.entries[12].counter < 0 ? 0 : ISLAND_BUILDINGS[12].downshift - state.entries[12].counter)
      }
    }
  }

  public attach(): void {
    this.refresh()
    for (let n = 9; n <= 14; ++n) {
      const names = n === 12 ? HOUSE_VARIANTS : [ISLAND_BUILDINGS[n].name]
      for (const name of names) {
        const roi = this._world.findRoi(name)
        if (roi != null) {
          this._world.addClickListener(roi, () => this._click(n))
        }
      }
    }
  }

  private _click = async (index: number): Promise<boolean> => {
    const save = engine.currentSaveGame
    if (this._world.ignoreEntityClick || save.playerUnsafe == null) {
      return false
    }
    const player = save.player
    if (player === 'pepper' && save.act !== 1) {
      return true
    }
    const state = save.buildings ?? defaultBuildingState()
    const info = ISLAND_BUILDINGS[index]
    const entry = state.entries[index]
    const allowed = (player === 'mama' && (info.flags & 2) !== 0) || (player === 'papa' && (info.flags & 4) !== 0) || (player === 'laura' && (info.flags & 8) !== 0)
    if (allowed) {
      state.entries[index] = advanceClickState(entry, player, 'building')
    }
    if (player === 'pepper' && (info.flags & 1) !== 0 && entry.counter === -1 && getSettings().islandQuality === 'high') {
      state.nextVariant = (state.nextVariant + 1) % HOUSE_VARIANTS.length
    }
    save.buildings = state
    this.refresh()
    const roi = this._world.findRoi(index === 12 ? HOUSE_VARIANTS[activeHouseVariant(state)] : info.name)
    if (roi != null && !this._animating.has(index)) {
      this._animating.add(index)
      try {
        await playCustomizationFeedback(this._world, roi, 'building', state.entries[index], (info.flags & 4) !== 0 ? clickAnimationId('building', state.entries[index].move, index) : 0, player === 'laura', (info.flags & 2) !== 0)
      } finally {
        this._animating.delete(index)
      }
    }
    return true
  }
}
