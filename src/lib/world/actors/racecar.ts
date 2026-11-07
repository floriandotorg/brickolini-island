import { switchWorld } from '../../switch-world'
import { Actor } from '../actor'

export class RaceCar extends Actor {
  public override async onClick(): Promise<boolean> {
    if (!this._isle.canExit) {
      return false
    }
    this._isle.currentVehicle?.exit()
    void switchWorld({ world: 'carrace' })
    return true
  }
}
