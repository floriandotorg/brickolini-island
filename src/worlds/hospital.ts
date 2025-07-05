import { Background_Bitmap, hho006cl_RunAnim } from '../actions/hospital'
import { playAnimation } from '../lib/animation'
import { Building } from '../lib/world/building'

export class Hospital extends Building {
  public override async init(): Promise<void> {
    await super.init()

    await this.loadWorld('HOSP', Background_Bitmap)

    await playAnimation(this, hho006cl_RunAnim)
  }
}
