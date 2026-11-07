import * as THREE from 'three'
import { VObehind0_PlayWav, VObehind1_PlayWav, VObehind2_PlayWav, VObehind3_PlayWav, VOhead0_PlayWav, VOhead1_PlayWav, VOinterrupt0_PlayWav, VOinterrupt1_PlayWav, VOinterrupt2_PlayWav, VOinterrupt3_PlayWav } from '../../../actions/act2main'
import { Act2 } from '../../../worlds/act2'
import { nextChaseLocation } from '../../act2-policy'
import { Playlist } from '../../assets/audio'
import type { Roi3D } from '../../assets/model'
import type { DestructionTarget } from '../destruction'
import { PathActor } from './path-actor'

const voices = {
  head: new Playlist([VOhead0_PlayWav, VOhead1_PlayWav]),
  behind: new Playlist([VObehind0_PlayWav, VObehind1_PlayWav, VObehind2_PlayWav, VObehind3_PlayWav]),
  interrupt: new Playlist([VOinterrupt0_PlayWav, VOinterrupt1_PlayWav, VOinterrupt2_PlayWav, VOinterrupt3_PlayWav]),
}
export class Act2Actor extends PathActor {
  private readonly _locations: {
    position: THREE.Vector3
    direction: THREE.Vector3
    boundary: string
    cleared: boolean
    targets: (
      | {
          type: 'plant'
          index: number
        }
      | {
          type: 'building'
          index: number
        }
    )[]
    next: [number, number]
  }[] = [
    {
      position: new THREE.Vector3(47.92, 7.0699968, -31.58),
      direction: new THREE.Vector3(-0.999664, 0.0, -0.025916),
      boundary: 'edg01_27',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 12,
        },
        {
          type: 'building',
          index: 14,
        },
        {
          type: 'plant',
          index: 2,
        },
        {
          type: 'plant',
          index: 23,
        },
        {
          type: 'plant',
          index: 32,
        },
        {
          type: 'plant',
          index: 66,
        },
        {
          type: 'plant',
          index: 71,
        },
        {
          type: 'plant',
          index: 72,
        },
        {
          type: 'plant',
          index: 73,
        },
      ],
      next: [3, 7],
    },
    {
      position: new THREE.Vector3(70.393349, 8.07, 3.151935),
      direction: new THREE.Vector3(-0.90653503, 0.0, 0.422131),
      boundary: 'int06',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 13,
        },
        {
          type: 'plant',
          index: 0,
        },
        {
          type: 'plant',
          index: 7,
        },
        {
          type: 'plant',
          index: 16,
        },
        {
          type: 'plant',
          index: 18,
        },
        {
          type: 'plant',
          index: 20,
        },
        {
          type: 'plant',
          index: 21,
        },
        {
          type: 'plant',
          index: 34,
        },
        {
          type: 'plant',
          index: 49,
        },
        {
          type: 'plant',
          index: 58,
        },
        {
          type: 'plant',
          index: 59,
        },
        {
          type: 'plant',
          index: 63,
        },
        {
          type: 'plant',
          index: 65,
        },
        {
          type: 'plant',
          index: 69,
        },
        {
          type: 'plant',
          index: 74,
        },
      ],
      next: [2, 4],
    },
    {
      position: new THREE.Vector3(47.74, 4.079995, -52.3),
      direction: new THREE.Vector3(-0.98293, 0.0, -0.18398),
      boundary: 'edg01_08',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 9,
        },
        {
          type: 'building',
          index: 11,
        },
        {
          type: 'plant',
          index: 12,
        },
        {
          type: 'plant',
          index: 19,
        },
        {
          type: 'plant',
          index: 24,
        },
        {
          type: 'plant',
          index: 48,
        },
        {
          type: 'plant',
          index: 60,
        },
      ],
      next: [3, 6],
    },
    {
      position: new THREE.Vector3(26.273487, 0.069, 12.170015),
      direction: new THREE.Vector3(0.987199, 0.0, -0.159491),
      boundary: 'INT14',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 7,
        },
        {
          type: 'building',
          index: 8,
        },
        {
          type: 'building',
          index: 3,
        },
        {
          type: 'plant',
          index: 8,
        },
        {
          type: 'plant',
          index: 15,
        },
        {
          type: 'plant',
          index: 46,
        },
      ],
      next: [5, 1],
    },
    {
      position: new THREE.Vector3(-26.16499, 0.069, 5.61),
      direction: new THREE.Vector3(0.027719, 0.0, 0.999616),
      boundary: 'INT22',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 5,
        },
        {
          type: 'building',
          index: 10,
        },
        {
          type: 'plant',
          index: 25,
        },
        {
          type: 'plant',
          index: 26,
        },
        {
          type: 'plant',
          index: 28,
        },
        {
          type: 'plant',
          index: 29,
        },
        {
          type: 'plant',
          index: 38,
        },
        {
          type: 'plant',
          index: 39,
        },
        {
          type: 'plant',
          index: 42,
        },
        {
          type: 'plant',
          index: 50,
        },
        {
          type: 'plant',
          index: 51,
        },
        {
          type: 'plant',
          index: 56,
        },
      ],
      next: [7, 0],
    },
    {
      position: new THREE.Vector3(-66.383446, 4.07, 32.387417),
      direction: new THREE.Vector3(0.979487, 0.0, -0.201506),
      boundary: 'edg02_27',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 4,
        },
        {
          type: 'plant',
          index: 3,
        },
        {
          type: 'plant',
          index: 40,
        },
        {
          type: 'plant',
          index: 53,
        },
        {
          type: 'plant',
          index: 55,
        },
      ],
      next: [6, 1],
    },
    {
      position: new THREE.Vector3(-71.843285, 0.069, -49.524852),
      direction: new THREE.Vector3(0.99031502, 0.0, 0.13884),
      boundary: 'edg02_39',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 2,
        },
        {
          type: 'plant',
          index: 22,
        },
        {
          type: 'plant',
          index: 33,
        },
        {
          type: 'plant',
          index: 41,
        },
        {
          type: 'plant',
          index: 45,
        },
        {
          type: 'plant',
          index: 67,
        },
      ],
      next: [0, 4],
    },
    {
      position: new THREE.Vector3(-26.470566, 0.069, -44.670845),
      direction: new THREE.Vector3(0.004602, 0.0, -0.99998897),
      boundary: 'int26',
      cleared: false,
      targets: [
        {
          type: 'building',
          index: 6,
        },
        {
          type: 'plant',
          index: 13,
        },
        {
          type: 'plant',
          index: 30,
        },
        {
          type: 'plant',
          index: 31,
        },
        {
          type: 'plant',
          index: 62,
        },
      ],
      next: [2, 5],
    },
    {
      position: new THREE.Vector3(6.323625, 0.069, -47.96045),
      direction: new THREE.Vector3(-0.982068, 0.0, 0.188529),
      boundary: 'edg02_53',
      cleared: false,
      targets: [
        {
          type: 'plant',
          index: 1,
        },
        {
          type: 'plant',
          index: 27,
        },
        {
          type: 'plant',
          index: 37,
        },
        {
          type: 'plant',
          index: 44,
        },
        {
          type: 'plant',
          index: 47,
        },
        {
          type: 'plant',
          index: 54,
        },
        {
          type: 'plant',
          index: 61,
        },
        {
          type: 'plant',
          index: 64,
        },
        {
          type: 'building',
          index: 15,
        },
      ],
      next: [0, 4],
    },
  ]
  private readonly _lastBrick = {
    position: new THREE.Vector3(44.6, 0.1, 45.3),
    direction: new THREE.Vector3(0.95, 0.0, -0.3),
    boundary: 'edg00_154',
  }
  private readonly _hiding = {
    position: new THREE.Vector3(36.689, -0.978409, 31.449),
    direction: new THREE.Vector3(0.083792, -0.94303, -0.66398698),
    boundary: 'edg00_157',
  }

  private _currentLocationIndex = 0
  private _state: 'idle' | 'shooting' | 'endShot' | 'roaming' | 'createdBrick' | 'goingToHide' | 'hiding' | 'hidden' = 'idle'
  private _time = 0
  private _shotStart = 0
  private _shotSound = false
  private _target: DestructionTarget | null = null
  private _inRange = false
  private _createdAt = 0
  private _resetSpeedAt = 0
  private _hopUntil = 0
  private _hopOffset = 0
  private _directionsConverted = false
  private _placedSixth = false
  private get world(): Act2 {
    if (!(this._isle instanceof Act2)) {
      throw new Error('Act 2 actor requires Act 2')
    }
    return this._isle
  }
  public override async init(): Promise<void> {
    this.roi.visible = false
  }
  public start(): void {
    if (!this._directionsConverted) {
      for (const location of [...this._locations, this._lastBrick, this._hiding]) {
        location.direction.x *= -1
      }
      this._directionsConverted = true
    }
    this.roi.visible = true
    this._currentLocationIndex = 0
    this.beginShot()
  }
  public stop(): void {
    this._state = 'idle'
    this.speed = 0
  }
  public goingToHide(): void {
    this._state = 'goingToHide'
    this._placedSixth = false
    this.setSpeed(7)
    this.go(this._lastBrick)
  }
  public hide(): void {
    this._state = 'hiding'
    this.setSpeed(9)
    this.go(this._hiding)
  }
  private setSpeed(speed: number, duration = 0): void {
    this.speed = speed
    this._resetSpeedAt = duration === 0 ? 0 : this._time + duration
  }
  private go(location: { boundary: string; position: THREE.Vector3; direction: THREE.Vector3 }): void {
    this.navigateTo(location.boundary, location.position, location.direction)
  }
  private beginShot(): void {
    this._state = 'shooting'
    this.setSpeed(0)
    this._shotStart = this._time
    this._shotSound = false
    this._target = this._locations[this._currentLocationIndex].targets.find(target => this.world.destruction.isAlive(target)) ?? null
    this._inRange = false
  }
  private nextLocation(): void {
    for (const name of ['pwrbrik', 'debrick', 'ray']) {
      const roi = this._isle.findRoi(name)
      if (roi != null) {
        roi.visible = false
      }
    }
    this._currentLocationIndex = nextChaseLocation(
      this._currentLocationIndex,
      this._locations.map(location => location.cleared),
      Math.random() < 0.5 ? 0 : 1,
    )
    this._state = 'roaming'
    this.setSpeed(7, 3000)
    this.go(this._locations[this._currentLocationIndex])
  }
  private shoot(): void {
    if (this._target == null) {
      this._locations[this._currentLocationIndex].cleared = true
      if (this._currentLocationIndex === 8) {
        this.stop()
        this.world.badEnding()
        return
      }
      this._state = 'endShot'
      return
    }
    const duration = Math.max(1300, this.getAnimationDuration(-1))
    const elapsed = this._time - this._shotStart
    if (!this._shotSound && elapsed >= duration - 1300) {
      this._shotSound = true
      const brickster = this._isle.findRoi('brickstr')
      void this._isle.playPositionalAudio('xarrow', brickster?.model ?? this.roi.model)
      this.world.destruction.schedule(this._target)
    }
    if (elapsed >= duration) {
      this.beginShot()
      return
    }
    const position = this.roi.position.clone().add(new THREE.Vector3(0, 1, 0))
    const z = position.clone().sub(this.world.destruction.position(this._target))
    z.y = 0
    z.normalize()
    const x = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), z).normalize()
    const y = new THREE.Vector3().crossVectors(z, x).normalize()
    this.applyAnimationAt(-1, elapsed, new THREE.Matrix4().makeBasis(x, y, z).setPosition(position))
  }
  private proximity(): void {
    if (!this._isle.isBoxInFrustum(this.roi.model.getWorldBoundingBox())) {
      return
    }
    const player = this._isle.camera.position
    const distance = this.roi.position.clone().sub(player)
    if (this._isle.camera.getWorldDirection(new THREE.Vector3()).dot(distance) < 0) {
      return
    }
    if (distance.lengthSq() >= 75) {
      this._inRange = false
      return
    }
    if (this._inRange) {
      return
    }
    this._inRange = true
    if (this._state === 'shooting') {
      void this.world.playBricksterVoice(voices.interrupt.play())
      this._state = 'endShot'
      return
    }
    const windshield = this.roi
      .getAllRois()
      .find(roi => roi.name === 'windsd')
      ?.model.getWorldPosition(new THREE.Vector3())
    const rear = this.roi
      .getAllRois()
      .find(roi => roi.name === 'reardr')
      ?.model.getWorldPosition(new THREE.Vector3())
    const inFront = windshield != null && rear != null ? player.distanceToSquared(rear) > player.distanceToSquared(windshield) : distance.dot(this.roi.getWorldDirection(new THREE.Vector3())) < 0
    if (inFront) {
      void this.world.playBricksterVoice(voices.head.play())
      return
    }
    if (this._time - this._createdAt > 3000) {
      this._createdAt = this._time
      this._state = 'createdBrick'
      this.setSpeed(3)
      if (this.world.createBrick()) {
        void this.world.playBricksterVoice(voices.behind.play(), true)
      }
    }
  }
  public override get collisionEnabled(): boolean {
    return super.collisionEnabled && this._hopUntil <= this._time
  }
  public override onCollision(_roi: Roi3D | null): void {
    if (this._hopUntil <= this._time) {
      this._hopUntil = this._time + 600
    }
    void this._isle.playPositionalAudio('hitactor', this.roi.model)
  }
  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    this._time += delta * 1000
    if (this._hopOffset !== 0) {
      this.roi.moveRoiTo(this.roi.position.clone().add(new THREE.Vector3(0, -this._hopOffset, 0)))
      const brickster = this._isle.findRoi('brickstr')
      if (brickster != null) {
        brickster.moveRoiTo(brickster.position.clone().add(new THREE.Vector3(0, -this._hopOffset, 0)))
      }
      this._hopOffset = 0
    }
    if (this._resetSpeedAt !== 0 && this._time >= this._resetSpeedAt) {
      this.setSpeed(4)
    }
    if (this._state === 'endShot') {
      this.nextLocation()
    }
    if (this._state === 'roaming' && !this.isFollowingPath) {
      this.beginShot()
    }
    if (this._state === 'goingToHide' && !this.isFollowingPath && !this._placedSixth) {
      this._placedSixth = true
      this.setSpeed(0)
      this.world.createBrick2()
    }
    if (this._state === 'hiding' && !this.isFollowingPath) {
      this.setSpeed(0)
      this.roi.visible = false
      const brickster = this._isle.findRoi('brickstr')
      if (brickster != null) {
        brickster.visible = false
      }
      this._state = 'hidden'
      this._isle.removeActor(this)
    }
    const from = this.roi.position.clone()
    if (this._state === 'shooting') {
      this.shoot()
    }
    const moved = this._state === 'roaming' || this._state === 'createdBrick' || this._state === 'goingToHide' || this._state === 'hiding' ? super.update(delta) : { from, to: from.clone() }
    if (this._state === 'createdBrick') {
      if (this._time - this._createdAt > 600) {
        this._state = 'roaming'
        this.setSpeed(8, 15000)
      }
    } else if (this._state === 'shooting' || this._state === 'roaming') {
      this.proximity()
    }
    if (this._hopUntil > this._time) {
      this._hopOffset = 3
      this.roi.moveRoiTo(this.roi.position.clone().add(new THREE.Vector3(0, 3, 0)))
      const brickster = this._isle.findRoi('brickstr')
      if (brickster != null) {
        brickster.moveRoiTo(brickster.position.clone().add(new THREE.Vector3(0, 3, 0)))
      }
    }
    return moved
  }
}
