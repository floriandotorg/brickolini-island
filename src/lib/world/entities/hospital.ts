import { EnterableBuilding } from './enterable-building'

export class Hospital extends EnterableBuilding {
  protected override world = { name: 'hospital' } as const
}
