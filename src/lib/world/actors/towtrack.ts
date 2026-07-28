import { FuelVehicle } from './fuel-vehicle'

export class TowTrack extends FuelVehicle {
  public override type = 'towtk' as const
  protected override dashboard = { type: 'towtk' } as const
  protected override explanationAnimation = null
  protected override explanationAnimationOffset = null
  protected override drainsOnlyWhenActive = true
}
