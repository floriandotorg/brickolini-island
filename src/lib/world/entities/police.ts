import { EnterableBuilding } from './enterable-building'

export class Police extends EnterableBuilding {
  protected override world = { name: 'police' } as const
}
