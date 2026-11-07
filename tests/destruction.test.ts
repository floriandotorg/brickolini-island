import assert from 'node:assert/strict'
import test from 'node:test'
import { damagedCounter, damagedHeight } from '../src/lib/destruction-rules.ts'

test('building damage takes two hits except the hospital and jet stand', () => {
  assert.equal(damagedCounter(-1, 5, 2), 3)
  assert.equal(damagedCounter(3, 5, 2), 0)
  assert.equal(damagedCounter(-1, 3, 2), 0)
  assert.equal(damagedCounter(0, 5, 2), 0)
})

test('flowers trees and bushes fall in one hit while palms take two', () => {
  assert.deepEqual(
    [1, 2, 2, 3].map(initial => damagedCounter(-1, initial, 1)),
    [0, 0, 0, 2],
  )
  assert.equal(damagedCounter(2, 3, 1), 0)
})

test('damaged heights preserve intact objects and the Info Center zero scale', () => {
  assert.equal(damagedHeight(7, -1, 5, 1), 7)
  assert.equal(damagedHeight(7, 3, 5, 1), 5)
  assert.equal(damagedHeight(9, 0, 5, 0), 9)
})
