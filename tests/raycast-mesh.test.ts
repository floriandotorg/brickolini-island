import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { RaycastMesh } from '../src/lib/raycast-mesh.ts'

const compare = (reference: THREE.Mesh, accelerated: THREE.Mesh, ray: THREE.Raycaster): void => {
  const expected = ray.intersectObject(reference)
  const actual = ray.intersectObject(accelerated)
  assert.equal(actual.length, expected.length)
  for (let n = 0; n < expected.length; ++n) {
    assert.ok(actual[n].point.distanceTo(expected[n].point) < 0.0000001)
    assert.ok(Math.abs(actual[n].distance - expected[n].distance) < 0.0000001)
    assert.equal(actual[n].faceIndex, expected[n].faceIndex)
    const normal = expected[n].face?.normal
    if (normal != null) {
      assert.ok(actual[n].face?.normal.distanceTo(normal) === 0)
    }
  }
}

test('accelerated terrain rays retain triangle indices, hits and normals', () => {
  const geometry = new THREE.PlaneGeometry(100, 100, 32, 32).rotateX(-Math.PI / 2)
  const indices = Array.from(geometry.index?.array ?? [])
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const reference = new THREE.Mesh(geometry, material)
  const accelerated = new RaycastMesh(geometry, material)
  assert.deepEqual(Array.from(geometry.index?.array ?? []), indices)
  assert.ok(geometry.boundsTree != null)
  for (let n = 0; n < 64; ++n) {
    const x = ((n * 13.731) % 90) - 45
    const z = ((n * 21.231 + 0.31) % 90) - 45
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 20, z), new THREE.Vector3(0, -1, 0), 0, 40)
    compare(reference, accelerated, ray)
  }
})

test('acceleration preserves mirrored transforms, near and far clipping and clone behavior', () => {
  const geometry = new THREE.SphereGeometry(5, 32, 16)
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const reference = new THREE.Mesh(geometry, material)
  const accelerated = new RaycastMesh(geometry, material)
  for (const mesh of [reference, accelerated]) {
    mesh.position.set(1, 2, 3)
    mesh.scale.set(-2, 0.5, 1.5)
    mesh.rotation.set(0.2, 0.3, 0.1)
    mesh.updateMatrixWorld(true)
  }
  for (const [near, far] of [
    [0, 100],
    [18, 100],
    [0, 5],
  ]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(1.123, 20, 3.231), new THREE.Vector3(0, -1, 0), near, far)
    compare(reference, accelerated, ray)
  }
  const clone = accelerated.clone()
  assert.ok(clone instanceof RaycastMesh)
  assert.equal(clone.geometry.boundsTree, geometry.boundsTree)
  clone.updateMatrixWorld(true)
  compare(reference, clone, new THREE.Raycaster(new THREE.Vector3(1.123, 20, 3.231), new THREE.Vector3(0, -1, 0)))
})

test('small meshes retain ordinary raycasting without building an acceleration tree', () => {
  const geometry = new THREE.BoxGeometry(2, 2, 2)
  const material = new THREE.MeshBasicMaterial()
  const reference = new THREE.Mesh(geometry, material)
  const accelerated = new RaycastMesh(geometry, material)
  assert.equal(geometry.boundsTree, undefined)
  compare(reference, accelerated, new THREE.Raycaster(new THREE.Vector3(0.123, 0.231, 10), new THREE.Vector3(0, 0, -1)))
})

test('shared terrain edges retain the original triangle tie order', () => {
  const geometry = new THREE.PlaneGeometry(100, 100, 32, 32).rotateX(-Math.PI / 2)
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const reference = new THREE.Mesh(geometry, material)
  const accelerated = new RaycastMesh(geometry, material)
  for (const x of [0, 3.125, -3.125]) {
    compare(reference, accelerated, new THREE.Raycaster(new THREE.Vector3(x, 20, 0), new THREE.Vector3(0, -1, 0)))
  }
})
