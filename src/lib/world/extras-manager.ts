import * as THREE from 'three'
import type { IsleBase } from '../../worlds/isle-base'
import type { Boundary } from '../assets/boundary'
import { engine } from '../engine'
import { allowedExtraLifetime, extraCycleIndices, initialExtraLocations, nextExtraPopulation } from '../extras-policy'
import { locations } from '../locations'
import { getSettings } from '../settings'
import { ExtraActor } from './actors/extra-actor'
import { CHARACTER_CYCLES, type CharacterName } from './character'
import { extraCharacters, extraVehicles } from './extras-data'

type ExtraSlot = { actor: ExtraActor; characterId: number; startTime: number; waiting: boolean; speed: number; riding: boolean; duration: number; lifetime: number }
const cycleRows = Object.values(CHARACTER_CYCLES)

export class ExtrasManager {
  public readonly slots: (ExtraSlot | null)[] = Array.from({ length: 40 }, () => null)
  public numAllowedExtras = 5
  public lastActionTime = 0
  private _enabled = new Set<CharacterName>(extraCharacters.map(character => character.name))
  private _time = 0
  private _maintenance = 0
  private _spawn = 0
  private _spawnInterval = 5
  private _smoothed = 0.1
  private _selector = 0
  private _adding = false
  private _initialized = false
  private _suspended = false

  constructor(private readonly _world: IsleBase) {}

  public enableCharacters(names: readonly CharacterName[]): void {
    this._enabled = new Set(names)
  }

  public async initialize(): Promise<void> {
    this._suspended = false
    if (this._initialized || !this._world.allowExtras || this._world.name !== 'act1') {
      return
    }
    this._initialized = true
    for (const location of initialExtraLocations()) {
      await this.addExtra(location, true)
    }
  }

  public suspend(): void {
    this._suspended = true
    for (let n = 0; n < this.slots.length; ++n) {
      this._remove(n)
    }
    this._initialized = false
    this.numAllowedExtras = 5
  }

  public resume(): void {
    this._suspended = false
    this._spawn = this._maintenance = this.lastActionTime = this._time
    this._spawnInterval = 5
  }

  private _setVehicleVisible(slot: ExtraSlot, visible: boolean): void {
    const vehicle = extraCharacters[slot.characterId].vehicleId
    if (vehicle != null && slot.riding) {
      const roi = this._world.findRoi(vehicle)
      if (roi != null) {
        roi.visible = visible
      }
    }
  }

  public tick(delta: number): void {
    if (this._suspended || !['act1', 'act2'].includes(this._world.name)) {
      return
    }
    this._time += delta
    if (this._time - this._maintenance > 1) {
      this._maintenance = this._time
      for (const slot of this.slots) {
        if (slot == null || slot.actor.borrowed) {
          continue
        }
        if (slot.waiting && slot.duration >= 0 && (this._time - slot.startTime) * 1000 > slot.duration) {
          slot.waiting = false
          slot.actor.speed = slot.speed < 0 ? Math.random() * (slot.riding ? 1.5 : 1.4) + (slot.riding ? 0.9 : 0.6) : slot.speed
        }
        this._setVehicleVisible(slot, !slot.actor.boundary?.hidden)
      }
    }
    if (this._time - this._spawn < this._spawnInterval) {
      return
    }
    this._spawn = this._time
    this._spawnInterval = 5 + Math.random() * 10
    this.purge(false)
    if (this._time - this.lastActionTime > 10) {
      void this.addExtra()
    }
    const population = nextExtraPopulation(this.numAllowedExtras, getSettings().islandQuality === 'high' ? 20 : 10, this._smoothed, delta)
    this.numAllowedExtras = population.count
    this._smoothed = population.smoothed
  }

  public purge(force: boolean): void {
    for (let n = 0; n < this.slots.length; ++n) {
      const slot = this.slots[n]
      if (slot == null || slot.actor.borrowed || (force && ['mama', 'papa'].includes(slot.actor.roi.name))) {
        continue
      }
      if (force || (slot.lifetime >= 0 && (this._time - slot.startTime) * 1000 > allowedExtraLifetime(this.numAllowedExtras) && this._world.characterRefCount(slot.actor.roi.name) === 1 && !this._world.isBoxInFrustum(slot.actor.roi.model.getWorldBoundingBox()))) {
        this._remove(n)
      }
    }
  }

