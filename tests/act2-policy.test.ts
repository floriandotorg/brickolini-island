import assert from 'node:assert/strict'
import test from 'node:test'
import { huntBrickPositions, nextChaseLocation } from '../src/lib/act2-policy.ts'

test('chase visits uncleared location seven and reserves pizza for last', () => {
  assert.equal(nextChaseLocation(0, [false, true, true, true, true, true, true, false, false], 1), 7)
  assert.equal(nextChaseLocation(7, [true, true, true, true, true, true, true, true, false], 0), 8)
})

test('hunt always provides four placements with every random branch reachable', () => {
  assert.deepEqual(
    huntBrickPositions(() => 0),
    [
      [-79.0625, 0.5, -19.75],
      [53.9328, 2.372259, -61.2073],
      [71.2397, 7.319758, -23],
      [-74.0625, 1.5, -91.125],
    ],
  )
  assert.deepEqual(huntBrickPositions(() => 0.99).at(-1), [-84, 4.5, 26])
})
