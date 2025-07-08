import { _StartUp, wgs023nu_RunAnim } from '../actions/garage'
import { playAnimation } from '../lib/animation'
import { Building } from '../lib/world/building'

export class Garage extends Building {
  public override async init(): Promise<void> {
    await super.init()

    void playAnimation(this, wgs023nu_RunAnim)
  }

  protected getBuildingConfig() {
    return {
      startUpAction: _StartUp,
    }
  }
}
