import type * as THREE from 'three'
import { PoliceStation_Music } from '../actions/jukebox'
import { _StartUp, nps002la_RunAnim, nps001ni_RunAnim } from '../actions/police'
import { Building } from '../lib/world/building'
import { World } from '../lib/world/world'
import { engine } from '../lib/engine'

export class Police extends World {
  private _building = new Building()
  private _numVisits = 0

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _StartUp,
      backgroundMusic: PoliceStation_Music,
    })
  }

  public override activate(): void {
    if (engine.currentPlayerCharacter === 'nick') {
      void this.playAnimation(nps002la_RunAnim)
    } else if (engine.currentPlayerCharacter === 'laura') {
      void this.playAnimation(nps001ni_RunAnim)
    } else {
      if (this._numVisits % 2 === 0) {
        void this.playAnimation(nps002la_RunAnim)
      } else {
        void this.playAnimation(nps001ni_RunAnim)
      }
    }

    ++this._numVisits
  }

  public override render(renderer: THREE.WebGLRenderer): void {
    this._building.render(renderer)
    super.render(renderer)
  }

  public override pointerDown(_event: MouseEvent, normalizedX: number, normalizedY: number): void {
    this._building.pointerDown(normalizedX, normalizedY)
  }
}
