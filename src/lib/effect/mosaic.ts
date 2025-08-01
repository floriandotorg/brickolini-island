import { Effect } from './composer'
import mosaicFrag from './shader/mosaic.glsl'

export class MosaicEffect extends Effect {
  public get fragmentShader() {
    return mosaicFrag
  }

  public set tileSize(value: number) {
    this.material.uniforms.uTileSize.value = value
  }

  public set progress(value: number) {
    this.material.uniforms.uMosaicProgress.value = value
  }

  public get progress(): number {
    return this.material.uniforms.uMosaicProgress.value
  }

  public override get uniforms() {
    return {
      uMosaicProgress: { value: 0.0 },
      uTileSize: { value: 10.0 },
    }
  }
}
