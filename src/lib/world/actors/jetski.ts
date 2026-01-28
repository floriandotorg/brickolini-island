import * as THREE from 'three'
import { sjs007in_RunAnim } from '../../../actions/isle'
import { Vehicle } from './vehicle'

export class Jetski extends Vehicle {
  protected override explanationAnimation = sjs007in_RunAnim
  protected override explanationAnimationOffset = new THREE.Vector3(2.5, 0.6, 2.5)
  public override type = 'jetski' as const
  protected override dashboard = { type: 'jetski' } as const
}
