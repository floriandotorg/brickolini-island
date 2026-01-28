import { EnterableBuilding } from './enterable-building'

export class BeachHouseEntity extends EnterableBuilding {
  protected override world = { name: 'jetski' } as const
}
