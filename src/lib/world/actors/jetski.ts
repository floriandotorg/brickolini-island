import * as THREE from 'three'
import { sjs007in_RunAnim } from '../../../actions/isle'
import { Beach_Music } from '../../../actions/jukebox'
import { engine } from '../../engine'
import { Vehicle } from './vehicle'

export class Jetski extends Vehicle {
  protected override explanationAnimation = sjs007in_RunAnim
  protected override explanationAnimationOffset = new THREE.Vector3(2.5, 0.6, 2.5)
  public override type = 'jetski' as const
  protected override dashboard = { type: 'jetski' } as const

  public override get fuel(): number {
    return 0.8
  }

  public override async enter(transition = true): Promise<void> {
    this._isle.allowExtras = false
    await super.enter(transition)
  }

  public override exit(): void {
    if (this._isle.currentVehicle !== this) {
      return
    }
    super.exit()
    const placement = this._isle.boundaryManager.getObjectPlacementFromLocation('jetskiSpawn')
    this.roi.moveRoiTo(placement.position, placement.quaternion)
    engine.currentSaveGame.setVehiclePlacement(this.type, placement)
    const player = this._isle.boundaryManager.getObjectPlacementFromLocation('jetraceExterior')
    this._isle.camera.position.copy(player.position).addScaledVector(player.boundary.normal, 1.25)
    this._isle.camera.quaternion.copy(player.quaternion)
    this._isle.allowExtras = true
    void engine.switchBackgroundMusic(Beach_Music)
  }
}
