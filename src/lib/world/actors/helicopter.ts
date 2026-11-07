import { engine } from '../../engine'
import { helicopterState } from '../../session-state.ts'
import { Vehicle } from './vehicle'

export class Helicopter extends Vehicle {
  protected override explanationAnimation = null
  protected override explanationAnimationOffset = null
  public override type = 'helicopter' as const
  protected override dashboard = { type: 'helicopter' } as const

  public override async enter(transition = true): Promise<void> {
    const placement = this._isle.boundaryManager.getObjectPlacementFromLocation('helicopterLanded')
    this.roi.moveRoiTo(placement.position, placement.quaternion)
    helicopterState.status = 0
    this._isle.allowExtras = false
    await super.enter(transition)
  }

  public override exit(): void {
    if (this._isle.currentVehicle !== this) {
      return
    }
    this._isle.setFlightMode(false)
    super.exit()
    const placement = this._isle.boundaryManager.getObjectPlacementFromLocation('helicopterSpawn')
    this.roi.moveRoiTo(placement.position, placement.quaternion)
    engine.currentSaveGame.setVehiclePlacement(this.type, placement)
    const player = this._isle.boundaryManager.getObjectPlacementFromLocation('helicopterExited')
    this._isle.camera.position.copy(player.position).addScaledVector(player.boundary.normal, 1.25)
    this._isle.camera.quaternion.copy(player.quaternion)
    helicopterState.status = 0
    this._isle.allowExtras = true
  }
}
