import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { createRandom, scatterGrass } from '../src/lib/world/grass.ts'

const createGround = (): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 20, 20, 2, 0, 30, 0, 0, 30, 10, 0, 30, 0, 10], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 20, 20, 0, 0, 0, 0, 0, 0, 0], 2))
  geometry.setIndex([0, 1, 2, 3, 4, 5])
  return geometry
}

test('grass grows only inside flat triangles and inherits interpolated ground uvs', () => {
  const tufts = scatterGrass(createGround(), new THREE.Matrix4(), 2, createRandom(7))
  assert.ok(tufts.positions.length > 0)
  assert.equal(tufts.positions.length / 3, tufts.uvs.length / 2)
  for (let n = 0; n < tufts.positions.length / 3; ++n) {
    const [x, y, z] = tufts.positions.slice(n * 3, n * 3 + 3)
    assert.equal(y, 2)
    assert.ok(x >= 0 && z >= 0 && x + z <= 20 + 1e-4)
    assert.ok(Math.abs(tufts.uvs[n * 2] - x) < 1e-4)
    assert.ok(Math.abs(tufts.uvs[n * 2 + 1] - z) < 1e-4)
  }
})

test('grass density scales with triangle area and respects world transforms', () => {
  const sparse = scatterGrass(createGround(), new THREE.Matrix4(), 1, createRandom(3)).positions.length / 3
  const dense = scatterGrass(createGround(), new THREE.Matrix4(), 4, createRandom(3)).positions.length / 3
  assert.ok(sparse > 40 && sparse < 200)
  assert.ok(dense > sparse * 3 && dense < sparse * 5)
  const moved = scatterGrass(createGround(), new THREE.Matrix4().makeTranslation(100, 5, 0), 1, createRandom(3))
  for (let n = 0; n < moved.positions.length / 3; ++n) {
    assert.ok(moved.positions[n * 3] >= 100)
    assert.equal(moved.positions[n * 3 + 1], 7)
  }
})

test('grass placement is deterministic for a seed', () => {
  assert.deepEqual(scatterGrass(createGround(), new THREE.Matrix4(), 2, createRandom(11)), scatterGrass(createGround(), new THREE.Matrix4(), 2, createRandom(11)))
})
