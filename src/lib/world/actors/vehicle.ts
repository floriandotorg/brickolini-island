import * as THREE from 'three'
import type { RunAnimationAction } from '../../action-types'
import { engine } from '../../engine'
import { Actor } from '../actor'
import type { Vehicle as DashboardVehicle, VehicleType } from '../dashboard'

export abstract class Vehicle extends Actor {
  public abstract readonly type: VehicleType
  protected abstract readonly dashboard: DashboardVehicle
  protected abstract readonly explanationAnimation: RunAnimationAction | null
  protected abstract readonly explanationAnimationOffset: THREE.Vector3 | null

  public get fuel(): number {
    return 0
  }

  override async onClick(): Promise<boolean> {
    if (!this._isle.canExit) {
      return true
    }
    await this.enter()
    return true
  }

  public exit(): void {
    if (this._isle.currentVehicle == null || this._isle.currentVehicle !== this) {
      return
    }

    const groundPosition = this._isle.getGroundPosition()
    engine.currentSaveGame.setVehiclePlacement(this.type, { position: groundPosition, quaternion: this._isle.camera.quaternion })
    this.roi.moveRoiTo(groundPosition, this._isle.camera.quaternion)
    this.roi.visible = true

    this._isle.camera.position.add(new THREE.Vector3(0, 0, -4).applyQuaternion(this._isle.camera.quaternion))
    this._isle.placeOnGround(this._isle.camera)

    this._isle.dashboard.clear()
    this._isle.currentVehicle = null

    const pizzeria = this._isle.getRoi('pizza').actor
    if (pizzeria != null && 'abort' in pizzeria && typeof pizzeria.abort === 'function') {
      pizzeria.abort()
    }
  }

  public async enter(): Promise<void> {
    await engine.transition()

    this._isle.currentVehicle = this

    this.roi.visible = false

    this._isle.camera.position.set(this.roi.model.position.x, this.roi.model.position.y, this.roi.model.position.z)
    this._isle.camera.quaternion.copy(this.roi.model.quaternion)
    this._isle.placeOnGround(this._isle.camera)

    void this._isle.dashboard.show(this.dashboard)

    if (this.explanationAnimation != null && this.explanationAnimationOffset != null && !engine.currentSaveGame.playedExitExplanation) {
      engine.currentSaveGame.playedExitExplanation = true

      const forward = new THREE.Vector3()
      this._isle.camera.getWorldDirection(forward)

      const offset = new THREE.Vector3(forward.x * this.explanationAnimationOffset.x, forward.y + this.explanationAnimationOffset.y - 1.25, forward.z * this.explanationAnimationOffset.z)

      void this._isle.playAnimation(this.explanationAnimation, {
        location: this._isle.camera.position.clone().add(offset),
        rotation: this._isle.camera.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)),
      })
    }
  }
}
