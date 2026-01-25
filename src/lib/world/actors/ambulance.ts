import { Vehicle } from './vehicle'

export class Ambulance extends Vehicle {
  public override type = 'ambul' as const
  protected override dashboard = { type: 'ambul' } as const
  protected override explanationAnimation = null
  protected override explanationAnimationOffset = null
}
