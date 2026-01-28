import { EnterableBuilding } from './enterable-building'

export class RaceStandsEntity extends EnterableBuilding {
  protected override world = { name: 'racecar' } as const
}
