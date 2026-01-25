import * as THREE from 'three'
import { sns006in_RunAnim } from '../../../actions/isle'
import { Vehicle } from './vehicle'

export class Bike extends Vehicle {
  public override type = 'bike' as const
  protected override dashboard = { type: 'bike' } as const
  protected override explanationAnimation = sns006in_RunAnim
  protected override explanationAnimationOffset = new THREE.Vector3(2.5, 0.7, 2.5)
}
