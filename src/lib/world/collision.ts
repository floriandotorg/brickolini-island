import * as THREE from 'three'
import type { Roi3D } from '../assets/model'

export type SphereCollider<T = Roi3D> = {
  center: THREE.Vector3
  radius: number
  dynamic: boolean
  roi: T
}

const EPSILON = 1e-4
const CONTACT_BUFFER = 0.02
const MAX_GLIDE_ITERATIONS = 4
const MAX_PUSH_ITERATIONS = 4

const _dir = new THREE.Vector3()
const _oc = new THREE.Vector3()
const _normal = new THREE.Vector3()
const _remaining = new THREE.Vector3()

export class CollisionResolver {
  collideAndGlide = <T>(from: THREE.Vector3, to: THREE.Vector3, radius: number, colliders: SphereCollider<T>[], contacts?: Set<T>): THREE.Vector3 => {
    const pos = from.clone()
    _remaining.copy(to).sub(from)

    for (let n = 0; n < MAX_GLIDE_ITERATIONS; ++n) {
      const len = _remaining.length()
      if (len < EPSILON) {
        break
      }
      _dir.copy(_remaining).multiplyScalar(1 / len)

      let bestT = Number.POSITIVE_INFINITY
      let bestRoi: T | null = null
      _normal.set(0, 0, 0)

      for (const collider of colliders) {
        const r = collider.radius + radius
        _oc.copy(pos).sub(collider.center)
        const b = _oc.dot(_dir)
        const c = _oc.dot(_oc) - r * r
        const disc = b * b - c
        if (disc < 0) {
          if (c < 0) {
            contacts?.add(collider.roi)
          }
          continue
        }
        const sqrtDisc = Math.sqrt(disc)
        const t0 = -b - sqrtDisc
        const t1 = -b + sqrtDisc
        if (t1 < 0 || t0 > len) {
          continue
        }
        if (t0 <= 0) {
          contacts?.add(collider.roi)
          continue
        }
        if (t0 < bestT) {
          bestT = t0
          bestRoi = collider.roi
          _normal.copy(pos).addScaledVector(_dir, t0).sub(collider.center).normalize()
        }
      }

      if (bestRoi == null) {
        pos.addScaledVector(_dir, len)
        _remaining.set(0, 0, 0)
        break
      }

      const advance = Math.max(bestT - CONTACT_BUFFER, 0)
      pos.addScaledVector(_dir, advance)
      _remaining.addScaledVector(_dir, -advance)
      _remaining.addScaledVector(_normal, -_remaining.dot(_normal))
      contacts?.add(bestRoi)
    }

    return pos
  }

  resolvePenetration = <T>(pos: THREE.Vector3, radius: number, colliders: SphereCollider<T>[], contacts?: Set<T>): THREE.Vector3 => {
    const push = new THREE.Vector3()
    for (let n = 0; n < MAX_PUSH_ITERATIONS; ++n) {
      let resolved = true
      for (const collider of colliders) {
        if (!collider.dynamic) {
          continue
        }
        const r = collider.radius + radius
        _oc.copy(pos).add(push).sub(collider.center)
        const dist = _oc.length()
        if (dist >= r) {
          continue
        }
        const overlap = r - dist
        if (dist > EPSILON) {
          _oc.multiplyScalar(1 / dist)
        } else {
          _oc.set(0, 1, 0)
        }
        push.addScaledVector(_oc, overlap)
        resolved = false
        contacts?.add(collider.roi)
      }
      if (resolved) {
        break
      }
    }
    return push
  }
}
