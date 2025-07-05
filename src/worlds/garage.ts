import { Background_Bitmap, wgs023nu_RunAnim } from '../actions/garage'
import { playAnimation } from '../lib/animation'
import { Building } from '../lib/world/building'

export class Garage extends Building {
  public override async init(): Promise<void> {
    await super.init()

    await this.loadWorld('GMAIN', Background_Bitmap)

    await playAnimation(this, wgs023nu_RunAnim)
  }
}
