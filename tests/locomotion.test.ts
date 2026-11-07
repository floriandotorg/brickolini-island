import assert from 'node:assert/strict'
import test from 'node:test'
import { advanceCycleTime, selectSpeedTier } from '../src/lib/locomotion.ts'

test('locomotion selects first tier at or above speed, excluding reaction tiers', () => {
  const tiers = [4, -21, 0, 0.7, -20]
  assert.equal(selectSpeedTier(tiers, 0), 0)
  assert.equal(selectSpeedTier(tiers, 0.1), 0.7)
  assert.equal(selectSpeedTier(tiers, 0.7), 0.7)
  assert.equal(selectSpeedTier(tiers, 0.8), 4)
  assert.equal(selectSpeedTier(tiers, 5), 4)
  assert.equal(selectSpeedTier([], 1), null)
})

test('moving phase follows distance and idle follows elapsed time', () => {
  assert.equal(advanceCycleTime(0, 0.5, 2, 2000), 1000)
  assert.equal(advanceCycleTime(1000, 0.5, 2, 2000), 0)
  assert.equal(advanceCycleTime(0, 0.5, 0, 2000), 500)
})
