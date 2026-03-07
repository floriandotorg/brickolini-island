import { EnterableBuilding } from './enterable-building'

export class Hospital extends EnterableBuilding {
  protected override world = { world: 'hospital' } as const
}