  private _remove(index: number): void {
    const slot = this.slots[index]
    if (slot == null) {
      return
    }
    this._world.removeActor(slot.actor)
    this._setVehicleVisible(slot, false)
    this._world.releaseActor(slot.actor.roi.name)
    this.slots[index] = null
  }

  private _offscreenPlacement(mode: number, bothEdgesHidden: boolean): { boundary: Boundary; src: number; srcScale: number; dest: number; destScale: number } | null {
    const start = this._world.boundaryManager.getBoundaryFromPosition(this._world.camera.position)
    if (start == null) {
      return null
    }
    const forward = this._world.camera.getWorldDirection(new THREE.Vector3())
    const best = start.edges.reduce((best, edge) => (edge.getFaceNormal(start).dot(forward) > best.getFaceNormal(start).dot(forward) ? edge : best))
    let boundary = start
    let previous = best
    let candidate = best.getCCWEdge(boundary)
    while (!candidate.isTraversable() && candidate !== best) {
      candidate = candidate.getCCWEdge(boundary)
    }
    if (candidate === best) {
      return null
    }
    const scale = 0.25 + Math.random() * 0.5
    const clockwise = mode === 1
    for (let n = 0; n < 12; ++n) {
      const position = candidate.getCWVertex(boundary).clone().lerp(candidate.getCCWVertex(boundary), scale)
      if (
        candidate.isTraversableIntoFaceWithMask(boundary, 1) &&
        !this._world.isBoxInFrustum(new THREE.Box3().setFromCenterAndSize(position, new THREE.Vector3(2, 2, 2))) &&
        (!bothEdgesHidden || !this._world.isBoxInFrustum(new THREE.Box3().setFromCenterAndSize(previous.getCWVertex(boundary).clone().lerp(previous.getCCWVertex(boundary), scale), new THREE.Vector3(2, 2, 2))))
      ) {
        return { boundary, src: boundary.edges.indexOf(candidate), srcScale: scale, dest: boundary.edges.indexOf(previous), destScale: scale }
      }
      const neighbor: Boundary | undefined = candidate.faceA === boundary ? candidate.faceB : candidate.faceA
      if (neighbor == null) {
        return null
      }
      previous = candidate
      boundary = neighbor
      candidate = clockwise ? candidate.getCWEdge(boundary) : candidate.getCCWEdge(boundary)
      while (!candidate.isTraversable() && candidate !== previous) {
        candidate = clockwise ? candidate.getCWEdge(boundary) : candidate.getCCWEdge(boundary)
      }
      if (candidate === previous) {
        return null
      }
    }
    return null
  }

