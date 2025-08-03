import { Effect } from './composer'
import filmGrainFrag from './shader/film-grain.glsl'

export class FilmGrainEffect extends Effect {
  public get fragmentShader() {
    return filmGrainFrag
  }
}
