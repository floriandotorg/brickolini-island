import * as THREE from 'three'
import type { Transition, TransitionType } from '../transition.ts'
import { Effect } from './composer'
import mosaicFrag from './shader/mosaic.glsl'

const types: TransitionType[] = ['mosaic', 'dissolve', 'wipeDown', 'windows', 'none']

export class MosaicEffect extends Effect {
  private _order: THREE.DataTexture | null = null
  private _shifts: THREE.DataTexture | null = null

  public get fragmentShader() {
    return mosaicFrag
  }

  public configure(transition: Transition): void {
    this._order?.dispose()
    this._shifts?.dispose()
    const texture = (values: number[]) => {
      const result = new THREE.DataTexture(new Float32Array(values), values.length, 1, THREE.RedFormat, THREE.FloatType)
      result.needsUpdate = true
      return result
    }
    this._order = texture(transition.order)
    this._shifts = texture(transition.shifts)
    this.material.uniforms.uColumnOrder.value = this._order
    this.material.uniforms.uRowShifts.value = this._shifts
    this.material.uniforms.uTransitionType.value = types.indexOf(transition.type)
    this.ticks = 0
  }

  public set ticks(value: number) {
    this.material.uniforms.uTransitionTicks.value = value
  }

  public override get uniforms() {
    return {
      uTransitionTicks: { value: 0 },
      uTransitionType: { value: 0 },
      uColumnOrder: { value: null },
      uRowShifts: { value: null },
    }
  }
}