  public async addExtra(location = -1, force = false): Promise<void> {
    if (this._adding || this._suspended || (!force && (!this._world.allowExtras || this._world.ambient.running || Math.abs(this._world.navigationSpeed) > 20))) {
      return
    }
    const index = this.slots.findIndex((slot, n) => slot == null && n < this.numAllowedExtras)
    if (index < 0) {
      return
    }
    this.purge(false)
    const mode = Math.random() < 0.5 ? 1 : 2
    let placement = location < 0 ? this._offscreenPlacement(mode, this._selector % 4 === 1) : null
    if (location >= 0) {
      const loc = locations[location]
      placement = null
      for (const source of loc == null ? [] : [loc.boundaryA, loc.boundaryB]) {
        const boundary = source.name == null ? null : this._world.boundaryManager.getBoundary(source.name)
        if (boundary == null) {
          continue
        }
        const position = boundary.getActorPlacement(source.src, source.srcScale, source.dest, source.destScale).matrix
        const box = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3().setFromMatrixPosition(position), new THREE.Vector3(2, 2, 2))
        if (source.unk0x10 || !this._world.isBoxInFrustum(box)) {
          placement = { boundary, src: source.src, srcScale: source.srcScale, dest: source.dest, destScale: source.destScale }
          break
        }
      }
    }
    if (placement == null) {
      return
    }
    const anim = engine.currentSaveGame.anim
    const wantActive = (location < 0 && this._selector % 4 >= 2) || Math.random() < 0.5
    for (let n = 0; n < extraCharacters.length; ++n) {
      const id = (anim.extraCharacterId + n + 1) % extraCharacters.length
      const character = extraCharacters[id]
      const active = this._world.animationInfos.some(info => info.location === -1 && info.modelInfo.some(model => model.name.slice(0, 2).toLowerCase() === character.name.slice(0, 2)))
      if (active !== wantActive || !character.canSpawnAsExtra || !this._enabled.has(character.name) || character.name === engine.currentCharacterName || this._world.characterExists(character.name)) {
        continue
      }
      this._adding = true
      try {
        if (this._selector % 4 === 1) {
          placement = { ...placement, src: placement.dest, srcScale: placement.destScale, dest: placement.src, destScale: placement.srcScale }
        }
        await this._place(index, id, placement, false, -1, this._selector % 4 === 0 ? (mode === 1 ? 2 : 1) : mode)
        ++this._selector
        engine.currentSaveGame.anim = { ...anim, extraCharacterId: id }
      } finally {
        this._adding = false
      }
      return
    }
  }

  private async _place(index: number, id: number, placement: { boundary: Boundary; src: number; srcScale: number; dest: number; destScale: number }, scripted: boolean, speed = -1, mode?: number): Promise<void> {
    this._remove(index)
    const character = extraCharacters[id]
    const roi = await this._world.getCharacter(character.name)
    roi.visible = false
    const actor = new ExtraActor(roi, this._world)
    actor.walkingMode = mode ?? (Math.random() < 0.5 ? 1 : 2)
    const data = placement.boundary.getActorPlacement(placement.src, placement.srcScale, placement.dest, placement.destScale)
    const position = new THREE.Vector3()
    const quaternion = new THREE.Quaternion()
    data.matrix.decompose(position, quaternion, new THREE.Vector3())
    roi.moveRoiTo(position, quaternion)
    actor.setCurrentDestination({ boundary: placement.boundary, edge: data.destinationEdge, scale: placement.destScale })
    const vehicle = character.vehicleId == null ? null : this._world.findRoi(character.vehicleId)
    const riding = !scripted && vehicle != null && !this.slots.some(slot => slot?.riding && extraCharacters[slot.characterId].vehicleId === character.vehicleId) && Math.random() * 100 < character.vehicleProbability
    const cycles = cycleRows[character.cycleIndex]
    const mood = engine.currentSaveGame.getCharacterVariant(character.name)?.mood ?? 0
    const [slow, fast, idle] = extraCycleIndices(mood)
    const actions = riding
      ? ([[1.7, cycles[10]]] as const)
      : scripted
        ? ([
            [4, cycles[Math.floor(Math.random() * 3)]],
            [0, cycles[(character.name === 'brickstr' ? 14 : 13) + Math.floor(Math.random() * 3)]],
          ] as const)
        : ([
            [0.7, cycles[slow]],
            [4, cycles[fast]],
            [0, cycles[idle]],
          ] as const)
    for (const [tier, action] of actions) {
      if (action != null) {
        await actor.addAnimationAction(tier, action)
      }
    }
    actor.speed = scripted ? 0 : Math.random() * (riding ? 1.5 : 1.4) + (riding ? 0.9 : 0.6)
    const slot = { actor, characterId: id, startTime: this._time, waiting: scripted, speed, riding, duration: scripted ? -1 : character.duration, lifetime: scripted ? -1 : character.maxLifetime }
    this.slots[index] = slot
    this._world.attachActor(actor)
    roi.visible = !placement.boundary.hidden
    this._setVehicleVisible(slot, true)
  }

  public async placeExtra(name: CharacterName, boundaryName: string, src: number, srcScale: number, dest: number, destScale: number, speed: number): Promise<void> {
    if (name === engine.currentSaveGame.playerUnsafe) {
      return
    }
    const id = extraCharacters.findIndex(character => character.name === name)
    const existing = this.slots.findIndex(slot => slot?.characterId === id)
    const index = existing >= 0 ? existing : this.slots.indexOf(null)
    const boundary = this._world.boundaryManager.getBoundary(boundaryName)
    if (index >= 0 && id >= 0 && boundary != null) {
      await this._place(index, id, { boundary, src, srcScale, dest, destScale }, true, speed)
    }
  }

  public async placeBrickster(position: THREE.Vector3 | null = null): Promise<void> {
    if (position == null || position.distanceToSquared(new THREE.Vector3(-98.875, 0, -46.1564)) < 800) {
      await this.placeExtra('brickstr', 'EDG02_95', 1, 0.5, 3, 0.5, 0.5)
    }
  }

  public async placeMamaAndPapa(position: THREE.Vector3 | null = null): Promise<void> {
    if (position == null || position.distanceToSquared(new THREE.Vector3(21.375, 0, -41.75)) < 1000) {
      await this.placeExtra('mama', 'USR00_47', 1, 0.43, 3, 0.84, 0.7)
      await this.placeExtra('papa', 'USR00_193', 3, 0.55, 1, 0.4, 0.9)
    }
  }

  public setDurationAndLifetime(names: readonly string[], duration: number, lifetime: number): void {
    for (const slot of this.slots) {
      if (slot != null && names.includes(slot.actor.roi.name)) {
        slot.duration = duration
        slot.lifetime = lifetime
        slot.startTime = this._time
      }
    }
  }

  public adoptCharacters(names: readonly string[]): void {
    if (!this._world.allowExtras || this._suspended) {
      return
    }
    for (const name of names) {
      const id = extraCharacters.findIndex(character => character.name === name.toLowerCase())
      if (id < 0 || name === engine.currentSaveGame.playerUnsafe || (name === 'brickstr' && this._world.name !== 'act1') || this.slots.some(slot => slot?.characterId === id)) {
        continue
      }
      const index = this.slots.indexOf(null)
      const roi = this._world.findRoi(name)
      const boundary = roi == null ? null : this._world.boundaryManager.getBoundaryFromPosition(roi.position.clone().add(new THREE.Vector3(0, 1, 0)))
      const edge = boundary?.edges.find(edge => edge.isTraversableFromFace(boundary))
      if (index < 0 || roi == null || !roi.model.visible || boundary == null || edge == null) {
        continue
      }
      void this._world.getCharacter(extraCharacters[id].name)
      const actor = new ExtraActor(roi, this._world)
      actor.setCurrentDestination({ boundary, edge, scale: 0.5 })
      const character = extraCharacters[id]
      const vehicle = character.vehicleId == null ? null : this._world.findRoi(character.vehicleId)
      const riding = vehicle?.model.visible === true && !this.slots.some(slot => slot?.riding && extraCharacters[slot.characterId].vehicleId === character.vehicleId)
      const cycles = cycleRows[character.cycleIndex]
      const indices = extraCycleIndices(engine.currentSaveGame.getCharacterVariant(name)?.mood ?? 0)
      const entries = riding
        ? ([[1.7, cycles[10]]] as const)
        : ([
            [0.7, cycles[indices[0]]],
            [4, cycles[indices[1]]],
            [0, cycles[indices[2]]],
          ] as const)
      for (const [tier, action] of entries) {
        if (action != null) {
          void actor.addAnimationAction(tier, action)
        }
      }
      this.slots[index] = { actor, characterId: id, startTime: this._time, waiting: true, speed: -1, riding, duration: Math.max(0, character.duration), lifetime: Math.max(0, character.maxLifetime) }
      this._world.attachActor(actor)
    }
  }

  public borrowForAnimation(names: readonly string[]): () => void {
    this.lastActionTime = this._time
    const borrowed = this.slots.filter(slot => slot != null && names.some(name => name.toLowerCase() === slot.actor.roi.name))
    for (const slot of borrowed) {
      if (slot != null) {
        slot.actor.roi.captureTransform()
        slot.actor.borrowed = true
      }
    }
    return () => {
      this.lastActionTime = this._time
      for (const slot of borrowed) {
        if (slot == null) {
          continue
        }
        if (slot.duration < 0 || slot.lifetime < 0) {
          slot.actor.roi.restoreTransform()
        } else {
          const boundary = this._world.boundaryManager.getBoundaryFromPosition(slot.actor.roi.position.clone().add(new THREE.Vector3(0, 1, 0)))
          const edge = boundary?.edges.find(edge => edge.isTraversableFromFace(boundary))
          if (boundary != null && edge != null) {
            slot.actor.setCurrentDestination({ boundary, edge, scale: 0.5 })
          }
        }
        slot.actor.borrowed = false
        slot.startTime = this._time
        slot.waiting = true
        slot.actor.speed = 0
        if (!slot.actor.roi.model.visible) {
          this._remove(this.slots.indexOf(slot))
        }
      }
      for (const name of extraVehicles) {
        if (!this.slots.some(slot => slot?.riding && extraCharacters[slot.characterId].vehicleId === name)) {
          const roi = this._world.findRoi(name)
          if (roi != null) {
            roi.visible = false
          }
        }
      }
    }
  }
}
