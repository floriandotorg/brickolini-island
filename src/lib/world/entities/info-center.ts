import { switchWorld } from '../../switch-world'
import { EnterableBuilding } from './enterable-building'

export class InfoCenter extends EnterableBuilding {
  protected override world = { ending: null } as const

  override async onClick(): Promise<boolean> {
    this._isle.abortMission()
    this._isle.toggleManagedAnimations(false)
    this._isle.currentVehicle?.exit()
    void switchWorld(this.world)
    return true
  }
}
