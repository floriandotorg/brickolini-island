import { _StartUp } from '../actions/infodoor'
import { InformationCenter_Music } from '../actions/jukebox'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'

export class InfoDoor extends Building {
  public override async init(): Promise<void> {
    await super.init()
  }

  protected getBuildingConfig() {
    return {
      startUpAction: _StartUp,
      backgroundMusic: InformationCenter_Music,
      exitSpawnPoint: {
        boundaryName: 'INT46',
        source: 0,
        sourceScale: 0.5,
        destination: 2,
        destinationScale: 0.5,
      },
    }
  }

  protected override buttonClicked(buttonName: string): void {
    switch (buttonName) {
      case 'LeftArrow_Ctl':
        void switchWorld('infoscor')
        break
      case 'RightArrow_Ctl':
        void switchWorld('elevbott')
        break
    }
  }
}
