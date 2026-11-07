import * as THREE from 'three'
import type { Boundary } from '../assets/boundary'
import { damagedCounter, damagedHeight } from '../destruction-rules'
import { engine } from '../engine'
import { defaultBuildingState, HOUSE_VARIANTS, ISLAND_BUILDINGS } from './island-buildings'
import { Plants } from './plants'
import type { World } from './world'

export type DestructionTarget = { type: 'plant' | 'building'; index: number }
type DestructionEntry = { target: DestructionTarget; start: number; finish: number; y: number; matrix: THREE.Matrix4; sound: boolean; started: boolean; hideAfter: boolean }
const plantCounters = [1, 2, 2, 3]
const plantHeights = [0.1, 0.7, 0.5, 0.9]

export class Destruction {
  private readonly _pending = new Map<string, DestructionEntry>()
  private _time = 0
  private _accumulator = 0

  constructor(private readonly _world: World) {
    _world.onDeactivate(() => this._pending.clear())
  }

  public counter = (target: DestructionTarget): number => (target.type === 'plant' ? Plants.getStates()[target.index].counter : (engine.currentSaveGame.buildings ?? defaultBuildingState()).entries[target.index].counter)
  public isAlive = (target: DestructionTarget): boolean => this.counter(target) !== 0
  public isIntact = (target: DestructionTarget): boolean => this.counter(target) < 0

  public object = (target: DestructionTarget): THREE.Object3D | null => {
    if (target.type === 'plant') {
      return Plants.getPlacement(this._world, target.index)?.group ?? null
    }
    const state = engine.currentSaveGame.buildings ?? defaultBuildingState()
    const name = target.index === 12 ? HOUSE_VARIANTS[state.nextVariant] : ISLAND_BUILDINGS[target.index].name
    return this._world.findRoi(name)?.model ?? null
  }

  public position = (target: DestructionTarget): THREE.Vector3 => this.object(target)?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3()

  public height = (target: DestructionTarget): number => {
    if (target.type === 'plant') {
      const state = Plants.getStates()[target.index]
      return damagedHeight(Plants.plants[target.index].locationAndDirection.location[1], state.counter, plantCounters[state.variant], plantHeights[state.variant])
    }
    const info = ISLAND_BUILDINGS[target.index]
    return damagedHeight(info.y, this.counter(target), info.downshift, target.index === 0 ? 0 : 1)
  }

  private adjust = (target: DestructionTarget): boolean => {
    if (!this.isAlive(target)) {
      return false
    }
    if (target.type === 'plant') {
      const states = Plants.getStates()
      const state = states[target.index]
      state.counter = damagedCounter(state.counter, plantCounters[state.variant], 1)
      engine.currentSaveGame.plants = states
    } else {
      const state = engine.currentSaveGame.buildings ?? defaultBuildingState()
      state.entries[target.index].counter = damagedCounter(state.entries[target.index].counter, ISLAND_BUILDINGS[target.index].downshift, 2)
      engine.currentSaveGame.buildings = state
    }
    return true
  }

  public decrement = (target: DestructionTarget): boolean => {
    const changed = this.adjust(target)
    if (changed) {
      this.apply(target)
    }
    return changed
  }

  private apply = (target: DestructionTarget): void => {
    const object = this.object(target)
    if (object == null) {
      return
    }
    if (target.type === 'plant') {
      const pose = Plants.plants[target.index].locationAndDirection
      object.scale.set(1, 1, 1)
      object.matrixAutoUpdate = true
      object.position.set(...pose.location)
      object.updateMatrix()
    }
    object.position.y = this.height(target)
    object.visible = this.isAlive(target)
    object.updateMatrix()
  }

  public resolveBuildings = (): { index: number; boundary: Boundary; position: THREE.Vector3 }[] =>
    ISLAND_BUILDINGS.flatMap((info, index) => {
      const boundary = this._world.boundaryManager.getBoundary(info.boundary)
      const position = new THREE.Vector3(...info.shot)
      if (boundary == null || this.object({ type: 'building', index }) == null || !boundary.isInside(position)) {
        return []
      }
      if (Math.abs(boundary.up.y) > 0.0001) {
        position.y = -(boundary.up.x * position.x + boundary.up.z * position.z + boundary.up.w) / boundary.up.y
      }
      return [{ index, boundary, position }]
    })

  public applyToWorld = (): void => {
    for (let n = 0; n < ISLAND_BUILDINGS.length; ++n) {
      this.apply({ type: 'building', index: n })
    }
    for (let n = 0; n < Plants.plants.length; ++n) {
      this.apply({ type: 'plant', index: n })
    }
  }

  public schedule = (target: DestructionTarget, delay = 800, withSound = true, hideAfter = false): void => {
    const object = this.object(target)
    const key = `${target.type}:${target.index}`
    if (object == null || this._pending.has(key) || !this.adjust(target)) {
      return
    }
    object.updateMatrix()
    this._pending.set(key, { target, start: this._time + delay, finish: this._time + delay + 1000, y: object.position.y, matrix: object.matrix.clone(), sound: withSound, started: false, hideAfter })
  }

  public update = (delta: number): void => {
    this._accumulator += delta * 1000
    while (this._accumulator >= 50) {
      this._accumulator -= 50
      this._time += 50
      for (const [key, entry] of this._pending) {
        const object = this.object(entry.target)
        if (object == null) {
          this._pending.delete(key)
          continue
        }
        if (this._time < entry.start) {
          continue
        }
        if (this._time > entry.finish) {
          if (entry.target.type === 'plant') {
            object.matrixAutoUpdate = true
            entry.matrix.decompose(object.position, object.quaternion, object.scale)
          }
          this.apply(entry.target)
          if (entry.hideAfter && entry.target.type === 'building') {
            object.visible = false
            const state = engine.currentSaveGame.buildings ?? defaultBuildingState()
            state.entries[entry.target.index].counter = 0
            engine.currentSaveGame.buildings = state
          }
          this._pending.delete(key)
          continue
        }
        if (!entry.started) {
          entry.started = true
          if (entry.target.type === 'building' && entry.sound && this._world.soundCache.has('bcrash')) {
            this._world.soundCache.play('bcrash', object)
          }
        }
        const remaining = entry.finish - this._time
        if (entry.target.type === 'building') {
          entry.y -= 0.05
          object.position.y = Math.sin(remaining * 10 * 0.0062832) * 0.4 + entry.y
        } else {
          const matrix = object.matrix.clone()
          const translation = new THREE.Vector3().setFromMatrixPosition(matrix)
          matrix.setPosition(0, 0, 0)
          matrix.elements[4] = -Math.sin(remaining * 2 * 0.0062832) * 0.2
          matrix.elements[6] = Math.sin(remaining * 4 * 0.0062832) * 0.2
          matrix.premultiply(new THREE.Matrix4().makeScale(1.03, 0.95, 1.03)).setPosition(translation)
          object.matrix.copy(matrix)
          object.matrixAutoUpdate = false
        }
      }
    }
  }
}
