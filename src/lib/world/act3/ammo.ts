import * as THREE from 'three'
import type { Act3 } from '../../../worlds/act3'
import type { Boundary } from '../../assets/boundary'
import { getGlobalPart, type Roi3D } from '../../assets/model'
import { Actor } from '../actor'
import { type AmmoArc, calculateArc, findLanding, type Plane, positionOnArc } from './ammo-arc'

export class Act3Ammo extends Actor {
  public valid = true
  public sharkFood = false
  public state: 'flying' | 'landed' | 'hit' | 'hitAnimation' = 'flying'
  public boundary: Boundary | null = null
  private _arc: AmmoArc | null = null
  private _apex = 0
  private _elapsed = 0
  private _hitTime = 0
  private _restQuaternion = new THREE.Quaternion()
  constructor(
    roi: Roi3D,
    private readonly _world: Act3,
    public readonly kind: 'pizza' | 'donut',
    public readonly index: number,
  ) {
    super(roi, _world)
  }
  public static async create(world: Act3, kind: 'pizza' | 'donut', index: number): Promise<Act3Ammo> {
    const name = kind === 'pizza' ? 'pizpie' : 'donut'
    const prefab = world.findRoi(name)
    const roi = prefab?.clone() ?? (await getGlobalPart(name, null, null))
    roi.visible = true
    roi.name = `${kind === 'pizza' ? 'p' : 'd'}ammo${index}`
    roi.model.name = roi.name
    roi.model.boundingSphere.center.set(0, 0, 0)
    const ammo = new Act3Ammo(roi, world, kind, index)
    world.scene.add(...roi.getAllModels())
    world.registerActor(ammo)
    return ammo
  }
  public shoot(location: THREE.Vector3, direction: THREE.Vector3, up: THREE.Vector3): boolean {
    const arc = calculateArc(location.toArray(), direction.toArray(), up.toArray())
    if (arc == null) {
      this.remove()
      return false
    }
    this._arc = arc
    const plane = (value: THREE.Vector4): Plane => [value.x, value.y, value.z, value.w]
    const faces = this._world.boundaryManager.boundaries.map(boundary => ({ boundary, flags: boundary.flags, plane: plane(boundary.up), edges: boundary.planes.map(plane) }))
    const landing = findLanding(arc, faces)
    this.boundary = landing?.boundary.boundary ?? null
    this._apex = landing?.time ?? arc.apex
    this.roi.moveRoiTo(location)
    this.roi.model.scale.setScalar(this.kind === 'pizza' ? 2 : 5)
    this._world.sound(this.kind === 'pizza' ? 'shootpz' : 'shootdn')
    return true
  }
  public override get collisionEnabled(): boolean {
    return this.valid && this.boundary != null && !this.sharkFood && this.state !== 'hit' && this.state !== 'hitAnimation'
  }
  public knockUp(): void {
    if (this.state !== 'landed') {
      return
    }
    this._restQuaternion.copy(this.roi.model.quaternion)
    this.roi.moveRoiTo(this.roi.position.clone().add(new THREE.Vector3(0, 5, 0)))
    this._hitTime = 0
    this.state = 'hit'
  }
  public override update(delta: number): null {
    if (!this.valid || this.sharkFood) {
      return null
    }
    if (this.state === 'hit' || this.state === 'hitAnimation') {
      this.state = 'hitAnimation'
      this._hitTime += delta
      if (this._hitTime < 2) {
        this.roi.model.rotateX(0.6 * delta * 60)
      } else {
        this.roi.moveRoiTo(this.roi.position.clone().add(new THREE.Vector3(0, -5, 0)), this._restQuaternion)
        this.state = 'landed'
      }
      return null
    }
    if (this.state !== 'flying' || this._arc == null) {
      return null
    }
    this._elapsed += delta
    const fraction = Math.min(1, this._elapsed)
    const time = fraction * this._apex
    const position = new THREE.Vector3(...positionOnArc(this._arc, time))
    const direction = new THREE.Vector3(-2 * this._arc.c0[0] * time - this._arc.c1[0], -2 * this._arc.c0[1] * time - this._arc.c1[1], -2 * this._arc.c0[2] * time - this._arc.c1[2]).normalize()
    const right = new THREE.Vector3(1, 0, 0)
    const up = new THREE.Vector3().crossVectors(direction, right).normalize()
    if (up.lengthSq() < 0.001) {
      right.set(0, 0, 1)
      up.crossVectors(direction, right).normalize()
    }
    right.crossVectors(up, direction).normalize()
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, direction))
    this.roi.moveRoiTo(position, quaternion)
    if (fraction < 1) {
      this.roi.model.rotateX(this._elapsed * 1000)
      this.roi.model.rotateY((this._elapsed * 10000) / 6)
      return null
    }
    if (this.boundary == null) {
      this.remove()
      this._world.triggerHitSound(this.kind === 'pizza' ? 2 : 4)
      return null
    }
    const normal = this.boundary.normal
    if (this.kind === 'pizza') {
      direction.crossVectors(new THREE.Vector3(1, 0, 0), normal).normalize()
      right.crossVectors(normal, direction)
      quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, normal, direction))
    } else {
      direction.crossVectors(normal, new THREE.Vector3(1, 0, 0)).normalize()
      up.crossVectors(direction, normal)
      quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(normal, up, direction))
    }
    this.roi.moveRoiTo(position, quaternion)
    this.state = 'landed'
    this._world.ammoLanded(this)
    return null
  }
  public remove(force = false): void {
    if (!this.valid || (this.sharkFood && !force)) {
      return
    }
    this.valid = false
    this.roi.visible = false
    this._world.removeActor(this)
    this._world.removeFromParents(this.roi.getAllModels())
  }
}
