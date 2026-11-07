import assert from 'node:assert/strict'
import test from 'node:test'
import { allowedExtraLifetime, extraCycleIndices, initialExtraLocations, nextExtraPopulation } from '../src/lib/extras-policy.ts'

test('extra lifetime follows the population limit', () => {
  assert.equal(allowedExtraLifetime(2), 20000)
  assert.equal(allowedExtraLifetime(20), 300000)
})

test('initial extras choose five distinct original locations', () => {
  assert.deepEqual(
    initialExtraLocations(() => 0),
    [1, 2, 3, 4, 5],
  )
  const locations = initialExtraLocations(() => 0.999)
  assert.equal(new Set(locations).size, 5)
  assert.ok(locations.every(location => location >= 1 && location <= 10))
})

test('mood selects the original slow fast and idle cycles', () => {
  assert.deepEqual([0, 1, 2, 3].map(extraCycleIndices), [
    [0, 4, 7],
    [1, 5, 7],
    [2, 5, 7],
    [3, 6, 8],
  ])
})

test('population adapts within quality limits', () => {
  assert.deepEqual(nextExtraPopulation(5, 10, 0.1, 0.3), { count: 4, smoothed: (0.2 + 0.3) / 3 })
  assert.equal(nextExtraPopulation(2, 10, 0.3, 0.4).count, 2)
  assert.equal(nextExtraPopulation(10, 10, 0.1, 0.02).count, 10)
  assert.equal(nextExtraPopulation(5, 20, 0.1, 0.02).count, 6)
})
