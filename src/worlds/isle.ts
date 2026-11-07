import * as THREE from 'three'
import { _Isle } from '../actions/isle'
import { act1State } from '../lib/act1-state'
import { getModel } from '../lib/assets/model'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import { radio } from '../lib/radio'
import type { Actor } from '../lib/world/actor'
import type { VehicleType } from '../lib/world/dashboard'
import type { WorldName } from '../lib/world/world'
import { CAR_BUILD_VEHICLES, IsleBase } from './isle-base'

export class Isle extends IsleBase {
  protected _buildMeshes = new Map<VehicleType, Actor>()

  constructor(worldName: WorldName, ignoreEntityClick: boolean) {
    super(worldName, { wdbWorldName: 'ACT1', dtaWorldName: 'ACT1', ignoreEntityClick })
  }

  public override escape(): boolean {
    radio.stop()
    engine.stopBackgroundMusic()
    this.abortMission()
    this.toggleManagedAnimations(false)
    this.stopAnimationsInRange('isle', 500, 999)
    this.currentVehicle?.exit()
    act1State.value = 'none'
    return true
  }

  public override async init(): Promise<void> {
    await super.init()

    await this.handleStartUpAction(_Isle)

    const isle = this.worldGroup.children.find(object => ['isle_hi', 'isle', 'isle_lo'].includes(object.name) && object.visible)
    if (isle == null || !(isle instanceof THREE.Object3D)) {
      throw new Error('Isle mesh not found')
    }
    this._isleMesh = isle
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    await super.activate(composer, _param)

    for (const { type, model, spawn, createActor } of CAR_BUILD_VEHICLES) {
      const previousActor = this._buildMeshes.get(type)
      if (previousActor != null) {
        this.removeFromParents(previousActor.roi.getAllModels())
        this.removeActor(previousActor)
      }
      const placement = (() => {
        const saved = engine.currentSaveGame.getVehiclePlacement(type)
        if (engine.resetVehicleRespawn(type) || (saved == null && engine.currentSaveGame.getBuildState(type).finishedBuild)) {
          return this.boundaryManager.getObjectPlacementFromLocation(spawn)
        }
        return saved
      })()
      if (placement != null) {
        const rootRoi = await getModel(model)
        const allRois = rootRoi.getAllModels()
        for (const roi of allRois) {
          this.scene.add(roi)
        }
        const actor = await createActor(rootRoi, this)
        await this.registerActor(actor)
        this._buildMeshes.set(type, actor)
        rootRoi.moveRoiTo(placement.position, placement.quaternion)
        engine.currentSaveGame.setVehiclePlacement(type, placement)
      }
    }

    this._bikeRoi = this.findRoi('bike')
    this._motobkRoi = this.findRoi('motobk')
    this._skateRoi = this.findRoi('skate')
    this._ambulanceRoi = this.findRoi('ambul')
    this._towtruckRoi = this.findRoi('towtk')

    if (this._bikeRoi != null) {
      this.placeVehicle('bike', 'INT44', 2, 0.5, 0, 0.5)
    }
    if (this._motobkRoi != null) {
      this.placeVehicle('moto', 'INT43', 4, 0.5, 1, 0.5)
    }
    if (this._skateRoi != null) {
      this.placeVehicle('skate', 'EDG02_84', 4, 0.5, 0, 0.5)
    }
  }
}
