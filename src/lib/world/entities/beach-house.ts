import { EnterableBuilding } from './enterable-building'

export class BeachHouseEntity extends EnterableBuilding {
  protected override world = { world: 'jetski' } as const
}
