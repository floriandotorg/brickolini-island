import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { CollisionResolver } from '../src/lib/world/collision.ts'

test('swept collision stops tunneling and slides along a sphere', () => {
  const resolver = new CollisionResolver()
  const contacts = new Set<string>()
  const collider = { center: new THREE.Vector3(), radius: 1, dynamic: true, roi: 'actor' }
  const straight = resolver.collideAndGlide(new THREE.Vector3(-3, 0, 0), new THREE.Vector3(3, 0, 0), 0, [collider], contacts)
  assert.ok(straight.x < -1)
  assert.ok(contacts.has('actor'))
  const glided = resolver.collideAndGlide(new THREE.Vector3(-3, 0, 0.7), new THREE.Vector3(3, 0, 0.7), 0, [collider])
  assert.ok(glided.z > 0.7)
  assert.ok(glided.length() >= 1)
})

test('penetration pushes out of dynamic actors and ignores fixed ones', () => {
  const resolver = new CollisionResolver()
  const collider = { center: new THREE.Vector3(), radius: 1, dynamic: true, roi: 'actor' }
  assert.equal(resolver.resolvePenetration(new THREE.Vector3(0.5, 0, 0), 0, [collider]).x, 0.5)
  assert.equal(resolver.resolvePenetration(new THREE.Vector3(0.5, 0, 0), 0, [{ ...collider, dynamic: false }]).length(), 0)
})
