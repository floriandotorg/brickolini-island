import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { BoundaryRaycastIndex } from '../src/lib/world/boundary-raycast.ts'

test('boundary indexing preserves hidden collider hits, clipping, layers and tie order', () => {
  const geometry = new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2)
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const meshes = [0, 0, 3, -2].map(y => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = y
    mesh.visible = false
    mesh.updateMatrixWorld(true)
    return mesh
  })
  meshes[3].layers.set(2)
  const index = new BoundaryRaycastIndex(meshes)
  for (const [near, far] of [
    [0, 100],
    [8, 100],
    [0, 2],
  ]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(0.123, 10, 0.231), new THREE.Vector3(0, -1, 0), near, far)
    const expected = ray.intersectObjects(meshes)
    const actual = index.intersect(ray)
    assert.equal(actual.length, expected.length)
    for (let n = 0; n < expected.length; ++n) {
      assert.equal(actual[n].object, expected[n].object)
      assert.equal(actual[n].faceIndex, expected[n].faceIndex)
      assert.equal(actual[n].distance, expected[n].distance)
      assert.ok(actual[n].point.equals(expected[n].point))
      assert.ok(actual[n].face?.normal.equals(expected[n].face?.normal ?? new THREE.Vector3()))
    }
  }
  assert.deepEqual(new BoundaryRaycastIndex([]).intersect(new THREE.Raycaster()), [])
})

test('boundary indexing avoids at least ninety percent of geometry raycasts', () => {
  const geometry = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)
  const material = new THREE.MeshBasicMaterial()
  const meshes: THREE.Mesh[] = []
  let calls = 0
  for (let n = 0; n < 512; ++n) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set((n % 32) * 4, 0, Math.floor(n / 32) * 4)
    mesh.updateMatrixWorld(true)
    const raycast = mesh.raycast
    mesh.raycast = (ray, hits) => {
      ++calls
      raycast.call(mesh, ray, hits)
    }
    meshes.push(mesh)
  }
  const index = new BoundaryRaycastIndex(meshes)
  const ray = new THREE.Raycaster(new THREE.Vector3(0.123, 10, 0.231), new THREE.Vector3(0, -1, 0))
  const expected = ray.intersectObjects(meshes)
  const ordinaryCalls = calls
  calls = 0
  const actual = index.intersect(ray)
  assert.ok(calls < ordinaryCalls / 10)
  assert.equal(actual[0]?.object, expected[0]?.object)
})
