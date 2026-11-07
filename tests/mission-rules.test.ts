import assert from 'node:assert/strict'
import test from 'node:test'
import { deliveryScore, hospitalVisit, isPizzaDestination } from '../src/lib/mission-rules.ts'

test('delivery scores use strict elapsed thresholds', () => {
  assert.equal(deliveryScore(99_999), 'red')
  assert.equal(deliveryScore(100_000), 'blue')
  assert.equal(deliveryScore(199_999), 'blue')
  assert.equal(deliveryScore(200_000), 'yellow')
})

test('destinations require matching actor and trigger type', () => {
  assert.equal(isPizzaDestination('pepper', 'S', 0x12e), true)
  assert.equal(isPizzaDestination('pepper', 'C', 0x12e), false)
  assert.equal(isPizzaDestination('mama', 'C', 0x22), true)
  assert.equal(isPizzaDestination('nick', 'W', 0x169), true)
  assert.equal(isPizzaDestination('laura', 'C', 0x0b), true)
  assert.equal(isPizzaDestination('papa', 'C', 0x0b), false)
})

test('only first hospital visit uses first acceptance, short path begins at fourth visit', () => {
  assert.deepEqual(hospitalVisit(0), { next: 1, short: false, acceptance: 0 })
  assert.deepEqual(hospitalVisit(1), { next: 2, short: false, acceptance: 1 })
  assert.deepEqual(hospitalVisit(3), { next: 4, short: true, acceptance: 1 })
  assert.deepEqual(hospitalVisit(5), { next: 5, short: true, acceptance: 1 })
})
