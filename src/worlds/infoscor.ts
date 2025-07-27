import { _StartUp } from '../actions/infoscor'
import { InformationCenter_Music } from '../actions/jukebox'
import { switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'

export class InfoScor extends Building {
  public override async init(): Promise<void> {
    await super.init()
  }

  protected getBuildingConfig() {
    return {
      startUpAction: _StartUp,
      backgroundMusic: InformationCenter_Music,
    }
  }

  protected override buttonClicked(buttonName: string): void {
    switch (buttonName) {
      case 'LeftArrow_Ctl':
        void switchWorld('infomain')
        break
      case 'RightArrow_Ctl':
        void switchWorld('infodoor')
        break
    }
  }
}
