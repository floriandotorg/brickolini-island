import * as THREE from 'three'
import { Elev1_2_Ride, Elev1_3_Ride, Elev2_1_Ride, Elev2_3_Ride, Elev3_1_Ride, Elev3_2_Ride, ElevRide as ElevRide_StartUp, Meter3_Bitmap } from '../../actions/isle'
import { Elevator_Music } from '../../actions/jukebox'
import type { AnimationAction, ImageAction, ParallelActionTuple, VideoAction } from '../../lib/action-types'
import { setImageSprite } from '../../lib/assets/canvas-sprite'
import { MovieSprite } from '../../lib/assets/movie-sprite'
import type { Composer } from '../../lib/effect/composer'
import type { NormalizedMouseEvent } from '../../lib/engine'
import { switchWorld } from '../../lib/switch-world'
import { Building } from '../../lib/world/building'
import { IsleBase } from '../isle-base'

// you cannot enter the second floor
export enum ElevatorEntrance {
  First,
  Third,
}

enum Floor {
  First,
  Second,
  Third,
}

export class Elevator extends IsleBase {
  public _building = new Building()
  private _meterSprite = new THREE.Sprite()
  private _floor = Floor.First

  constructor() {
    super('elevride')
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: ElevRide_StartUp,
      backgroundMusic: Elevator_Music,
      exitSpawnPoint: { spawn: 'policeExited' },
    })

    this._building.onButtonClicked = buttonName => {
      switch (buttonName) {
        case 'ElevRide_Info_Ctl':
          this._move(Floor.First)
          return true
        case 'ElevRide_Two_Ctl':
          this._move(Floor.Second)
          return true
        case 'ElevRide_Three_Ctl':
          this._move(Floor.Third)
          return true
      }
      return false
    }

    const infocenter = this.scene.getObjectByName('infocen')
    if (infocenter == null || !(infocenter instanceof THREE.Group)) {
      throw new Error('Infocenter mesh not found')
    }
    infocenter.visible = false

    this._meterSprite.position.z = -0.5
    this._building.scene.add(this._meterSprite)
  }

  private _move(floor: Floor): void {
    switch (this._floor) {
      case Floor.First:
        switch (floor) {
          case Floor.First:
            this._exit()
            break
          case Floor.Second:
            this._playRide(Elev1_2_Ride)
            break
          case Floor.Third:
            this._playRide(Elev1_3_Ride)
            break
        }
        break
      case Floor.Second:
        switch (floor) {
          case Floor.First:
            this._playRide(Elev2_1_Ride)
            break
          case Floor.Second:
            // TODO
            break
          case Floor.Third:
            this._playRide(Elev2_3_Ride)
            break
        }
        break
      case Floor.Third:
        switch (floor) {
          case Floor.First:
            this._playRide(Elev3_1_Ride)
            break
          case Floor.Second:
            this._playRide(Elev3_2_Ride)
            break
          case Floor.Third:
            this._exit()
            break
        }
        break
    }
    this._floor = floor
  }

  private async _playRide(ride: ParallelActionTuple<readonly [VideoAction, AnimationAction, ImageAction]>) {
    this._meterSprite.visible = false
    setImageSprite(this._meterSprite, ride.children[2])
    const meterMovieSprite = await MovieSprite.create(ride.children[0], -0.4)
    const meterMoviePromise = meterMovieSprite.play(this._building.scene).then(() => {
      meterMovieSprite.removeFromParent()
      this._meterSprite.visible = true
    })
    const animationPromise = this.playAnimation(ride.children[1])
    await Promise.all([meterMoviePromise, animationPromise])
    this._exit()
  }

  private _exit(): void {
    switch (this._floor) {
      case Floor.First:
        switchWorld('infomain')
        break
      case Floor.Third:
        switchWorld('elevopen')
        break
    }
  }

  public override activate(composer: Composer, param?: ElevatorEntrance): void {
    super.activate(composer)
    this._building.activate(composer)

    switch (param) {
      case ElevatorEntrance.Third:
        this._updateCameraProjection([-93.37283, 19.4375, -10.382307], [0.0, 0.0, 1.0], [0.0, 1.0, 0.0], 90)
        this._meterSprite.visible = true
        setImageSprite(this._meterSprite, Meter3_Bitmap)
        this._floor = Floor.Third
        break
      default:
        this._updateCameraProjection([-93.37283, 10.1875, -10.382307], [0.0, 0.0, 1.0], [0.0, 1.0, 0.0], 90)
        this._meterSprite.visible = false
        this._floor = Floor.First
        break
    }
  }

  public override pointerDown(event: NormalizedMouseEvent): void {
    this._building.pointerDown(event.normalizedX, event.normalizedY)
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }
}
