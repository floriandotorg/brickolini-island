import assert from 'node:assert/strict'
import test from 'node:test'
import { approachRaceSpeed, raceTargetSpeed } from '../src/lib/race-speed.ts'

test('race rubber banding compares raw waypoints and applies curve factors', () => {
  assert.equal(raceTargetSpeed(20, false, 2, 0, 0.65, 0.6), 17)
  assert.equal(raceTargetSpeed(20, false, 3, 0, 0.65, 0.6), 14)
  assert.equal(raceTargetSpeed(20, false, 1, 19, 0.65, 0.6), 26)
  assert.equal(raceTargetSpeed(20, true, 0, 0, 0.95, 0.5), 19)
  assert.equal(raceTargetSpeed(20, false, 2, 0, 0.95, 0.5), 17.5)
})

test('race acceleration clamps only from above', () => {
  assert.equal(approachRaceSpeed(10, 12, 100, 0.03), 12)
  assert.equal(approachRaceSpeed(15, 12, 100, 0.04), 11)
})
