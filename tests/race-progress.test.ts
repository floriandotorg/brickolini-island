import assert from 'node:assert/strict'
import test from 'node:test'
import { RaceProgress } from '../src/lib/race-progress.ts'

test('race accepts only forward waypoints within four and counts finish waypoint', () => {
  const race = new RaceProgress(2, 20)
  assert.equal(race.visit(5), false)
  assert.equal(race.visit(1), true)
  assert.equal(race.visit(1), false)
  assert.equal(race.visit(0), false)
  for (let n = 2; n <= 20; ++n) {
    race.visit(n)
  }
  assert.equal(race.lap, 1)
  assert.equal(race.progress, 0.5)
  for (let n = 1; n <= 20; ++n) {
    race.visit(n)
  }
  assert.equal(race.finished, true)
  assert.equal(race.visit(1), false)
  assert.equal(race.progress, 1)
})
