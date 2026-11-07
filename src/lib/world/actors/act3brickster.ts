import * as THREE from 'three'
import { Act3 } from '../../../worlds/act3'
import type { Roi3D } from '../../assets/model'
import { Act3Ammo } from '../act3/ammo'
import { Act3Actor } from './act3actor'

export class Act3Brickster extends Act3Actor {
  private _sub: 'walkingPizza' | 'walkingBuilding' | 'shooting' | 'fleeing' = 'walkingBuilding'
  private _building: number | null = null
  private _targetPosition = new THREE.Vector3()
  private _shootStart = 0
  private _eatEnd = 0
  private _fleeEnd = 0
  private _nextTaunt = 0
  public pizzasEaten = 0
  private get world(): Act3 {
    if (!(this._isle instanceof Act3)) {
      throw new Error('Act 3 actor requires Act 3')
    }
    return this._isle
  }
  public override async init(): Promise<void> {
    this.actorState = 'disabled'
  }
  public hitByAmmo(): void {
    if (this.pizzasEaten < 8) {
      this.hit()
    }
  }
  public hit(): void {
    this._building = null
    this.clearPath()
    if (this.pizzasEaten < 8 && this._time > this._fleeEnd + 5000) {
      let best: Act3Ammo | null = null
      let length = Number.POSITIVE_INFINITY
      for (const pizza of this.world.pizzas) {
        if (!pizza.valid || pizza.sharkFood || pizza.state !== 'landed' || pizza.boundary == null) {
          continue
        }
        if (pizza.roi.position.distanceToSquared(this.roi.position) > 1600) {
          this.world.shark.eatPizza(pizza)
          continue
        }
        const distance = this.routeLength(pizza.boundary.name, pizza.roi.position)
        if (distance != null && distance < length) {
          best = pizza
          length = distance
        }
      }
      if (best?.boundary != null && this.tryNavigateTo(best.boundary.name, best.roi.position.clone(), best.roi.position.clone().sub(this.roi.position).normalize()) != null) {
        this._sub = 'walkingPizza'
        this.speed = this._eatEnd > this._time ? 3 : 5
        return
      }
    }
    const targets = this.world.buildingTargets.filter(target => target.index !== 0 && this.world.destruction.isIntact({ type: 'building', index: target.index }))
    const candidates = targets.some(target => target.index !== 15) ? targets.filter(target => target.index !== 15) : targets
    candidates.sort((a, b) => a.position.distanceToSquared(this.roi.position) - b.position.distanceToSquared(this.roi.position))
    if (candidates.length === 0) {
      this.world.badEnding(this.roi)
      return
    }
    for (const target of candidates) {
      if (this.tryNavigateTo(target.boundary.name, target.position.clone(), target.position.clone().sub(this.roi.position).normalize()) != null) {
        this._building = target.index
        this._sub = 'walkingBuilding'
        this.speed = this._eatEnd > this._time ? 3 : 5
        return
      }
    }
    this.speed = 0
  }
  private flee(): void {
    const cop = this.world.cops.toSorted((a, b) => a.roi.position.distanceToSquared(this.roi.position) - b.roi.position.distanceToSquared(this.roi.position))[0]
    if (cop == null || cop.roi.position.distanceToSquared(this.roi.position) >= 225) {
      return
    }
    const boundary = this._isle.boundaryManager.getBoundaryFromPosition(this.roi.position.clone().add(new THREE.Vector3(0, 1, 0)))
    if (boundary == null) {
      return
    }
    const candidates = [boundary, ...(this._destination == null ? [] : [this._destination.edge.getOtherBoundary(this._destination.boundary)])].flatMap(face => face.edges.filter(edge => edge.isTraversableFromFace(face)).map(edge => ({ boundary: face, edge, point: edge.pointA.clone().lerp(edge.pointB, 0.5) })))
    let best = candidates[0]
    for (const candidate of candidates) {
      if (best == null || (cop.roi.position.clone().sub(this.roi.position).dot(candidate.point.clone().sub(this.roi.position)) < 0 && candidate.point.distanceToSquared(cop.roi.position) > best.point.distanceToSquared(cop.roi.position))) {
        best = candidate
      }
    }
    if (best == null) {
      return
    }
    const wasFleeing = this._sub === 'fleeing'
    this.clearPath()
    this.setCurrentDestination({ boundary: best.boundary, edge: best.edge, scale: 0.5 })
    this._sub = 'fleeing'
    this.speed = this._eatEnd > this._time ? 3 : 5
    if (!wasFleeing) {
      this._fleeEnd = this._time + 10000
    }
  }
  public override onCollision(roi: Roi3D | null, mover = false): void {
    if (!mover || roi == null) {
      return
    }
    if (roi.actor instanceof Act3Ammo && roi.actor.kind === 'pizza') {
      const pizza = roi.actor
      if (pizza.valid && !pizza.sharkFood) {
        pizza.remove()
        ++this.pizzasEaten
        this._eatEnd = this._time + 2000
        this.speed = 3
        if (this.pizzasEaten >= 8) {
          this.world.triggerHitSound(6)
        } else {
          this.world.sound('eatpz')
        }
        this.hit()
      }
      return
    }
    if (this.world.cops.some(cop => cop.roi === roi)) {
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
    if (this._eatEnd !== 0 && this._time >= this._eatEnd) {
      this._eatEnd = 0
      this.speed = 5
    }
    if (this._time >= this._nextTaunt) {
      this.world.triggerHitSound(5)
      this._nextTaunt = this._time + 15000
    }
    if (this._sub === 'shooting') {
      const duration = Math.max(1, this.getAnimationDuration(-1))
      if (this._time - this._shootStart >= duration) {
        if (this._building != null) {
          this.world.disableHelicopterDot()
          while (this.world.destruction.decrement({ type: 'building', index: this._building })) {}
        }
        this.pizzasEaten = 0
        this.world.sound('thpt')
        this.hit()
        return this.stationary()
      }
      this.faceTowards(this._targetPosition)
      const transform = new THREE.Matrix4().makeRotationFromQuaternion(this.roi.getWorldQuaternion(new THREE.Quaternion())).setPosition(this.roi.position)
      this.applyAnimationAt(-1, this._time - this._shootStart, transform)
      return this.stationary()
    }
    const moved = this.move(delta)
    if (this._sub === 'walkingBuilding' && this.hasArrived && this._building != null) {
      this._sub = 'shooting'
      this._shootStart = this._time
      this._targetPosition.copy(this.world.destruction.position({ type: 'building', index: this._building }))
      this.speed = 0
      this.world.sound('xarrow')
      this.world.destruction.schedule({ type: 'building', index: this._building }, 0, false, true)
    } else if (this._sub === 'fleeing') {
      if (this._time >= this._fleeEnd) {
        this.hit()
      } else if (this._time > this._fleeEnd - 9000) {
        this.flee()
      }
    } else {
      this.flee()
    }
    return moved
  }
}
