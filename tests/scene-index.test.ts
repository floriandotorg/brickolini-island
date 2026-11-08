import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { SceneIndex } from '../src/lib/scene-index.ts'

test('scene indices retain traversal order without rescanning unchanged trees', () => {
  const scene = new THREE.Scene()
  const group = new THREE.Group()
  const first = new THREE.Mesh()
  const second = new THREE.Mesh()
  group.add(first)
  scene.add(group, second)
  const index = new SceneIndex(scene, (object): object is THREE.Mesh => object instanceof THREE.Mesh)
  assert.deepEqual(index.objects, [first, second])
  const objects = index.objects
  assert.equal(index.objects, objects)
  first.name = 'changed'
  assert.equal(index.objects[0].name, 'changed')
  const third = new THREE.Mesh()
  group.add(third)
  assert.deepEqual(index.objects, [first, third, second])
  first.removeFromParent()
  assert.deepEqual(index.objects, [third, second])
  scene.add(first)
  assert.deepEqual(index.objects, [third, second, first])
  index.dispose()
})

test('scene indices follow nested subtree removal, reparenting and disposal', () => {
  const scene = new THREE.Scene()
  const first = new THREE.Mesh()
  const group = new THREE.Group().add(first)
  scene.add(group)
  const index = new SceneIndex(scene, (object): object is THREE.Mesh => object instanceof THREE.Mesh)
  assert.deepEqual(index.objects, [first])
  group.removeFromParent()
  assert.deepEqual(index.objects, [])
  const second = new THREE.Mesh()
  group.add(second)
  scene.add(group)
  assert.deepEqual(index.objects, [first, second])
  const other = new THREE.Group()
  scene.add(other)
  other.add(first)
  assert.deepEqual(index.objects, [second, first])
  index.dispose()
  scene.add(new THREE.Mesh())
  assert.deepEqual(index.objects, [])
})
