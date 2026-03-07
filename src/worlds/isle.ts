import * as THREE from 'three'
import type { Composer } from '../lib/effect/composer'
import type { WorldName } from '../lib/world/world'
import { IsleBase } from './isle-base'

export class Isle extends IsleBase {
  constructor(worldName: WorldName) {
    super(worldName, { wdbWorldName: 'ACT1', dtaWorldName: 'ACT1' })
  }

  public override async init(): Promise<void> {
    await super.init()

    const isle = this.scene.getObjectByName('isle_hi')
    if (isle == null || !(isle instanceof THREE.Object3D)) {
      throw new Error('Isle mesh not found')
    }
    this._isleMesh = isle
  }

  public override async activate(composer: Composer, _param?: unknown): Promise<void> {
    await super.activate(composer, _param)

    this._bikeRoi = this.findRoi('bike')
    this._motobkRoi = this.findRoi('motobk')
    this._skateRoi = this.findRoi('skate')
    this._ambulanceRoi = this.findRoi('ambul')
    this._towtruckRoi = this.findRoi('towtk')

    const mama = await this.getActor('mama')
    const mamaPlacement = this.boundaryManager.getObjectPlacement('USR00_47', 1, 0.43, 3, 0.84)
    mama.moveRoiTo(mamaPlacement.position, mamaPlacement.quaternion)

    const papa = await this.getActor('papa')
    const papaPlacement = this.boundaryManager.getObjectPlacement('USR00_193', 3, 0.55, 1, 0.4)
    papa.moveRoiTo(papaPlacement.position, papaPlacement.quaternion)

    const brickstr = await this.getActor('brickstr')
    const brickstrPlacement = this.boundaryManager.getObjectPlacement('EDG02_95', 1, 0.5, 3, 0.5)
    brickstr.moveRoiTo(brickstrPlacement.position, brickstrPlacement.quaternion)

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
