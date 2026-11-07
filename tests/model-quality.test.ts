import assert from 'node:assert/strict'
import test from 'node:test'
import { islandModelName, lodIndex } from '../src/lib/model-quality.ts'

test('quality and debug caps select available model detail levels', () => {
  assert.equal(lodIndex(6, null, 'low'), 1)
  assert.equal(lodIndex(6, null, 'medium'), 2)
  assert.equal(lodIndex(6, null, 'high'), 5)
  assert.equal(lodIndex(6, 0, 'high'), 0)
  assert.equal(lodIndex(6, 3.6, 'high'), 3)
  assert.equal(lodIndex(2, 5, 'high'), 1)
})

test('island quality selects the original mesh and falls back to an available mesh', () => {
  const names = ['isle', 'isle_lo', 'isle_hi']
  assert.equal(islandModelName(names, 'low'), 'isle_lo')
  assert.equal(islandModelName(names, 'medium'), 'isle')
  assert.equal(islandModelName(names, 'high'), 'isle_hi')
  assert.equal(islandModelName(['isle_hi'], 'low'), 'isle_hi')
  assert.equal(islandModelName(['isle', 'isle_hi'], 'low'), 'isle')
})
