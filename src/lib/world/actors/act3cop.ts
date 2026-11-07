import * as THREE from 'three'
import { Act3 } from '../../../worlds/act3'
import type { Roi3D } from '../../assets/model'
import { Act3Ammo } from '../act3/ammo'
import { Act3Actor } from './act3actor'

const destinations = [
  { boundary: 'INT38', position: [-3.69, -1.31251, -59.231], direction: [0.99601698, 0, -0.089166] },
  { boundary: 'EDG02_08', position: [96.459999, 4, 11.22], direction: [0.9725, 0, -0.23] },
  { boundary: 'INT18', position: [-28.076799, 2, 32.11], direction: [0.19769999, 0, 0.98] },
  { boundary: 'INT48', position: [-84.736, 9, -1.965], direction: [-0.241, 0, -0.97] },
  { boundary: 'INT42', position: [-63.76178, 0.999993, -77.739998], direction: [-0.47999999, 0, -0.87699997] },
] as const
export class Act3Cop extends Act3Actor {
  private _boostEnd = 0
  private get world(): Act3 {
    if (!(this._isle instanceof Act3)) {
      throw new Error('Act 3 cop requires Act 3')
    }
    return this._isle
  }
  public override async init(): Promise<void> {
    this.actorState = 'disabled'
  }
  public hit(): void {
    const brickster = this.world.brickster
    if (this.roi.position.distanceToSquared(brickster.roi.position) < 144) {
      const boundary = this._isle.boundaryManager.getBoundaryFromPosition(brickster.roi.position.clone().add(new THREE.Vector3(0, 1, 0)))
      if (boundary != null && this.tryNavigateTo(boundary.name, brickster.roi.position.clone(), brickster.roi.getWorldDirection(new THREE.Vector3())) != null) {
        this.speed = this._boostEnd > this._time ? 6 : 2
        return
      }
    }
    let best: Act3Ammo | null = null
    let length = Number.POSITIVE_INFINITY
    for (const donut of this.world.donuts) {
      if (!donut.valid || donut.state !== 'landed' || donut.boundary == null) {
        continue
      }
      const distance = this.routeLength(donut.boundary.name, donut.roi.position)
      if (distance != null && distance < length) {
        length = distance
        best = donut
      }
    }
    if (best?.boundary != null && this.tryNavigateTo(best.boundary.name, best.roi.position.clone(), best.roi.position.clone().sub(this.roi.position).normalize()) != null) {
      this.speed = this._boostEnd > this._time ? 6 : 2
      return
    }
    const offset = Math.floor(Math.random() * destinations.length)
    for (let n = 0; n < destinations.length; ++n) {
      const target = destinations[(n + offset) % destinations.length]
      const position = new THREE.Vector3(...target.position)
      const boundary = this._isle.boundaryManager.getBoundary(target.boundary)
      if (boundary != null && Math.abs(boundary.up.y) > 0.001) {
        position.y = -(boundary.up.x * position.x + boundary.up.z * position.z + boundary.up.w) / boundary.up.y
      }
      if (this.tryNavigateTo(target.boundary, position, new THREE.Vector3(...target.direction)) != null) {
        this.speed = this._boostEnd > this._time ? 6 : 2
        return
      }
    }
  }
  public override onCollision(roi: Roi3D | null, mover = false): void {
    if (roi === this.world.brickster.roi) {
      this.world.goodEnding(roi)
      return
    }
    if (!mover || roi == null) {
      return
    }
    if (roi.actor instanceof Act3Ammo && roi.actor.kind === 'donut') {
      roi.actor.remove()
      this._boostEnd = this._time + 2000
      this.speed = 6
      this.world.sound('eatdn')
      this.hit()
      return
    }
    super.onCollision(roi, mover)
    if (roi.actor instanceof Act3Ammo) {
      roi.actor.knockUp()
    }
  }
  public override update(delta: number): { from: THREE.Vector3; to: THREE.Vector3 } {
    if (!this.stepState(delta)) {
      return this.stationary()
    }
    const moved = this.move(delta)
    if (this._boostEnd !== 0 && this._time >= this._boostEnd) {
      this._boostEnd = 0
      this.speed = 2
    }
    const distance = this.roi.position.distanceToSquared(this.world.brickster.roi.position)
    if (distance < 4) {
      this.world.goodEnding(this.world.brickster.roi)
    } else if (distance < 25) {
      this.world.brickster.actorState = 'disabled'
      this.hit()
    } else if (this.hasArrived) {
      this.hit()
    }
    return moved
  }
}
