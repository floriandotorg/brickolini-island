import { Effect } from './composer'
import transparentEdgeBlurFrag from './shader/transparent-edge-blur.glsl'

export class TransparentEdgeBlurEffect extends Effect {
  public get fragmentShader() {
    return transparentEdgeBlurFrag
  }
}
