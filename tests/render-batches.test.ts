import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { markSharedShaderHook, RenderBatches } from '../src/lib/effect/render-batches.ts'

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
  assert.equal(batch.parent, null)
  batches.restore()
  batches.dispose()
})

test('discovery follows graph changes without rescanning unchanged scenes', () => {
  const { scene, parent, batches } = createScene()
  const traverse = scene.traverse
  let traversals = 0
  scene.traverse = callback => {
    ++traversals
    traverse.call(scene, callback)
  }
  batches.prepare(scene)
  batches.restore()
  batches.prepare(scene)
  batches.restore()
  assert.equal(traversals, 1)
  const added = new THREE.Group()
  added.add(parent.children[0].clone(), parent.children[1].clone())
  scene.add(added)
  batches.prepare(scene)
  batches.restore()
  const instanceCount = () => scene.children.filter(object => object instanceof THREE.BatchedMesh).reduce((count, object) => count + object.instanceCount, 0)
  assert.equal(instanceCount(), 6)
  added.removeFromParent()
  batches.prepare(scene)
  batches.restore()
  assert.equal(instanceCount(), 4)
  scene.add(added)
  batches.prepare(scene)
  batches.restore()
  assert.equal(instanceCount(), 6)
  assert.equal(traversals, 1)
  batches.dispose()
})

test('nested directional lights follow scene additions, removals and reparenting', () => {
  const { scene, parent, batches } = createScene()
  batches.prepare(scene)
  batches.restore()
  const light = new THREE.DirectionalLight()
  parent.add(light)
  batches.prepare(scene)
  batches.restore()
  assert.deepEqual([...batches.directionalLights], [light])
  light.removeFromParent()
  batches.prepare(scene)
  batches.restore()
  assert.equal([...batches.directionalLights].length, 0)
  scene.add(light)
  batches.prepare(scene)
  batches.restore()
  assert.deepEqual([...batches.directionalLights], [light])
  batches.dispose()
})

test('materials with shared engine shader hooks still batch while custom shaders stay separate', () => {
  const { scene, parent, batches } = createScene()
  const [shared, other, custom] = parent.children
  if (!(shared instanceof THREE.Mesh && other instanceof THREE.Mesh && custom instanceof THREE.Mesh)) {
    throw new Error('Expected meshes')
  }
  for (const mesh of [shared, other]) {
    mesh.material.onBeforeCompile = () => {}
    markSharedShaderHook(mesh.material)
  }
  custom.material.onBeforeCompile = () => {}
  assert.equal(batches.prepare(scene), true)
  assert.equal(shared.layers.mask, 0)
  assert.equal(other.layers.mask, 0)
  assert.equal(custom.layers.mask, 1)
  batches.restore()
  assert.equal(batches.prepare(scene), false)
  batches.dispose()
})
