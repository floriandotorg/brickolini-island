import assert from 'node:assert/strict'
import test from 'node:test'
import { findAnimationRange, proximityBand, selectLocationAnimation } from '../src/lib/ambient-policy.ts'

const entry = (location: number, name: string, numPlayed = 0, actorMask = 31) => ({ location, name, numPlayed, actorMask, active: true, modelInfo: [] })

test('location lookup stops at the first proximity run and returns its full range', () => {
  const entries = [entry(38, 'a'), entry(38, 'b'), entry(1, 'c'), entry(-1, 'd'), entry(-1, 'e'), entry(24, 'f')]
  assert.deepEqual(findAnimationRange(entries, 38), [0, 2])
  assert.deepEqual(findAnimationRange(entries, -1), [3, 5])
  assert.equal(findAnimationRange(entries, 24), null)
})

test('camera selection honors player exclusion masks once-only names and stable ties', () => {
  const entries = [entry(1, 'intro', 1), entry(1, 'Impossible'), entry(1, 'wrongMask', 0, 2), { ...entry(1, 'self'), modelInfo: [{ name: 'pepper' }] }, entry(1, 'normal', 2), entry(1, 'least', 1), entry(1, 'tie', 1)]
  assert.equal(selectLocationAnimation(entries, 1, 'pepper', 1)?.name, 'least')
})

test('proximity bands use strict speed thresholds', () => {
  assert.deepEqual(proximityBand(0), { min: 2, max: 16 })
  assert.deepEqual(proximityBand(5), { min: 25, max: 36 })
  assert.deepEqual(proximityBand(6), { min: 36, max: 100 })
  assert.equal(proximityBand(-1), null)
  assert.equal(proximityBand(10), null)
})
