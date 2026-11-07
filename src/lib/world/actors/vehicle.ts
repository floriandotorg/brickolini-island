import * as THREE from 'three'
import { BikeHorn_Sound, DuneCarHorn_Sound } from '../../../actions/isle'
import { BeachBlvd_Music, GarageArea_Music, InformationCenter_Music, Jail_Music, JetskiRace_Music, PoliceStation_Music } from '../../../actions/jukebox'
import { act1State } from '../../act1-state'
import type { AudioAction, RunAnimationAction } from '../../action-types'
import { engine } from '../../engine'
import { vehicleReturn } from '../../session-state.ts'
import { switchWorld } from '../../switch-world'
import { Actor } from '../actor'
import type { Vehicle as DashboardVehicle, VehicleType } from '../dashboard'

export abstract class Vehicle extends Actor {
  public abstract readonly type: VehicleType
  protected abstract readonly dashboard: DashboardVehicle
  protected abstract readonly explanationAnimation: RunAnimationAction | null
  protected abstract readonly explanationAnimationOffset: THREE.Vector3 | null

  protected hideOnExit = false
  protected persistPlacement = true

  public get fuel(): number {
    return 0
  }

  override async onClick(): Promise<boolean> {
    if (!this._isle.canExit && !(this.type === 'skate' && act1State.value === 'pizza')) {
      return true
    }
    if (this._isle.currentVehicle !== this) {
      await this.enter()
    }
    return true
  }

  public exit(): void {
    if (this._isle.currentVehicle == null || this._isle.currentVehicle !== this) {
      return
    }

    const groundPosition = this._isle.getGroundPosition()
    if (this.persistPlacement) {
      engine.currentSaveGame.setVehiclePlacement(this.type, { position: groundPosition, quaternion: this._isle.camera.quaternion })
    } else {
      engine.currentSaveGame.clearVehiclePlacement(this.type)
    }
    this.roi.moveRoiTo(groundPosition, this._isle.camera.quaternion)
    this.roi.visible = !this.hideOnExit

    const boundary = this._isle.boundaryManager.getBoundaryFromPosition(this._isle.camera.position)
    const radius = this.roi.model.getWorldBoundingSphere().radius
    const beside = boundary?.edges.map(edge => groundPosition.clone().addScaledVector(edge.getFaceNormal(boundary), radius)).find(position => boundary.isInside(position)) ?? groundPosition
    this._isle.camera.position.copy(beside).addScaledVector(boundary?.normal ?? new THREE.Vector3(0, 1, 0), 1.25)

    this._isle.dashboard.clear()
    this._isle.currentVehicle = null

    const pizzeria = this.type === 'skate' ? this._isle.findRoi('pizza')?.actor : null
    if (pizzeria != null && 'abort' in pizzeria && typeof pizzeria.abort === 'function') {
      pizzeria.abort()
    }
  }

  public info(): void {
    const type = this.type === 'towtk' || this.type === 'ambul' ? null : this.type
    this.exit()
    this._isle.abortMission()
    vehicleReturn.type = type
    void switchWorld({ ending: null })
  }

  public async enter(transition = true): Promise<void> {
    this._isle.toggleManagedAnimations(false)
    if (transition) {
      await engine.transition({ keepMusic: true })
    }

    if (this._isle.currentVehicle != null && this._isle.currentVehicle !== this) {
      this._isle.currentVehicle.exit()
    }
    this._isle.currentVehicle = this
    if (['bike', 'moto', 'skate', 'dunecar'].includes(this.type)) {
      await this._isle.extras.placeBrickster(this.roi.position)
      await this._isle.extras.placeMamaAndPapa(this.roi.position)
    } else if (this.type === 'helicopter' || this.type === 'jetski') {
      await this._isle.extras.placeBrickster()
    }

    this.roi.visible = false

    this._isle.camera.position.set(this.roi.model.position.x, this.roi.model.position.y, this.roi.model.position.z)
    this._isle.camera.quaternion.copy(this.roi.model.quaternion)
    this._isle.placeOnGround(this._isle.camera)

    await this._isle.dashboard.show(this.dashboard)
    engine.finishTransition()
    const music: Partial<Record<VehicleType, AudioAction>> = { bike: InformationCenter_Music, moto: PoliceStation_Music, skate: BeachBlvd_Music, dunecar: GarageArea_Music, jetski: JetskiRace_Music, helicopter: Jail_Music }
    if (music[this.type] != null && !(this.type === 'skate' && act1State.value === 'pizza')) {
      const action = music[this.type]
      if (action != null) {
        void engine.switchBackgroundMusic(action)
      }
    }
    const horn = this.type === 'bike' ? BikeHorn_Sound : this.type === 'dunecar' ? DuneCarHorn_Sound : null
    if (horn != null) {
      this._isle.dashboard.onHornToggle = on => {
        if (on) {
          void engine.playAudio(horn, 'effects')
        }
      }
    }

    if (act1State.value !== 'pizza' && this.explanationAnimation != null && this.explanationAnimationOffset != null && !engine.currentSaveGame.playedExitExplanation) {
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
