import assert from 'node:assert/strict'
import test from 'node:test'
import { pathFraction, tumbleAxis, walkingBehavior } from '../src/lib/walking-policy.ts'

test('pedestrian walking modes choose the first exit in either direction or a random exit', () => {
  assert.deepEqual(walkingBehavior(4, 1, 0.8), { clockwise: false, index: 1 })
  assert.deepEqual(walkingBehavior(4, 2, 0.8), { clockwise: true, index: 1 })
  assert.deepEqual(walkingBehavior(4, 0, 0.8), { clockwise: false, index: 4 })
})

test('pedestrian phase follows chord distance and clamps at arrival', () => {
  assert.equal(pathFraction(0, 1, 2, 10), 0.2)
  assert.equal(pathFraction(0.9, 1, 2, 10), 1)
})

test('hits tumble about the world axis perpendicular to the incoming direction', () => {
  assert.deepEqual(tumbleAxis(1, 0), [0, 0, 1])
  assert.deepEqual(tumbleAxis(0, -1), [-1, 0, 0])
})
