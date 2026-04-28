import * as THREE from 'three'
import { _Isle } from '../actions/isle'
import { getModel } from '../lib/assets/model'
import type { Composer } from '../lib/effect/composer'
import { engine } from '../lib/engine'
import type { Actor } from '../lib/world/actor'
import { PathActor } from '../lib/world/actors/path-actor'
import { CHARACTER_CYCLES } from '../lib/world/character'
import type { VehicleType } from '../lib/world/dashboard'
import type { WorldName } from '../lib/world/world'
import { CAR_BUILD_VEHICLES, IsleBase } from './isle-base'

export class Isle extends IsleBase {
  private _buildMeshes = new Map<VehicleType, Actor>()

  constructor(worldName: WorldName, ignoreEntityClick: boolean) {
    super(worldName, { wdbWorldName: 'ACT1', dtaWorldName: 'ACT1', ignoreEntityClick })
  }

  public override async init(): Promise<void> {
    await super.init()

    await this.handleStartUpAction(_Isle)

    const isle = this.scene.getObjectByName('isle_hi')
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
        if (engine.resetVehicleRespawn(type)) {
          return this.boundaryManager.getObjectPlacementFromLocation(spawn)
        }
        return engine.currentSaveGame.getVehiclePlacement(type)
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

    if (engine.currentSaveGame.playerUnsafe !== 'mama') {
      const mama = await this.getCharacter('mama')
      const mamaPlacement = this.boundaryManager.getObjectPlacement('USR00_47', 1, 0.43, 3, 0.84)
      mama.moveRoiTo(mamaPlacement.position, mamaPlacement.quaternion)
      const mamaActor = new PathActor(mama, this)
      const mamaCycle1 = CHARACTER_CYCLES.mama[Math.floor(Math.random() * 3)]
      if (mamaCycle1 == null) {
        throw new Error('Mama cycle 1 is null')
      }
      void mamaActor.addAnimationAction(4, mamaCycle1)
      const mamaCycle2 = CHARACTER_CYCLES.mama[Math.floor(Math.random() * 3) + 13]
      if (mamaCycle2 == null) {
        throw new Error('Mama cycle 2 is null')
      }
      void mamaActor.addAnimationAction(0, mamaCycle2)
      mamaActor.speed = 0.9
      this.registerActor(mamaActor)
    }

    if (engine.currentSaveGame.playerUnsafe !== 'papa') {
      const papa = await this.getCharacter('papa')
      const papaPlacement = this.boundaryManager.getObjectPlacement('USR00_193', 3, 0.55, 1, 0.4)
      papa.moveRoiTo(papaPlacement.position, papaPlacement.quaternion)
      const papaActor = new PathActor(papa, this)
      const papaCycle1 = CHARACTER_CYCLES.papa[Math.floor(Math.random() * 3)]
      if (papaCycle1 == null) {
        throw new Error('Papa cycle 1 is null')
      }
      void papaActor.addAnimationAction(4, papaCycle1)
      const papaCycle2 = CHARACTER_CYCLES.papa[Math.floor(Math.random() * 3) + 13]
      if (papaCycle2 == null) {
        throw new Error('Papa cycle 2 is null')
      }
      void papaActor.addAnimationAction(0, papaCycle2)
      papaActor.speed = 0.9
      this.registerActor(papaActor)
    }

    const brickstr = await this.getCharacter('brickstr')
    const brickstrPlacement = this.boundaryManager.getObjectPlacement('EDG02_95', 1, 0.5, 3, 0.5)
    brickstr.moveRoiTo(brickstrPlacement.position, brickstrPlacement.quaternion)
    const brickstrActor = new PathActor(brickstr, this)
    void brickstrActor.addAnimationAction(4, CHARACTER_CYCLES.brickstr[Math.floor(Math.random() * 3)])
    void brickstrActor.addAnimationAction(0, CHARACTER_CYCLES.brickstr[Math.floor(Math.random() * 3) + 14])
    brickstrActor.speed = 0.5
    this.registerActor(brickstrActor)

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
