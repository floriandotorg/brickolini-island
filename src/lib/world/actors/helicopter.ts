import { Vehicle } from './vehicle'

export class Helicopter extends Vehicle {
  protected override explanationAnimation = null
  protected override explanationAnimationOffset = null
  public override type = 'helicopter' as const
  protected override dashboard = { type: 'helicopter' } as const
}
