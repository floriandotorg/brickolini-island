import { _StartUp, nps001ni_RunAnim } from '../actions/police'
import { playAnimation } from '../lib/animation'
import { Building } from '../lib/world/building'

export class Police extends Building {
  public override async init(): Promise<void> {
    await super.init()

    void playAnimation(this, nps001ni_RunAnim)
  }

  protected getBuildingConfig() {
    return {
      startUpAction: _StartUp,
    }
  }
}
