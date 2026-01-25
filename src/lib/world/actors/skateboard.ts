import * as THREE from 'three'
import { sns008in_RunAnim } from '../../../actions/isle'
import { Vehicle } from './vehicle'

export class Skateboard extends Vehicle {
  public override type = 'skate' as const
  protected override dashboard = { type: 'skate', showPizza: false } as const
  protected override explanationAnimation = sns008in_RunAnim
  protected override explanationAnimationOffset = new THREE.Vector3(2.5, 0.2, 2.5)
}
