import * as THREE from 'three'
import { sns006in_RunAnim } from '../../../actions/isle'
import { FuelVehicle } from './fuel-vehicle'

export class Motocycle extends FuelVehicle {
  public override type = 'moto' as const
  protected override dashboard = { type: 'moto' } as const
  protected override explanationAnimation = sns006in_RunAnim
  protected override explanationAnimationOffset = new THREE.Vector3(2.5, 0.7, 2.5)
  protected override drainsOnlyWhenActive = true
}
