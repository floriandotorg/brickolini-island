import { Effect } from './composer'
import bilateralFilterFrag from './shader/bilateral-filter.glsl'

export class BilateralFilterEffect extends Effect {
  public get fragmentShader() {
    return bilateralFilterFrag
  }
}
