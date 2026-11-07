import assert from 'node:assert/strict'
import test from 'node:test'
import { crossesEdge } from '../src/lib/edge-crossing.ts'

test('ramp entry requires crossing the edge segment, not its infinite line', () => {
  assert.equal(crossesEdge([0, -1], [0, 1], [-1, 0], [1, 0]), true)
  assert.equal(crossesEdge([2, -1], [2, 1], [-1, 0], [1, 0]), false)
  assert.equal(crossesEdge([0, 0], [0, 0], [-1, 0], [1, 0]), false)
})
