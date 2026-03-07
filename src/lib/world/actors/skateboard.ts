import * as THREE from 'three'
import { sns008in_RunAnim } from '../../../actions/isle'
import { Vehicle } from './vehicle'

export class Skateboard extends Vehicle {
  public override type = 'skate' as const
  protected override explanationAnimation = sns008in_RunAnim
  protected override explanationAnimationOffset = new THREE.Vector3(2.5, 0.2, 2.5)

  private _showPizza = false

  public get dashboard(): { type: 'skate'; showPizza: boolean } {
    return { type: 'skate', showPizza: this._showPizza }
  }

  public set showPizza(show: boolean) {
    this._showPizza = show
    if (this._isle.currentVehicle === this) {
      this._isle.dashboard.show({ type: 'skate', showPizza: show })
    }
  }
}
