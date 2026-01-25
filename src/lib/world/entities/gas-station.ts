import { EnterableBuilding } from './enterable-building'

export class GasStation extends EnterableBuilding {
  protected override world = { name: 'garage' } as const
}
