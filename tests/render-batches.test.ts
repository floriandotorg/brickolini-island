import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { RenderBatches } from '../src/lib/effect/render-batches.ts'

const createScene = () => {
  const scene = new THREE.Scene()
  const parent = new THREE.Group()
  scene.add(parent)
  for (let n = 0; n < 4; ++n) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhysicalMaterial({ color: n % 2 ? 'red' : 'blue' }))
    mesh.geometry.clearGroups()
    mesh.position.x = n * 2
    mesh.castShadow = true
    parent.add(mesh)
  }
  return { scene, parent, batches: new RenderBatches() }
}

test('opaque meshes batch across colors and preserve source objects after rendering', () => {
  const { scene, parent, batches } = createScene()
  batches.prepare(scene)
  const batch = scene.children.find(object => object instanceof THREE.BatchedMesh)
  assert.ok(batch instanceof THREE.BatchedMesh)
  assert.equal(batch.instanceCount, 4)
  assert.equal(batch.castShadow, true)
  assert.ok(parent.children.every(object => object.layers.mask === 0))
  const matrix = new THREE.Matrix4()
  batch.getMatrixAt(3, matrix)
  assert.equal(matrix.elements[12], 6)
  batches.restore()
  assert.ok(parent.children.every(object => object.layers.mask === 1))
  assert.equal(batch.visible, false)
  batches.dispose()
  assert.equal(scene.children.length, 1)
})

test('batches track parent visibility, movement, recoloring and material replacement', () => {
  const { scene, parent, batches } = createScene()
  batches.prepare(scene)
  batches.restore()
  parent.position.x = 10
  parent.visible = false
  batches.prepare(scene)
  const batch = scene.children.find(object => object instanceof THREE.BatchedMesh)
  assert.ok(batch instanceof THREE.BatchedMesh)
  assert.equal(batch.getVisibleAt(0), false)
  batches.restore()
  parent.visible = true
  const mesh = parent.children[0]
  assert.ok(mesh instanceof THREE.Mesh)
  mesh.material.color.set('green')
  batches.prepare(scene)
  const color = new THREE.Color()
  batch.getColorAt(0, color)
  assert.equal(color.getHex(), new THREE.Color('green').getHex())
  const matrix = new THREE.Matrix4()
  batch.getMatrixAt(0, matrix)
  assert.equal(matrix.elements[12], 10)
  batches.restore()
  mesh.material.transparent = true
  mesh.material.opacity = 0.5
  batches.prepare(scene)
  assert.equal(mesh.layers.mask, 1)
  assert.equal(batch.getVisibleAt(0), false)
  batches.restore()
  batches.dispose()
})

test('textured batches retain UVs and fall back when textures or layers change', () => {
  const { scene, parent, batches } = createScene()
  const texture = new THREE.Texture()
  for (const object of parent.children) {
    assert.ok(object instanceof THREE.Mesh)
    object.material.map = texture
  }
  batches.prepare(scene)
  batches.restore()
  const batch = scene.children.find(object => object instanceof THREE.BatchedMesh)
  assert.ok(batch instanceof THREE.BatchedMesh)
  assert.ok(batch.geometry.getAttribute('uv'))
  const first = parent.children[0]
  const second = parent.children[1]
  assert.ok(first instanceof THREE.Mesh)
  first.material.map = new THREE.Texture()
  second.layers.set(2)
  batches.prepare(scene)
  assert.equal(batch.getVisibleAt(0), false)
  assert.equal(first.layers.mask, 1)
  assert.equal(batch.getVisibleAt(1), false)
  assert.equal(second.layers.mask, 4)
  batches.restore()
  batches.dispose()
})

test('removed objects disappear from batches without changing raycast behavior', () => {
  const { scene, parent, batches } = createScene()
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1))
  scene.updateMatrixWorld(true)
  const before = ray.intersectObjects(scene.children, true).map(hit => hit.object)
  batches.prepare(scene)
  batches.restore()
  assert.deepEqual(
    ray.intersectObjects(scene.children, true).map(hit => hit.object),
    before,
  )
  const batch = scene.children.find(object => object instanceof THREE.BatchedMesh)
  assert.ok(batch instanceof THREE.BatchedMesh)
  parent.removeFromParent()
  batches.prepare(scene)
  assert.equal(batch.getVisibleAt(0), false)
  batches.restore()
  batches.dispose()
})
