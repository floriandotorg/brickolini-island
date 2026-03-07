import { EnterableBuilding } from './enterable-building'

export class Police extends EnterableBuilding {
  protected override world = { world: 'police' } as const
}
