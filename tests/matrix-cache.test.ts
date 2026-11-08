import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { cacheObjectMatrix, updateRaycastMatrices, updateVisibleMatrices } from '../src/lib/matrix-cache.ts'

test('unchanged transforms leave world matrices clean and changed transforms propagate', () => {
  const scene = new THREE.Scene()
  cacheObjectMatrix(scene)
  const parent = new THREE.Group()
  cacheObjectMatrix(parent)
  const child = new THREE.Group()
  cacheObjectMatrix(child)
  scene.add(parent)
  parent.add(child)
  scene.updateMatrixWorld()
  scene.updateMatrix()
  parent.updateMatrix()
  child.updateMatrix()
  assert.equal(scene.matrixWorldNeedsUpdate, false)
  assert.equal(parent.matrixWorldNeedsUpdate, false)
  assert.equal(child.matrixWorldNeedsUpdate, false)
  parent.position.set(4, 5, 6)
  parent.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1)
  child.position.set(1, 2, 3)
  scene.updateMatrixWorld()
  const expected = new THREE.Matrix4().compose(parent.position, parent.quaternion, parent.scale).multiply(new THREE.Matrix4().compose(child.position, child.quaternion, child.scale))
  assert.deepEqual(child.matrixWorld.elements, expected.elements)
  parent.scale.set(2, 3, 4)
  scene.updateMatrixWorld()
  expected.compose(parent.position, parent.quaternion, parent.scale).multiply(child.matrix)
  assert.deepEqual(child.matrixWorld.elements, expected.elements)
})

test('manual matrices, disabled updates, pivot changes and reparenting retain three behavior', () => {
  const scene = new THREE.Scene()
  cacheObjectMatrix(scene)
  const parent = new THREE.Group()
  cacheObjectMatrix(parent)
  const child = new THREE.Group()
  cacheObjectMatrix(child)
  scene.add(parent, child)
  scene.updateMatrixWorld()
  child.matrix.makeTranslation(99, 99, 99)
  scene.updateMatrixWorld()
  assert.equal(child.matrixWorld.elements[12], 0)
  child.matrixAutoUpdate = false
  child.matrix.makeTranslation(7, 8, 9)
  child.matrixWorldNeedsUpdate = true
  scene.updateMatrixWorld()
  assert.equal(child.matrixWorld.elements[12], 7)
  child.matrixAutoUpdate = true
  child.scale.setScalar(2)
  child.pivot = new THREE.Vector3(1, 0, 0)
  scene.updateMatrixWorld()
  const reference = new THREE.Group()
  reference.scale.copy(child.scale)
  reference.pivot = child.pivot.clone()
  reference.updateMatrix()
  assert.deepEqual(child.matrix.elements, reference.matrix.elements)
  child.pivot.x = 3
  scene.updateMatrixWorld()
  reference.pivot.x = 3
  reference.updateMatrix()
  assert.deepEqual(child.matrix.elements, reference.matrix.elements)
  parent.position.x = 10
  parent.add(child)
  scene.updateMatrixWorld()
  assert.equal(child.matrixWorld.elements[12], parent.position.x + reference.matrix.elements[12])
})

test('ordinary objects cache once while custom update callbacks remain intact', () => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
  cacheObjectMatrix(mesh)
  const update = mesh.updateMatrix
  cacheObjectMatrix(mesh)
  assert.equal(mesh.updateMatrix, update)
  mesh.updateMatrixWorld()
  mesh.updateMatrix()
  assert.equal(mesh.matrixWorldNeedsUpdate, false)
  mesh.position.x = 3
  mesh.updateMatrixWorld()
  assert.equal(mesh.matrixWorld.elements[12], 3)
  const custom = new THREE.Group()
  let calls = 0
  custom.updateMatrix = () => {
    ++calls
  }
  cacheObjectMatrix(custom)
  custom.updateMatrix()
  assert.equal(calls, 1)
})

test('externally animated world matrices propagate to unchanged children', () => {
  const scene = new THREE.Scene()
  const parent = new THREE.Group()
  const child = new THREE.Group()
  for (const object of [scene, parent, child]) {
    cacheObjectMatrix(object)
  }
  scene.add(parent)
  parent.add(child)
  parent.matrixWorldAutoUpdate = false
  scene.updateMatrixWorld()
  parent.matrixWorld.makeTranslation(10, 20, 30)
  scene.updateMatrixWorld()
  assert.equal(child.matrixWorld.elements[12], 10)
  parent.matrixWorld.makeTranslation(40, 50, 60)
  scene.updateMatrixWorld()
  assert.equal(child.matrixWorld.elements[12], 40)
})

test('world position queries observe parent movement before the next render', () => {
  const scene = new THREE.Scene()
  const parent = new THREE.Group()
  const child = new THREE.Group()
  for (const object of [scene, parent, child]) {
    cacheObjectMatrix(object)
  }
  scene.add(parent)
  parent.add(child)
  child.position.x = 2
  scene.updateMatrixWorld()
  parent.position.x = 10
  assert.equal(child.getWorldPosition(new THREE.Vector3()).x, 12)
  parent.position.x = 20
  parent.getWorldPosition(new THREE.Vector3())
  scene.updateMatrixWorld()
  assert.equal(child.matrixWorld.elements[12], 22)
})

test('render matrix updates skip hidden trees while raycast preparation keeps hidden colliders current', () => {
  const scene = new THREE.Scene()
  const hidden = new THREE.Group()
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial())
  scene.add(hidden)
  hidden.add(ground)
  scene.traverse(cacheObjectMatrix)
  scene.updateMatrixWorld()
  hidden.visible = false
  hidden.position.y = 3
  updateVisibleMatrices(scene)
  assert.equal(ground.matrixWorld.elements[13], 0)
  updateRaycastMatrices([hidden])
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, -1, 0))
  assert.equal(ray.intersectObject(hidden, true)[0]?.point.y, 3)
  hidden.visible = true
  hidden.position.y = 5
  updateVisibleMatrices(scene)
  assert.equal(ground.matrixWorld.elements[13], 5)
})

test('render updates propagate moving parents into manually managed local matrices', () => {
  const scene = new THREE.Scene()
  const parent = new THREE.Group()
  const child = new THREE.Group()
  scene.add(parent)
  parent.add(child)
  scene.traverse(cacheObjectMatrix)
  child.matrixAutoUpdate = false
  child.matrix.makeTranslation(2, 0, 0)
  scene.updateMatrixWorld(true)
  parent.position.x = 10
  updateVisibleMatrices(scene)
  assert.equal(child.matrixWorld.elements[12], 12)
})

test('unchanged visible objects avoid world matrix multiplication', () => {
  const scene = new THREE.Scene()
  const parent = new THREE.Group()
  const child = new THREE.Group()
  scene.add(parent)
  parent.add(child)
  scene.traverse(cacheObjectMatrix)
  scene.updateMatrixWorld()
  let multiplications = 0
  const multiply = child.matrixWorld.multiplyMatrices.bind(child.matrixWorld)
  child.matrixWorld.multiplyMatrices = (a, b) => {
    ++multiplications
    return multiply(a, b)
  }
  updateVisibleMatrices(scene)
  updateVisibleMatrices(scene)
  assert.equal(multiplications, 0)
  parent.position.x = 10
  updateVisibleMatrices(scene)
  assert.equal(multiplications, 1)
  assert.equal(child.matrixWorld.elements[12], 10)
})
