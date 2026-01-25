import { EnterableBuilding } from './enterable-building'

export class InfoCenter extends EnterableBuilding {
  protected override world = { name: 'infomain' } as const
}
