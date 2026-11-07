import * as THREE from 'three'
import type { IsleBase } from '../../worlds/isle-base'
import { findAnimationRange, proximityBand, selectLocationAnimation } from '../ambient-policy'
import type { Boundary } from '../assets/boundary'
import type { DTA } from '../assets/dta'
import type { Roi3D } from '../assets/model'
import { engine } from '../engine'
import { locations } from '../locations'
import { extraCharacters, extraVehicles } from './extras-data'

export class AmbientManager {
  private readonly _running = new Set<DTA.AnimationInfo>()
  private _pending = false
  private _time = 0
  private _lastAction = 0

  constructor(private readonly _world: IsleBase) {}

  public get running(): boolean {
    return this._pending || this._running.size > 0
  }

  public restore(): void {
    const state = engine.currentSaveGame.anim
    for (let n = 0; n < this._world.animationInfos.length; ++n) {
      const info = this._world.animationInfos[n]
      info.active = this._world.name === 'act1'
      if (this._world.name === 'act1') {
        info.numPlayed = state.playCounts[n] ?? 0
      }
    }
    if (this._world.name === 'act1') {
      for (let n = 0; n < locations.length; ++n) {
        locations[n].animationPlayedAtLocation = state.locationsPlayed[n] ?? false
      }
    }
    this._lastAction = this._time
  }

  public persist(): void {
    if (this._world.name === 'act1') {
      engine.currentSaveGame.anim = { ...engine.currentSaveGame.anim, playCounts: this._world.animationInfos.map(info => Math.min(65535, info.numPlayed)), locationsPlayed: locations.map(location => location.animationPlayedAtLocation) }
    }
  }

  public setActive(names: readonly string[], active = true): void {
    for (const info of this._world.animationInfos) {
      if (names.includes(info.name.toLowerCase())) {
        info.active = active
      }
    }
  }

  public setAllActive(active: boolean): void {
    for (const info of this._world.animationInfos) {
      info.active = active
    }
  }

  public begin(info: DTA.AnimationInfo, localActors = true): () => void {
    this._running.add(info)
    this._lastAction = this._time
    ++info.numPlayed
    this.persist()
    const returnExtras = localActors ? this._world.extras.borrowForAnimation(info.modelInfo.map(model => model.name)) : () => {}
    return () => {
      returnExtras()
      this._running.delete(info)
      this._lastAction = this._time
      this.persist()
    }
  }

  public isBoundaryBusy(boundary: Boundary): boolean {
    return [...this._running].some(info => new THREE.Vector3(...info.position).distanceTo(boundary.unknownVec3) <= info.radius + boundary.unknownFloat)
  }

  public async cameraTrigger(locationIndex: number): Promise<void> {
    if (!this._world.cameraAnimationTriggerEnabled || this.running) {
      return
    }
    const location = locations[locationIndex]
    if (location != null && (location.frequency === 0 || (location.animationPlayedAtLocation && location.frequency < Math.floor(Math.random() * 100)))) {
      return
    }
    const info = selectLocationAnimation(this._world.animationInfos, locationIndex, engine.currentCharacterName, engine.currentPlayerMask)
    if (info == null) {
      return
    }
    if (location != null) {
      location.animationPlayedAtLocation = true
    }
    await this._play(info)
  }

  private _play = async (info: DTA.AnimationInfo, anchor?: Roi3D): Promise<void> => {
    this._pending = true
    try {
      const action = await this._world.getRunAnimation(info.objectId)
      if (action != null) {
        await this._world.playCameraAnimation(action, info, locations[info.location], false, anchor)
      }
    } finally {
      this._pending = false
    }
  }

  public tick(delta: number): void {
    this._time += delta
    if (!this._world.allowExtras || this.running || this._time - this._lastAction <= 10) {
      return
    }
    const band = proximityBand(this._world.navigationSpeed)
    const range = findAnimationRange(this._world.animationInfos, -1)
    if (band == null || range == null) {
      return
    }
    const boundary = this._world.boundaryManager.getBoundaryFromPosition(this._world.camera.position)
    const direction = this._world.camera.getWorldDirection(new THREE.Vector3())
    for (const slot of this._world.extras.slots) {
      if (slot == null || slot.actor.boundary !== boundary || slot.actor.reacting || slot.actor.borrowed || !this._world.isBoxInFrustum(slot.actor.roi.model.getWorldBoundingBox()) || slot.actor.roi.getWorldDirection(new THREE.Vector3()).dot(direction) <= Math.SQRT1_2) {
        continue
      }
      const distance = slot.actor.roi.position.distanceToSquared(this._world.camera.position.clone().add(new THREE.Vector3(0, -1.25, 0)))
      if (distance <= band.min || distance >= band.max) {
        continue
      }
      const name = extraCharacters[slot.characterId].name.slice(0, 2)
      const vehicle = extraCharacters[slot.characterId].vehicleId
      const candidates = this._world.animationInfos
        .slice(...range)
        .filter(
          info =>
            info.active &&
            !info.modelInfo.some(model => model.name.toLowerCase() === engine.currentCharacterName || (model.name.toLowerCase() === 'pep' && engine.currentCharacterName === 'pepper')) &&
            (info.actorMask & engine.currentPlayerMask) !== 0 &&
            info.name.slice(-2).toLowerCase() === name &&
            (vehicle == null || slot.riding === info.modelInfo.some(model => model.canBeIndexed !== 0 && extraVehicles.some(vehicleName => vehicleName === model.name.toLowerCase()) && model.name.toLowerCase() === vehicle)),
        )
      const best = candidates.reduce<DTA.AnimationInfo | null>((best, info) => (best == null || info.numPlayed < best.numPlayed ? info : best), null)
      if (best != null) {
        void this._play(best, slot.actor.roi)
        return
      }
    }
  }
}
