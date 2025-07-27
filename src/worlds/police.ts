import { PoliceStation_Music } from '../actions/jukebox'
import { _StartUp, nps001ni_RunAnim } from '../actions/police'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'

export class Police extends World {
  public _building = new Building()

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: PoliceStation_Music,
      exitSpawnPoint: {
        boundaryName: 'EDG02_64',
        source: 2,
        sourceScale: 0.24,
        destination: 0,
        destinationScale: 0.84,
      },
    })

    void this.playAnimation(nps001ni_RunAnim)
  }
}
