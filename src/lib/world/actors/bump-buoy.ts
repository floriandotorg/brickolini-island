import { act1State } from '../../act1-state'
import { engine } from '../../engine'
import { switchWorld } from '../../switch-world'
import { PathActor } from './path-actor'

export class BumpBuoy extends PathActor {
  public override async onClick(): Promise<boolean> {
    const jetski = this._isle.currentVehicle
    if (jetski?.type !== 'jetski' || !this._isle.canExit) {
      return false
    }
    jetski.exit()
    const placement = this._isle.boundaryManager.getObjectPlacementFromLocation('jetskiSpawn')
    jetski.roi.moveRoiTo(placement.position, placement.quaternion)
    engine.currentSaveGame.setVehiclePlacement('jetski', placement)
    act1State.value = 'transitionToJetski'
    void switchWorld('jetrace')
    return true
  }
}
