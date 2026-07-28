import * as THREE from 'three'
import { sns005in_RunAnim } from '../../../actions/isle'
import { FuelVehicle } from './fuel-vehicle'

export class DuneBugy extends FuelVehicle {
  protected override explanationAnimation = sns005in_RunAnim
  protected override explanationAnimationOffset = new THREE.Vector3(2.5, 0.7, 2.5)
  public override type = 'dunecar' as const
  protected override dashboard = { type: 'dunecar' } as const
  protected override drainsOnlyWhenActive = false
}
