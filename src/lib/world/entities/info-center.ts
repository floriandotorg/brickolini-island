import { EnterableBuilding } from './enterable-building'

export class InfoCenter extends EnterableBuilding {
  protected override world = { ending: null } as const
}
