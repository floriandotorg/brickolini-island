import * as THREE from 'three'
import { Elev1_2_Ride, Elev1_3_Ride, Elev2_1_Ride, Elev2_3_Ride, Elev3_1_Ride, Elev3_2_Ride, ElevRide as ElevRide_StartUp, Floor2, Meter3_Bitmap } from '../../actions/isle'
import { Elevator_Music } from '../../actions/jukebox'
import type { AnimationAction, ImageAction, ParallelActionTuple, VideoAction } from '../../lib/action-types'
import { createImageSprite, setImageSprite } from '../../lib/assets/canvas-sprite'
import { MovieSprite } from '../../lib/assets/movie-sprite'
import type { Composer } from '../../lib/effect/composer'
import { engine, type NormalizedMouseEvent, type Timeout } from '../../lib/engine'
import { switchWorld } from '../../lib/switch-world'
import { Building } from '../../lib/world/building'
import { ElevatorEntrance } from '../../lib/world/world'
import { Isle } from '../isle'

enum Floor {
  First = 0,
  Second = 1,
  Third = 2,
}

export class Elevator extends Isle {
  private readonly _building = new Building()
  private _meterSprite = new THREE.Sprite()
  private _floor = Floor.First
  private _busy = false
  private _visit = 0
  private _floor2Still: THREE.Sprite | null = null
  private _floor2Movie: MovieSprite | null = null
  private _floor2Timeout: Timeout | null = null
  private _rideMovie: MovieSprite | null = null

  constructor() {
    super('elevride', true)
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
    if (this._busy) {
      return
    }
    this.stopFloor2()
    switch (this._floor) {
      case Floor.First:
        switch (floor) {
          case Floor.First:
            this._exit()
            break
          case Floor.Second:
            void this._playRide(Elev1_2_Ride)
            break
          case Floor.Third:
            void this._playRide(Elev1_3_Ride)
            break
        }
        break
      case Floor.Second:
        switch (floor) {
          case Floor.First:
            void this._playRide(Elev2_1_Ride)
            break
          case Floor.Second:
            void this.showFloor2()
            break
          case Floor.Third:
            void this._playRide(Elev2_3_Ride)
            break
        }
        break
      case Floor.Third:
        switch (floor) {
          case Floor.First:
            void this._playRide(Elev3_1_Ride)
            break
          case Floor.Second:
            void this._playRide(Elev3_2_Ride)
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
    this._busy = true
    const visit = this._visit
    this._meterSprite.visible = false
    setImageSprite(this._meterSprite, ride.children[2])
    const meterMovieSprite = await MovieSprite.create(ride.children[0], -0.4)
    if (visit !== this._visit) {
      return
    }
    this._rideMovie = meterMovieSprite
    const meterMoviePromise = meterMovieSprite.play(this._building.scene).then(() => {
      meterMovieSprite.removeFromParent()
      if (visit === this._visit) {
        this._meterSprite.visible = true
      }
    })
    const animationPromise = this.playAnimation(ride.children[1])
    await Promise.all([meterMoviePromise, animationPromise])
    if (visit === this._visit) {
      this._busy = false
      this._exit()
    }
  }

  private stopFloor2 = (): void => {
    this._floor2Movie?.stop()
    this._floor2Movie?.removeFromParent()
    this._floor2Movie = null
    this._floor2Still?.removeFromParent()
    this._floor2Still = null
    this._floor2Timeout = null
  }

  private showFloor2 = async (): Promise<void> => {
    this.stopFloor2()
    const visit = this._visit
    const movie = await MovieSprite.create(Floor2.children[1], -0.2, Floor2.children[2])
    if (visit !== this._visit || this._busy) {
      return
    }
    this._floor2Still = createImageSprite(Floor2.children[0])
    this._floor2Still.position.z = -0.3
    this._building.scene.add(this._floor2Still)
    this._floor2Movie = movie
    movie.hideAfterFinish = true
    this._floor2Timeout = engine.createTimeout(13_100)
    void movie.play(this._building.scene)
  }

  private _exit(): void {
    switch (this._floor) {
      case Floor.First:
        void switchWorld({ ending: null })
        break
      case Floor.Second:
        void this.showFloor2()
        break
      case Floor.Third:
        void switchWorld('elevopen')
        break
    }
  }

  public override async activate(composer: Composer, param?: ElevatorEntrance): Promise<void> {
    ++this._visit
    this._busy = false
    this.stopFloor2()
    await super.activate(composer)
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

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._busy) {
      return
    }
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      return
    }
    await super.pointerDown(event)
  }

  public override keyPressed(_key: string): void {}

  public override escape(): boolean {
    return !this._busy
  }

  public override update(delta: number): void {
    super.update(delta)
    if (this._floor2Timeout?.isExpired) {
      this.stopFloor2()
    }
  }

  public override deactivate(): void {
    ++this._visit
    this.stopFloor2()
    this._rideMovie?.stop()
    this._rideMovie?.removeFromParent()
    this._rideMovie = null
    super.deactivate()
  }

  public override pointerUp(_event: NormalizedMouseEvent): void {
    this._building.pointerUp()
  }
}
