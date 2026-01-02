import type * as THREE from 'three'
import { engine } from '../lib/engine'
import { PlayerMovement } from '../lib/world/player-movement'
import { IsleBase } from './isle-base'

export class CarRace extends IsleBase {
  private _playerMovement = new PlayerMovement(
    this.camera,
    this._groundGroup,
    () => this._boundaryManager.walls,
    () => this._isleMesh,
  )

  constructor() {
    super('carrace', 'RACC')
  }

  protected override get debugPositionDirection(): { position: THREE.Vector3; direction: THREE.Vector3; slewMode: boolean } | null {
    return this._playerMovement.getDebugInfo()
  }

  public override keyPressed(key: string): void {
    super.keyPressed(key)

    if (key === 'f' && import.meta.env.DEV) {
      this._playerMovement.toggleSlewMode()
    }

    if (key === 'm') {
      engine.currentSaveGame.nextSunPosition()
      this._updateSun()
    }
  }

  public override update(delta: number): void {
    super.update(delta)

    if (this.isRunningCameraAnimation) {
      return
    }

    const { normalizedSpeed } = this._playerMovement.update(delta, null)
    this._dashboard.update(normalizedSpeed)
  }
}
